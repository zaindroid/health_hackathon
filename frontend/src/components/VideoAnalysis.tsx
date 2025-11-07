/**
 * Video Analysis Component
 *
 * Real-time heart rate monitoring using webcam and CAIRE API.
 * Captures video frames, sends to backend, displays heart rate and rPPG signals.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useVideoHealth } from '../hooks/useVideoHealth';

interface VideoAnalysisProps {
  wsUrl?: string;
}

export const VideoAnalysis: React.FC<VideoAnalysisProps> = ({
  wsUrl = `ws://${window.location.hostname}:3001/video-health`
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

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
  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return null;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG (without data URL prefix)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
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
      setIsRecording(true);

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
   * Send frames to backend at ~30 FPS
   */
  useEffect(() => {
    if (!isRecording || !isConnected) return;

    const intervalId = setInterval(() => {
      const frameData = captureFrame();
      if (frameData) {
        sendFrame(frameData);
      }
    }, 1000 / 30); // 30 FPS

    return () => clearInterval(intervalId);
  }, [isRecording, isConnected, sendFrame]);

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
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>📹 Video Health Monitoring</h2>

      {/* Video Preview */}
      <div style={{
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '20px',
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            maxWidth: '640px',
            display: 'block',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {/* Heart Rate Overlay */}
        {heartRate && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            padding: '15px 25px',
            borderRadius: '8px',
            fontSize: '24px',
            fontWeight: 'bold',
          }}>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '5px' }}>
              Heart Rate
            </div>
            <div style={{ fontSize: '32px', color: '#ff4444' }}>
              {heartRate} <span style={{ fontSize: '20px' }}>BPM</span>
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            color: '#fff',
            padding: '8px 15px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            RECORDING
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        justifyContent: 'center',
      }}>
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            style={{
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ▶ Start Monitoring
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            style={{
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ⏹ Stop Monitoring
          </button>
        )}
      </div>

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
        <ul style={{ marginBottom: 0 }}>
          <li>Position your face in the camera view with good lighting</li>
          <li>Click "Start Monitoring" to begin heart rate detection</li>
          <li>Keep your face visible and relatively still for best results</li>
          <li>Heart rate is measured using rPPG (remote photoplethysmography)</li>
          <li>Recording takes ~10 seconds for accurate measurements</li>
        </ul>
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
