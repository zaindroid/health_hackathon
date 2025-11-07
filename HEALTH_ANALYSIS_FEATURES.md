# Health Analysis Features - Detailed Guide

## Overview

The Healthy Hack project includes three distinct health monitoring and analysis systems:

1. **Medical Face Scanner** - Real-time eye and first aid assessment via face mesh
2. **Video Health Monitor** - Heart rate extraction via CAIRE API
3. **Voice Health Agent** - Educational voice interaction about medical topics

---

## 1. Medical Face Scanner (Python FastAPI)

### Location
- **Main API**: `/backend/python-services/main.py`
- **Analyzer**: `/backend/python-services/analyzers/face_mesh_analyzer.py`
- **Dependencies**: MediaPipe, OpenCV, NumPy, scipy

### Purpose
Real-time analysis of facial features to detect:
- Eye health indicators
- First aid emergency signs
- Medical condition screening

### How It Works

```
Video Frame (JPEG)
        ↓
MediaPipe Face Mesh (478 landmarks)
        ↓
    ┌───┴───┐
    ↓       ↓
EYE ANALYSIS        FIRST AID ASSESSMENT
├─ Pupils           ├─ Facial Asymmetry (Stroke)
├─ Jaundice         ├─ Pallor (Shock/Anemia)
├─ Redness          ├─ Cyanosis (Hypoxia)
├─ Blink Rate       └─ Consciousness Checks
└─ Asymmetry
    ↓       ↓
    └───┬───┘
        ↓
  RESPONSE WITH:
  • 478 landmarks
  • Eye metrics
  • First aid alerts
  • Anatomy targets
  • Voice guidance
```

### API Endpoint: POST /analyze

#### Input
```json
{
  "image_data": "base64_encoded_jpeg_image"
}
```

#### Output
```json
{
  "success": true,
  "face_detected": true,
  "landmarks": [
    {"x": 100, "y": 150, "z": 5},
    ...  // 478 total landmarks
  ],
  "eye_metrics": {
    "pupil_diameter_left": 4.2,
    "pupil_diameter_right": 4.0,
    "pupil_asymmetry": 0.2,
    "pupil_asymmetry_alert": false,
    "sclera_redness_left": 0.15,
    "sclera_redness_right": 0.12,
    "jaundice_score": 0.08,
    "jaundice_detected": false,
    "blink_detected": false,
    "blink_rate": 16.5
  },
  "first_aid": {
    "facial_asymmetry": 0.05,
    "stroke_risk": "normal",
    "stroke_alert": false,
    "pallor_score": 0.3,
    "pallor_alert": false,
    "cyanosis_detected": false,
    "cyanosis_alert": false,
    "respiratory_rate": null,
    "consciousness_indicators": {
      "eyes_open": true,
      "face_tracking": true,
      "blink_response": true
    },
    "urgent_findings": []
  },
  "quality_score": 0.87,
  "warnings": [],
  "anatomy_targets": [],
  "voice_guidance": "Your facial scan looks normal. All metrics within expected ranges."
}
```

---

## 2. Eye Health Metrics

### Eye Metrics Analysis

#### Pupil Diameter & Asymmetry
- **What It Measures**: Size of pupil in each eye
- **Normal Range**: 2-8 mm depending on lighting
- **Clinical Significance**:
  - Asymmetry > 1.5 mm = EMERGENCY (neurological issue, possible stroke)
  - Unequal pupils = potential brain damage or spinal injury

**Implementation** (`face_mesh_analyzer.py:185-205`):
```python
def _calculate_pupil_diameter(self, landmarks, iris_indices, eye_outer):
    """Calculate pupil diameter in mm (estimated)"""
    # Uses MediaPipe iris landmarks
    # Calibrates against standard iris size (11.7mm)
    # Estimates pupil as 60% of iris
    return pupil_diameter_mm
```

#### Sclera (Eye White) Redness
- **What It Measures**: Red tint in eye whites
- **Scale**: 0.0 (white) to 1.0 (fully red)
- **Clinical Significance**:
  - > 0.5 = Eye irritation, fatigue, or infection
  - Indicates inflammation

**Implementation** (`face_mesh_analyzer.py:207-232`):
```python
def _analyze_sclera_redness(self, frame, landmarks, sclera_indices):
    """Analyze redness of eye whites (0-1 scale)"""
    # Extracts sclera region using face mesh
    # Analyzes red channel dominance
    # Red > Green indicates redness
```

#### Jaundice Detection
- **What It Measures**: Yellow tint in eye whites
- **Scale**: 0.0 (white) to 1.0 (very yellow)
- **Clinical Significance**:
  - > 0.3 = Jaundice detected (liver disease concern)
  - > 0.5 = EMERGENCY (severe liver dysfunction)

