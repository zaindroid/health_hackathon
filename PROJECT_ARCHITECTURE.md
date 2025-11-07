# Healthy Hack Project - Architecture Summary

## Overview
This is an AI Voice Agent Healthcare System that combines:
- Real-time voice interaction for 3D anatomy education
- Medical video analysis (face mesh, eye health, first aid assessment)
- Heart rate monitoring via CAIRE API
- 3D anatomical model navigation
- Voice-guided medical education

---

## Architecture Overview

### Frontend/Backend Structure
```
healthy_hack/
├── frontend/                    # React/Vite frontend
│   └── src/
│       ├── components/
│       │   ├── MedicalScanner.tsx    # Face mesh scanning UI
│       │   └── ...
│       └── hooks/
│           └── useMedicalScanner.ts  # Medical analysis hook (calls Python /analyze)
├── backend/                     # Node.js/TypeScript backend
│   ├── server.ts                # Main Express HTTP/WebSocket server
│   ├── routes/
│   │   ├── voice.ts             # Voice agent WebSocket handler
│   │   └── video-health.ts      # Video health WebSocket handler (CAIRE API)
│   ├── video/
│   │   └── video-health-service.ts  # CAIRE API integration
│   ├── python-services/         # Python FastAPI medical analyzer
│   │   ├── main.py              # FastAPI app with /analyze endpoint
│   │   ├── requirements.txt
│   │   └── analyzers/
│   │       └── face_mesh_analyzer.py  # MediaPipe face analysis
│   ├── llm/                     # LLM providers (Bedrock, OpenAI, etc.)
│   ├── stt/                     # Speech-to-text (Deepgram)
│   ├── tts/                     # Text-to-speech (Cartesia, WebSpeech)
│   └── config/                  # Configuration & environment
└── shared/
    └── types.ts                 # TypeScript interfaces for all services
```

---

## 1. Overall Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Vite)                   │
│  ┌─────────────────┬──────────────────┬──────────────────┐      │
│  │  Voice Control  │ Medical Scanner  │  3D Anatomy View │      │
│  │  (Microphone)   │ (Webcam)         │  (BioDigital)    │      │
│  └────────┬────────┴────────┬─────────┴────────┬────────┘      │
└───────────┼──────────────────┼──────────────────┼──────────────┘
            │                  │                  │
    ┌───────▼────────┐  ┌──────▼────────┐  ┌────▼──────────┐
    │ WebSocket WS   │  │ HTTP POST     │  │ WebSocket WS  │
    │ /voice         │  │ localhost:8000│  │ /video-health │
    └────────────────┘  │ /analyze      │  └───────────────┘
                        └──────┬────────┘
                        
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js/TypeScript)                   │
│                       server.ts (Express)                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  WebSocket Server                       │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │        /voice (VoiceSessionHandler)              │  │    │
│  │  │  Audio → Deepgram STT → LLM → Response          │  │    │
│  │  │         → Cartesia TTS → Audio back to frontend  │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │      /video-health (VideoHealthHandler)          │  │    │
│  │  │  Frames → VideoHealthService → CAIRE API         │  │    │
│  │  │         → Heart Rate + rPPG Signals              │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           HTTP Routes (Express)                          │  │
│  │  GET /           - Service info                          │  │
│  │  GET /health     - Health check + config status          │  │
│  │  GET /config     - Configuration validation              │  │
│  │  POST /test/llm  - Test LLM provider                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │                          │
    ┌───────▼────────┐        ┌────────▼──────────┐
    │  External APIs │        │   Python Service  │
    ├────────────────┤        ├───────────────────┤
    │ • Deepgram STT │        │ FastAPI App       │
    │ • OpenAI/LLM   │        │ :8000             │
    │ • Bedrock      │        │                   │
    │ • Cartesia TTS │        │ POST /analyze     │
    │ • CAIRE API    │        │ POST /analyze-batch│
    │               │        │ POST /reset       │
    └────────────────┘        └───────────────────┘
                                      │
                              ┌───────▼──────────┐
                              │  MediaPipe Analyzer
                              ├───────────────────┤
                              │ Face Mesh (478    │
                              │ landmarks)        │
                              │ Eye Metrics       │
                              │ First Aid Assess  │
                              └───────────────────┘
