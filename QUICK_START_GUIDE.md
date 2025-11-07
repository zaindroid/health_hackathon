# 🚀 Quick Start Guide - Healthcare Voice Agent Platform

## 📋 What's Been Built

Your GitHub repo contains a complete healthcare platform with:

✅ **Voice-Controlled 3D Anatomy Navigator**
- Deepgram STT → AWS Bedrock Claude → Cartesia TTS
- Real-time 3D model navigation via voice commands
- Tool calling system for camera control

✅ **Video Health Signals Integration**
- CAIRE API for heart rate monitoring from video
- Arrhythmia detection capabilities
- Real-time rPPG signal analysis

✅ **Backend Infrastructure**
- TypeScript/Node.js backend
- WebSocket support for real-time communication
- Modular architecture with tool system

✅ **AWS Deployment Ready**
- Docker configuration
- Bedrock Claude 3.5 integration
- Complete deployment documentation

---

## 🏗️ Repository Structure

```
healthy_hack/
├── backend/                    # Node.js backend
│   ├── llm/                   # LLM providers (Bedrock, Local, OpenAI)
│   ├── stt/                   # Speech-to-text (Deepgram)
│   ├── tts/                   # Text-to-speech (Cartesia)
│   ├── tools/                 # Tool system (3D navigation)
│   │   ├── anatomy_navigator.ts        # 3D camera control
│   │   └── biodigital_placeholder.ts   # Tool handler
│   ├── routes/                # WebSocket routes
│   │   └── voice.ts          # Main voice agent
│   ├── config/                # Configuration
│   ├── navigation_tests/      # 3D viewpoint database
│   │   └── anatomy-data.json
│   ├── video health signals/  # CAIRE video API
│   │   ├── javascript_demo/
│   │   ├── python_demo/
│   │   └── ppg_arrhythmia_notebook/
│   ├── .env                   # Environment configuration
│   ├── Dockerfile             # Docker configuration
│   └── server.ts              # Entry point
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceInterface.tsx
│   │   │   └── BioDigitalViewer.tsx
│   │   ├── hooks/
│   │   │   └── useVoiceAgent.ts
│   │   └── App.tsx
│   └── package.json
│
├── shared/                     # Shared TypeScript types
│   └── types.ts
│
└── Documentation/
    ├── AWS_COMPLETE_IMPLEMENTATION_PLAN.md  # Full AWS plan
    ├── AWS_DEPLOYMENT_GUIDE.md              # Deployment guide
    ├── VOICE_CONTROLLED_3D_NAVIGATION.md    # 3D navigation docs
    ├── CARTESIA_AND_LATENCY.md              # TTS optimization
    └── AWS_MIGRATION_SUMMARY.md             # Migration summary
```

---

## ⚡ Quick Start (Local Development)

### **1. Backend Setup**

```bash
cd backend

# Install dependencies
npm install

# Configure environment (.env already set up)
# Verify these are present:
# - LLM_PROVIDER=bedrock
# - AWS credentials
# - DEEPGRAM_API_KEY
# - CARTESIA_API_KEY

# Build
npm run build

# Start backend
npm run dev

# You should see:
# ✅ Bedrock LLM Provider initialized
# ✅ Cartesia Sonic TTS Provider initialized
# 🚀 Server running on port 3001
```

### **2. Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev

# Open browser: http://localhost:5173
```

### **3. Test Voice Commands**

1. Click "Start Talking"
2. You'll hear: "Hello! I can help you explore 3D anatomy..."
3. Try saying:
   - "Show me the front view"
   - "Rotate to the back"
   - "Show the right shoulder"
   - "What is the trapezius muscle?"

---

## 🎯 Key Features

### **1. Voice-Controlled 3D Navigation**

**How it works:**
```
Voice Input → Deepgram STT → Bedrock Claude → Tool Action → 3D Camera Pan
```

**Supported commands:**
- "Show me the front/back/left/right"
- "Rotate to [viewpoint]"
- "Focus on [anatomical structure]"

**Files:**
- Agent: `backend/routes/voice.ts`
- Tool Handler: `backend/tools/biodigital_placeholder.ts`
- Navigator: `backend/tools/anatomy_navigator.ts`
- Database: `backend/navigation_tests/anatomy-data.json`

### **2. Video Health Monitoring**

**CAIRE API Integration:**
- API Key: `_gskosjmOYnzNJ_4bieNyGrJZrbpmLuYfscfFZdOHZA`
- Endpoint: `ws://3.67.186.245:8003/ws/`

