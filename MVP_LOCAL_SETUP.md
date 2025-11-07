# Local MVP Setup Guide

## Overview

This is a **local development MVP** of the Health Helper redesign that can be **easily deployed to AWS** by changing environment variables.

## What's Been Implemented

### ✅ Backend (Node.js + TypeScript)

1. **Database Layer** (`backend/services/database.ts`)
   - SQLite for local development
   - Abstraction layer ready for PostgreSQL (AWS RDS)
   - Switch with `DB_TYPE=postgres` env variable

2. **Session Orchestrator** (`backend/services/sessionOrchestrator.ts`)
   - Complete session lifecycle management
   - Tracks vitals, conversation, symptoms, anatomy interactions, education
   - In-memory + database persistence
   - Report generation

3. **Session API Routes** (`backend/routes/session.ts`)
   - `POST /api/session/start` - Start new session with role selection
   - `POST /api/session/vitals/consent` - Record vitals consent
   - `POST /api/session/data/*` - Track all session data
   - `POST /api/session/end` - End session and get report
   - `GET /api/session/:id/status` - Get session status
   - `GET /api/session/active` - Get all active sessions

4. **Database Schema** (`backend/database/schema_sqlite.sql`)
   - 9 tables for comprehensive tracking
   - Sessions, video_analysis, symptom_locations, conversation_turns
   - anatomy_interactions, education_delivered, session_reports
   - vitals_displayed, doctor_reviews

### ✅ Frontend (React + TypeScript)

1. **Welcome Screen** (`frontend/src/components/WelcomeScreen.tsx`)
   - Beautiful role selection (Patient/Doctor)
   - Use case selection for patients
   - Doctor workflow placeholder (Phase 2)
   - Responsive design

2. **Updated App.tsx**
   - Session management integration
   - Welcome Screen flow
   - Session info display in header
   - End session functionality

3. **Existing Features**
   - Voice-controlled 3D anatomy (BioDigital)
   - Medical Face Scanner (MediaPipe)
   - Heart Rate Monitor (CAIRE API)
   - Multi-tab interface

---

## How to Run Locally

### 1. Start Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on: `http://localhost:3001`

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

### 3. Open Browser

Navigate to: `http://localhost:5173`

You should see the **Welcome Screen** with role selection.

---

## Testing the Workflow

### Test 1: Patient Session

1. Open `http://localhost:5173`
2. Click **"I'm a Patient"**
3. Select use case (e.g., "Headache") or skip
4. Click **"Start Session"**
5. Main app loads with session info in header
6. Session is tracked in database
7. Click **"End Session"** when done

### Test 2: Check Session in Database

```bash
cd backend
sqlite3 database/health_helper.db

# View sessions
SELECT id, user_role, use_case, status, started_at FROM sessions;

# View active sessions
SELECT * FROM active_sessions;

# Exit
.quit
```

### Test 3: API Endpoints

```bash
# Start session
curl -X POST http://localhost:3001/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"role": "patient", "useCase": "headache"}'

# Get session status (replace SESSION_ID)
curl http://localhost:3001/api/session/SESSION_ID/status

# Get all active sessions
curl http://localhost:3001/api/session/active

# End session
curl -X POST http://localhost:3001/api/session/end \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "SESSION_ID"}'
```

---

## Database Location

**Local SQLite Database:**
```
backend/database/health_helper.db
```

**View Database:**
```bash
sqlite3 backend/database/health_helper.db
```

**Useful Queries:**
```sql
-- All sessions
SELECT * FROM sessions ORDER BY started_at DESC;

-- Active sessions with duration
SELECT * FROM active_sessions;

-- Session with vitals
SELECT
  s.id,
  s.use_case,
  COUNT(va.id) as vitals_count
FROM sessions s
LEFT JOIN video_analysis va ON s.id = va.session_id
GROUP BY s.id;
```

---

## Architecture Highlights

### Local Development
- **Database:** SQLite (zero setup, file-based)
- **Storage:** Local file system
- **Easy Testing:** No cloud dependencies

### AWS Deployment Ready
Just change these environment variables:

