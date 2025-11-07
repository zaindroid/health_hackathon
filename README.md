# 🏥 AI Voice Agent - Healthcare Education System

A real-time, modular AI voice agent architecture built with TypeScript and Node.js for healthcare education and diagnostic applications.

## 🎯 Overview

This system provides a complete voice-in → transcription → AI response → voice-out loop with a modular architecture designed for:

- **Real-time voice interaction** using Deepgram STT
- **Pluggable LLM providers** (Bedrock Claude, OpenAI, local models)
- **Structured responses** with intent classification and tool actions
- **Extensible architecture** for RAG, tools, and custom integrations
- **Healthcare focus** with medical education and diagnostic capabilities

## 🏗️ Architecture

```
┌─────────────┐
│  Frontend   │  React + TypeScript + Vite
│  (Minimal)  │  - Voice recording
│             │  - WebSocket client
│             │  - TTS playback
└──────┬──────┘
       │ WebSocket
       │
┌──────▼──────┐
│   Backend   │  Node.js + Express + TypeScript
│             │
│  ┌────────┐ │
│  │  STT   │ │  Deepgram real-time transcription
│  └────────┘ │
│  ┌────────┐ │
│  │  LLM   │ │  Bedrock Claude / OpenAI / Local
│  └────────┘ │
│  ┌────────┐ │
│  │  RAG   │ │  Vector store retrieval (placeholder)
│  └────────┘ │
│  ┌────────┐ │
│  │ Tools  │ │  BioDigital, etc. (placeholder)
│  └────────┘ │
└─────────────┘
```

## 📁 Project Structure

