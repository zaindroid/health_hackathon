/**
 * Video Analysis Component
 *
 * Real-time heart rate monitoring using webcam and CAIRE API.
 * Captures video frames, sends to backend, displays heart rate and rPPG signals.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useVideoHealth } from '../hooks/useVideoHealth';
import { useMedicalScanner } from '../hooks/useMedicalScanner';

interface VideoAnalysisProps {
  wsUrl?: string;
  sessionId?: string;
}

export const VideoAnalysis: React.FC<VideoAnalysisProps> = ({
  wsUrl = `ws://${window.location.hostname}:3001/video-health`,
  sessionId
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing camera...');
  const recordingStartTime = useRef<number | null>(null);
  const RECORDING_DURATION = 15000; // 15 seconds

  // CAIRE API for heart rate
  const {
    connect,
    disconnect,
    sendFrame,
    startMonitoring,
    stopMonitoring,
    heartRate,
    rppgSignal,
    isConnected,
    status,
    error,
  } = useVideoHealth(wsUrl);

  // MediaPipe for pupil size and blink rate
  const {
    analyzeFrame: analyzeEyeMetrics,
    eyeMetrics,
    faceDetected,
  } = useMedicalScanner();

  /**
   * Start webcam capture
   */
  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      console.log('✅ Webcam started');
      return mediaStream;
    } catch (err) {
      console.error('❌ Failed to start webcam:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to access webcam';
      alert(`Failed to access webcam: ${errorMsg}\n\nPlease grant camera permissions and try again.`);
      throw err; // Re-throw so handleStartRecording can catch it
    }
  };

  /**
   * Stop webcam capture
   */
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    console.log('🛑 Webcam stopped');
  };

  /**
   * Capture frame from video and convert to base64 JPEG
   */
  const captureFrame = (): { frameData: string | null; fullDataUrl: string | null } => {
    if (!videoRef.current || !canvasRef.current) return { frameData: null, fullDataUrl: null };

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return { frameData: null, fullDataUrl: null };

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG (without data URL prefix for CAIRE)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const frameData = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

    return { frameData, fullDataUrl: dataUrl };
  };

  /**
   * Start recording and monitoring
   */
  const handleStartRecording = async () => {
    try {
      console.log('📹 Starting recording...');

      // Check if video element already has a stream
      let activeStream = stream;

      if (videoRef.current?.srcObject instanceof MediaStream) {
        activeStream = videoRef.current.srcObject as MediaStream;
        console.log('✅ Using existing video stream');
      }

      // Start webcam if not already started
      if (!activeStream || activeStream.getTracks().length === 0) {
        console.log('📷 Starting webcam...');
        activeStream = await startWebcam();
        // Wait a bit for stream to be fully ready
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Final verification
      const tracks = activeStream?.getTracks() || [];
      console.log(`📊 Stream status: ${tracks.length} tracks, active: ${tracks.some(t => t.enabled && t.readyState === 'live')}`);

      if (tracks.length === 0 || !tracks.some(t => t.readyState === 'live')) {
        throw new Error('Webcam stream is not active. Please grant camera permissions.');
      }

      console.log('🔌 Connecting to WebSocket...');
      // Connect to backend WebSocket
      await connect();

      console.log('📤 Sending start message...');
      // Send start message to initiate CAIRE connection
      startMonitoring();

      // Start sending frames at 30 FPS
      recordingStartTime.current = Date.now();
      setIsRecording(true);
      setRecordingProgress(0);

      console.log('✅ Recording started successfully');
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to start recording: ${errorMsg}`);
    }
  };

  /**
   * Stop recording and monitoring
   */
  const handleStopRecording = () => {
    setIsRecording(false);
    stopMonitoring();
    stopWebcam();
    disconnect();

    console.log('🛑 Recording stopped');
  };

  /**
   * Send frames to backend at ~30 FPS for CAIRE
   * and analyze eye metrics at ~10 FPS for MediaPipe
   */
  useEffect(() => {
    if (!isRecording || !isConnected) return;

    let frameCount = 0;

    const intervalId = setInterval(() => {
      const { frameData, fullDataUrl } = captureFrame();

      // Send to CAIRE API every frame (30 FPS)
      if (frameData) {
        sendFrame(frameData);
      }

      // Send to MediaPipe every 3rd frame (~10 FPS)
      frameCount++;
      if (fullDataUrl && frameCount % 3 === 0) {
        analyzeEyeMetrics(fullDataUrl);
      }
    }, 1000 / 30); // 30 FPS

    return () => clearInterval(intervalId);
  }, [isRecording, isConnected, sendFrame, analyzeEyeMetrics]);

  /**
   * Auto-start webcam and monitoring when face is detected
   */
  useEffect(() => {
    let mounted = true;
    let faceCheckInterval: NodeJS.Timeout;

    const autoStart = async () => {
      try {
        setStatusMessage('Starting camera...');
        await startWebcam();

        if (!mounted) return;

        setStatusMessage('Please position your face in the frame');

        // Wait for face detection from MediaPipe
        faceCheckInterval = setInterval(() => {
          if (faceDetected && !isRecording && mounted) {
            setStatusMessage('Face detected! Starting vitals check...');
            clearInterval(faceCheckInterval);

            // Small delay then start
            setTimeout(async () => {
              if (mounted && !isRecording) {
                await handleStartRecording();
              }
            }, 1000);
          }
        }, 500);
      } catch (error) {
        console.error('Auto-start failed:', error);
        setStatusMessage('Camera access denied. Please grant camera permissions.');
      }
    };

    autoStart();

    return () => {
      mounted = false;
      if (faceCheckInterval) clearInterval(faceCheckInterval);
      stopWebcam();
      disconnect();
    };
  }, []); // Run once on mount

  /**
   * Send vitals data to backend and trigger voice explanation
   */
  const sendVitalsToBackend = async () => {
    if (!sessionId) {
      console.warn('⚠️ No sessionId provided, cannot send vitals');
      return;
    }

    try {
      // Send vitals data
      const vitalsData = [];

      if (heartRate) {
        vitalsData.push({
          name: 'Heart Rate',
          value: heartRate,
          unit: 'BPM'
        });
      }

      if (eyeMetrics) {
        vitalsData.push({
          name: 'Pupil Size (Left)',
          value: eyeMetrics.pupil_diameter_left.toFixed(1),
          unit: 'mm'
        });
        vitalsData.push({
          name: 'Pupil Size (Right)',
          value: eyeMetrics.pupil_diameter_right.toFixed(1),
          unit: 'mm'
        });
        vitalsData.push({
          name: 'Blink Rate',
          value: eyeMetrics.blink_rate,
          unit: '/min'
        });
      }

      // Send each vital
      for (const vital of vitalsData) {
        await fetch('http://localhost:3001/api/session/data/vital-displayed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, metric: vital }),
        });
      }

      console.log('✅ Vitals data sent to backend:', vitalsData);

      // Notify backend that vitals are complete
      await fetch('http://localhost:3001/api/session/vitals/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          vitals: { heartRate, eyeMetrics }
        }),
      });

      // Dispatch event to trigger voice agent explanation
      const event = new CustomEvent('vitals-complete', {
        detail: { heartRate, eyeMetrics, sessionId }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('❌ Failed to send vitals:', error);
    }
  };

  /**
   * Auto-stop after recording duration
   */
  useEffect(() => {
    if (!isRecording || !recordingStartTime.current) return;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - (recordingStartTime.current || 0);
      const progress = Math.min((elapsed / RECORDING_DURATION) * 100, 100);
      setRecordingProgress(progress);

      if (elapsed >= RECORDING_DURATION) {
        handleStopRecording();
        setIsComplete(true);
        setStatusMessage('Analysis complete! Your health assistant will explain the results.');
        sendVitalsToBackend();
        clearInterval(progressInterval);
      }
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isRecording, heartRate, eyeMetrics]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopWebcam();
      disconnect();
    };
  }, [disconnect]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ marginBottom: '15px', fontSize: '32px', textAlign: 'center' }}>📹 Live Video Vitals Check</h2>
      <p style={{ fontSize: '16px', color: '#666', marginBottom: '25px', textAlign: 'center' }}>
        Analyzing heart rate, pupil size, and blink rate in real-time
      </p>

      {/* Video Preview */}
      <div style={{
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '20px',
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto 20px auto',
        aspectRatio: '16 / 9',
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {/* Vitals Overlay - Combined Display */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {/* Heart Rate */}
          {heartRate && (
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '24px' }}>❤️</span>
              <div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>Heart Rate</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff4444' }}>
                  {heartRate} <span style={{ fontSize: '14px' }}>BPM</span>
                </div>
              </div>
            </div>
          )}

          {/* Pupil Size */}
          {eyeMetrics && faceDetected && (
            <>
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '24px' }}>👁️</span>
                <div>
                  <div style={{ fontSize: '11px', opacity: 0.7 }}>Pupil Size</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ffff' }}>
                    L: {eyeMetrics.pupil_diameter_left.toFixed(1)}mm | R: {eyeMetrics.pupil_diameter_right.toFixed(1)}mm
                  </div>
                </div>
              </div>

              {/* Blink Rate */}
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '24px' }}>👀</span>
                <div>
                  <div style={{ fontSize: '11px', opacity: 0.7 }}>Blink Rate</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4CAF50' }}>
                    {eyeMetrics.blink_rate} <span style={{ fontSize: '14px' }}>/min</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Status Indicator */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: isRecording ? 'rgba(255, 0, 0, 0.9)' : 'rgba(33, 150, 243, 0.9)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '25px',
          fontSize: '15px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {isRecording && (
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          )}
          {statusMessage}
        </div>

        {/* Progress Bar */}
        {isRecording && (
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '100%',
            height: '6px',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}>
            <div style={{
              width: `${recordingProgress}%`,
              height: '100%',
              backgroundColor: '#4CAF50',
              transition: 'width 0.1s linear',
            }} />
          </div>
        )}
      </div>

      {/* Auto-monitoring notice */}
      {!isComplete && (
        <div style={{
          textAlign: 'center',
          padding: '15px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '15px',
          color: '#1565c0',
        }}>
          {isRecording ? (
            <>
              <strong>📊 Recording in progress...</strong>
              <br />
              Please stay still. Analysis will complete automatically in {Math.ceil((RECORDING_DURATION - (Date.now() - (recordingStartTime.current || 0))) / 1000)} seconds.
            </>
          ) : (
            <>
              <strong>🎯 Automatic face detection enabled</strong>
              <br />
              Position your face in the frame to begin vitals check
            </>
          )}
        </div>
      )}

      {/* Status Messages */}
      <div style={{ marginBottom: '20px' }}>
        {status && (
          <div style={{
            padding: '10px 15px',
            backgroundColor: '#e3f2fd',
            borderLeft: '4px solid #2196F3',
            borderRadius: '4px',
            marginBottom: '10px',
          }}>
            <strong>Status:</strong> {status}
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 15px',
            backgroundColor: '#ffebee',
            borderLeft: '4px solid #f44336',
            borderRadius: '4px',
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* rPPG Signal Visualization */}
      {rppgSignal && rppgSignal.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>rPPG Signal</h3>
          <div style={{
            height: '150px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            padding: '10px',
            position: 'relative',
          }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                points={rppgSignal.map((value, index) => {
                  const x = (index / rppgSignal.length) * 100;
                  const y = 50 - (value * 50); // Center and scale
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#ff4444"
                strokeWidth="0.5"
              />
            </svg>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {rppgSignal.length} samples
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666',
      }}>
        <h4 style={{ marginTop: 0 }}>How it works:</h4>
        <ul style={{ marginBottom: 0, lineHeight: '1.8' }}>
          <li><strong>❤️ Heart Rate:</strong> Measured using rPPG (remote photoplethysmography) via CAIRE API</li>
          <li><strong>👁️ Pupil Size:</strong> Tracked using MediaPipe Face Mesh for neurological indicators</li>
          <li><strong>👀 Blink Rate:</strong> Monitored for fatigue, dry eye, and health indicators</li>
          <li>Position your face in the camera view with good lighting</li>
          <li>Keep your face visible and relatively still for best results</li>
          <li>Recording takes ~10-15 seconds for accurate measurements</li>
        </ul>
        <div style={{
          marginTop: '15px',
          padding: '12px',
          backgroundColor: '#fff3cd',
          borderRadius: '6px',
          fontSize: '13px',
        }}>
          <strong>⚕️ Note:</strong> Results will be explained by the voice assistant.
          The AI will recommend whether you should rest or see a doctor based on your vitals.
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};
