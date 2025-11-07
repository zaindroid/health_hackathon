# Healthy Hack - Documentation Index

## Newly Created Documentation (2025-11-07)

These documents provide comprehensive project understanding:

### 1. PROJECT_ARCHITECTURE.md (25KB)
**Absolute Path:** `/home/zainey/healthy_hack/PROJECT_ARCHITECTURE.md`

Complete architectural overview including:
- 17 detailed sections covering full system
- Architecture diagrams (ASCII art)
- Server.ts main entry point
- Voice agent handler details
- Video health WebSocket endpoint
- CAIRE API integration
- Python FastAPI medical analyzer
- Face mesh analyzer implementation
- Frontend integration
- Shared types & interfaces
- Data flow diagrams (3 complete flows)
- Dependencies summary
- Environment variables
- Quick start commands
- Quality notes & considerations

**Use this for:** Deep understanding of how everything fits together

---

### 2. QUICK_REFERENCE.md (7.7KB)
**Absolute Path:** `/home/zainey/healthy_hack/QUICK_REFERENCE.md`

Developer quick lookup including:
- Key file locations (all services)
- Main endpoints (WebSocket & HTTP)
- Data flow summaries (3 main flows)
- Important classes & services table
- Starting the project (3 terminals)
- Environment variables template
- Testing endpoints (curl examples)
- /analyze 500 error troubleshooting
- Medical analysis output structure
- Alert thresholds table
- Architecture diagram (ASCII)
- Dependencies list
- Common issues & fixes
- Useful commands

**Use this for:** Quick reference while coding

---

### 3. HEALTH_ANALYSIS_FEATURES.md (17KB)
**Absolute Path:** `/home/zainey/healthy_hack/HEALTH_ANALYSIS_FEATURES.md`

Medical analysis deep dive including:
- Overview of 3 health systems
- Medical face scanner (sections 1-2)
- Eye health metrics analysis (pupils, redness, jaundice, blinks)
- First aid assessment (FAST stroke protocol, pallor, cyanosis)
- Alert system (4 levels, urgent findings, thresholds)
- 3D anatomy auto-navigation
- Voice guidance generation
- Video health monitoring (CAIRE API)
- Frontend integration details
- Performance considerations
- Medical disclaimer
- Key methods reference table
- Testing procedures
- Implementation code examples

**Use this for:** Understanding medical features & implementing health analysis

---

## Quick Access to Key Files

### Backend Services (Node.js/TypeScript)
- **Main Server:** `/home/zainey/healthy_hack/backend/server.ts` (213 lines)
- **Voice Agent:** `/home/zainey/healthy_hack/backend/routes/voice.ts` (305 lines)
- **Video Health:** `/home/zainey/healthy_hack/backend/routes/video-health.ts` (210 lines)
- **CAIRE Client:** `/home/zainey/healthy_hack/backend/video/video-health-service.ts` (162 lines)

### Backend Services (Python)
- **FastAPI App:** `/home/zainey/healthy_hack/backend/python-services/main.py` (305 lines)
- **Face Analyzer:** `/home/zainey/healthy_hack/backend/python-services/analyzers/face_mesh_analyzer.py` (494 lines)
- **Dependencies:** `/home/zainey/healthy_hack/backend/python-services/requirements.txt`

### Frontend (React/Vite)
- **Medical Hook:** `/home/zainey/healthy_hack/frontend/src/hooks/useMedicalScanner.ts` (173 lines)
- **Scanner UI:** `/home/zainey/healthy_hack/frontend/src/components/MedicalScanner.tsx`

### Shared Code
- **Types:** `/home/zainey/healthy_hack/shared/types.ts` (202 lines)

---

## Key Endpoints Summary

### Node.js WebSocket (localhost:3001)
```
ws://localhost:3001/voice              Voice agent (STT→LLM→TTS)
ws://localhost:3001/video-health       Heart rate monitoring
```

### Node.js HTTP (localhost:3001)
```
GET  /health                           Health check
GET  /config                           Config validation
POST /test/llm                         Test LLM provider
```

### Python FastAPI (localhost:8000)
```
POST /analyze                          Single frame analysis
POST /analyze-batch                    Multiple frame analysis
POST /reset                            Reset analyzer state
```

---

## Architecture at a Glance

```
Frontend (React/Vite)
    ↓ WebSocket & HTTP
Node.js Backend (Express/TypeScript)
    ├── /voice → Voice Agent (STT→LLM→TTS)
    ├── /video-health → Video Health (CAIRE API)
    └── /health, /config, /test/llm
        ↓ HTTP POST
    Python Service (FastAPI/Python)
        ├── /analyze → Face Mesh Analysis
        ├── /analyze-batch → Batch Analysis
        └── /reset → Clear State
            ↓ Uses
        MediaPipe Face Mesh (478 landmarks)
        Medical Analysis Engine
```

---

## Medical Analysis Features

### Eye Health Detection
- Pupil diameter & asymmetry (neurological indicator)
- Sclera redness (fatigue, infection)
- Jaundice (liver disease)
- Blink rate (consciousness indicator)

### First Aid Assessment
- Facial asymmetry (FAST stroke protocol)
- Pallor (blood loss/shock)
- Cyanosis (blue lips = hypoxia)
- Consciousness indicators
- Urgent findings alerts

### Auto-Features
- 3D anatomy auto-navigation
- Voice guidance generation
- Image quality scoring
- User warnings

---

## Alert System

