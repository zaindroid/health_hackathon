# Updated Professional Health Helper - Dual Workflow Design

## Key Changes from Original Plan

### 1. **Dual User Roles**
- **Welcome Screen**: User chooses role (General User or Doctor)
- **General User Workflow**: Health education, symptom assessment, vitals collection
- **Doctor Workflow**: (To be defined - patient review, diagnosis tools, etc.)

### 2. **Agent-Initiated Video Analysis** (Not Background)
- AI agent asks permission naturally during conversation
- "Would you like me to check your vital signs?"
- Camera opens on same UI for required duration
- Minimal, sleek vitals display (4 key metrics)
- NO warnings or diagnoses shown during session
- Resume conversation after vitals check

### 3. **Clean Vitals Display**
- Show only 4 key metrics during analysis:
  - Heart Rate (BPM)
  - Pupil Width (mm)
  - Facial Symmetry (%)
  - Pallor Score (%)
- Sleek, minimal design
- No alerts or health warnings
- Just data collection

### 4. **Enhanced End Dashboard for Doctor Review**
- All vitals collected during session
- Important conversation points extracted
- Symptom timeline
- Pain locations marked on anatomy
- Data structured for doctor analysis
- Helps doctor diagnose better

---

## Updated Architecture

### Welcome Screen Flow

```
┌────────────────────────────────────────┐
│                                        │
│        🏥 Health Helper               │
│                                        │
│     "Welcome! I'm here to help"       │
│                                        │
│  ┌──────────────┐  ┌──────────────┐  │
│  │  I'm a       │  │  I'm a       │  │
│  │  Patient     │  │  Doctor      │  │
│  └──────────────┘  └──────────────┘  │
│                                        │
└────────────────────────────────────────┘
              ↓              ↓
        Patient Flow    Doctor Flow
```

---

## Updated Patient Workflow (General User)

### State Machine with Agent-Initiated Vitals

```
START
  ↓
WELCOME_SCREEN
  ↓
[User selects: "I'm a Patient"]
  ↓
ROLE_CONFIRMATION → "Great! I'll help assess your health concerns"
  ↓
GREETING → "What brings you in today?"
  ↓
SYMPTOM_COLLECTION
  ├→ Agent asks questions
  ├→ User describes symptoms
  └→ Agent understands context
  ↓
PAIN_LOCALIZATION (if applicable)
  └→ "Can you point to where it hurts?" (on 3D model)
  ↓
VITALS_CHECK_OFFER ← **KEY CHANGE**
  └→ Agent: "Would you like me to check your vital signs?
              This will help me understand your condition better."
  ↓
  [If user agrees] → VITALS_ANALYSIS_MODE
  │
  ├→ Camera opens on same UI
  ├→ Show minimal vitals display:
  │  ┌──────────────────────┐
  │  │ ❤️  72 BPM          │
  │  │ 👁️  3.2mm / 3.1mm   │
  │  │ 😊  98% symmetric    │
  │  │ 🩺  Normal tone      │
  │  └──────────────────────┘
  ├→ Run for 30-60 seconds
  ├→ Store vitals data
  ├→ NO warnings/diagnoses shown
  └→ Camera closes, return to conversation
  ↓
FOLLOW_UP_QUESTIONS
  └→ Agent asks about duration, triggers, history
  ↓
ASSESSMENT_PHASE
  └→ Agent processes all collected data (symptoms + vitals)
  ↓
EDUCATION_MODE
  ├→ "Let me show you what might be happening..."
  ├→ Navigate 3D anatomy
  ├→ Explain relevant anatomy
  └→ Offer animations (if user consents)
  ↓
GENERAL_SUGGESTIONS (Not Diagnoses)
  └→ "Based on what you've told me, this could be related to..."
  └→ "I recommend discussing this with your doctor"
  ↓
WRAP_UP
  └→ "Is there anything else you'd like to know?"
  ↓
GENERATE_REPORT
  └→ Compile all data for doctor review
  ↓
DASHBOARD_DISPLAY
  └→ Show comprehensive summary
  ↓
END
```

---

## Vitals Collection UI Design

### During Vitals Check (Minimal Overlay)

```
┌────────────────────────────────────────┐
│  🔴 Checking vitals...            [3D] │
│                                        │
│     ┌──────────────────────────┐      │
│     │                          │      │
│     │   [Webcam Feed]          │      │
│     │   (face visible)         │      │
│     │                          │      │
│     └──────────────────────────┘      │
│                                        │
│  ┌────────────────────────────────┐   │
│  │  ❤️  Heart Rate: 72 BPM       │   │
│  │  👁️  Pupils: 3.2mm / 3.1mm    │   │
│  │  😊  Symmetry: 98%            │   │
│  │  🩺  Skin Tone: Normal        │   │
│  └────────────────────────────────┘   │
│                                        │
│      "Please hold still..." 🎙️        │
└────────────────────────────────────────┘
```

