# 🔬 Comprehensive Video Health Analysis System

## Overview

This document outlines the integration of **20+ health indicators** from facial video analysis, creating a complete non-invasive health assessment platform.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Video Capture                       │
│  • Webcam stream (30 FPS)                                       │
│  • Face detection & ROI extraction                              │
│  • Quality checks (lighting, distance, stability)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Analysis Pipeline                     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐      │
│  │ Vital Signs  │  │ Eye Analysis │  │  Skin Analysis  │      │
│  │              │  │              │  │                 │      │
│  │ • HR (rPPG)  │  │ • Pupil size │  │ • Pallor        │      │
│  │ • RR         │  │ • Redness    │  │ • Cyanosis      │      │
│  │ • SpO2       │  │ • Jaundice   │  │ • Inflammation  │      │
│  │ • BP est.    │  │ • Blinking   │  │ • Hemoglobin    │      │
│  │ • HRV        │  │ • Tracking   │  │ • Temperature   │      │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘      │
│         │                  │                    │               │
│         └──────────────────┼────────────────────┘               │
│                            ▼                                    │
│         ┌──────────────────────────────────┐                   │
│         │   Multi-Modal Fusion Engine      │                   │
│         │  • Combine all indicators        │                   │
│         │  • Cross-validate metrics        │                   │
│         │  • Generate health score         │                   │
│         │  • Detect anomalies              │                   │
│         └──────────────┬───────────────────┘                   │
└────────────────────────┼───────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Medical Knowledge Integration                       │
│                                                                  │
│  ┌──────────────────┐    ┌─────────────────────────────┐       │
│  │ 3D Anatomy Link  │    │  Symptom → Condition Map    │       │
│  │                  │    │                             │       │
│  │ Low SpO2 →       │    │  Pallor + Low HR →          │       │
│  │ Show lungs/heart │    │  "Possible anemia"          │       │
│  │                  │    │  → Show blood/bone marrow   │       │
│  │ Jaundice →       │    │                             │       │
│  │ Show liver       │    │  Pupil asymmetry →          │       │
│  │                  │    │  "Neurological concern"     │       │
│  └──────────────────┘    │  → Show brain               │       │
│                          └─────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Complete Health Indicators List

### 1. Cardiovascular (6 metrics)

| Metric | Normal Range | Detection Method | Clinical Significance |
|--------|--------------|------------------|----------------------|
| **Heart Rate** | 60-100 BPM | rPPG (skin color changes) | Tachycardia, bradycardia, arrhythmia |
| **HRV (RMSSD)** | >30 ms | Inter-beat intervals | Stress, autonomic dysfunction |
| **Respiration Rate** | 12-20 breaths/min | Facial/chest motion | Respiratory distress, anxiety |
| **SpO2** | 95-100% | rPPG wavelength analysis | Hypoxia, lung disease |
| **Blood Pressure** | 120/80 mmHg | Pulse wave analysis | Hypertension screening |
| **Pulse Wave Velocity** | <10 m/s | rPPG timing | Arterial stiffness, CVD risk |

**Models:**
- PhysNet (HR, rPPG)
- MTTS-CAN (HR, RR)
- VitalCam (SpO2, BP estimation)
- HeartPy (HRV analysis)

---

### 2. Hematology (3 metrics)

| Metric | Normal Range | Detection | Indicates |
|--------|--------------|-----------|-----------|
| **Hemoglobin** | 12-18 g/dL | Conjunctiva color | Anemia, blood disorders |
| **Pallor Index** | Normalized 0-1 | Facial skin color | Acute blood loss, chronic anemia |
| **Cyanosis** | Binary (Y/N) | Lip/nail bed blue tint | Hypoxia, heart/lung failure |

**Models:**
- AnemiCheck (hemoglobin from conjunctiva)
- Custom CNN (skin color analysis)

---

### 3. Hepatology (1 metric)

| Metric | Normal Range | Detection | Indicates |
|--------|--------------|-----------|-----------|
| **Jaundice (Bilirubin)** | <1.2 mg/dL | Sclera yellowness | Liver disease, hepatitis, gallstones |

