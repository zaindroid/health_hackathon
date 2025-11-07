# 🧪 Testing Ollama on Remote PC (ged25-ki)

## SSH into Your Remote PC First

From your Windows machine:
```bash
ssh zulhaq@100.124.93.99
# or
ssh zulhaq@ged25-ki.tail51b02f.ts.net
```

---

## ✅ Step 1: Check if Ollama Container is Running

```bash
docker ps | grep ollama
```

**Expected output:**
```
ollama    Up 2 days    127.0.0.1:11434->11434/tcp
```

**If not running:**
```bash
# Start it
docker start ollama

# Or check your service manager
ged-services status
```

---

## ✅ Step 2: Test Ollama Native API (Local)

Test that Ollama itself is working:

```bash
# List available models
curl http://localhost:11434/api/tags

# Should show your models including qwen3-fixed:latest
```

**Test a simple generation:**
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen3-fixed:latest",
  "prompt": "Say hello",
  "stream": false
}'
```

This should return a JSON response with generated text.

---

## ✅ Step 3: Test OpenAI-Compatible API (What We Need!)

This is the key test - the `/v1` endpoint:

```bash
# List models via OpenAI-compatible endpoint
curl http://localhost:11434/v1/models
```

**Expected output:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "qwen3-fixed:latest",
      "object": "model",
      "created": 1234567890,
      "owned_by": "library"
    },
    ...
  ]
}
```

**If this fails or returns 404**, it means the OpenAI-compatible API is not enabled!

---

## ✅ Step 4: Test Chat Completion (Full Test)

Test the actual chat endpoint we're using:

```bash
curl http://localhost:11434/v1/chat/completions -H "Content-Type: application/json" -d '{
  "model": "qwen3-fixed:latest",
  "messages": [
    {"role": "user", "content": "Hello, are you working?"}
  ],
  "max_tokens": 50
}'
```

**Expected output:**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "qwen3-fixed:latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Yes, I'm working! How can I help you?"
      },
      "finish_reason": "stop"
    }
  ]
}
```

---

## ✅ Step 5: Test External Access (From Your Windows Machine)

Now test from your Windows machine (where the backend runs):

```bash
# Test from Windows (in Git Bash or WSL)
curl http://100.124.93.99:11434/v1/models

# Or use PowerShell
Invoke-RestMethod -Uri "http://100.124.93.99:11434/v1/models"
```

**If this fails but localhost works**, it's a firewall/network issue.

---

## 🔧 Troubleshooting

### ❌ Problem: "404 Not Found" on `/v1/models`

**Solution:** Ollama's OpenAI compatibility might not be enabled.

**Check Ollama version:**
```bash
docker exec ollama ollama --version
```

**You need Ollama v0.1.26 or higher** for OpenAI API compatibility.

**Update if needed:**
```bash
docker pull ollama/ollama:latest
docker restart ollama
```

### ❌ Problem: "Connection Refused" from Windows

**Check if port 11434 is exposed:**
```bash
docker ps | grep ollama
# Look for: 0.0.0.0:11434 or 127.0.0.1:11434
```

**If it shows `127.0.0.1:11434`**, it's only accessible locally!

**Fix:** Update your docker-compose or container to expose it:
```yaml
ports:
  - "0.0.0.0:11434:11434"  # Expose to all interfaces
```

**Or restart Ollama with:**
```bash
docker run -d \
  -v ollama:/root/.ollama \
  -p 0.0.0.0:11434:11434 \
  --name ollama \
  ollama/ollama
```

### ❌ Problem: OpenAI API Returns Errors

**Enable CORS if needed:**
```bash
docker run -d \
  -v ollama:/root/.ollama \
  -p 11434:11434 \
  -e OLLAMA_ORIGINS="*" \
  --name ollama \
  ollama/ollama
```

### ❌ Problem: Firewall Blocking

**Check firewall on remote PC:**
```bash
# On Linux
sudo ufw status
sudo ufw allow 11434/tcp

# Or check iptables
sudo iptables -L -n | grep 11434
```

---

## 📊 Quick Test Summary

Run these in order:

```bash
# 1. Is container running?
docker ps | grep ollama

# 2. Does native API work?
curl http://localhost:11434/api/tags

# 3. Does OpenAI API work? (MOST IMPORTANT)
curl http://localhost:11434/v1/models

# 4. Can we chat?
curl http://localhost:11434/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"qwen3-fixed:latest","messages":[{"role":"user","content":"test"}]}'

# 5. From Windows - is it externally accessible?
# Run this from Windows machine:
curl http://100.124.93.99:11434/v1/models
```

---

## 🎯 Expected Results for Success

✅ Step 1: Container is running
✅ Step 2: Native API returns model list
✅ Step 3: OpenAI API (`/v1/models`) returns JSON list
✅ Step 4: Chat completion works and returns response
✅ Step 5: Accessible from Windows machine

If **all pass**, your backend should work!

If **Step 3 fails**, Ollama OpenAI compatibility is not enabled.

If **Step 5 fails**, it's a network/firewall issue.

---

## 🔍 Check Ollama Logs

If things aren't working:

```bash
# View Ollama logs
docker logs ollama -f

# Check for errors when you make requests
```

---

## 💡 Alternative: Use Ollama Without Docker

If Docker is causing issues, you can run Ollama directly:

```bash
# Install Ollama (if not using Docker)
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# In another terminal, list models
ollama list
```

---

## 📝 What to Share

After testing, share these outputs:

1. `docker ps | grep ollama`
2. `curl http://localhost:11434/v1/models`
3. Any error messages you see

This will help diagnose the exact issue!