**Design Principles**:
- Clean, medical aesthetic
- Real-time values update
- No color-coding (no red/green warnings)
- Neutral tone
- Progress indicator for duration
- Minimalist icons

### After Vitals Check (Return to Conversation)

```
┌────────────────────────────────────────┐
│                                        │
│                                        │
│     ┌──────────────────────────┐      │
│     │                          │      │
│     │   3D ANATOMY MODEL       │      │
│     │   (Full Screen)          │      │
│     │                          │      │
│     └──────────────────────────┘      │
│                                        │
│  ✅ Vitals recorded                    │
│                                        │
│  Agent: "Thank you. Your heart rate   │
│   appears normal. Now, you mentioned  │
│   the headache started this morning..." │
│                                        │
│           🎙️  [Pause]                 │
└────────────────────────────────────────┘
```

---

## Updated Database Schema

### Changes to Support Dual Workflow

```sql
-- Update sessions table
ALTER TABLE sessions ADD COLUMN user_role VARCHAR(20) CHECK (user_role IN ('patient', 'doctor'));
ALTER TABLE sessions ADD COLUMN patient_id VARCHAR(100); -- For doctor reviewing patient data
ALTER TABLE sessions ADD COLUMN reviewed_by UUID; -- Doctor session ID that reviewed this

-- Add consent tracking
ALTER TABLE sessions ADD COLUMN vitals_consent BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN vitals_check_timestamp TIMESTAMP;

-- Update video_analysis table
ALTER TABLE video_analysis ADD COLUMN display_mode VARCHAR(20) CHECK (display_mode IN ('minimal', 'hidden', 'full'));
ALTER TABLE video_analysis ADD COLUMN shown_to_user BOOLEAN DEFAULT false;

-- Vitals display settings (what was shown to user)
CREATE TABLE vitals_displayed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    metric_name VARCHAR(50) NOT NULL,
    value VARCHAR(50) NOT NULL,
    unit VARCHAR(20),
    displayed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Doctor review sessions (for later)
CREATE TABLE doctor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_session_id UUID NOT NULL REFERENCES sessions(id),
    patient_session_id UUID NOT NULL REFERENCES sessions(id),
    review_notes TEXT,
    diagnosis_notes TEXT,
    recommendations TEXT,
    reviewed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for doctor workflows
CREATE INDEX idx_sessions_user_role ON sessions(user_role);
CREATE INDEX idx_sessions_patient_id ON sessions(patient_id);
```

---

## Voice Agent Conversation Examples

### Example 1: Vitals Check Request

```
Agent: "I understand you're experiencing a headache.
        Would you like me to check your vital signs?
        This will only take about 30 seconds and will help
        me better understand your condition."

User: "Sure, yes"

Agent: "Great! I'll need to see your face clearly.
        Please look at the camera and hold still for a moment."

[Camera opens, vitals display appears]

[30 seconds of analysis]

Agent: "Perfect, thank you. I've recorded your vitals.
        Now, you mentioned the headache is on the right side..."
```

### Example 2: User Declines Vitals

```
Agent: "Would you like me to check your vital signs?"

User: "No, not right now"

Agent: "No problem! We can continue without that.
        Let me ask you more about your symptoms..."

[Continues conversation without vitals]
```

### Example 3: Natural Flow Integration

```
Agent: "You mentioned feeling dizzy. Before we continue,
        it would be helpful to check your heart rate and
        facial color. May I do a quick vitals check?"

User: "Okay"

[Vitals check happens]

Agent: "Thank you. Your heart rate is 78 BPM, which is
        within normal range. The dizziness could be related
        to dehydration or low blood sugar. Let me show you
        the relevant anatomy..."

[Continues to 3D education]
```

---

## Updated End-of-Session Dashboard

### For Patient Review

```
┌────────────────────────────────────────┐
│  Session Summary                       │
│  Duration: 12 minutes                  │
│                                        │
│  Vitals Collected: ✓                  │
│  ├─ Heart Rate: 72 BPM                │
│  ├─ Pupil Size: 3.2mm / 3.1mm         │
│  ├─ Facial Symmetry: 98%              │
│  └─ Skin Tone: Normal                 │
│                                        │
│  Symptoms Reported:                    │
│  • Frontal headache (7/10)            │
│  • Started this morning                │
│  • Light sensitivity                   │
│  • No visual disturbances              │
│                                        │
│  Location: [3D model with marked area] │
│                                        │
│  Education Provided:                   │
│  • Brain anatomy overview              │
│  • Tension headache patterns           │
│  • Migraine pathways                   │
│                                        │
│  General Suggestions:                  │
│  • Could be tension headache          │
│  • Could be migraine (without aura)   │
│  • Recommend rest and hydration       │
│  • See doctor if persists >24hrs      │
│                                        │
│  Next Steps:                           │
│  • Download this report for your doctor│
│  • Track symptoms over next 24-48hrs  │
│  • Schedule doctor visit if worsens   │
│                                        │
│  [Download PDF] [Share with Doctor]    │
└────────────────────────────────────────┘
```