**Models:**
- BiliScreen (University of Washington)

---

### 4. Ophthalmology (6 metrics)

| Metric | Normal | Detection | Clinical Use |
|--------|--------|-----------|--------------|
| **Pupil Size** | 2-4mm (light), 4-8mm (dark) | Iris segmentation | Neurological assessment |
| **Pupil Asymmetry** | <0.5mm difference | Bilateral comparison | Stroke, brain injury, Horner's |
| **Pupil Light Reflex** | Constricts in <1s | Temporal analysis | CN III palsy, brain death |
| **Sclera Redness** | White baseline | Color histogram | Conjunctivitis, uveitis, fatigue |
| **Blink Rate** | 15-20/min | Eyelid tracking | Parkinson's, dry eye, fatigue |
| **Eye Tracking** | Smooth pursuit | Gaze patterns | ADHD, autism, TBI |

**Models:**
- MediaPipe Face Mesh (iris landmarks)
- OpenEDS (eye disease screening)
- Pupil Labs (pupil detection)

---

### 5. Neurology (5 metrics)

| Metric | Normal | Detection | Indicates |
|--------|--------|-----------|-----------|
| **Facial Asymmetry** | <5% difference | Landmark symmetry | Stroke, Bell's palsy, TIA |
| **Tremor Frequency** | None | Motion spectrum analysis | Parkinson's, essential tremor |
| **Micro-expressions** | Baseline | Subtle Action Units | Pain, stress, deception |
| **Coordination** | Smooth movements | Pose estimation tests | Cerebellar dysfunction |
| **Cognitive Load** | Baseline pupil | Dilation patterns | Mental fatigue, stress |

**Models:**
- MediaPipe Face Mesh (asymmetry)
- OpenFace (Action Units)
- Pose estimation (coordination)

---

### 6. Mental Health (4 metrics)

| Metric | Range | Detection | Correlates With |
|--------|-------|-----------|-----------------|
| **Stress Index** | 0-100 | HRV + facial tension | Anxiety, burnout |
| **Fatigue Level** | 0-10 | Eye closure, blink | Sleep deprivation, chronic fatigue |
| **Pain Score** | 0-10 | Facial Action Units | Acute/chronic pain |
| **Depression Markers** | Binary screening | Facial affect, eye contact | Clinical depression |

**Models:**
- EmoPain (pain from expressions)
- DepressionNet (affect analysis)
- Driver drowsiness models (fatigue)

---

### 7. Dermatology (3 metrics)

| Metric | Detection | Use Case |
|--------|-----------|----------|
| **Inflammation** | Erythema detection | Infection, allergic reaction |
| **Skin Temperature** | Thermal gradient (if IR) | Fever, inflammation |
| **Lesion Detection** | Segmentation | Skin cancer screening (future) |

---

## Implementation Stack

### Backend Services Structure

```
backend/
├── video/
│   ├── video-health-service.ts         # Existing CAIRE integration
│   ├── comprehensive-analyzer.ts       # NEW: Multi-modal analysis
│   ├── analyzers/
│   │   ├── vital-signs.py             # PhysNet, MTTS-CAN
│   │   ├── eye-analysis.py            # MediaPipe, pupil detection
│   │   ├── skin-analysis.py           # AnemiCheck, BiliScreen
│   │   ├── neuro-assessment.py        # Facial asymmetry, tremor
│   │   └── mental-health.py           # Stress, fatigue, pain
│   ├── fusion/
│   │   └── multi-modal-fusion.ts      # Combine all indicators
│   └── models/                        # Pretrained model weights
│       ├── physnet.pth
│       ├── mediapipe/
│       └── anemicheck/
```

### Python Microservices (Run alongside Node.js)

