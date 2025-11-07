# Healthy Hack - Quick Reference Guide

## Key File Locations

### Node.js Backend (TypeScript)
- **Main Server**: `/backend/server.ts` - Express + WebSocket
- **Voice Handler**: `/backend/routes/voice.ts` - Audio, STT, LLM, TTS
- **Video Health**: `/backend/routes/video-health.ts` - CAIRE API integration
- **CAIRE Service**: `/backend/video/video-health-service.ts` - WebSocket client
- **Config**: `/backend/config/env.ts` - Environment variables

### Python Backend (FastAPI)
- **Medical Analyzer**: `/backend/python-services/main.py` - FastAPI endpoints
- **Face Analyzer**: `/backend/python-services/analyzers/face_mesh_analyzer.py` - MediaPipe
- **Requirements**: `/backend/python-services/requirements.txt`

### Frontend (React/Vite)
- **Medical Scanner Hook**: `/frontend/src/hooks/useMedicalScanner.ts` - Calls Python /analyze
- **Medical Scanner UI**: `/frontend/src/components/MedicalScanner.tsx` - Face mesh display

### Shared
- **Type Definitions**: `/shared/types.ts` - All interfaces

---

## Main Endpoints

### Node.js WebSocket (Port 3001)
```
ws://localhost:3001/voice           → Voice agent (STT → LLM → TTS)
ws://localhost:3001/video-health    → Heart rate monitoring (CAIRE)
```

### Node.js HTTP (Port 3001)
```
GET  /health                        → Health check
GET  /config                        → Config validation
POST /test/llm                      → Test LLM provider
```

### Python FastAPI (Port 8000)
```
POST /analyze                       → Analyze single frame
POST /analyze-batch                 → Analyze multiple frames
POST /reset                         → Reset analyzer state
```

---

## Data Flows

### 1. Voice Agent (Complete Pipeline)
```
User Mic → WebSocket /voice → Deepgram STT → LLM (Bedrock/OpenAI)
→ Optional RAG → Optional Tool/3D nav → Cartesia/WebSpeech TTS → Audio Response
```

### 2. Medical Scanner (Face Analysis)
```
User Webcam → Capture Frame → Base64 JPEG → POST /analyze (Python)
→ MediaPipe Face Mesh (478 landmarks) → Eye analysis + First aid assessment
→ Return metrics + alerts → Display on frontend
```

### 3. Video Health (Heart Rate)
```
User Webcam → WebSocket /video-health → VideoHealthService → CAIRE API WebSocket
→ Heart Rate + rPPG signals → Return metrics
```

---

## Important Classes & Services

| Class | File | Purpose |
|-------|------|---------|
| `VoiceAgentServer` | server.ts | Main HTTP/WebSocket server |
| `VoiceSessionHandler` | routes/voice.ts | Voice interaction |
| `VideoHealthHandler` | routes/video-health.ts | Video heart rate |
| `VideoHealthService` | video/video-health-service.ts | CAIRE WebSocket client |
| `FaceMeshAnalyzer` | analyzers/face_mesh_analyzer.py | Medical face analysis |

---

## Starting the Project

### Terminal 1: Node.js Backend
```bash
cd /home/zainey/healthy_hack/backend
npm install
npm run dev
# Runs on :3001
```

### Terminal 2: Python Backend
```bash
cd /home/zainey/healthy_hack/backend/python-services
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Runs on :8000
```

### Terminal 3: Frontend (optional)
```bash
cd /home/zainey/healthy_hack/frontend
npm install
npm run dev
# Runs on :5173 (Vite default)
```

---

## Environment Variables (.env)

### Backend Node.js
```
LLM_PROVIDER=bedrock|openai|local|mock
BEDROCK_REGION=us-east-1
BEDROCK_MODEL=anthropic.claude-3-sonnet
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
CARTESIA_API_KEY=...
CAIRE_API_KEY=...
CAIRE_WS_URL=ws://3.67.186.245:8003/ws/
SERVER_HOST=0.0.0.0
SERVER_PORT=3001
CORS_ORIGINS=*
```

---

## Testing Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

