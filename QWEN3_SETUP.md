# 🚀 Qwen3 Local Model Setup Guide

## ✅ Implementation Complete!

I've implemented full support for your Qwen3 model! The local LLM provider now works with any OpenAI-compatible endpoint.

## 📋 What You Need

To connect to your Qwen3 model via Tailscale, I need:

1. **Tailscale IP address** of your remote PC
2. **Port number** your model server is running on
3. **API endpoint path** (usually `/v1` for OpenAI-compatible)
4. **Model name** (usually `qwen3` or specific variant)

## 🔧 Configuration

### Step 1: Find Your Model Server Details

**If you're using Ollama:**
- Default endpoint: `http://TAILSCALE_IP:11434/v1`
- Model name: Check with `ollama list`

**If you're using vLLM:**
- Default endpoint: `http://TAILSCALE_IP:8000/v1`
- Model name: The name you specified when starting vLLM

**If you're using LM Studio:**
- Default endpoint: `http://TAILSCALE_IP:1234/v1`
- Model name: Usually just the model file name

**If you're using text-generation-webui:**
- Default endpoint: `http://TAILSCALE_IP:5000/v1`
- Model name: Check the loaded model

### Step 2: Update Backend .env

Edit `backend/.env` and add:

```env
# Switch to local provider
LLM_PROVIDER=local

# Your Qwen3 model configuration
LOCAL_MODEL_ENDPOINT=http://YOUR_TAILSCALE_IP:PORT/v1
LOCAL_MODEL_NAME=qwen3

# Example for Ollama:
# LOCAL_MODEL_ENDPOINT=http://100.100.100.50:11434/v1
# LOCAL_MODEL_NAME=qwen2.5:latest

# Example for vLLM:
# LOCAL_MODEL_ENDPOINT=http://100.100.100.50:8000/v1
# LOCAL_MODEL_NAME=Qwen/Qwen2.5-7B-Instruct
```

### Step 3: Test Connection

Before starting the full system, test the connection:

```bash
# Test with curl (replace with your actual endpoint)
curl http://YOUR_TAILSCALE_IP:PORT/v1/models

# Should return a list of available models
```

### Step 4: Start Backend

```bash
cd ~/healthy_hack/backend
npm run dev
```

You should see:
```
✅ Local LLM Provider initialized
   Endpoint: http://YOUR_TAILSCALE_IP:PORT/v1
   Model: qwen3
🚀 Voice Agent Server Started!
```

## 🧪 Testing

Once configured, test it:

1. **Refresh frontend**: http://localhost:5173
2. **Click "Start Talking"**
3. **Say**: "Tell me about the heart"
4. **Listen** to Qwen3's response!

## 🔍 Common Endpoint Formats

### Ollama
```env
LOCAL_MODEL_ENDPOINT=http://100.100.100.50:11434/v1
LOCAL_MODEL_NAME=qwen2.5:7b
```

### vLLM
```env
LOCAL_MODEL_ENDPOINT=http://100.100.100.50:8000/v1
LOCAL_MODEL_NAME=Qwen/Qwen2.5-7B-Instruct
```

### LM Studio
```env
LOCAL_MODEL_ENDPOINT=http://100.100.100.50:1234/v1
LOCAL_MODEL_NAME=qwen2.5-7b-instruct
```

### Tabby (OpenAI compatible)
```env
LOCAL_MODEL_ENDPOINT=http://100.100.100.50:8080/v1
LOCAL_MODEL_NAME=qwen2.5
```

## 🐛 Troubleshooting

### "Cannot connect to local model"

1. **Check Tailscale is running:**
   ```bash
   tailscale status
   ```

2. **Ping your remote PC:**
   ```bash
   ping YOUR_TAILSCALE_IP
   ```

3. **Check model server is running:**
   ```bash
   curl http://YOUR_TAILSCALE_IP:PORT/health
   # or
   curl http://YOUR_TAILSCALE_IP:PORT/v1/models
   ```

4. **Verify firewall allows connections:**
   - On remote PC, ensure port is open
   - Check if Tailscale is allowing the connection

### "Model not found"

- Check model name matches exactly what's loaded
- Try listing models: `curl http://YOUR_TAILSCALE_IP:PORT/v1/models`

### "Timeout errors"

- Increase timeout in the code if needed
- Check network latency: `ping YOUR_TAILSCALE_IP`
- Ensure model is fully loaded on remote PC

### "JSON parsing errors"

Qwen3 might not be returning proper JSON. I've added fallback handling, but you can:
1. Check model temperature (lower = more consistent)
2. Use JSON mode if your serving software supports it
3. The system will use the raw text as fallback

## 💡 Tips for Better Performance

### 1. Response Quality
```env
# In backend/llm/local.ts, you can adjust:
temperature: 0.7     # Lower = more focused (0.3-0.5 for medical)
max_tokens: 500      # Adjust based on your needs
```

### 2. Speed Optimization
- Use quantized models (Q4, Q5) for faster inference
- Ensure GPU is being used on remote PC
- Consider model size vs. speed tradeoff

### 3. Network Optimization
- Tailscale should add minimal latency
- Test with: `ping -c 10 YOUR_TAILSCALE_IP`
- Good: <50ms, Acceptable: <200ms

## 📊 Feature Comparison

| Feature | Qwen3 (Local) | Mock | OpenAI |
|---------|---------------|------|---------|
| Cost | FREE | FREE | $0.15/1M |
| Speed | Medium | Instant | Fast |
| Quality | Good-Excellent | Good | Excellent |
| Privacy | Full | Full | Cloud |
| Customization | Full | None | Limited |

## 🎯 Next Steps

Once working with Qwen3:

1. ✅ Test basic responses
2. 🎨 Fine-tune prompts for better medical responses
3. 📚 Add RAG for enhanced medical knowledge
4. 🔧 Adjust temperature/max_tokens for optimal output
5. 🚀 Enjoy your private, FREE AI assistant!

## 📝 Example Configuration

Here's a complete example for Ollama with Qwen3:

```env
# backend/.env

# Server
PORT=3001
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173

# Use local model
LLM_PROVIDER=local

# Qwen3 via Tailscale
LOCAL_MODEL_ENDPOINT=http://100.100.100.50:11434/v1
LOCAL_MODEL_NAME=qwen2.5:7b

# Deepgram (still needed for STT)
DEEPGRAM_API_KEY=your_deepgram_key

# Features
ENABLE_RAG=false
ENABLE_TOOLS=false
```

## 🆘 Need Help?

If you're stuck, check:
1. Backend console for connection errors
2. Remote PC logs for model serving issues
3. Tailscale status for network issues
4. Model server logs for API errors

---

**Ready to configure!** Just tell me:
1. Your Tailscale IP
2. The port your model server uses
3. What software you're using (Ollama, vLLM, etc.)

And I'll configure it for you! 🚀