```python
# backend/video/analyzers/comprehensive_analyzer.py

import mediapipe as mp
import cv2
import numpy as np
from typing import Dict, Any

class ComprehensiveHealthAnalyzer:
    """
    Multi-modal health analysis from facial video.
    Runs all pretrained models in parallel.
    """

    def __init__(self):
        # Initialize all models
        self.vital_signs = VitalSignsAnalyzer()
        self.eye_analyzer = EyeHealthAnalyzer()
        self.skin_analyzer = SkinColorAnalyzer()
        self.neuro_analyzer = NeuroAssessment()
        self.mental_analyzer = MentalHealthAnalyzer()

    async def analyze_frame_batch(self, frames: list) -> Dict[str, Any]:
        """
        Analyze a batch of frames (10 seconds @ 30 FPS = 300 frames)
        Returns all health indicators.
        """
        results = {}

        # 1. Vital Signs (rPPG-based)
        vitals = await self.vital_signs.analyze(frames)
        results['heart_rate'] = vitals.hr
        results['respiration_rate'] = vitals.rr
        results['spo2'] = vitals.spo2
        results['hrv'] = vitals.hrv
        results['blood_pressure_est'] = vitals.bp

        # 2. Eye Analysis (single frame or temporal)
        eyes = await self.eye_analyzer.analyze(frames[-1])  # Latest frame
        results['pupil_size_left'] = eyes.left_pupil.diameter
        results['pupil_size_right'] = eyes.right_pupil.diameter
        results['pupil_asymmetry'] = abs(eyes.left_pupil.diameter - eyes.right_pupil.diameter)
        results['sclera_redness'] = eyes.redness_score
        results['blink_rate'] = eyes.blink_rate
        results['jaundice_detected'] = eyes.jaundice_score > 0.3

        # 3. Skin Analysis
        skin = await self.skin_analyzer.analyze(frames[-1])
        results['hemoglobin_gdl'] = skin.hemoglobin
        results['pallor_detected'] = skin.pallor_score > 0.5
        results['cyanosis_detected'] = skin.cyanosis_score > 0.5
        results['skin_temperature'] = skin.temperature_est

        # 4. Neurological
        neuro = await self.neuro_analyzer.analyze(frames)
        results['facial_asymmetry'] = neuro.asymmetry_percent
        results['tremor_detected'] = neuro.tremor_frequency > 0
        results['tremor_frequency'] = neuro.tremor_frequency

        # 5. Mental Health
        mental = await self.mental_analyzer.analyze(frames)
        results['stress_level'] = mental.stress_index  # 0-100
        results['fatigue_level'] = mental.fatigue_score  # 0-10
        results['pain_score'] = mental.pain_score  # 0-10

        # 6. Quality Metrics
        results['confidence'] = self.calculate_confidence(results)
        results['warnings'] = self.generate_warnings(results)

        return results
```

---

## Medical Knowledge Integration

### Symptom → Anatomy Mapping

```typescript
// backend/medical/symptom-anatomy-map.ts

export const SYMPTOM_ANATOMY_MAP = {
  // Cardiovascular
  low_heart_rate: {
    anatomyTarget: 'heart',
    viewpoint: 'anterior_thorax',
    education: 'Bradycardia: Heart beating slower than 60 BPM. May indicate athletic heart, hypothyroidism, or heart block.',
    voicePrompt: 'Your heart rate is low. Let me show you the cardiac conduction system.',
  },

  high_heart_rate: {
    anatomyTarget: 'heart',
    viewpoint: 'heart_internal',
    education: 'Tachycardia: Heart rate over 100 BPM. Could be anxiety, dehydration, fever, or cardiac arrhythmia.',
    voicePrompt: 'Elevated heart rate detected. Here\'s your heart and what might cause this.',
  },

  // Respiratory
  low_spo2: {
    anatomyTarget: 'lungs',
    viewpoint: 'respiratory_system',
    education: 'Low oxygen saturation (<95%). May indicate pneumonia, COPD, pulmonary embolism, or COVID-19.',
    voicePrompt: 'Your oxygen levels are low. Let me show you the respiratory system.',
  },

  // Hematology
  anemia_detected: {
    anatomyTarget: ['blood_vessels', 'bone_marrow'],
    viewpoint: 'skeletal_system',
    education: 'Anemia: Low hemoglobin (<12 g/dL). Red blood cells carry oxygen. Common causes: iron deficiency, B12 deficiency, chronic disease.',
    voicePrompt: 'Signs of anemia detected. Here\'s where red blood cells are made.',
  },

  // Hepatology
  jaundice_detected: {
    anatomyTarget: 'liver',
    viewpoint: 'abdominal_organs',
    education: 'Jaundice: Yellow discoloration from high bilirubin. Liver processes bilirubin from old red blood cells. Causes: hepatitis, cirrhosis, bile duct obstruction.',
    voicePrompt: 'Jaundice detected in your eyes. Let me explain the liver and bile system.',
  },

  // Neurology
  facial_asymmetry: {
    anatomyTarget: 'brain',
    viewpoint: 'cranial_nerves',
    education: 'Facial asymmetry: May indicate stroke (F.A.S.T. protocol), Bell\'s palsy, or nerve damage. Seek immediate care if sudden onset.',
    voicePrompt: 'I\'m detecting facial asymmetry. This could be serious. Here\'s the facial nerve pathway.',
    urgent: true,
  },

  pupil_asymmetry: {
    anatomyTarget: 'brain',
    viewpoint: 'brain_cross_section',
    education: 'Unequal pupils (anisocoria): May be normal or indicate brain injury, stroke, or nerve damage. Seek care if accompanied by headache, vision changes, or confusion.',
    voicePrompt: 'Your pupils are different sizes. Let me show you the brain and optic nerves.',
    urgent: true,
  },
};
```