```bash
# Switch to PostgreSQL
DB_TYPE=postgres
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=health_helper
DB_USER=postgres
DB_PASSWORD=your-password

# Switch to S3 for storage
S3_REPORTS_BUCKET=health-helper-reports
S3_SESSIONS_BUCKET=health-helper-sessions
AWS_REGION=us-east-1
```

**No code changes needed!** The abstraction layer handles the switch automatically.

---

## File Structure

```
backend/
├── database/
│   ├── health_helper.db          # SQLite database file
│   └── schema_sqlite.sql         # Database schema
├── services/
│   ├── database.ts               # Database abstraction layer
│   └── sessionOrchestrator.ts    # Session management
├── routes/
│   └── session.ts                # Session API endpoints
└── server.ts                     # Main server (updated)

frontend/
├── src/
│   ├── components/
│   │   └── WelcomeScreen.tsx     # Role selection screen
│   ├── styles/
│   │   └── WelcomeScreen.css     # Welcome screen styles
│   └── App.tsx                   # Main app (updated)
```

---

## What's Different from Old Design?

### Before (Old Design)
- No role selection
- No session management
- Direct app entry
- No database tracking

### After (New MVP Design)
- ✅ Welcome screen with role selection (Patient/Doctor)
- ✅ Complete session lifecycle management
- ✅ Database tracking of all interactions
- ✅ Session info displayed in header
- ✅ End session functionality
- ✅ API endpoints for session management
- ✅ Ready for AWS deployment

---

## Next Phase: Agent-Initiated Vitals

**Phase 2 will add:**
1. Voice agent asks permission for vitals check
2. Minimal vitals display (4 metrics)
3. Agent-initiated workflow
4. Enhanced end dashboard

**Current Status:**
- ✅ Phase 1: Database + Welcome Screen + Session Management (COMPLETE)
- ⏳ Phase 2: Agent-initiated vitals workflow (Next)
- ⏳ Phase 3: Doctor review features (Later)

---

## Deployment to AWS (When Ready)

### Step 1: Create RDS PostgreSQL
```bash
aws rds create-db-instance \
    --db-instance-identifier health-helper-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password YOUR_PASSWORD \
    --allocated-storage 20
```

### Step 2: Run PostgreSQL Schema
```bash
psql -h your-rds-endpoint.amazonaws.com -U postgres -d health_helper < database/schema.sql
```

### Step 3: Update Environment Variables
Change `backend/.env` to use PostgreSQL connection string.

### Step 4: Deploy
No code changes needed - just deploy with new env vars!

---

## Troubleshooting

### Backend won't start
- Check if port 3001 is available: `lsof -i :3001`
- Verify .env file exists with required variables
- Check SQLite database file permissions

### Frontend won't connect
- Ensure backend is running on port 3001
- Check browser console for errors
- Verify CORS is configured correctly

### Database errors
- Check SQLite file exists: `ls -la backend/database/health_helper.db`
- Verify schema is applied: `sqlite3 backend/database/health_helper.db ".tables"`
- Check file permissions

### Session not starting
- Check browser console for API errors
- Verify backend /api/session/start endpoint responds
- Test with curl to isolate frontend/backend issue

---

## Cost Estimate

### Local Development
**Cost: $0** (everything runs locally)

### AWS Deployment
- **RDS db.t3.micro:** ~$15/month
- **S3 Storage:** ~$0.50/month (first 50GB free)
- **EC2 t3.micro:** ~$8/month
- **Data Transfer:** ~$1/month
- **Total: ~$25/month** (development)

---

## Summary

You now have a **fully functional local MVP** with:
- ✅ Role-based session management
- ✅ Complete database tracking
- ✅ Session lifecycle management
- ✅ Clean welcome screen workflow
- ✅ AWS deployment ready architecture

**Next Steps:**
1. Test the workflow thoroughly
2. Integrate vitals consent flow with voice agent
3. Implement minimal vitals display (Phase 2)
4. Deploy to AWS when ready

**Ready to build the future of voice-first health assistance!** 🚀
