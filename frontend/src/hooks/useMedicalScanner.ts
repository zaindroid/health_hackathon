/**
 * useMedicalScanner Hook
 *
 * React hook for medical face scanning with eye analysis and first aid assessment.
 * Communicates with Python FastAPI service running MediaPipe Face Mesh.
 */

import { useState, useCallback } from 'react';

interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

interface EyeMetrics {
  pupil_diameter_left: number;
  pupil_diameter_right: number;
  pupil_asymmetry: number;
  pupil_asymmetry_alert: boolean;
  sclera_redness_left: number;
  sclera_redness_right: number;
  jaundice_score: number;
  jaundice_detected: boolean;
  blink_detected: boolean;
  blink_rate: number;
}

interface FirstAidAssessment {
  facial_asymmetry: number;
  stroke_risk: string;
  stroke_alert: boolean;
  pallor_score: number;
  pallor_alert: boolean;
  cyanosis_detected: boolean;
  cyanosis_alert: boolean;
  respiratory_rate: number | null;
  consciousness_indicators: {
    eyes_open: boolean;
    face_tracking: boolean;
    blink_response: boolean;
  };
  urgent_findings: string[];
}

interface AnalysisResult {
  success: boolean;
  face_detected: boolean;
  landmarks: LandmarkPoint[];
  eye_metrics: EyeMetrics;
  first_aid: FirstAidAssessment;
  quality_score: number;
  warnings: string[];
  anatomy_targets: string[];
  voice_guidance: string;
}

interface UseMedicalScannerResult {
  // State
  faceDetected: boolean;
  eyeMetrics: EyeMetrics | null;
  firstAid: FirstAidAssessment | null;
  landmarks: LandmarkPoint[];
  quality: number | null;
  warnings: string[];
  anatomyTargets: string[];
  voiceGuidance: string | null;
  isAnalyzing: boolean;
  error: string | null;

  // Actions
  analyzeFrame: (imageData: string) => Promise<void>;
  reset: () => Promise<void>;
}

const PYTHON_SERVICE_URL = 'http://localhost:8000';

export function useMedicalScanner(): UseMedicalScannerResult {
  const [faceDetected, setFaceDetected] = useState(false);
  const [eyeMetrics, setEyeMetrics] = useState<EyeMetrics | null>(null);
  const [firstAid, setFirstAid] = useState<FirstAidAssessment | null>(null);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[]>([]);
  const [quality, setQuality] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [anatomyTargets, setAnatomyTargets] = useState<string[]>([]);
  const [voiceGuidance, setVoiceGuidance] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyze a single frame
   */
  const analyzeFrame = useCallback(async (imageData: string): Promise<void> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`${PYTHON_SERVICE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: imageData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result: AnalysisResult = await response.json();

      // Update all state
      setFaceDetected(result.face_detected);
      setEyeMetrics(result.eye_metrics);
      setFirstAid(result.first_aid);
      setLandmarks(result.landmarks);
      setQuality(result.quality_score);
      setWarnings(result.warnings);
      setAnatomyTargets(result.anatomy_targets);
      setVoiceGuidance(result.voice_guidance);

    } catch (err) {
      console.error('❌ Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Reset analyzer state
   */
  const reset = useCallback(async (): Promise<void> => {
    try {
      await fetch(`${PYTHON_SERVICE_URL}/reset`, {
        method: 'POST',
      });

      // Clear local state
      setFaceDetected(false);
      setEyeMetrics(null);
      setFirstAid(null);
      setLandmarks([]);
      setQuality(null);
      setWarnings([]);
      setAnatomyTargets([]);
      setVoiceGuidance(null);
      setError(null);

      console.log('✅ Medical scanner reset');
    } catch (err) {
      console.error('❌ Reset error:', err);
    }
  }, []);

  return {
    faceDetected,
    eyeMetrics,
    firstAid,
    landmarks,
    quality,
    warnings,
    anatomyTargets,
    voiceGuidance,
    isAnalyzing,
    error,
    analyzeFrame,
    reset,
  };
}