```

---

## 2. Node.js Backend - server.ts (Main Entry Point)

**Location:** `/home/zainey/healthy_hack/backend/server.ts`

### Responsibility
- Main Express HTTP server
- WebSocket server for real-time communication
- Route initialization
- Configuration validation
- Graceful shutdown

### Key Features
```typescript
class VoiceAgentServer {
  - setupMiddleware()      // CORS, JSON parsing, logging
  - setupRoutes()          // HTTP endpoints
  - setupWebSocket()       // WebSocket routing
  - start()                // Server startup
  - shutdown()             // Graceful shutdown
}
```

### HTTP Endpoints
```
GET /              - Root endpoint with service info
GET /health        - Health check + active sessions
GET /config        - Configuration validation
POST /test/llm     - Test LLM provider connectivity
```

### WebSocket Endpoints
```
ws://localhost:3001/voice              → VoiceSessionHandler
ws://localhost:3001/video-health       → VideoHealthHandler
```

---

## 3. Voice Agent Handler - routes/voice.ts

**Location:** `/home/zainey/healthy_hack/backend/routes/voice.ts`

### Responsibility
Complete voice interaction pipeline:
```
User Audio Input (WebSocket)
    ↓
Deepgram STT (Speech-to-Text)
    ↓
LLM Processing (Bedrock/OpenAI/Local)
    ↓
Optional RAG (Retrieval-Augmented Generation)
    ↓
Tool Execution (BioDigital 3D navigation)
    ↓
Cartesia/WebSpeech TTS (Text-to-Speech)
    ↓
Response back to Frontend
```

### Key Methods
```typescript
handleControlMessage()    // start/stop control
startSession()            // Initialize STT stream
stopSession()             // Stop STT
processTranscript()       // LLM + Tools + TTS
```

### Features
- **STT:** Deepgram real-time transcription
- **LLM:** Bedrock (AWS), OpenAI, or local models
- **RAG:** Medical document retrieval (optional)
- **Tools:** BioDigital 3D model control
- **TTS:** Cartesia (external) or WebSpeech (frontend)

---

## 4. Video Health WebSocket - routes/video-health.ts

**Location:** `/home/zainey/healthy_hack/backend/routes/video-health.ts`

### Responsibility
Real-time video heart rate monitoring via CAIRE API

### Data Flow
```
Frontend Video Frames (Base64 JPEG)
    ↓
VideoHealthHandler
    ↓
VideoHealthService (CAIRE API WebSocket)
    ↓
Heart Rate + rPPG Signals
    ↓
Health Metrics Response → Frontend
```

### Key Methods
```typescript
handleMessage()         // Process WebSocket messages
startMonitoring()       // Connect to CAIRE API
handleFrame()           // Send frame to CAIRE
stopMonitoring()        // Disconnect from CAIRE
handleHealthMetrics()   // Process and relay metrics
cleanup()               // Resource cleanup
```

### Message Types
```typescript
// FROM FRONTEND
{ type: 'start' }                      // Begin monitoring
{ type: 'frame', data: {...} }         // Send video frame
{ type: 'stop' }                       // Stop monitoring

// TO FRONTEND
{ type: 'status', status: 'ready|monitoring|stopped' }
{ type: 'health_metrics', data: {...} }
{ type: 'error', error: 'message' }
```

---

## 5. CAIRE API Integration - video/video-health-service.ts

**Location:** `/home/zainey/healthy_hack/backend/video/video-health-service.ts`

### Responsibility
WebSocket client for CAIRE API (external heart rate service)

### Features
```typescript
class VideoHealthService {
  connect()               // Connect to CAIRE WebSocket
  sendFrame()             // Send base64 frame + timestamp
  onMetrics()             // Register callback for heart rate updates
  disconnect()            // Close connection
  isReady()               // Check connection status
  getSessionId()          // Get current session ID
}
```

### Configuration
```typescript
const config = {
  apiKey: process.env.CAIRE_API_KEY,
  wsUrl: process.env.CAIRE_WS_URL || 'ws://3.67.186.245:8003/ws/'
}
```

### CAIRE Response Format
```typescript
{
  state: 'ok' | 'finished',
  socket_id: string,
  datapt_id: string,
  inference: { hr?: number },        // Heart rate in BPM
  advanced: {
    rppg?: number[],                 // rPPG signal array
    rppg_timestamps?: number[]       // Timestamps for each sample
  }
  model_version?: string
}
```

---

## 6. Python FastAPI Service (Medical Analyzer)

**Location:** `/home/zainey/healthy_hack/backend/python-services/main.py`

### Responsibility
Real-time face mesh analysis with medical indicators

### Endpoints

#### POST /analyze
Analyze a single video frame
```
REQUEST:  { "image_data": "base64_string" }
RESPONSE: {
  "success": bool,
  "face_detected": bool,
  "landmarks": [...],          // 478 3D face mesh points
  "eye_metrics": {
    "pupil_diameter_left": float,
    "pupil_diameter_right": float,
    "pupil_asymmetry": float,
    "sclera_redness_left": float,
    "sclera_redness_right": float,
    "jaundice_score": float,
    "blink_rate": float
  },
  "first_aid": {
    "facial_asymmetry": float,
    "stroke_risk": "normal|warning|urgent|emergency",
    "pallor_score": float,
    "cyanosis_detected": bool,
    "consciousness_indicators": {...},
    "urgent_findings": [...]
  },
  "quality_score": float,
  "warnings": [...],
  "anatomy_targets": [...],           // 3D models to show
  "voice_guidance": string            // What to say to user
}
```

#### POST /analyze-batch
Analyze multiple frames for temporal analysis
```
REQUEST:  [{ "image_data": "..." }, ...]
RESPONSE: {
  "total_frames": int,
  "faces_detected": int,
  "average_quality": float,
  "blink_rate": float
}
```

#### POST /reset
Reset analyzer state
```
RESPONSE: { "message": "Analyzer reset successfully" }
```

---

## 7. Face Mesh Analyzer - analyzers/face_mesh_analyzer.py

**Location:** `/home/zainey/healthy_hack/backend/python-services/analyzers/face_mesh_analyzer.py`

### Responsibility
Core medical analysis using MediaPipe Face Mesh

### Key Components

#### Input
- BGR video frame from webcam
- Processes 478 facial landmarks

#### Analysis Pipeline
```
Frame → MediaPipe Face Mesh → 478 Landmarks
            ↓
    ┌───────┴────────┐
    ↓                ↓