### 4 Alert Levels
- **NORMAL:** No issues detected
- **WARNING:** Monitor condition
- **URGENT:** Seek medical advice soon
- **EMERGENCY:** Call 911 immediately

### Critical Thresholds
| Metric | Emergency Alert |
|--------|-----------------|
| Pupil asymmetry | >1.5mm |
| Facial asymmetry | >15% |
| Jaundice score | >0.5 |
| Pallor score | >0.7 |
| Cyanosis | Present |

---

## Getting Started

### 1. Read in This Order
1. This file (DOCUMENTATION_INDEX.md)
2. QUICK_REFERENCE.md (endpoints & quick commands)
3. PROJECT_ARCHITECTURE.md (full system overview)
4. HEALTH_ANALYSIS_FEATURES.md (medical details)

### 2. Start Services
```bash
# Terminal 1: Node.js Backend
cd /home/zainey/healthy_hack/backend
npm install
npm run dev

# Terminal 2: Python Service
cd /home/zainey/healthy_hack/backend/python-services
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3: Frontend (optional)
cd /home/zainey/healthy_hack/frontend
npm install
npm run dev
```

### 3. Test Services
```bash
# Health check
curl http://localhost:3001/health

# Config validation
curl http://localhost:3001/config

# Medical analysis (requires base64 JPEG)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_data": "YOUR_BASE64_JPEG"}'
```

---

## Troubleshooting

### Python Service Returns 500
**Location:** `/home/zainey/healthy_hack/backend/python-services/main.py`

**Causes:**
1. Service not running on :8000
2. MediaPipe not installed
3. Invalid base64 image
4. Missing dependencies

**Fix:**
```bash
cd backend/python-services
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level debug
```

### WebSocket Connection Failed
**Check:** Node.js backend running on :3001
```bash
cd backend && npm run dev
```

### CAIRE API Errors
**Check:** Environment variables
```bash
grep CAIRE .env
# Should have CAIRE_API_KEY and CAIRE_WS_URL
```

---

## Technology Stack

### Frontend
- React 18+
- Vite (build tool)
- WebSocket (real-time)
- TypeScript

### Backend (Node.js)
- Express (HTTP server)
- ws (WebSocket)
- TypeScript
- Deepgram (STT)
- AWS Bedrock (LLM)
- OpenAI (LLM alternative)

### Backend (Python)
- FastAPI
- Uvicorn (ASGI)
- MediaPipe (face detection)
- OpenCV (image processing)
- NumPy, SciPy (analysis)
- Pydantic (validation)

### External Services
- **CAIRE API:** Heart rate & rPPG signals
- **Deepgram:** Speech-to-text
- **AWS Bedrock:** LLM inference
- **OpenAI:** LLM alternative
- **Cartesia:** Text-to-speech

---

## File Size Reference

### Documentation Files
- PROJECT_ARCHITECTURE.md: 25KB (17 sections)
- QUICK_REFERENCE.md: 7.7KB (14 sections)
- HEALTH_ANALYSIS_FEATURES.md: 17KB (12 sections)

### Source Code
- server.ts: ~6KB (213 lines)
- voice.ts: ~10KB (305 lines)
- video-health.ts: ~8KB (210 lines)
- face_mesh_analyzer.py: ~18KB (494 lines)
- main.py (FastAPI): ~10KB (305 lines)

---

## Navigation Guide

**Want to understand...**

- How voice interaction works? → See QUICK_REFERENCE.md "Data Flows" or PROJECT_ARCHITECTURE.md section 3
- Medical analysis? → See HEALTH_ANALYSIS_FEATURES.md (all 12 sections)
- CAIRE integration? → See PROJECT_ARCHITECTURE.md section 5 or QUICK_REFERENCE.md
- How to fix 500 errors? → See QUICK_REFERENCE.md "/analyze Endpoint 500 Errors"
- Where /analyze is? → See QUICK_REFERENCE.md "Key File Locations"
- What video-health does? → See QUICK_REFERENCE.md "Data Flows #3" or PROJECT_ARCHITECTURE.md section 4
- Alert thresholds? → See HEALTH_ANALYSIS_FEATURES.md section 4 or QUICK_REFERENCE.md
- 3D anatomy navigation? → See HEALTH_ANALYSIS_FEATURES.md section 5
- How to start? → See QUICK_REFERENCE.md "Starting the Project"

---

## Important Notes

### Medical Disclaimer
This tool is for **educational purposes only**. Do not use for:
- Emergency medical decisions
- Diagnosis of serious conditions
- Treatment planning
- Replacement of professional medical advice

**Seek immediate emergency care for:**
- Sudden facial drooping
- Unequal pupils with headache
- Blue lips or difficulty breathing
- Severe paleness with dizziness

---

## Support Resources

### In This Project
- README.md - Original project overview
- START_HERE.md - Initial setup guide
- MEDICAL_SCANNER_QUICK_START.md - Medical feature setup
- AWS_DEPLOYMENT_GUIDE.md - Cloud deployment

### Quick Commands
```bash
# Check server health
curl http://localhost:3001/health

# Check configuration
curl http://localhost:3001/config

# Test LLM provider
curl -X POST http://localhost:3001/test/llm

# Type check Node.js
npm run type-check

# Build Node.js
npm run build
```

---

## Documentation Metadata

- **Created:** 2025-11-07
- **Scope:** Complete project exploration
- **Coverage:** 100% of health analysis features
- **Files Documented:** 10+ key source files
- **Total Content:** 50KB+ of detailed documentation

---

**Happy coding!**

For detailed information, start with QUICK_REFERENCE.md and drill into specific docs as needed.
