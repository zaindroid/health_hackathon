# 🔧 Deepgram Connection Fixes

## Issues Identified

The Deepgram connection was closing immediately after opening because:

1. **Event Handler Timing**: Event handlers were being registered INSIDE the Open event, causing a race condition
2. **Audio Buffering**: Audio data was being sent before the connection was ready
3. **No Keep-Alive**: Connection was timing out due to lack of activity signal

## Fixes Applied

### 1. Event Handler Registration (backend/stt/deepgram.ts)

**Before:**
```typescript
this.connection.on(LiveTranscriptionEvents.Open, () => {
  // Events registered HERE - too late!
  this.connection.on(LiveTranscriptionEvents.Transcript, ...)
});
```

**After:**
```typescript
// Set up ALL event handlers BEFORE connection opens
this.connection.on(LiveTranscriptionEvents.Transcript, ...);
this.connection.on(LiveTranscriptionEvents.Error, ...);
this.connection.on(LiveTranscriptionEvents.Close, ...);
this.connection.on(LiveTranscriptionEvents.Open, () => {
  // Connection is ready, flush buffer
});
```

### 2. Audio Buffering

**Added:**
```typescript
private audioBuffer: Buffer[] = [];

sendAudio(audioData: Buffer): void {
  if (this.isActive) {
    // Send immediately if connected
    this.connection.send(audioData);
  } else {
    // Buffer until connection opens
    this.audioBuffer.push(audioData);
  }
}
```

**Benefits:**
- No audio data is lost during connection setup
- Buffered audio is sent immediately when connection opens
- Buffer size limited to prevent memory issues

### 3. Keep-Alive Mechanism

**Added:**
```typescript
private startKeepAlive(): void {
  this.keepAliveInterval = setInterval(() => {
    if (this.connection && this.isActive) {
      this.connection.keepAlive();
    }
  }, 5000);
}
```

**Benefits:**
- Keeps connection alive during silence
- Prevents timeout disconnections
- Cleaned up properly on close

### 4. Explicit Audio Format

**Added:**
```typescript
this.connection = this.deepgram.listen.live({
  model: 'nova-2',
  language: 'en-US',
  encoding: 'linear16',    // Explicit format
  sample_rate: 16000,      // Match frontend
  channels: 1,             // Mono audio
  // ... other settings
});
```

**Benefits:**
- No format mismatch
- Better transcription quality
- Matches frontend audio settings

## Testing

### Expected Log Output

**Successful Connection:**
```
🎤 Deepgram connection opened and ready
📤 Sending 3 buffered audio chunks
📝 Transcript (interim): hello
📝 Transcript (final): Hello, tell me about the heart
🤖 Sending request to OpenAI...
✅ OpenAI response received
```

### Signs of Success

✅ No "Cannot send audio" warnings
✅ Connection stays open during speech
✅ Transcripts appear in console
✅ LLM responses are generated
✅ Voice output plays in browser

## How to Test

1. **Restart Backend**:
   ```bash
   cd ~/healthy_hack/backend
   npm run dev
   ```

2. **Refresh Frontend**:
   - Open http://localhost:5173
   - Click "Start Talking"
   - Speak clearly: "Tell me about the human heart"

3. **Watch Backend Logs**:
   - Should see "Deepgram connection opened and ready"
   - Should see transcript lines appearing
   - Should see OpenAI responses

4. **Listen for Voice**:
   - Browser should speak the AI response
   - Check browser console for any errors

## Troubleshooting

### Connection Still Closing?

1. Check Deepgram API key is valid
2. Verify you have API credits
3. Check firewall isn't blocking WebSocket

### No Audio Buffering?

1. Check microphone permissions in browser
2. Verify audio format matches (16kHz, mono, PCM16)
3. Check browser console for audio errors

### Keep-Alive Not Working?

1. Check for errors in console
2. Verify connection.keepAlive() method exists
3. May need to update @deepgram/sdk to latest

## Next Steps

If issues persist:

1. Check Deepgram dashboard for API logs
2. Enable verbose logging in Deepgram SDK
3. Test with a simple audio file first
4. Consider using Deepgram's test endpoint

---

**Changes Made:**
- `backend/stt/deepgram.ts` - Complete rewrite of connection handling
- Audio buffering mechanism added
- Keep-alive system implemented
- Better error handling and logging