Eye Analysis    First Aid Assessment
├─ Pupils       ├─ FAST Protocol (Stroke)
├─ Jaundice     ├─ Pallor (Shock/Anemia)
├─ Redness      ├─ Cyanosis (Hypoxia)
├─ Blink Rate   ├─ Consciousness Checks
└─ Asymmetry    └─ Urgent Findings
    ↓                ↓
    └───────┬────────┘
            ↓
   Quality Score & Warnings
```

#### Eye Metrics
```python
class EyeMetrics:
    pupil_diameter_left: float      # 2-8mm normal
    pupil_diameter_right: float
    pupil_asymmetry: float          # <0.5mm = normal, >1.5mm = EMERGENCY
    sclera_redness_left: float      # 0-1 scale
    sclera_redness_right: float
    jaundice_score: float           # 0-1 (>0.3 = detected)
    blink_detected: bool
```

#### First Aid Assessment
```python
class FirstAidAssessment:
    facial_asymmetry: float         # Stroke indicator
    stroke_risk: AlertLevel         # NORMAL|WARNING|URGENT|EMERGENCY
    pallor_score: float             # 0-1 (blood loss/shock)
    cyanosis_detected: bool         # Blue lips (hypoxia)
    respiratory_rate: Optional[float]
    consciousness_indicators: Dict
    urgent_findings: List[str]      # Critical alerts
```

#### Alert Thresholds
| Metric | Normal | Warning | Emergency |
|--------|--------|---------|-----------|
| Pupil Asymmetry | <0.5mm | 0.5-1.5mm | >1.5mm |
| Facial Asymmetry | <5% | 5-15% | >15% |
| Jaundice Score | <0.3 | 0.3-0.5 | >0.5 |
| Pallor Score | <0.5 | 0.5-0.7 | >0.7 |
| Cyanosis | Absent | - | Present |

### Key Methods
```python
analyze(frame)              # Main analysis pipeline
_extract_landmarks()        # Get 478 3D points
_analyze_eyes()             # Pupil, jaundice, redness
_assess_first_aid()         # Stroke, pallor, cyanosis
_calculate_facial_asymmetry()  # FAST protocol
_detect_jaundice()          # Yellow sclera
_detect_pallor()            # Pale face
_detect_cyanosis()          # Blue lips
_calculate_quality()        # Image quality score
_generate_warnings()        # User warnings
get_blink_rate()            # Blinks per minute
```

---

## 8. Medical Scanner Frontend Hook - useMedicalScanner.ts

**Location:** `/home/zainey/healthy_hack/frontend/src/hooks/useMedicalScanner.ts`

### Responsibility
React hook to communicate with Python /analyze endpoint

### Configuration
```typescript
const PYTHON_SERVICE_URL = 'http://localhost:8000'
```

### State Management
```typescript
- faceDetected: boolean
- eyeMetrics: EyeMetrics | null
- firstAid: FirstAidAssessment | null
- landmarks: LandmarkPoint[]
- quality: number | null
- warnings: string[]
- anatomyTargets: string[]
- voiceGuidance: string | null
- isAnalyzing: boolean
- error: string | null
```

### Main Functions
```typescript
analyzeFrame(imageData)     // POST base64 image to /analyze
reset()                     // POST to /reset, clear state
```

### Integration Points
- Reads from MedicalScanner component (video frames)
- Provides analysis results to parent component
- Triggers 3D anatomy navigation
- Feeds voice guidance to TTS

---

## 9. Shared Types - shared/types.ts

**Location:** `/home/zainey/healthy_hack/shared/types.ts`

### Key Interfaces

#### WebSocket Messages
```typescript
interface ClientMessage {
  type: 'audio' | 'control'
  action?: 'start' | 'stop'
  data?: any
}

