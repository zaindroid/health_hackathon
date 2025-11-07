# Quick Start Guide - Health Helper Redesign

## Overview

This guide will help you start implementing the voice-first health helper redesign.

---

## Prerequisites

### Required Accounts & Tools
- ✅ AWS Account (RDS, S3, ECS access)
- ✅ Node.js 18+ and npm
- ✅ Python 3.10+
- ✅ PostgreSQL client (psql)
- ✅ Git

### Existing Setup (Already Working)
- ✅ Voice agent (Cartesia TTS + Bedrock LLM)
- ✅ BioDigital 3D anatomy integration
- ✅ Facial analysis (MediaPipe)
- ✅ Heart rate monitoring (CAIRE API)

---

## Phase 1: Database Setup (Day 1)

### Step 1: Create RDS PostgreSQL Instance

```bash
# Using AWS CLI
aws rds create-db-instance \
    --db-instance-identifier health-helper-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.3 \
    --master-username postgres \
    --master-user-password YOUR_SECURE_PASSWORD \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-XXXXXXXX \
    --db-subnet-group-name default \
    --backup-retention-period 7 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "mon:04:00-mon:05:00" \
    --multi-az false \
    --publicly-accessible true \
    --storage-encrypted true

# Wait for instance to be available (5-10 minutes)
aws rds wait db-instance-available --db-instance-identifier health-helper-db

# Get endpoint
aws rds describe-db-instances \
    --db-instance-identifier health-helper-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text
```

### Step 2: Run Database Schema

```bash
# Connect to RDS
psql -h YOUR_RDS_ENDPOINT.region.rds.amazonaws.com \
     -U postgres \
     -d postgres

# Create database
CREATE DATABASE health_helper;

# Connect to new database
\c health_helper

# Run schema
\i database/schema.sql

# Verify tables
\dt

# Should see:
# - sessions
# - video_analysis
# - symptom_locations
# - conversation_turns
# - anatomy_interactions
# - education_delivered
# - session_reports
```

### Step 3: Create S3 Buckets

```bash
# Create bucket for reports
aws s3 mb s3://health-helper-reports

# Create bucket for session data
aws s3 mb s3://health-helper-sessions

# Set up lifecycle policies
aws s3api put-bucket-lifecycle-configuration \
    --bucket health-helper-reports \
    --lifecycle-configuration file://s3-lifecycle.json
```

Create `s3-lifecycle.json`:
```json
{
  "Rules": [
    {
      "Id": "DeleteOldReports",
      "Status": "Enabled",
      "Prefix": "reports/",
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

### Step 4: Update Environment Variables

Add to `backend/.env`:
```bash
# Database
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=health_helper
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD

# S3
S3_REPORTS_BUCKET=health-helper-reports
S3_SESSIONS_BUCKET=health-helper-sessions
AWS_REGION=us-east-1

# Existing variables
CAIRE_API_KEY=_gskosjmOYnzNJ_4bieNyGrJZrbpmLuYfscfFZdOHZA
CAIRE_WS_URL=ws://3.67.186.245:8003/ws/
```

---

## Phase 1: Backend Session Orchestrator (Days 2-3)

### Step 1: Install Dependencies

```bash
cd backend

# Add database libraries
npm install pg
npm install @aws-sdk/client-s3
npm install @aws-sdk/client-rds
npm install uuid

# Add for PDF generation later
npm install pdfkit
```

### Step 2: Create Database Service

Create `backend/services/database.ts`:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // For RDS
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

### Step 3: Create Session Orchestrator

Create `backend/services/sessionOrchestrator.ts`:
```typescript
import { v4 as uuidv4 } from 'uuid';
import db from './database';

interface SessionData {
  sessionId: string;
  startTime: Date;
  vitals: any[];
  conversation: any[];
  symptoms: any[];
  anatomyInteractions: any[];
  education: any[];
}

class SessionOrchestrator {
  private activeSessions: Map<string, SessionData> = new Map();

  async startSession(useCase?: string): Promise<string> {
    const sessionId = uuidv4();

    // Create in database
    const result = await db.query(
      'INSERT INTO sessions (id, status, use_case) VALUES ($1, $2, $3) RETURNING id',
      [sessionId, 'active', useCase]
    );

    // Initialize in-memory session
    this.activeSessions.set(sessionId, {
      sessionId,
      startTime: new Date(),
      vitals: [],
      conversation: [],
      symptoms: [],
      anatomyInteractions: [],
      education: [],
    });

    console.log(`✅ New session started: ${sessionId}`);
    return sessionId;
  }

  async addVideoAnalysis(sessionId: string, data: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Store in memory
    session.vitals.push(data);

    // Store in database
    await db.query(
      `INSERT INTO video_analysis (
        session_id, analysis_type, face_detected,
        heart_rate, pupil_asymmetry, alerts
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sessionId,
        data.type,
        data.faceDetected,
        data.heartRate,
        data.pupilAsymmetry,
        JSON.stringify(data.alerts || {})
      ]
    );
  }

  async addSymptom(sessionId: string, symptom: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.symptoms.push(symptom);

    await db.query(
      `INSERT INTO symptom_locations (
        session_id, anatomy_part, symptom_type,
        intensity, description, coordinates
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sessionId,
        symptom.anatomyPart,
        symptom.type,
        symptom.intensity,
        symptom.description,
        JSON.stringify(symptom.coordinates)
      ]
    );
  }

