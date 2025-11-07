# 🎙️ Voice-Controlled 3D Anatomy Navigation

## ✅ What's Been Integrated

I've successfully integrated your 3D anatomy navigation system into the LiveKit voice agent! Now you can control the BioDigital 3D viewer using **voice commands only** - no buttons needed.

---

## 🏗️ Architecture Overview

```
User Voice → Deepgram STT → Qwen3 LLM → Tool Action → Anatomy Navigator → Camera Command → WebSocket → Frontend → BioDigital 3D Viewer
```

**Flow:**
1. You speak: "Show me the back view"
2. Deepgram transcribes to text
3. Qwen3 generates JSON response with tool_action
4. Tool handler executes navigation lookup
5. Camera coordinates sent via WebSocket
6. Frontend automatically pans 3D camera

---

## 📁 New Files Created

### Backend:
1. **`backend/tools/anatomy_navigator.ts`** - TypeScript port of your Python navigator
   - Loads anatomy-data.json database
   - Looks up viewpoint camera coordinates
   - Generates camera commands

2. **Updated `backend/tools/biodigital_placeholder.ts`** - Now fully functional!
   - Handles tool actions: `show_front`, `show_back`, `show_right_shoulder`, `show_left_shoulder`
   - Returns camera commands to voice route

3. **Updated `backend/routes/voice.ts`** - Sends camera commands
   - Executes tool actions when LLM generates them
   - Sends camera commands via WebSocket to frontend

4. **Updated `backend/llm/local.ts`** - Enhanced prompt
   - LLM now knows about 3D navigation tools
   - Includes examples of navigation commands

### Frontend:
1. **`frontend/src/components/BioDigitalViewer.tsx`** - 3D viewer component
   - Loads BioDigital Human API
   - Listens for camera command events
   - Automatically executes navigation

2. **Updated `frontend/src/App.tsx`** - Split-screen layout
   - Left: 3D Anatomy Viewer (70% width)
   - Right: Voice Interface (30% width)

3. **Updated `frontend/src/hooks/useVoiceAgent.ts`** - Camera command handling
   - Receives camera commands from WebSocket
   - Dispatches events to 3D viewer

### Configuration:
1. **Updated `backend/.env`**
   - `ENABLE_TOOLS=true` ✅

2. **Updated `shared/types.ts`**
   - Added `camera_command` message type
   - Added camera command interface

---

## 🎯 Supported Voice Commands

The LLM has been trained to recognize these navigation intents:

| Voice Command | Tool Action | Result |
|---------------|-------------|--------|
| "Show me the front view" | `show_front` | Front view of neck & shoulders |
| "Rotate to the back" | `show_back` | Back view showing trapezius, upper back |
| "Show the right shoulder" | `show_right_shoulder` | Right lateral view of shoulder |
| "Show me the left shoulder" | `show_left_shoulder` | Left lateral view of shoulder |

**Natural variations also work:**
- "Let me see the front"
- "Turn it around to the back"
- "Focus on the right shoulder"
- "Switch to left shoulder view"

---

## 🚀 How to Test

### Step 1: Start Backend

```bash
cd ~/healthy_hack/backend
npm run dev
```

**You should see:**
```
✅ Anatomy Navigator initialized
   Default model: neck_shoulders_upper_back
✅ BioDigital Tool Handler initialized with Anatomy Navigator
🚀 Server running on port 3001
```

### Step 2: Start Frontend

```bash
cd ~/healthy_hack/frontend
npm run dev
```

**Open browser:** http://localhost:5173

### Step 3: Test Voice Navigation

1. Click "Start Talking"
2. Say: **"Show me the front view"**
3. Watch the 3D model automatically rotate!

**Try these:**
- "Show me the back"
- "Rotate to the right shoulder"
- "Show the left shoulder"
- "Go back to the front view"

---

## 🔍 Behind the Scenes

### Example Flow:

**User says:** "Show me the back view"

**1. Deepgram STT:**
```
Transcript: "Show me the back view"
```

**2. Qwen3 LLM Response:**
```json
{
  "utterance": "Rotating to show you the back muscles and spine.",
  "intent": "navigate",
  "tool_action": {
    "op": "show_back"
  }
}
```

**3. Anatomy Navigator Lookup:**
```typescript
// Looks up in anatomy-data.json
{
  "id": "back",
  "camera": {
    "position": { "x": -3.45, "y": 149.66, "z": 62.83 },
    "target": { "x": 1.04, "y": 152.04, "z": 10.25 }
  }
}
```

**4. Camera Command Generated:**
```json
{
  "action": "camera.set",
  "params": {
    "position": { "x": -3.45, "y": 149.66, "z": 62.83 },
    "target": { "x": 1.04, "y": 152.04, "z": 10.25 },
    "animate": true,
    "duration": 1000
  }
}
```

**5. WebSocket Message to Frontend:**
```json
{
  "type": "camera_command",
  "cameraCommand": { ... }
}
```

**6. BioDigital Viewer Execution:**
```javascript
human.send("camera.set", {
  position: { x: -3.45, y: 149.66, z: 62.83 },
  target: { x: 1.04, y: 152.04, z: 10.25 },
  animate: true,
  duration: 1000
});
```

**Result:** Camera smoothly pans to back view in 1 second! ✨

---

## 📊 Database Structure

Your `anatomy-data.json` contains:

```json
{
  "models": [
    {
      "id": "neck_shoulders_upper_back",
      "name": "Neck, Shoulders & Upper Back",
      "viewpoints": [
        {
          "id": "front",
          "name": "Front View",
          "camera": {
            "position": { "x": 1.52, "y": 161.48, "z": -62.83 },
            "target": { "x": 1.03, "y": 158.82, "z": -15.39 }
          }
        },
        {
          "id": "back",
          "name": "Back of Shoulder and Neck",
          "camera": { ... }
        },
        ...
      ]
    }
  ]
}
```