interface ServerMessage {
  type: 'transcript' | 'llm_response' | 'error' | 'status' | 'audio' | 'camera_command'
  transcript?: TranscriptEvent
  llmResponse?: LLMResponse
  audio?: { data: string, format: string, sampleRate: number }
  cameraCommand?: { action, params, objectName }
}
```

#### Video Health Types
```typescript
interface VideoHealthConfig {
  apiKey: string
  wsUrl: string
}

interface VideoFramePayload {
  datapt_id: string
  state: 'stream' | 'end'
  frame_data: string           // base64 JPEG
  timestamp: string            // UNIX timestamp
  advanced: boolean            // Enable rPPG
}

interface VideoHealthResponse {
  state: 'ok' | 'finished'
  inference: { hr?: number }
  advanced?: { rppg?: number[], rppg_timestamps?: number[] }
}
```

#### LLM/STT/TTS Interfaces
```typescript
interface LLMProvider {
  generateResponse(transcript, context?): Promise<LLMResponse>
  isConfigured(): boolean
}

interface STTProvider {
  startStream(): void
  stopStream(): void
  onTranscript(callback): void
}

interface TTSProvider {
  speak(text): Promise<void | Buffer>
  isConfigured(): boolean
}
```

---

## 10. 500 Error Issue - /analyze Endpoint

### Current State
The `/analyze` endpoint (Python FastAPI) **works correctly**:
- Located in: `/home/zainey/healthy_hack/backend/python-services/main.py:192`
- Processes base64 image → MediaPipe analysis → Returns results
- Called by: `useMedicalScanner.ts` hook from frontend

### Potential 500 Error Causes
1. **Python service not running:** Need to start: `python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`
2. **Missing dependencies:** Check `requirements.txt` dependencies installed
3. **MediaPipe initialization:** Face mesh model download issues
4. **Image format issues:** Invalid base64 or JPEG encoding
5. **CORS issues:** Python service needs proper CORS configuration (already set)

### To Debug
```bash
# Terminal 1: Start Python service
cd /home/zainey/healthy_hack/backend/python-services
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Test endpoint
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_data": "YOUR_BASE64_IMAGE"}'

# Check logs for errors
```

---

## 11. Summary of Key Files

### Backend Services
| File | Purpose | Key Classes/Functions |
|------|---------|---------------------|
| `server.ts` | Main Express/WebSocket server | `VoiceAgentServer` |
| `routes/voice.ts` | Voice interaction handler | `VoiceSessionHandler` |
| `routes/video-health.ts` | Video heart rate handler | `VideoHealthHandler` |
| `video/video-health-service.ts` | CAIRE API integration | `VideoHealthService` |
| `python-services/main.py` | Medical analysis API | FastAPI app + endpoints |
| `python-services/analyzers/face_mesh_analyzer.py` | Face mesh analysis | `FaceMeshAnalyzer` |

### Frontend Components
| File | Purpose | Hook/Component |
|------|---------|-----------------|
| `useMedicalScanner.ts` | Medical analysis state management | Custom React hook |
| `MedicalScanner.tsx` | Face scanning UI | React component |

### Configuration & Types
| File | Purpose |
|------|---------|
| `config/env.ts` | Environment variables & validation |
| `shared/types.ts` | Shared TypeScript interfaces |

---

## 12. Data Flow Diagram

### Voice Agent Flow
```
User speaks into microphone
         ↓
WebSocket → Deepgram STT
         ↓
Transcript event
         ↓
LLM (Bedrock/OpenAI) → Generate response
         ↓
Optional: RAG retrieval
         ↓
Optional: Tool execution (BioDigital)
         ↓
TTS (Cartesia/WebSpeech) → Generate audio
         ↓