**Implementation** (`face_mesh_analyzer.py:234-266`):
```python
def _detect_jaundice(self, frame, landmarks, left_sclera, right_sclera):
    """Detect jaundice (yellow sclera) - liver disease indicator"""
    # Converts to LAB color space (better for yellow detection)
    # Analyzes 'b' channel (blue-yellow axis)
    # High 'b' value = yellow/jaundice
```

#### Blink Rate
- **What It Measures**: Frequency of eye blinks
- **Normal Range**: 12-20 blinks per minute at rest
- **Clinical Significance**:
  - High rate (> 26) = Stress, anxiety, nervousness
  - Low rate (< 8) = Concentration, neurological issues, Parkinson's
  - No blink = Unconsciousness

**Implementation** (`face_mesh_analyzer.py:268-285`):
```python
def _detect_blink(self, landmarks):
    """Detect if eyes are blinking (closed)"""
    # Uses eye aspect ratio (EAR) method
    # Measures vertical distance between eyelids
    # Threshold < 5 pixels = blink detected
    
def get_blink_rate(self):
    """Calculate blinks per minute from history"""
    # Tracks blink history (up to 900 frames = 30 seconds at 30 FPS)
    # Detects transitions from open to closed
```

---

## 3. First Aid Assessment

### FAST Protocol - Stroke Detection

The system implements the FAST protocol for detecting stroke:
- **F**ace - Facial drooping (asymmetry)
- **A**rm - Arm weakness (not detected)
- **S**peech - Speech difficulty (not detected)
- **T**ime - Time to call 911

#### Facial Asymmetry
- **What It Measures**: Difference between left and right face halves
- **Calculated As**: Distance ratio of facial features from center
- **Alert Thresholds**:
  - Normal: < 0.05 (5% difference)
  - Warning: 0.05-0.15 (5-15% difference)
  - EMERGENCY: > 0.15 (>15% difference)

**Implementation** (`face_mesh_analyzer.py:340-363`):
```python
def _calculate_facial_asymmetry(self, landmarks):
    """Calculate facial asymmetry (stroke indicator)"""
    # Compares left cheek vs right cheek
    # Compares left mouth corner vs right mouth corner
    # Calculates distance from face center (nose)
    # Returns asymmetry ratio
```

### Shock & Circulatory Assessment

#### Pallor (Paleness)
- **What It Measures**: Loss of normal skin color
- **Clinical Significance**:
  - Indicates blood loss, anemia, or shock
  - > 0.6 = Warning (possible anemia)
  - > 0.7 = URGENT (possible shock/blood loss)

**Implementation** (`face_mesh_analyzer.py:365-394`):
```python
def _detect_pallor(self, frame, landmarks):
    """Detect pallor (paleness) - blood loss/shock indicator"""
    # Extracts face region using face oval landmarks
    # Converts to LAB color space
    # Analyzes 'a' channel (red-green axis)
    # Low 'a' value with high 'L' = pale
```

### Respiratory & Hypoxia Assessment

#### Cyanosis (Blue Lips)
- **What It Measures**: Blue tint to lips and extremities
- **Clinical Significance**:
  - Indicates hypoxia (low oxygen)
  - URGENT/EMERGENCY (respiratory or cardiac failure)
  - Requires immediate medical attention

**Implementation** (`face_mesh_analyzer.py:396-423`):
```python
def _detect_cyanosis(self, frame, landmarks):
    """Detect cyanosis (blue lips) - hypoxia indicator"""
    # Extracts lip region using mouth landmarks
    # Analyzes blue channel dominance
    # Blue > Red indicates cyanosis
```

### Consciousness Indicators
```python
consciousness_indicators = {
    'eyes_open': not eye_metrics.blink_detected,
    'face_tracking': True,  # If face detected, person is present
    'blink_response': len(blink_history) > 0 and any(blink_history)
}
```

---

## 4. Alert System

### Alert Levels
```python
class AlertLevel(Enum):
    NORMAL = "normal"          # No issues
    WARNING = "warning"        # Monitor condition
    URGENT = "urgent"          # Seek medical advice
    EMERGENCY = "emergency"    # Call 911 immediately
```