```
healthy_hack/
├── backend/
│   ├── server.ts              # Main server with WebSocket
│   ├── config/
│   │   └── env.ts             # Environment configuration
│   ├── llm/
│   │   ├── index.ts           # LLM provider factory
│   │   ├── bedrock.ts         # AWS Bedrock Claude (default)
│   │   ├── openai.ts          # OpenAI GPT (placeholder)
│   │   └── local.ts           # Local model (placeholder)
│   ├── stt/
│   │   └── deepgram.ts        # Deepgram real-time STT
│   ├── tts/
│   │   └── webspeech_placeholder.ts
│   ├── tools/
│   │   └── biodigital_placeholder.ts
│   ├── rag/
│   │   └── retriever_placeholder.ts
│   └── routes/
│       └── voice.ts           # WebSocket voice session handler
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── hooks/
│   │   │   └── useVoiceAgent.ts  # Voice agent hook
│   │   └── components/
│   │       └── VoiceInterface.tsx # Voice UI component
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── shared/
│   └── types.ts               # Shared TypeScript interfaces
├── .env.example               # Environment variables template
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Deepgram API Key** (required for STT)
- **AWS Credentials** (for Bedrock) or OpenAI API Key

### 1. Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

**Required variables:**
```env
DEEPGRAM_API_KEY=your_deepgram_api_key
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### 3. Run Locally

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access:** Open [http://localhost:5173](http://localhost:5173)

## 🔌 API Endpoints

### HTTP Endpoints

- `GET /` - Service information
- `GET /health` - Health check with configuration status
- `GET /config` - Configuration validation
- `POST /test/llm` - Test LLM provider

### WebSocket

- `WS /voice` - Real-time voice interaction

**Message Format:**

Client → Server:
```json
{
  "type": "control",
  "action": "start" | "stop"
}
```

Server → Client:
```json
{
  "type": "transcript" | "llm_response" | "error" | "status",
  "transcript": { "text": "...", "isFinal": true },
  "llmResponse": {
    "utterance": "The left ventricle pumps...",
    "intent": "explain_anatomy",
    "tool_action": { "op": "highlight", "target": "left_ventricle" }
  }
}
```

## 🧩 Adding New Modules

### Adding a New LLM Provider

1. Create `backend/llm/my-provider.ts`:

```typescript
import { LLMProvider, LLMResponse, RAGContext } from '../../shared/types';

export class MyLLMProvider implements LLMProvider {
  name = 'my-provider';

  isConfigured(): boolean {
    return !!process.env.MY_API_KEY;
  }

  async generateResponse(transcript: string, context?: RAGContext): Promise<LLMResponse> {
    // Implement your LLM integration
  }
}
```

2. Add to `backend/llm/index.ts`:

```typescript
case 'my-provider':
  return getMyProvider();
```

3. Update `.env`:
```env
LLM_PROVIDER=my-provider
MY_API_KEY=your_key
```

### Adding RAG Integration

1. Implement `RAGRetriever` interface in `backend/rag/`:

```typescript
export class MyRAGRetriever implements RAGRetriever {
  async retrieve(query: string, topK?: number): Promise<Document[]> {
    // 1. Generate embedding for query
    // 2. Search vector database
    // 3. Return relevant documents
  }
}
```

2. Enable in `.env`:
```env
ENABLE_RAG=true
```

### Adding Tool Handlers

1. Implement `ToolHandler` interface in `backend/tools/`:

```typescript
export class MyToolHandler implements ToolHandler {
  canHandle(action: ToolAction): boolean {
    return action.op === 'my-action';
  }

  async execute(action: ToolAction): Promise<ToolResult> {
    // Execute tool action
  }
}
```

2. Enable in `.env`:
```env
ENABLE_TOOLS=true
```

## 🎨 Frontend Customization

The frontend is intentionally minimal and modular. To redesign:

1. **Keep the hook:** `useVoiceAgent.ts` contains all WebSocket logic
2. **Replace UI:** Modify or replace `VoiceInterface.tsx`
3. **Add features:** Extend the hook with new methods

Example:
```typescript
// Your custom component
import { useVoiceAgent } from './hooks/useVoiceAgent';

function MyCustomUI() {
  const { isRecording, transcript, startRecording, stopRecording } = useVoiceAgent();

  // Your custom UI implementation
}
```

## 🔧 Configuration Options

### LLM Providers

- **Bedrock** (default): AWS-hosted Claude models
- **OpenAI**: GPT-4 and other models (TODO: implement)
- **Local**: Ollama, LM Studio, etc. (TODO: implement)

### STT Providers

- **Deepgram** (default): Real-time transcription

### TTS Providers

- **Web Speech API** (default): Browser-based
- **External**: Polly, Google TTS, etc. (TODO: implement)

## 📦 Deployment

### Backend Deployment (AWS Lambda)

1. Build the backend:
```bash
cd backend
npm run build
```

2. Create Lambda function with the following configuration:
   - Runtime: Node.js 18.x
   - Handler: `dist/server.handler`
   - Environment variables from `.env`

3. Add API Gateway with WebSocket support

### Backend Deployment (EC2/Docker)

```bash
# Build Docker image (TODO: create Dockerfile)
docker build -t voice-agent-backend ./backend
docker run -p 3001:3001 --env-file .env voice-agent-backend
```

### Frontend Deployment (S3 + CloudFront)

```bash
cd frontend
npm run build

# Upload dist/ to S3
aws s3 sync dist/ s3://your-bucket-name

# Configure CloudFront distribution
```

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test

# Type checking
npm run type-check
```

## 🐛 Troubleshooting

### WebSocket Connection Failed

- Check backend is running on port 3001
- Verify `VITE_WS_URL` in frontend `.env`
- Check CORS configuration in `backend/config/env.ts`

### Deepgram Transcription Not Working

- Verify `DEEPGRAM_API_KEY` is set
- Check microphone permissions in browser
- Ensure audio is being streamed (check browser console)

### LLM Responses Not Generating

- Check AWS credentials are valid
- Verify Bedrock model access in your AWS account
- Test with `/test/llm` endpoint

### Audio Not Playing

- Check browser supports Web Speech API
- Verify audio permissions
- Check browser console for errors

## 🔐 Security Considerations

- Never commit `.env` files
- Use IAM roles instead of access keys in production
- Validate all user inputs
- Implement rate limiting
- Use HTTPS/WSS in production
- Sanitize LLM outputs before display

## 📚 Resources

- [Deepgram API Docs](https://developers.deepgram.com/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [BioDigital Human API](https://developer.biodigital.com/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

## 🤝 Contributing

This is a modular foundation. Contributions welcome for:

- [ ] OpenAI LLM integration
- [ ] Local model support (Ollama)
- [ ] RAG implementation (Pinecone, Weaviate)
- [ ] BioDigital Human integration
- [ ] External TTS providers
- [ ] LiveKit real-time video integration
- [ ] Advanced diagnostics features

## 📄 License

MIT

## 🎯 Next Steps

1. **Complete TODOs** in codebase (search for `// TODO:`)
2. **Add RAG** for medical knowledge retrieval
3. **Integrate BioDigital** for 3D anatomy visualization
4. **Implement OpenAI provider** as alternative to Bedrock
5. **Add user authentication** and session management
6. **Create diagnostic workflows** for clinical education
7. **Deploy to production** with proper monitoring

---

**Built with ❤️ for healthcare education**