Send response + audio back via WebSocket
         ↓
Frontend plays audio and updates UI
```

### Medical Analysis Flow
```
User starts medical scan
         ↓
Webcam captures video frame
         ↓
Convert frame to base64 JPEG
         ↓
POST to Python /analyze endpoint
         ↓
MediaPipe Face Mesh (478 landmarks)
         ↓
Analyze eyes: pupils, jaundice, redness
Assess first aid: stroke, shock, cyanosis
         ↓
Return metrics + alerts + anatomy targets
         ↓
Frontend displays face mesh overlay
Shows alerts (urgent findings)
Navigate 3D anatomy to target organs
Trigger voice guidance
```

### Video Health (CAIRE) Flow
```
User starts video health monitoring
         ↓
WebSocket connection to /video-health
         ↓
Send video frames as base64 JPEG
         ↓
VideoHealthService connects to CAIRE API
         ↓
CAIRE processes frames → extracts heart rate
         ↓
Receive heart rate + rPPG signal
         ↓
Send health metrics back to frontend
         ↓
Frontend displays real-time heart rate
```

---

## 13. Dependencies Summary

### Node.js Backend (`package.json`)
```
Core:
  - express: HTTP server
  - ws: WebSocket
  - cors: CORS middleware
  
LLM/AI:
  - @aws-sdk/client-bedrock-runtime: AWS Bedrock
  - @deepgram/sdk: Speech-to-text
  - openai: OpenAI LLM
  
Utilities:
  - uuid: Session IDs
  - dotenv: Environment variables
```

### Python Backend (`requirements.txt`)
```
ML/Vision:
  - mediapipe: Face mesh detection
  - opencv-python: Image processing
  - numpy: Numerical operations
  - scipy: Signal processing

Web:
  - fastapi: API framework
  - uvicorn: ASGI server
  - pydantic: Data validation

Utilities:
  - python-multipart: Form data handling
  - Pillow: Image manipulation
  - python-dotenv: Environment variables
```

---

## 14. Environment Variables Required

### Node.js Backend (`.env`)
```env
# LLM
LLM_PROVIDER=bedrock          # or openai, local, mock
BEDROCK_REGION=us-east-1
BEDROCK_MODEL=anthropic.claude-3-sonnet

OPENAI_API_KEY=sk-...

# STT
DEEPGRAM_API_KEY=...

# TTS
TTS_PROVIDER=external          # or webspeech
CARTESIA_API_KEY=...

# Video Health (CAIRE)
CAIRE_API_KEY=...
CAIRE_WS_URL=ws://3.67.186.245:8003/ws/

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=3001
CORS_ORIGINS=*
```

### Python Backend (`.env`)
```env
# Usually inherited or not needed - service runs on default ports
```

---

## 15. Quick Start Commands

### Start Backend Services
```bash
# Terminal 1: Node.js WebSocket server
cd backend
npm install
npm run dev

# Terminal 2: Python FastAPI service
cd backend/python-services
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3: Frontend (optional, if separate)
cd frontend
npm install
npm run dev
```

### Testing
```bash
# Test health endpoint
curl http://localhost:3001/health

# Test Python analyzer
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_data": "base64_jpeg_here"}'
```

---

## 16. Key Features Summary

### Voice Agent
- Real-time speech transcription (Deepgram)
- LLM responses (Bedrock, OpenAI, local)
- Medical document retrieval (RAG optional)
- 3D anatomy navigation (BioDigital)
- Voice responses (Cartesia or WebSpeech)

### Medical Scanner
- Face mesh detection (MediaPipe - 478 points)
- Eye health metrics (pupils, jaundice, redness, blinks)
- First aid assessment (stroke FAST, shock, hypoxia)
- Alert system (3 levels: warning, urgent, emergency)
- 3D anatomy auto-navigation (relevant organs)

### Video Health Monitoring
- Real-time heart rate extraction (CAIRE API)
- rPPG signal analysis (remote photoplethysmography)
- Continuous monitoring capability
- Metrics streaming via WebSocket

---

## 17. Architecture Quality Notes

✅ **Strengths**
- Modular separation: Voice, Video, Video Health
- Multiple LLM provider support
- Real-time streaming via WebSocket
- Medical-focused analysis
- Comprehensive error handling
- Docker-ready (Python service has Dockerfile)

⚠️ **Considerations**
- Python service separate process (requires monitoring)
- CAIRE API dependency (external service)
- Deepgram/Bedrock/OpenAI costs
- GPU recommended for real-time performance

---

**End of Summary**
