# 🚀 START HERE - Launch Instructions

## ✅ Setup Complete!

Your environment is configured with:
- ✅ Deepgram API key
- ✅ OpenAI API key (gpt-4o-mini)
- ✅ All dependencies installed

## 🎯 Start the Application

### Terminal 1 - Start Backend

```bash
cd ~/healthy_hack/backend
npm run dev
```

You should see:
```
✅ OpenAI LLM Provider initialized
✅ Deepgram STT Provider initialized
✅ All required configurations are set
🚀 Voice Agent Server Started!
```

### Terminal 2 - Start Frontend

```bash
cd ~/healthy_hack/frontend
npm run dev
```

You should see:
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

## 🎤 Using the Voice Agent

1. **Open Browser**: Go to http://localhost:5173
2. **Click "Start Talking"**: Allow microphone access when prompted
3. **Speak**: Say something like "Tell me about the human heart"
4. **Listen**: The AI will respond with voice output

## 🧪 Test Commands

Try these voice commands:
- "What is the function of the left ventricle?"
- "Explain the circulatory system"
- "Tell me about the lungs"
- "How does the brain work?"

## 🐛 Troubleshooting

### Backend won't start
- Check that `.env` file exists in `backend/` directory
- Verify API keys are set correctly
- Look for error messages in console

### Frontend can't connect
- Ensure backend is running first on port 3001
- Check WebSocket URL in `frontend/.env`
- Look for connection errors in browser console

### Microphone not working
- Grant microphone permissions in browser
- Try using Chrome or Edge (best WebSocket support)
- Check audio input device settings

### No AI response
- Check OpenAI API key is valid
- Check Deepgram is transcribing (you'll see transcript)
- Look for errors in backend console

## 📊 Configuration Status

Check backend configuration:
```bash
curl http://localhost:3001/health
```

Test LLM integration:
```bash
curl -X POST http://localhost:3001/test/llm
```

## 🔐 Security Reminder

**IMPORTANT**: Your API keys in this conversation are now public. Regenerate them:

1. **Deepgram**: https://console.deepgram.com/ → API Keys
2. **OpenAI**: https://platform.openai.com/api-keys

Then update `backend/.env` with new keys.

## 📝 Project Files

- **Backend API**: `backend/server.ts`
- **Voice Logic**: `backend/routes/voice.ts`
- **OpenAI Integration**: `backend/llm/openai.ts`
- **Frontend Hook**: `frontend/src/hooks/useVoiceAgent.ts`
- **UI Component**: `frontend/src/components/VoiceInterface.tsx`

## 🎨 Customization

### Change AI Model
Edit `backend/.env`:
```env
OPENAI_MODEL=gpt-4o        # More capable, higher cost
OPENAI_MODEL=gpt-4o-mini   # Balanced (current)
```

### Switch to Bedrock
Edit `backend/.env`:
```env
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

### Customize UI
Edit: `frontend/src/components/VoiceInterface.tsx`

All logic is in `useVoiceAgent` hook - UI is easily replaceable!

## 📚 Full Documentation

- **README.md** - Complete architecture guide
- **QUICKSTART.md** - 5-minute setup guide
- **Inline comments** - Clear TODOs throughout code

## 🎯 Next Steps

1. ✅ Test the voice agent
2. 🎨 Customize the UI design
3. 📚 Add RAG for medical knowledge
4. 🔧 Integrate 3D anatomy viewer (BioDigital)
5. 🚀 Deploy to production

---

**Need help?** Check the troubleshooting section or review console logs for errors.

**Ready to build?** All TODOs are marked in the code for easy extension!

Good luck! 🎉