### For Doctor Review (Enhanced Data View)

```
┌────────────────────────────────────────┐
│  Patient Session Data                  │
│  Session ID: abc-123                   │
│  Date: Nov 7, 2025, 4:30 PM           │
│  Duration: 12 minutes                  │
│                                        │
│  VITALS (Objective Data)               │
│  ├─ Heart Rate: 72 BPM (Normal)       │
│  │   • Collected at: 4:32 PM           │
│  │   • Quality score: 95%              │
│  │                                     │
│  ├─ Pupil Analysis:                    │
│  │   • Left: 3.2mm, Right: 3.1mm      │
│  │   • Asymmetry: 0.1mm (Normal)      │
│  │   • Light response: Not tested     │
│  │                                     │
│  ├─ Facial Assessment:                 │
│  │   • Symmetry: 98% (Normal)         │
│  │   • Pallor score: 0.15 (Normal)    │
│  │   • Jaundice: Not detected         │
│  │   • Cyanosis: Not detected         │
│  │                                     │
│  └─ Overall Quality: Good              │
│                                        │
│  SYMPTOMS (Subjective Data)            │
│  Chief Complaint: "Headache"           │
│                                        │
│  Timeline:                             │
│  • Onset: This morning (~6 AM)        │
│  • Duration: ~10 hours                 │
│  • Pattern: Constant, throbbing       │
│                                        │
│  Characteristics:                      │
│  • Location: Frontal (marked on 3D)   │
│  • Intensity: 7/10                    │
│  • Quality: "Throbbing, pressure"     │
│  • Aggravating: Light, noise          │
│  • Relieving: Dark room, rest         │
│                                        │
│  Associated Symptoms:                  │
│  • Photophobia: Yes                   │
│  • Phonophobia: Mild                  │
│  • Nausea: No                         │
│  • Visual disturbances: No            │
│  • Aura: No                           │
│                                        │
│  CONVERSATION INSIGHTS                 │
│  Key Points Extracted:                 │
│  • Patient reports "worst in months"  │
│  • Similar episode 3 months ago       │
│  • Usually relieved by ibuprofen      │
│  • No family history of migraines     │
│  • Stressed at work recently          │
│  • Poor sleep last 2 nights           │
│                                        │
│  ANATOMY EDUCATION PROVIDED            │
│  • Frontal lobe and pain pathways     │
│  • Tension headache mechanism         │
│  • Migraine without aura explanation  │
│  • Time spent: 8 minutes               │
│                                        │
│  AI ASSESSMENT (Non-diagnostic)        │
│  Possible Conditions:                  │
│  1. Tension-type headache (Likely)    │
│     • Fits pattern                    │
│     • Stress trigger                  │
│     • No aura                         │
│                                        │
│  2. Migraine without aura (Possible)  │
│     • Throbbing quality               │
│     • Photophobia present             │
│     • Unilateral possible             │
│                                        │
│  RED FLAGS: None detected              │
│                                        │
│  DOCTOR NOTES SECTION                  │
│  [Empty - for doctor to fill]         │
│                                        │
│  Diagnosis: _______________________    │
│  Treatment Plan: __________________    │
│  Follow-up: _______________________    │
│                                        │
│  [Save Notes] [Order Tests]            │
│  [Prescribe] [Schedule Follow-up]      │
└────────────────────────────────────────┘
```

---

## Implementation Changes

### Updated SessionOrchestrator