### Auto-Generated Health Report

```typescript
// backend/reports/health-report-generator.ts

export class HealthReportGenerator {
  generateReport(metrics: HealthMetrics): HealthReport {
    const findings: Finding[] = [];
    const anatomyTargets: string[] = [];

    // Analyze each metric
    if (metrics.heart_rate < 60) {
      findings.push({
        severity: 'warning',
        category: 'Cardiovascular',
        finding: 'Bradycardia (low heart rate)',
        value: `${metrics.heart_rate} BPM`,
        normal: '60-100 BPM',
        explanation: SYMPTOM_ANATOMY_MAP.low_heart_rate.education,
        anatomyLink: 'heart',
      });
      anatomyTargets.push('heart');
    }

    if (metrics.hemoglobin_gdl < 12) {
      findings.push({
        severity: 'moderate',
        category: 'Hematology',
        finding: 'Possible anemia',
        value: `${metrics.hemoglobin_gdl} g/dL`,
        normal: '12-18 g/dL',
        explanation: SYMPTOM_ANATOMY_MAP.anemia_detected.education,
        anatomyLink: 'bone_marrow',
      });
      anatomyTargets.push('bone_marrow');
    }

    // Check urgent conditions
    const urgentFindings = findings.filter(f => f.severity === 'urgent');

    return {
      timestamp: new Date(),
      overallScore: this.calculateHealthScore(metrics),
      findings,
      anatomyTargets,
      recommendations: this.generateRecommendations(findings),
      urgentAlert: urgentFindings.length > 0,
      voiceNarration: this.generateVoiceScript(findings),
    };
  }
}
```

---

## Frontend Integration

### Enhanced VideoAnalysis Component

```tsx
// frontend/src/components/ComprehensiveVideoAnalysis.tsx

export const ComprehensiveVideoAnalysis: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [anatomyTarget, setAnatomyTarget] = useState<string | null>(null);

  const handleMetricsUpdate = (data: HealthMetrics) => {
    setMetrics(data);

    // Auto-navigate to relevant anatomy if abnormal finding
    if (data.jaundice_detected) {
      setAnatomyTarget('liver');
      showEducationalContent('jaundice');
    }
  };

  return (
    <div className="comprehensive-analysis">
      {/* Video Feed */}
      <VideoCapture onMetricsUpdate={handleMetricsUpdate} />

      {/* Real-time Metrics Dashboard */}
      <MetricsPanel>
        <VitalSignsCard metrics={metrics} />
        <EyeHealthCard metrics={metrics} />
        <SkinAnalysisCard metrics={metrics} />
        <NeuroAssessmentCard metrics={metrics} />
        <MentalHealthCard metrics={metrics} />
      </MetricsPanel>

      {/* 3D Anatomy Integration */}
      {anatomyTarget && (
        <AnatomyViewer target={anatomyTarget} autoExplain={true} />
      )}

      {/* Health Report */}
      <HealthReport metrics={metrics} />
    </div>
  );
};
```

