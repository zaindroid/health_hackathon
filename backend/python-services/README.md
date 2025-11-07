# Medical Video Analysis Service

Python FastAPI service for real-time face mesh analysis, eye health assessment, and first aid screening.

## Features

- **Face Mesh Analysis** (MediaPipe - 478 landmarks)
- **Eye Health Metrics:**
  - Pupil size and asymmetry (neurological indicators)
  - Jaundice detection (liver disease)
  - Sclera redness (fatigue, infection)
  - Blink rate analysis
- **First Aid Assessment:**
  - Facial asymmetry (stroke detection - FAST protocol)
  - Pallor detection (shock, blood loss, anemia)
  - Cyanosis (blue lips - hypoxia)
  - Consciousness indicators
- **3D Anatomy Integration** - Auto-navigation to affected organs
- **Voice Guidance** - Educational explanations

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Build
docker build -t medical-analyzer .

# Run
docker run -p 8000:8000 medical-analyzer

# Test
curl http://localhost:8000/
```

### Option 2: Local Python

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### `POST /analyze`

Analyze a single video frame.

**Request:**
```json
{
  "image_data": "base64_encoded_image"
}
```

**Response:**
```json
{
  "success": true,
  "face_detected": true,
  "landmarks": [...],  // 478 facial landmarks
  "eye_metrics": {
    "pupil_diameter_left": 4.2,
    "pupil_diameter_right": 4.0,
    "pupil_asymmetry": 0.2,
    "pupil_asymmetry_alert": false,
    "jaundice_score": 0.1,
    "jaundice_detected": false,
    "blink_rate": 16.5
  },
  "first_aid": {
    "facial_asymmetry": 0.05,
    "stroke_risk": "normal",
    "stroke_alert": false,
    "pallor_score": 0.3,
    "cyanosis_detected": false,
    "urgent_findings": []
  },
  "quality_score": 0.85,
  "warnings": [],
  "anatomy_targets": [],  // 3D models to show
  "voice_guidance": "Your facial scan looks normal..."
}
```

### `POST /reset`

Reset analyzer state (clears history).

## Integration with Frontend

```typescript
// React component
const response = await fetch('http://localhost:8000/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image_data: base64Image })
});

const result = await response.json();

// Handle urgent findings
if (result.first_aid.urgent_findings.length > 0) {
  alert('⚠️ MEDICAL ALERT: ' + result.first_aid.urgent_findings.join(', '));
}

// Navigate to 3D anatomy
if (result.anatomy_targets.length > 0) {
  navigate3DModel(result.anatomy_targets[0]);
}

// Trigger voice explanation
if (result.voice_guidance) {
  speakText(result.voice_guidance);
}
```

## Medical Disclaimer

⚠️ **IMPORTANT:** This tool is for educational and screening purposes only.

**DO NOT use for:**
- Emergency medical decisions
- Diagnosis of serious conditions
- Treatment planning

**SEEK IMMEDIATE MEDICAL CARE for:**
- Sudden facial drooping or weakness
- Unequal pupils with headache or confusion
- Blue lips or severe difficulty breathing
- Severe pallor with dizziness or chest pain

Always consult a healthcare provider for medical advice.

## Alert Thresholds

| Metric | Normal | Warning | Emergency |
|--------|--------|---------|-----------|
| **Pupil Asymmetry** | <0.5mm | 0.5-1.5mm | >1.5mm |
| **Facial Asymmetry** | <5% | 5-15% | >15% |
| **Jaundice Score** | <0.3 | 0.3-0.5 | >0.5 |
| **Pallor Score** | <0.5 | 0.5-0.7 | >0.7 |
| **Cyanosis** | Absent | - | Present |

## FAST Protocol (Stroke Detection)

**F**ace - Facial asymmetry (one side drooping)
**A**rm - Arm weakness (one arm drifts down)
**S**peech - Speech difficulty (slurred or absent)
**T**ime - Time to call 911 (emergency!)

This service detects the **F** (Face) component automatically.

## Technical Architecture

```
Video Frame (Base64)
        ↓
MediaPipe Face Mesh (478 landmarks)
        ↓
    ┌───────┴───────┐
    ↓               ↓
Eye Analysis    First Aid
  • Pupils        • Asymmetry
  • Jaundice      • Pallor
  • Redness       • Cyanosis
  • Blinks        • Consciousness
    ↓               ↓
    └───────┬───────┘
            ↓
   Medical Assessment
            ↓
   ┌────────┴────────┐
   ↓                 ↓
3D Anatomy    Voice Guidance
Navigation    (Educational)
```

## Development

### Add New Analysis

1. Create analyzer in `analyzers/` directory
2. Add to `main.py` imports
3. Update response models
4. Test with sample images

### Run Tests

```bash
pytest tests/
```

### Performance

- Frame processing: ~50-100ms (CPU)
- Frame processing: ~10-20ms (GPU)
- Recommended: 10 FPS for real-time analysis

## Dependencies

- **mediapipe** - Face mesh detection (Google)
- **opencv-python** - Image processing
- **fastapi** - Web framework
- **numpy** - Numerical operations
- **scipy** - Signal processing

## License

MIT License - Educational and research use only.

## Support

For issues or questions, see main project README.