The system automatically looks up these coordinates based on the tool action.

---

## 🛠️ How to Add New Viewpoints

### Option 1: Edit JSON Database

Add new viewpoints to `backend/navigation_tests/anatomy-data.json`:

```json
{
  "id": "top",
  "name": "Top View",
  "buttonLabel": "Top View",
  "camera": {
    "position": { "x": 0, "y": 200, "z": 0 },
    "target": { "x": 0, "y": 150, "z": 0 }
  }
}
```

### Option 2: Add New Tool Actions

Update `backend/tools/biodigital_placeholder.ts`:

```typescript
case 'show_top':
  cameraCommand = this.navigator.navigateToViewpoint('top', action.params?.model_id);
  break;
```

Update LLM prompt in `backend/llm/local.ts`:

```typescript
3D NAVIGATION TOOLS:
- "show_top": Show top view of the anatomy
```

### Option 3: Use Generic Navigate

Already supported! User can say:
- "Navigate to the top view"

And LLM can generate:
```json
{
  "tool_action": {
    "op": "navigate",
    "target": "top"
  }
}
```

---

## 🔧 Debugging

### Check Backend Logs:

Look for:
```
[*] Looking up model 'neck_shoulders_upper_back' in database...
[+] Found model: Neck, Shoulders & Upper Back
[*] Finding coordinates for 'back' viewpoint...
[+] Found coordinates: position={...}, target={...}
[>] Generating camera pan command...
[+] Camera command generated
📹 Camera command sent to frontend: camera.set
```

### Check Frontend Console:

Look for:
```
✅ BioDigital 3D Viewer is ready
🎙️ Voice agent can now control the 3D model
📹 Received camera command: { action: 'camera.set', ... }
📹 Dispatched camera command event: camera.set
📹 Executing camera command: { action: 'camera.set', ... }
✅ Camera panned to new position
```

### Common Issues:

**1. "BioDigital viewer not ready yet"**
- Wait a few seconds after page load
- BioDigital iframe takes time to initialize

**2. Camera not moving:**
- Check browser console for HumanAPI errors
- Verify iframe src URL is correct
- Check if BioDigital API key is valid

**3. LLM not generating tool actions:**
- Check if `ENABLE_TOOLS=true` in backend/.env
- Look at LLM response in backend logs
- Verify Qwen3 is understanding the prompt

---

## 🎨 Customization

### Change Default Model:

Edit `backend/tools/anatomy_navigator.ts`:

```typescript
private currentModelId: string = 'muscular_system'; // Changed from 'neck_shoulders_upper_back'
```

### Change Animation Duration:

Edit `backend/tools/anatomy_navigator.ts`:

```typescript
private cameraPanTo(position: CameraPosition, animate: boolean = true, duration: number = 2000): CameraCommand {
  // Changed duration from 1000ms to 2000ms (slower, smoother)
```

### Change Default View:

Edit `frontend/src/components/BioDigitalViewer.tsx`:

```typescript
human.send('camera.set', {
  position: { x: -3.45, y: 149.66, z: 62.83 }, // Back view instead of front
  target: { "x": 1.04, "y": 152.04, "z": 10.25 },
  animate: true,
  duration: 1000,
});
```

---

## 🚀 Advanced: Adding More Models

You have 3 models in your database:
1. **neck_shoulders_upper_back** (currently active)
2. **skeletal_system**
3. **muscular_system**

To switch models via voice:

1. Update LLM prompt to include model switching
2. Add tool action: `switch_model`
3. Update navigator to handle model changes

Example:
```typescript
case 'switch_model':
  if (action.target) {
    this.navigator.setCurrentModel(action.target);
    return { success: true, message: `Switched to ${action.target}` };
  }
  break;
```

---

## 📈 Performance

**Current latency breakdown:**
- Voice → STT: 100-300ms
- Deepgram STT: 50-100ms
- Qwen3 Generation: 10-30s (using 30B model)
- Tool Execution: <10ms
- WebSocket → Frontend: <50ms
- 3D Animation: 1000ms (configurable)

**Total:** ~11-31 seconds (mostly Qwen3)

**To reduce latency:** See CARTESIA_AND_LATENCY.md for suggestions on using 7B model.

---

## 🎉 Summary

**What works now:**
✅ Voice commands control 3D anatomy viewer
✅ No buttons needed - fully autonomous
✅ 4 viewpoints: front, back, right shoulder, left shoulder
✅ Smooth camera animations
✅ WebSocket real-time communication
✅ Split-screen interface (3D + Voice)

**Voice commands recognized:**
- "Show me the front/back/left/right"
- "Rotate to..."
- "Focus on..."
- "Switch to..."

**Next steps (optional):**
- Add muscle highlighting via voice
- Add model switching (skeletal, muscular, etc.)
- Add zoom/rotate controls
- Add anatomical structure focus

---

## 🧪 Quick Test Commands

Try these in order:

1. "Show me the front view"
2. "Now show the back"
3. "Rotate to the right shoulder"
4. "Show me the left shoulder"
5. "Go back to the front view"

Each command should smoothly animate the 3D camera! 🎉

---

## 📚 Resources

- Your navigation tests: `backend/navigation_tests/`
- Anatomy database: `backend/navigation_tests/anatomy-data.json`
- BioDigital API Docs: https://developer.biodigital.com/
- Human API Reference: https://developer.biodigital.com/documentation/api

---

**Enjoy your voice-controlled 3D anatomy learning system!** 🎙️✨