---

## Pretrained Model Integration Guide

### Quick Setup (Docker-based Python Service)

```dockerfile
# backend/video/Dockerfile.analyzer

FROM python:3.10-slim

RUN pip install \
    mediapipe \
    opencv-python \
    numpy \
    torch torchvision \
    heartpy \
    neurokit2 \
    fastapi uvicorn

COPY analyzers/ /app/analyzers/
COPY models/ /app/models/

WORKDIR /app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```python
# backend/video/analyzers/main.py (FastAPI service)

from fastapi import FastAPI, File, UploadFile
from typing import List
import cv2
import numpy as np

app = FastAPI()

analyzer = ComprehensiveHealthAnalyzer()

@app.post("/analyze")
async def analyze_video(frames: List[UploadFile]):
    """
    Endpoint for comprehensive health analysis.
    Receives video frames, returns all metrics.
    """
    # Decode frames
    frame_arrays = [decode_frame(f) for f in frames]

    # Run analysis
    results = await analyzer.analyze_frame_batch(frame_arrays)

    return results
```

### Node.js → Python Communication

```typescript
// backend/video/python-analyzer-client.ts

import axios from 'axios';

export class PythonAnalyzerClient {
  private baseUrl = 'http://localhost:8000';

  async analyzeFrames(frames: Buffer[]): Promise<HealthMetrics> {
    const formData = new FormData();
    frames.forEach((frame, i) => {
      formData.append('frames', frame, `frame_${i}.jpg`);
    });

    const response = await axios.post(`${this.baseUrl}/analyze`, formData);
    return response.data;
  }
}
```

---

## Implementation Phases

### **Phase 3A: Core Vital Signs** (Already Done ✅)
- Heart rate (CAIRE API)
- Basic UI

### **Phase 3B: Eye Analysis** (1 week)
- MediaPipe Face Mesh integration
- Pupil size, redness, jaundice detection
- Blink rate analysis

### **Phase 3C: Skin Analysis** (1 week)
- Hemoglobin estimation (AnemiCheck)
- Pallor/cyanosis detection
- Color-based screening

### **Phase 3D: Neurological** (1 week)
- Facial asymmetry detection
- Tremor analysis
- Coordination tests (interactive)

### **Phase 3E: Mental Health** (1 week)
- HRV-based stress
- Fatigue detection
- Pain scoring

### **Phase 3F: Medical Integration** (1 week)
- Symptom → Anatomy mapping
- Auto-navigation to affected organs
- Voice education on findings
- Health report generation

---

## Medical Disclaimer & Safety

```typescript
// Display prominently in UI
const MEDICAL_DISCLAIMER = `
⚠️ IMPORTANT MEDICAL DISCLAIMER

This tool is for educational and screening purposes only.
It is NOT a substitute for professional medical diagnosis.

DO NOT use for:
- Emergency medical decisions
- Diagnosis of serious conditions
- Treatment planning

SEEK IMMEDIATE MEDICAL CARE if you experience:
- Chest pain or pressure
- Difficulty breathing
- Sudden facial drooping or weakness
- Severe headache
- Confusion or loss of consciousness

Always consult a healthcare provider for medical advice.
`;
```

---

## Next Steps

**Immediate (This Week):**
1. Set up Python FastAPI service with MediaPipe
2. Implement eye analysis (pupil, jaundice, redness)
3. Add metrics dashboard to UI

**Short Term (2-3 weeks):**
4. Integrate skin color analysis
5. Build symptom → anatomy mapping
6. Create health report generator

**Medium Term (1-2 months):**
7. Add neurological assessments
8. Mental health indicators
9. Historical tracking & trends
10. Multi-language support

Would you like me to:
1. **Start implementing eye analysis** with MediaPipe right now?
2. **Set up the Python FastAPI service** for multi-modal analysis?
3. **Create the symptom → anatomy mapping** system first?

Let me know which component you want to tackle first!
