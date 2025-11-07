/**
 * Medical Scanner Component
 *
 * Interactive face mesh scanning with eye analysis and first aid assessment.
 * Features:
 * - Real-time face mesh overlay
 * - Animated scanning effect
 * - Eye health indicators
 * - First aid alerts (stroke, shock, hypoxia)
 * - Auto-navigation to 3D anatomy
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useMedicalScanner } from '../hooks/useMedicalScanner';

interface MedicalScannerProps {
  onAnatomyTarget?: (target: string) => void;
  onVoiceGuidance?: (text: string) => void;
}

export const MedicalScanner: React.FC<MedicalScannerProps> = ({
  onAnatomyTarget,
  onVoiceGuidance,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  const {
    analyzeFrame,
    faceDetected,
    eyeMetrics,
    firstAid,
    landmarks,
    quality,
    warnings,
    anatomyTargets,
    voiceGuidance,
    isAnalyzing,
  } = useMedicalScanner();

  /**
   * Start webcam and scanning
   */
  const startScanning = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      console.log('✅ Medical scanner started');
    } catch (err) {
      console.error('❌ Failed to start scanner:', err);
      alert('Failed to access webcam. Please grant camera permissions.');
    }
  };

  /**
   * Stop scanning
   */
  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setScanProgress(0);
    console.log('🛑 Medical scanner stopped');
  };

  /**
   * Capture and analyze frame
   */
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Set canvas size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get base64 image
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Verify we have valid image data (not empty)
    if (!imageData || imageData.length < 100) {
      console.warn('⚠️  Invalid image data, skipping frame');
      return;
    }

    // Analyze with Python service
    await analyzeFrame(imageData);

    // Update scan progress animation
    setScanProgress(prev => (prev + 5) % 100);
  }, [isScanning, analyzeFrame]);

  /**
   * Draw face mesh overlay
   */
  const drawFaceMesh = useCallback(() => {
    if (!overlayCanvasRef.current || !videoRef.current || !landmarks.length) return;

    const overlay = overlayCanvasRef.current;
    const video = videoRef.current;
    const ctx = overlay.getContext('2d');

    if (!ctx) return;

    // Get displayed video size
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;

    // Get actual video resolution
    const videoWidth = video.videoWidth || displayWidth;
    const videoHeight = video.videoHeight || displayHeight;

    // Set canvas to match displayed size
    overlay.width = displayWidth;
    overlay.height = displayHeight;

    // Calculate scale factors
    const scaleX = displayWidth / videoWidth;
    const scaleY = displayHeight / videoHeight;

    // Clear previous frame
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw face mesh points with scaling
    ctx.fillStyle = '#00ff00';
    landmarks.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x * scaleX, point.y * scaleY, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw iris circles (pupils) with scaling
    if (eyeMetrics) {
      // Left iris
      const leftIris = landmarks.slice(474, 478);
      if (leftIris.length > 0) {
        const centerLeft = {
          x: (leftIris.reduce((sum, p) => sum + p.x, 0) / leftIris.length) * scaleX,
          y: (leftIris.reduce((sum, p) => sum + p.y, 0) / leftIris.length) * scaleY,
        };

        ctx.strokeStyle = eyeMetrics.pupil_asymmetry_alert ? '#ff0000' : '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerLeft.x, centerLeft.y, 20 * scaleX, 0, 2 * Math.PI);
        ctx.stroke();

        // Pupil size label
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px monospace';
        ctx.fillText(`${eyeMetrics.pupil_diameter_left}mm`, centerLeft.x + 25 * scaleX, centerLeft.y);
      }

      // Right iris
      const rightIris = landmarks.slice(469, 473);
      if (rightIris.length > 0) {
        const centerRight = {
          x: (rightIris.reduce((sum, p) => sum + p.x, 0) / rightIris.length) * scaleX,
          y: (rightIris.reduce((sum, p) => sum + p.y, 0) / rightIris.length) * scaleY,
        };

        ctx.strokeStyle = eyeMetrics.pupil_asymmetry_alert ? '#ff0000' : '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerRight.x, centerRight.y, 20 * scaleX, 0, 2 * Math.PI);
        ctx.stroke();

        // Pupil size label
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px monospace';
        ctx.fillText(`${eyeMetrics.pupil_diameter_right}mm`, centerRight.x + 25 * scaleX, centerRight.y);
      }
    }

    // Draw face oval with scaling
    const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323];
    if (faceOval.every(i => i < landmarks.length)) {
      ctx.strokeStyle = faceDetected ? '#00ff00' : '#ff0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(landmarks[faceOval[0]].x * scaleX, landmarks[faceOval[0]].y * scaleY);
      faceOval.forEach(i => {
        ctx.lineTo(landmarks[i].x * scaleX, landmarks[i].y * scaleY);
      });
      ctx.closePath();
      ctx.stroke();
    }

  }, [landmarks, faceDetected, eyeMetrics]);

  /**
   * Animation loop
   */
  useEffect(() => {
    if (!isScanning) return;

    const intervalId = setInterval(() => {
      captureAndAnalyze();
      drawFaceMesh();
    }, 100); // 10 FPS for analysis

    return () => clearInterval(intervalId);
  }, [isScanning, captureAndAnalyze, drawFaceMesh]);

  /**
   * Handle anatomy targets
   */
  useEffect(() => {
    if (anatomyTargets.length > 0 && onAnatomyTarget) {
      onAnatomyTarget(anatomyTargets[0]);
    }
  }, [anatomyTargets, onAnatomyTarget]);

  /**
   * Handle voice guidance
   */
  useEffect(() => {
    if (voiceGuidance && onVoiceGuidance) {
      onVoiceGuidance(voiceGuidance);
    }
  }, [voiceGuidance, onVoiceGuidance]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🔬 Medical Face Scanner
        {isAnalyzing && (
          <span style={{ fontSize: '14px', color: '#666' }}>(Analyzing...)</span>
        )}
      </h2>

      {/* Video Container with Overlay */}
      <div style={{
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        {/* Video Feed */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            maxWidth: '800px',
            display: 'block',
          }}
        />

        {/* Hidden capture canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Face mesh overlay */}
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />

        {/* Scanning Animation */}
        {isScanning && (
          <>
            <ScanningLine progress={scanProgress} />
            <ScanGrid />
          </>
        )}

        {/* Quality Indicator */}
        {quality !== null && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            padding: '8px 15px',
            borderRadius: '8px',
            fontSize: '14px',
          }}>
            Quality: <QualityBadge quality={quality} />
          </div>
        )}

        {/* Urgent Alerts */}
        {firstAid?.urgent_findings && firstAid.urgent_findings.length > 0 && (
          <UrgentAlert findings={firstAid.urgent_findings} />
        )}

        {/* Eye Metrics Overlay */}
        {eyeMetrics && faceDetected && (
          <EyeMetricsOverlay metrics={eyeMetrics} />
        )}

        {/* First Aid Status */}
        {firstAid && faceDetected && (
          <FirstAidStatus assessment={firstAid} />
        )}
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        justifyContent: 'center',
      }}>
        {!isScanning ? (
          <button
            onClick={startScanning}
            style={{
              padding: '15px 40px',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: '#2196F3',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
            }}
          >
            🔬 Start Medical Scan
          </button>
        ) : (
          <button
            onClick={stopScanning}
            style={{
              padding: '15px 40px',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ⏹ Stop Scan
          </button>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          {warnings.map((warning, i) => (
            <div key={i} style={{
              padding: '10px 15px',
              backgroundColor: '#fff3cd',
              borderLeft: '4px solid #ffc107',
              borderRadius: '4px',
              marginBottom: '8px',
            }}>
              ⚠️ {warning}
            </div>
          ))}
        </div>
      )}

      {/* Info Panel */}
      <InfoPanel />
    </div>
  );
};