### Config Validation
```bash
curl http://localhost:3001/config
```

### Medical Analysis (Python)
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_data": "base64_jpeg_string"}'
```

---

## /analyze Endpoint 500 Errors - Troubleshooting

**Issue**: Python service returns 500 error

**Common Causes**:
1. Python service not running on :8000
2. MediaPipe not installed or model not downloaded
3. Invalid base64 image data
4. CORS configuration issue

**Debug Steps**:
```bash
# 1. Check if service is running
curl http://localhost:8000/

# 2. Check if venv is activated
source /home/zainey/healthy_hack/backend/python-services/venv/bin/activate

# 3. Verify dependencies
pip install -r requirements.txt

# 4. Run with verbose logging
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level debug

# 5. Check for MediaPipe errors
python -c "import mediapipe; print('MediaPipe OK')"
```

---

## Medical Analysis Output Structure

### Eye Metrics
- `pupil_diameter_left/right`: Size in mm (normal: 2-8mm)
- `pupil_asymmetry`: Difference between pupils (normal: <0.5mm)
- `sclera_redness`: Eye white redness (0-1 scale)
- `jaundice_score`: Yellow sclera indicator (>0.3 = detected)
- `blink_rate`: Blinks per minute

### First Aid Assessment
- `facial_asymmetry`: Stroke indicator (>0.15 = EMERGENCY)
- `stroke_risk`: Alert level (normal/warning/urgent/emergency)
- `pallor_score`: Paleness (blood loss/shock)
- `cyanosis_detected`: Blue lips (hypoxia)
- `urgent_findings`: Array of critical alerts

### Anatomy Targets
Auto-suggested 3D organs: `brain`, `liver`, `heart`, `lungs`, etc.

---

## Alert Thresholds

| Metric | Normal | Alert |
|--------|--------|-------|
| Pupil Asymmetry | <0.5mm | >1.5mm = EMERGENCY |
| Facial Asymmetry | <5% | >15% = EMERGENCY |
| Jaundice Score | <0.3 | >0.5 = EMERGENCY |
| Pallor Score | <0.5 | >0.7 = URGENT |
| Cyanosis | Absent | Present = URGENT |

---

## Architecture Summary

```
Frontend (React) ← WebSocket → Node.js Backend (Express)
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
              Voice Agent    Video Health    [HTTP Routes]
              (STT→LLM→TTS)  (CAIRE API)     (health, config)
              
                    ↓               ↓
            External APIs     Python FastAPI
         (Deepgram, Bedrock,   (:8000)
          Cartesia, OpenAI)    Face Analysis
                                MediaPipe
```

---

## Key Dependencies

### Node.js
- `express`: HTTP server
- `ws`: WebSocket
- `@deepgram/sdk`: STT
- `@aws-sdk/client-bedrock-runtime`: LLM
- `openai`: LLM alternative

### Python
- `fastapi`: Web framework
- `mediapipe`: Face detection
- `opencv-python`: Image processing
- `uvicorn`: ASGI server

---

## Common Issues & Fixes

### Issue: ModuleNotFoundError in Python
**Fix**: Install dependencies
```bash
cd backend/python-services
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: CORS error from frontend
**Fix**: Check CORS_ORIGINS in .env
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Issue: WebSocket connection failed
**Fix**: Ensure Node backend is running
```bash
npm run dev  # in backend directory
```

### Issue: CAIRE API connection fails
**Fix**: Check CAIRE credentials
```bash
# Verify in .env:
CAIRE_API_KEY=<your-key>
CAIRE_WS_URL=ws://3.67.186.245:8003/ws/
```

---

## Useful Commands

```bash
# Type check Node.js
npm run type-check

# Build Node.js
npm run build

# Check configuration
curl http://localhost:3001/config

# Test LLM
curl -X POST http://localhost:3001/test/llm

# Reset Python analyzer
curl -X POST http://localhost:8000/reset
```

---

## Architecture Files Saved

- **Full Documentation**: `/PROJECT_ARCHITECTURE.md`
- **Quick Reference**: `/QUICK_REFERENCE.md` (this file)

---

Last Updated: 2025-11-07
