# 🚀 Quick Start Guide

## 📋 Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Deepgram API key ([Sign up here](https://deepgram.com/))
- [ ] AWS account with Bedrock access (or OpenAI API key)

## ⚡ 5-Minute Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit and add your keys
# Required: DEEPGRAM_API_KEY, AWS credentials
nano .env
```

### 3. Run Development Servers

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

### 4. Test the Application

1. Open [http://localhost:5173](http://localhost:5173)
2. Click "Start Talking"
3. Allow microphone access
4. Say: "Tell me about the human heart"
5. Listen to the AI response!

## 🔑 Getting API Keys

### Deepgram (Required)

1. Visit [console.deepgram.com](https://console.deepgram.com/)
2. Sign up for free account
3. Create a new API key
4. Copy to `.env` as `DEEPGRAM_API_KEY`

### AWS Bedrock (Default LLM)

1. Log into AWS Console
2. Navigate to IAM → Users
3. Create access key
4. Enable Bedrock model access in your region
5. Add to `.env`:
   ```env
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_REGION=us-east-1
   ```

### Alternative: OpenAI

1. Visit [platform.openai.com](https://platform.openai.com/)
2. Create API key
3. Update `.env`:
   ```env
   LLM_PROVIDER=openai
   OPENAI_API_KEY=your_key
   ```
4. Implement OpenAI provider (see `backend/llm/openai.ts`)

## 🧪 Testing the System

### Test Backend Health

```bash
curl http://localhost:3001/health
```

### Test LLM Integration

```bash
curl -X POST http://localhost:3001/test/llm
```

### Test WebSocket Connection

Open browser console on frontend and check for:
- "✅ WebSocket connected"
- "🎤 Recording started" after clicking Start

## 🐛 Common Issues

### "WebSocket connection failed"

- Ensure backend is running on port 3001
- Check firewall settings
- Verify CORS configuration

### "Microphone access denied"

- Check browser permissions
- Use HTTPS in production (required for mic access)
- Try a different browser

### "Deepgram API error"

- Verify API key is correct
- Check your Deepgram credits
- Ensure audio format is correct (16kHz, mono)

### "AWS Bedrock not authorized"

- Enable Bedrock model access in AWS console
- Check IAM permissions
- Verify region supports your chosen model

## 📝 Example Queries

Try these to test the system:

- "What is the function of the left ventricle?"
- "Explain the circulatory system"
- "Tell me about the respiratory system"
- "How does the brain process information?"
- "What are the chambers of the heart?"

## 🎯 Next Steps

1. ✅ Get the basic system running
2. 🔧 Customize the UI in `frontend/src/components/VoiceInterface.tsx`
3. 🤖 Implement additional LLM providers
4. 📚 Add RAG for medical knowledge
5. 🔧 Integrate BioDigital for 3D visualization
6. 🚀 Deploy to production

## 📚 Documentation

- Full documentation: [`README.md`](./README.md)
- Architecture details: See README
- API reference: See README
- Deployment guide: See README

## 💡 Tips

- Use headphones to avoid audio feedback
- Speak clearly and at normal pace
- Keep queries under 30 seconds
- Check browser console for debug info
- Review `backend/llm/bedrock.ts` to customize AI behavior

## 🆘 Need Help?

Check:
1. Backend console for errors
2. Frontend browser console
3. Network tab for WebSocket messages
4. `/health` endpoint for configuration status

---

**Happy Building! 🎉**