/**
 * Scanning line animation
 */
const ScanningLine: React.FC<{ progress: number }> = ({ progress }) => (
  <div style={{
    position: 'absolute',
    top: `${progress}%`,
    left: 0,
    width: '100%',
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
    boxShadow: '0 0 15px #00ff00',
    animation: 'pulse 1.5s ease-in-out infinite',
  }} />
);

/**
 * Scan grid overlay
 */
const ScanGrid: React.FC = () => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `
      linear-gradient(0deg, transparent 49%, rgba(0, 255, 0, 0.1) 50%, transparent 51%),
      linear-gradient(90deg, transparent 49%, rgba(0, 255, 0, 0.1) 50%, transparent 51%)
    `,
    backgroundSize: '30px 30px',
    opacity: 0.3,
    pointerEvents: 'none',
  }} />
);

/**
 * Quality badge
 */
const QualityBadge: React.FC<{ quality: number }> = ({ quality }) => {
  const color = quality > 0.7 ? '#4CAF50' : quality > 0.4 ? '#FFC107' : '#f44336';
  const label = quality > 0.7 ? 'Excellent' : quality > 0.4 ? 'Fair' : 'Poor';

  return (
    <span style={{ color, fontWeight: 'bold' }}>
      {label} ({Math.round(quality * 100)}%)
    </span>
  );
};

/**
 * Urgent alert banner
 */