### Urgent Findings
The system generates automatic alerts for critical conditions:
```python
urgent_findings = []

if stroke_risk in [AlertLevel.EMERGENCY, AlertLevel.URGENT]:
    urgent_findings.append("⚠️ FACIAL ASYMMETRY - Possible stroke - Call 911")

if pupil_asymmetry > 1.5:
    urgent_findings.append("⚠️ UNEQUAL PUPILS - Neurological emergency")

if cyanosis_detected:
    urgent_findings.append("⚠️ CYANOSIS (Blue lips) - Low oxygen - Seek immediate care")

if pallor > 0.7:
    urgent_findings.append("⚠️ SEVERE PALLOR - Possible shock/blood loss")

if jaundice_score > 0.5:
    urgent_findings.append("⚠️ JAUNDICE - Liver concern - See doctor")
```

### Alert Thresholds Summary

| Metric | Normal | Warning | Urgent | Emergency |
|--------|--------|---------|--------|-----------|
| **Pupil Asymmetry** | <0.5mm | 0.5-1.5mm | - | >1.5mm |
| **Facial Asymmetry** | <5% | 5-15% | - | >15% |
| **Jaundice Score** | <0.3 | 0.3-0.5 | - | >0.5 |
| **Pallor Score** | <0.5 | 0.5-0.7 | >0.7 | - |
| **Cyanosis** | Absent | - | Present | - |
| **Sclera Redness** | <0.3 | 0.3-0.5 | >0.5 | - |

---

## 5. 3D Anatomy Auto-Navigation

Based on findings, the system automatically suggests 3D anatomy models to display:

```python
def generate_anatomy_targets(eye_metrics, first_aid) -> List[str]:
    targets = []
    
    if first_aid.stroke_alert:
        targets.append("brain")
        targets.append("cranial_nerves")
    
    if eye_metrics.pupil_asymmetry_alert:
        targets.append("brain")
        targets.append("optic_nerve")
    
    if eye_metrics.jaundice_detected:
        targets.append("liver")
        targets.append("biliary_system")
    
    if first_aid.pallor_alert:
        targets.append("heart")
        targets.append("blood_vessels")
    
    if first_aid.cyanosis_alert:
        targets.append("lungs")
        targets.append("heart")
    
    return targets
```

---

## 6. Voice Guidance Generation

The system generates educational voice guidance based on findings:

```python
def generate_voice_guidance(eye_metrics, first_aid, warnings) -> str:
    guidance_parts = []
    
    # Urgent findings first
    if first_aid.urgent_findings:
        urgent_text = " ".join(first_aid.urgent_findings[:2])
        guidance_parts.append(urgent_text)
    
    # Eye findings
    if eye_metrics.pupil_asymmetry > 1.5:
        guidance_parts.append(
            "I'm detecting unequal pupil sizes. This can indicate a "
            "neurological issue. Let me show you the brain and optic nerve pathways."
        )
    elif eye_metrics.jaundice_detected:
        guidance_parts.append(
            "Your eyes show signs of jaundice, which may indicate liver function "
            "concerns. Here's the liver and how it processes bilirubin."
        )
    
    # First aid findings
    if first_aid.facial_asymmetry > 0.15:
        guidance_parts.append(
            "I'm detecting facial asymmetry. If this is sudden, it could be a stroke. "
            "Remember FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 911."
        )
    
    if first_aid.cyanosis_detected:
        guidance_parts.append(
            "Your lips appear blue, indicating low oxygen levels. "
            "This requires immediate medical attention."
        )
    
    # Normal case
    if not guidance_parts:
        guidance_parts.append("Your facial scan looks normal. All metrics within expected ranges.")
    
    return " ".join(guidance_parts)
```

---

## 7. Video Health Monitoring (CAIRE API)

### Location
- **Handler**: `/backend/routes/video-health.ts`
- **Service**: `/backend/video/video-health-service.ts`

### Purpose
Real-time heart rate extraction from video using remote photoplethysmography (rPPG)

### How It Works

```
Video Frames (Continuous)
        ↓
VideoHealthHandler
        ↓
CAIRE API (External Service)
        ↓
Signal Processing
        ↓
Heart Rate Extraction
        ↓
rPPG Signal Visualization
```

### CAIRE API Integration

**WebSocket Connection**:
```
ws://3.67.186.245:8003/ws/?api_key=YOUR_KEY
```

**Frame Submission**:
```json
{
  "datapt_id": "session-uuid",
  "state": "stream",
  "frame_data": "base64_jpeg",
  "timestamp": "1234567890.123",
  "advanced": true
}
```

**Response**:
```json
{
  "state": "ok",
  "socket_id": "...",
  "datapt_id": "...",
  "inference": {
    "hr": 72  // Heart rate in BPM
  },
  "advanced": {
    "rppg": [0.5, 0.51, 0.52, ...],
    "rppg_timestamps": [1234567890.1, 1234567890.2, ...]
  },
  "model_version": "1.0"
}
```

### Implementation Details

