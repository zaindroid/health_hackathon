# 🔧 Install Tailscale in WSL

## Why You Need This

Your backend runs in WSL, but Tailscale is on Windows. WSL can't access Tailscale's network, so you need Tailscale inside WSL too.

## ✅ Installation Steps

### 1. Install Tailscale in WSL

```bash
# Download and run the install script
curl -fsSL https://tailscale.com/install.sh | sh
```

### 2. Start Tailscale

```bash
# Start Tailscale (may need sudo)
sudo tailscale up
```

This will give you a login URL. Open it in your browser and authenticate.

### 3. Verify It Works

```bash
# Check Tailscale status
tailscale status

# Test access to your remote PC
curl https://ged25-ki.tail51b02f.ts.net:11443/v1/models
```

You should now see the JSON response with your models!

### 4. Restart Backend

```bash
cd ~/healthy_hack/backend
npm run dev
```

Your backend should now be able to connect to Qwen3!

---

## 🐛 Troubleshooting

### "Permission denied" when starting Tailscale

```bash
# Run with sudo
sudo tailscale up
```

### "Already logged in on another device"

That's fine! Tailscale allows multiple devices per account. Just authenticate when prompted.

### WSL and Windows Tailscale Conflict

If you have issues, you can:
- Use different Tailscale accounts for WSL and Windows
- Or use the same account (recommended) - they'll both be on your tailnet

---

## ✅ Expected Result

After installation:

```bash
# This should work from WSL:
curl https://ged25-ki.tail51b02f.ts.net:11443/v1/models

# Output:
{"object":"list","data":[{"id":"qwen3-fixed:latest",...}]}
```

Then your Node.js backend will work perfectly! 🎉