const UrgentAlert: React.FC<{ findings: string[] }> = ({ findings }) => (
  <div style={{
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#d32f2f',
    color: '#fff',
    padding: '15px 25px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    maxWidth: '90%',
    textAlign: 'center',
    animation: 'pulse 1s ease-in-out infinite',
    boxShadow: '0 4px 20px rgba(211, 47, 47, 0.6)',
  }}>
    <div style={{ marginBottom: '8px', fontSize: '24px' }}>🚨 MEDICAL ALERT</div>
    {findings.map((finding, i) => (
      <div key={i} style={{ marginBottom: '4px' }}>{finding}</div>
    ))}
  </div>
);

/**
 * Eye metrics overlay
 */
const EyeMetricsOverlay: React.FC<{ metrics: any }> = ({ metrics }) => (
  <div style={{
    position: 'absolute',
    top: '60px',
    right: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '13px',
    minWidth: '200px',
  }}>
    <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#00ffff' }}>
      👁️ Eye Analysis
    </div>

    <MetricRow
      label="Left Pupil"
      value={`${metrics.pupil_diameter_left} mm`}
      alert={metrics.pupil_asymmetry_alert}
    />
    <MetricRow
      label="Right Pupil"
      value={`${metrics.pupil_diameter_right} mm`}
      alert={metrics.pupil_asymmetry_alert}
    />
    <MetricRow
      label="Asymmetry"
      value={`${metrics.pupil_asymmetry.toFixed(2)} mm`}
      alert={metrics.pupil_asymmetry_alert}
    />

    {metrics.jaundice_detected && (
      <div style={{
        marginTop: '8px',
        padding: '8px',
        backgroundColor: '#ff9800',
        borderRadius: '4px',
        color: '#000',
      }}>
        ⚠️ Jaundice detected
      </div>
    )}

    <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.7 }}>
      Blink rate: {metrics.blink_rate} /min
    </div>
  </div>
);

/**
 * First aid status panel
 */
const FirstAidStatus: React.FC<{ assessment: any }> = ({ assessment }) => (
  <div style={{
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '13px',
    minWidth: '220px',
  }}>
    <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#ff6b6b' }}>
      🚑 First Aid Assessment
    </div>

    <MetricRow
      label="Facial Symmetry"
      value={assessment.stroke_alert ? 'ASYMMETRIC' : 'Normal'}
      alert={assessment.stroke_alert}
    />

    {assessment.cyanosis_detected && (
      <div style={{
        marginTop: '8px',
        padding: '8px',
        backgroundColor: '#2196F3',
        borderRadius: '4px',
        fontWeight: 'bold',
      }}>
        ⚠️ Cyanosis (Blue lips)
      </div>
    )}

    {assessment.pallor_alert && (
      <div style={{
        marginTop: '8px',
        padding: '8px',
        backgroundColor: '#ff9800',
        borderRadius: '4px',
        color: '#000',
        fontWeight: 'bold',
      }}>
        ⚠️ Severe pallor detected
      </div>
    )}
  </div>
);

/**
 * Metric row component
 */
const MetricRow: React.FC<{ label: string; value: string; alert?: boolean }> = ({
  label,
  value,
  alert
}) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    padding: '4px 8px',
    backgroundColor: alert ? 'rgba(211, 47, 47, 0.3)' : 'transparent',
    borderRadius: '4px',
  }}>
    <span style={{ opacity: 0.8 }}>{label}:</span>
    <span style={{
      fontWeight: 'bold',
      color: alert ? '#ff4444' : '#00ff00'
    }}>
      {value}
    </span>
  </div>
);

/**
 * Info panel
 */
const InfoPanel: React.FC = () => (
  <div style={{
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  }}>
    <h3 style={{ marginTop: 0 }}>Medical Scanner Features:</h3>
    <ul style={{ marginBottom: 0 }}>
      <li><strong>Eye Health:</strong> Pupil size, asymmetry (neurological), jaundice (liver), redness</li>
      <li><strong>Stroke Detection (FAST):</strong> Facial asymmetry, pupil inequality</li>
      <li><strong>Shock/Blood Loss:</strong> Pallor (pale skin color)</li>
      <li><strong>Hypoxia:</strong> Cyanosis (blue lips indicating low oxygen)</li>
      <li><strong>Blink Rate:</strong> Fatigue, dry eye, Parkinson's indicators</li>
    </ul>

    <div style={{
      marginTop: '15px',
      padding: '12px',
      backgroundColor: '#fff3cd',
      borderRadius: '6px',
      fontSize: '14px',
    }}>
      <strong>⚕️ Medical Disclaimer:</strong> This tool is for educational and screening purposes only.
      It is NOT a substitute for professional medical diagnosis. Seek immediate medical care for emergencies.
    </div>
  </div>
);

export default MedicalScanner;