**Capabilities:**
- Real-time heart rate monitoring from webcam
- rPPG signal extraction
- Arrhythmia detection

**Files:**
- API Docs: `backend/video health signals/api instructions.txt`
- JavaScript Demo: `backend/video health signals/javascript_demo/`
- Python Demo: `backend/video health signals/python_demo/`
- ML Model: `backend/video health signals/ppg_arrhythmia_notebook/`

### **3. Modular LLM System**

**Supported providers:**
- AWS Bedrock (Claude 3.5 Sonnet) ✅ **Currently Active**
- Local Qwen3 (via Ollama/Tailscale)
- OpenAI GPT
- Mock (for testing)

**Switch providers:**
```env
# In backend/.env
LLM_PROVIDER=bedrock  # or 'local', 'openai', 'mock'
```

---

## 🚀 AWS Deployment

### **Quick Deploy to AWS**

See detailed guide: `AWS_DEPLOYMENT_GUIDE.md`

**Option 1: EC2 (Recommended)**
```bash
# See AWS_DEPLOYMENT_GUIDE.md → Option 1
# Estimated cost: $60-90/month
```

**Option 2: Docker + ECS**
```bash
cd backend
docker build -t healthcare-backend .

# Push to ECR and deploy
# See AWS_DEPLOYMENT_GUIDE.md → Option 3
```

---

## 📊 Complete Platform Vision

See: `AWS_COMPLETE_IMPLEMENTATION_PLAN.md`

**Planned features:**
1. ✅ Voice-controlled 3D anatomy (DONE)
2. 🔨 Patient history management (TO DO)
3. 🔨 RAG medical knowledge base (TO DO)
4. 🔨 Video health analysis UI (TO DO)
5. 🔨 Multi-tab interface (TO DO)

**AWS Services to use:**
- RDS PostgreSQL (patient records)
- OpenSearch (RAG vector database)
- SageMaker (arrhythmia ML model)
- S3 (file storage)
- CloudFront (CDN)

---

## 🔑 Environment Variables

### **Backend (.env)**

```env
# Server
PORT=3001
HOST=0.0.0.0

# LLM Provider
LLM_PROVIDER=bedrock
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=ASIAWGDE73X7TY4K3EB2
AWS_SECRET_ACCESS_KEY=OVWKvEgDWtOK7UJ8cj2QdxYxN1u2CN2fa44fI6co
AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEPL... (expires!)
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# Speech Services
DEEPGRAM_API_KEY=3763c0d7cb5fd4216bf9ae964e353e7bfc2985dc
CARTESIA_API_KEY=sk_car_SavSUBUsuChkr8BYKyVdQN
TTS_PROVIDER=external

# Features
ENABLE_TOOLS=true
ENABLE_RAG=false

# CAIRE Video API (for future integration)
CAIRE_API_KEY=_gskosjmOYnzNJ_4bieNyGrJZrbpmLuYfscfFZdOHZA
CAIRE_WS_URL=ws://3.67.186.245:8003/ws/
```

### **Frontend (.env)**

```env
VITE_WS_URL=ws://localhost:3001
```

---

## 🐛 Troubleshooting

### **Backend won't start?**

```bash
# Check if port 3001 is available
lsof -i :3001

# Kill existing process
kill -9 $(lsof -t -i:3001)

# Rebuild
npm run build
npm run dev
```

### **Bedrock errors?**

```bash
# Test AWS credentials
aws bedrock list-foundation-models --region us-west-2

# Check if model is available
aws bedrock get-foundation-model \
  --model-identifier anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --region us-west-2
```