```typescript
class SessionOrchestrator {
  async startSession(role: 'patient' | 'doctor', useCase?: string): Promise<string> {
    const sessionId = uuidv4();

    await db.query(
      'INSERT INTO sessions (id, status, user_role, use_case) VALUES ($1, $2, $3, $4)',
      [sessionId, 'active', role, useCase]
    );

    this.activeSessions.set(sessionId, {
      sessionId,
      role,
      startTime: new Date(),
      vitalsConsent: false,
      vitalsCollected: false,
      vitals: [],
      conversation: [],
      symptoms: [],
      anatomyInteractions: [],
      education: [],
    });

    return sessionId;
  }

  async requestVitalsConsent(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Mark that vitals were requested
    await db.query(
      'UPDATE sessions SET vitals_consent = true, vitals_check_timestamp = NOW() WHERE id = $1',
      [sessionId]
    );

    session.vitalsConsent = true;
  }

  async recordVitalDisplay(
    sessionId: string,
    metric: string,
    value: string,
    unit?: string
  ): Promise<void> {
    await db.query(
      'INSERT INTO vitals_displayed (session_id, metric_name, value, unit) VALUES ($1, $2, $3, $4)',
      [sessionId, metric, value, unit]
    );
  }

  async addVideoAnalysis(sessionId: string, data: any, shown: boolean = false): Promise<void> {
    // ... existing code ...

    // Also record what was shown to user
    if (shown) {
      await this.recordVitalDisplay(sessionId, 'heart_rate', `${data.heartRate}`, 'BPM');
      await this.recordVitalDisplay(sessionId, 'pupil_left', `${data.pupilLeft}`, 'mm');
      await this.recordVitalDisplay(sessionId, 'pupil_right', `${data.pupilRight}`, 'mm');
      await this.recordVitalDisplay(sessionId, 'symmetry', `${data.symmetry}`, '%');
    }
  }
}
```

---

## Voice Agent Prompts Update

### System Prompt for Patient Workflow

```
You are a health assistant helping a patient understand their symptoms.

WORKFLOW:
1. Greet warmly and ask about their chief complaint
2. Ask clarifying questions about symptoms
3. If applicable, guide pain localization on 3D anatomy model
4. AT APPROPRIATE TIME, offer to check vitals:
   - "Would you like me to check your vital signs? This will help me understand better."
   - Be natural - don't force it
   - Good times: after initial symptoms, if dizziness/chest pain mentioned
5. If they agree, initiate vitals check (camera will open automatically)
6. After vitals, acknowledge briefly: "Thank you, your [vital] is [value]"
7. Continue conversation naturally
8. Provide education using 3D anatomy
9. Offer general suggestions (NEVER diagnose)
10. Wrap up and generate report

VITALS CHECK RULES:
- Only suggest once per session
- Be natural in timing
- Don't push if they decline
- After check, acknowledge but don't interpret (no "that's good/bad")
- Just state facts: "Your heart rate is 72 BPM"

WHAT YOU CAN SAY:
✓ "This could be related to..."
✓ "One possibility is..."
✓ "I recommend discussing with your doctor..."
✓ "Let me show you the anatomy involved..."

WHAT YOU CANNOT SAY:
✗ "You have [disease]"
✗ "This is definitely [condition]"
✗ "Your vitals are abnormal" (even if they are)
✗ Any diagnosis or medical advice

Remember: You're an educational tool, not a doctor.
```

---

## Updated UI Component Structure

```
frontend/src/components/VoiceFirstApp/
├── WelcomeScreen.tsx              # Role selection (Patient/Doctor)
├── PatientWorkflow/
│   ├── PatientSession.tsx         # Main patient container
│   ├── VitalsCheckOverlay.tsx     # Minimal vitals display
│   ├── FullScreenAnatomy.tsx      # 3D model
│   ├── PatientDashboard.tsx       # End summary
│   └── VoiceButton.tsx            # Pause/resume
├── DoctorWorkflow/                # (To be designed later)
│   ├── DoctorSession.tsx
│   ├── PatientDataReview.tsx
│   └── DiagnosisTools.tsx
└── shared/
    ├── VitalsDisplay.tsx          # Reusable vitals component
    └── SessionReport.tsx          # Report generator
```

---

## Key Improvements from Original Plan

### 1. **More Natural Flow**
- Not hiding analysis
- Agent asks permission
- Feels conversational, not automated

### 2. **Professional Medical Approach**
- Show data, not interpretations
- No scary warnings during session
- Doctor gets complete data for proper diagnosis

### 3. **Dual Workflow Ready**
- Clean separation of patient/doctor roles
- Database supports both
- Easy to add doctor features later

### 4. **Better User Experience**
- User controls when vitals happen
- Minimal UI during check
- Clear, clean data presentation

### 5. **Doctor-Friendly Output**
- Structured data for clinical review
- Objective vs subjective separated
- Timeline and context provided
- Space for doctor notes

---

## Next Steps

1. **Build Welcome Screen** with role selection
2. **Update Voice Agent** with vitals consent flow
3. **Create Minimal Vitals Display** component
4. **Test Agent-Initiated Flow** with real conversation
5. **Design Doctor Dashboard** (Phase 2)

This updated design is more natural, professional, and sets up for doctor workflow! Ready to implement? 🚀