**Connection** (`video-health-service.ts:31-72`):
```typescript
async connect(): Promise<void> {
  // Build WebSocket URL with API key
  const url = new URL(this.config.wsUrl);
  url.searchParams.set('api_key', this.config.apiKey);
  
  // Connect and set up event handlers
  this.ws = new WebSocket(url.toString());
  
  this.ws.on('open', () => {
    this.isConnected = true;
    this.sessionId = uuidv4();
    resolve();
  });
}
```

**Frame Sending** (`video-health-service.ts:99-113`):
```typescript
async sendFrame(frameData: string, timestamp?: number): Promise<void> {
  const payload = {
    datapt_id: this.sessionId,
    state: 'stream',
    frame_data: frameData,  // base64 JPEG
    timestamp: timestamp.toString(),
    advanced: true  // Enable rPPG signals
  };
  
  this.ws.send(JSON.stringify(payload));
}
```

**Metrics Callback** (`video-health-service.ts:118-126`):
```typescript
onMetrics(callback): void {
  const id = uuidv4();
  this.messageHandlers.set(id, callback);
  
  // Return unsubscribe function
  return () => {
    this.messageHandlers.delete(id);
  };
}
```

---

## 8. Frontend Integration

### useMedicalScanner Hook

**Location**: `/frontend/src/hooks/useMedicalScanner.ts`

**Function**:
```typescript
const { analyzeFrame } = useMedicalScanner();

// Capture frame and analyze
await analyzeFrame(base64ImageData);
```

**Returns**:
```typescript
{
  faceDetected: boolean
  eyeMetrics: EyeMetrics | null
  firstAid: FirstAidAssessment | null
  landmarks: LandmarkPoint[]
  quality: number | null
  warnings: string[]
  anatomyTargets: string[]
  voiceGuidance: string | null
  isAnalyzing: boolean
  error: string | null
}
```

### MedicalScanner Component

**Location**: `/frontend/src/components/MedicalScanner.tsx`

**Features**:
- Real-time webcam access
- Frame capture and analysis
- Face mesh overlay visualization
- Alert display
- 3D anatomy navigation triggers

---

## 9. Performance Considerations

### Processing Speed
- **CPU**: 50-100ms per frame
- **GPU**: 10-20ms per frame
- **Recommended**: 10 FPS for real-time analysis

### Frame Format
- Input: Base64-encoded JPEG
- Quality: 720p or higher recommended
- Lighting: Well-lit, front-facing

### Memory
- MediaPipe Face Mesh: ~200MB
- Per-frame processing: ~20-50MB temporary

---

## 10. Medical Disclaimer

WARNING: This tool is for **educational purposes only** and should NOT be used for:
- Emergency medical decisions
- Diagnosis of serious conditions
- Treatment planning
- Replacement of professional medical advice

**SEEK IMMEDIATE EMERGENCY CARE** for:
- Sudden facial drooping or weakness
- Unequal pupils with headache or confusion
- Blue lips or severe difficulty breathing
- Severe paleness with dizziness or chest pain
- Any neurological emergency symptoms

Always consult a healthcare provider for medical advice.

---

## 11. Key Methods Reference

### face_mesh_analyzer.py

| Method | Purpose | Returns |
|--------|---------|---------|
| `analyze(frame)` | Main analysis | FaceMeshData |
| `_extract_landmarks()` | Get 478 points | List[Tuple] |
| `_analyze_eyes()` | Eye metrics | EyeMetrics |
| `_assess_first_aid()` | First aid check | FirstAidAssessment |
| `_calculate_facial_asymmetry()` | Stroke detection | float |
| `_detect_jaundice()` | Yellow eyes | float |
| `_detect_pallor()` | Pale face | float |
| `_detect_cyanosis()` | Blue lips | bool |
| `_calculate_quality()` | Image quality | float |
| `_generate_warnings()` | User warnings | List[str] |
| `get_blink_rate()` | Blinks/minute | float |

---

## 12. Testing the Health Analysis

### Manual Testing

```bash
# 1. Start Python service
cd backend/python-services
source venv/bin/activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 2. Capture test image (requires setup)
# Save as base64 or use existing image

# 3. Test endpoint
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_data": "YOUR_BASE64_JPEG"}'

# 4. Check response for:
# - face_detected: true
# - landmarks array length: 478
# - eye_metrics populated
# - first_aid assessment
# - quality_score > 0.7
# - anatomy_targets array
# - voice_guidance text
```

### Frontend Testing
1. Navigate to Medical Scanner component
2. Grant webcam permission
3. Click "Start Scanning"
4. Face should be detected in 1-2 seconds
5. Overlay should appear with landmarks
6. Metrics should update in real-time

---

**End of Health Analysis Features**