### **Audio not working?**

- Check browser console for errors
- Verify Cartesia API key is valid
- Ensure microphone permissions granted
- Try hard refresh (Ctrl+Shift+R)

### **3D model not responding?**

- Check if `ENABLE_TOOLS=true` in backend/.env
- Verify BioDigital iframe loads
- Check browser console for WebSocket errors
- Ensure anatomy-data.json exists

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| **QUICK_START_GUIDE.md** | This file - getting started |
| **AWS_COMPLETE_IMPLEMENTATION_PLAN.md** | Full platform architecture |
| **AWS_DEPLOYMENT_GUIDE.md** | AWS deployment instructions |
| **VOICE_CONTROLLED_3D_NAVIGATION.md** | 3D navigation system docs |
| **CARTESIA_AND_LATENCY.md** | TTS optimization guide |
| **AWS_MIGRATION_SUMMARY.md** | Bedrock migration summary |

---

## 👥 Team Collaboration

### **Project Structure for Team**

**Frontend Team:**
- Work in `frontend/` directory
- Build new tabs (Patient Records, Video Analysis)
- API calls via WebSocket and REST

**Backend Team:**
- Work in `backend/` directory
- Add new routes, tools, services
- Database integration

**ML Team:**
- Train arrhythmia model (notebook provided)
- Deploy to SageMaker
- Integrate with backend

**DevOps Team:**
- AWS infrastructure setup
- CI/CD pipeline
- Monitoring and logging

### **Git Workflow**

```bash
# Create feature branch
git checkout -b feature/patient-records

# Make changes
git add .
git commit -m "Add patient records API"

# Push and create PR
git push origin feature/patient-records
```

---

## 🎯 Next Steps

### **For Development:**
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Test voice commands
4. Review AWS implementation plan

### **For Production:**
1. Review `AWS_DEPLOYMENT_GUIDE.md`
2. Set up AWS infrastructure
3. Deploy backend to EC2/ECS
4. Deploy frontend to S3 + CloudFront

### **For New Features:**
1. Review `AWS_COMPLETE_IMPLEMENTATION_PLAN.md`
2. Choose phase to implement
3. Follow implementation steps
4. Test and deploy

---

## 💡 Useful Commands

```bash
# Backend
cd backend
npm install              # Install dependencies
npm run build           # Build TypeScript
npm run dev            # Start dev server
npm run test           # Run tests

# Frontend
cd frontend
npm install             # Install dependencies
npm run dev            # Start dev server
npm run build          # Build for production

# Docker
docker build -t healthcare-backend .
docker run -p 3001:3001 healthcare-backend

# AWS CLI
aws bedrock list-foundation-models --region us-west-2
aws rds describe-db-instances
aws opensearch describe-domain --domain-name medical-knowledge-base
```

---

## 📞 Support

**Issues?**
- Check documentation in root directory
- Review backend logs
- Check AWS CloudWatch (production)

**Questions?**
- Review architecture in `AWS_COMPLETE_IMPLEMENTATION_PLAN.md`
- Check code comments in source files
- Consult AWS documentation

---

## ✨ Features Summary

| Feature | Status | Files |
|---------|--------|-------|
| Voice Agent | ✅ Working | `backend/routes/voice.ts` |
| 3D Navigation | ✅ Working | `backend/tools/anatomy_navigator.ts` |
| Bedrock LLM | ✅ Working | `backend/llm/bedrock.ts` |
| Cartesia TTS | ✅ Working | `backend/tts/cartesia.ts` |
| Deepgram STT | ✅ Working | `backend/stt/deepgram.ts` |
| Video API Docs | ✅ Ready | `backend/video health signals/` |
| Patient Records | 🔨 Planned | See AWS plan |
| RAG System | 🔨 Planned | See AWS plan |
| Video UI | 🔨 Planned | See AWS plan |

---

**Platform is ready for team collaboration and AWS deployment!** 🚀

Start with local development, then deploy to AWS following the guides!