  async addConversationTurn(
    sessionId: string,
    speaker: 'user' | 'agent',
    message: string,
    intent?: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const turn = { speaker, message, intent, timestamp: new Date() };
    session.conversation.push(turn);

    await db.query(
      `INSERT INTO conversation_turns (
        session_id, turn_number, speaker, message, intent
      ) VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, session.conversation.length, speaker, message, intent]
    );
  }

  async endSession(sessionId: string): Promise<any> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Update session status
    await db.query(
      'UPDATE sessions SET status = $1, ended_at = NOW() WHERE id = $2',
      ['completed', sessionId]
    );

    // Generate report (will implement later)
    const report = await this.generateReport(sessionId);

    // Clean up in-memory session
    this.activeSessions.delete(sessionId);

    console.log(`✅ Session ended: ${sessionId}`);
    return report;
  }

  private async generateReport(sessionId: string): Promise<any> {
    // TODO: Implement report generation
    return { sessionId, status: 'report_generated' };
  }

  getActiveSession(sessionId: string): SessionData | undefined {
    return this.activeSessions.get(sessionId);
  }
}

export default new SessionOrchestrator();
```

### Step 4: Create API Endpoints

Create `backend/routes/session.ts`:
```typescript
import express from 'express';
import sessionOrchestrator from '../services/sessionOrchestrator';

const router = express.Router();

// Start new session
router.post('/start', async (req, res) => {
  try {
    const { useCase } = req.body;
    const sessionId = await sessionOrchestrator.startSession(useCase);

    res.json({
      success: true,
      sessionId,
      message: 'Session started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add video analysis data
router.post('/data/video', async (req, res) => {
  try {
    const { sessionId, data } = req.body;
    await sessionOrchestrator.addVideoAnalysis(sessionId, data);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add symptom
router.post('/data/symptom', async (req, res) => {
  try {
    const { sessionId, symptom } = req.body;
    await sessionOrchestrator.addSymptom(sessionId, symptom);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add conversation turn
router.post('/data/conversation', async (req, res) => {
  try {
    const { sessionId, speaker, message, intent } = req.body;
    await sessionOrchestrator.addConversationTurn(
      sessionId,
      speaker,
      message,
      intent
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// End session and get report
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const report = await sessionOrchestrator.endSession(sessionId);

    res.json({
      success: true,
      report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get session status
router.get('/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessionOrchestrator.getActiveSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        startTime: session.startTime,
        vitalsCount: session.vitals.length,
        conversationTurns: session.conversation.length,
        symptomsReported: session.symptoms.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

### Step 5: Add Routes to Server

In `backend/server.ts`, add:
```typescript
import sessionRoutes from './routes/session';

// ... existing code ...

// Add session routes
app.use('/api/v2/session', sessionRoutes);

console.log('✅ Session routes registered at /api/v2/session');
```

### Step 6: Test Session Orchestrator

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test endpoints
curl -X POST http://localhost:3001/api/v2/session/start \
  -H "Content-Type: application/json" \
  -d '{"useCase": "headache"}'

# Should return:
# {"success": true, "sessionId": "uuid", "message": "Session started"}

# Test adding data
curl -X POST http://localhost:3001/api/v2/session/data/symptom \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID",
    "symptom": {
      "anatomyPart": "frontal_lobe",
      "type": "pain",
      "intensity": 7,
      "description": "Throbbing pain"
    }
  }'

# Check session status
curl http://localhost:3001/api/v2/session/YOUR_SESSION_ID/status
```

---

## Next Steps

Once Phase 1 is complete:

1. ✅ Database running on RDS
2. ✅ S3 buckets created
3. ✅ Session Orchestrator working
4. ✅ API endpoints tested

**Move to Phase 2**: Voice-First UI

See `REDESIGN_IMPLEMENTATION_PLAN.md` for complete roadmap.

---

## Useful Commands

### Database
```bash
# Connect to RDS
psql -h $DB_HOST -U postgres -d health_helper

# Check active sessions
SELECT * FROM active_sessions;

# View recent sessions
SELECT id, started_at, use_case, status FROM sessions ORDER BY started_at DESC LIMIT 10;

# Session details
SELECT
  s.id,
  s.use_case,
  COUNT(va.id) as vitals_count,
  COUNT(sl.id) as symptoms_count
FROM sessions s
LEFT JOIN video_analysis va ON s.id = va.session_id
LEFT JOIN symptom_locations sl ON s.id = sl.session_id
WHERE s.id = 'SESSION_ID'
GROUP BY s.id, s.use_case;
```

### S3
```bash
# List reports
aws s3 ls s3://health-helper-reports/reports/

# Download a report
aws s3 cp s3://health-helper-reports/reports/SESSION_ID/report.pdf ./
```

### Monitoring
```bash
# View backend logs
cd backend && npm run dev | grep "Session"

# Database connections
psql -h $DB_HOST -U postgres -d health_helper -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Troubleshooting

### Can't connect to RDS
- Check security group allows your IP on port 5432
- Verify VPC settings
- Check RDS instance is "available"

### Tables not created
- Ensure you're connected to correct database: `\c health_helper`
- Check for errors in schema.sql
- Verify PostgreSQL version: `SELECT version();`

### API endpoints not responding
- Check backend is running: `ps aux | grep node`
- Verify routes are registered: Check server.ts
- Check database connection: Test with psql

---

## Support

For issues during implementation:
- Check `REDESIGN_IMPLEMENTATION_PLAN.md` for detailed architecture
- Review database schema: `database/schema.sql`
- Test with provided curl commands
- Check AWS console for RDS/S3 status

Ready to build the future of voice-first health assistance! 🎉
