/**
 * Session API Routes
 *
 * RESTful endpoints for session management
 * Works alongside WebSocket handlers for real-time communication
 */

import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import sessionOrchestrator from '../services/sessionOrchestrator';
import { kbRetriever } from '../rag/retriever_bedrock';

const router: Router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * POST /api/session/start
 * Start a new session with role selection
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { role, useCase } = req.body;

    // Validate role
    if (role && !['patient', 'doctor'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be "patient" or "doctor"'
      });
    }

    const sessionId = await sessionOrchestrator.startSession(
      role || 'patient',
      useCase
    );

    res.json({
      success: true,
      sessionId,
      role: role || 'patient',
      useCase: useCase || null,
      message: 'Session started successfully'
    });
  } catch (error: any) {
    console.error('❌ Error starting session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start session'
    });
  }
});

/**
 * POST /api/session/vitals/consent
 * Record user consent for vitals check
 */
router.post('/vitals/consent', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    await sessionOrchestrator.recordVitalsConsent(sessionId);

    res.json({
      success: true,
      message: 'Vitals consent recorded'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record consent'
    });
  }
});

/**
 * POST /api/session/data/video
 * Add video analysis data (heart rate, facial scan)
 */
router.post('/data/video', async (req: Request, res: Response) => {
  try {
    const { sessionId, data } = req.body;

    if (!sessionId || !data) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and data are required'
      });
    }

    await sessionOrchestrator.addVideoAnalysis(sessionId, data);

    res.json({
      success: true,
      message: 'Video analysis data recorded'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record video data'
    });
  }
});

/**
 * POST /api/session/data/vital-displayed
 * Record what vitals were shown to user
 */
router.post('/data/vital-displayed', async (req: Request, res: Response) => {
  try {
    const { sessionId, metric } = req.body;

    if (!sessionId || !metric) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and metric are required'
      });
    }

    await sessionOrchestrator.addVitalDisplayed(sessionId, metric);

    res.json({
      success: true,
      message: 'Vital display recorded'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record vital display'
    });
  }
});

/**
 * POST /api/session/data/symptom
 * Add symptom/pain location
 */
router.post('/data/symptom', async (req: Request, res: Response) => {
  try {
    const { sessionId, symptom } = req.body;

    if (!sessionId || !symptom) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and symptom are required'
      });
    }

    await sessionOrchestrator.addSymptom(sessionId, symptom);

    res.json({
      success: true,
      message: 'Symptom recorded'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record symptom'
    });
  }
});

/**
 * POST /api/session/data/conversation
 * Add conversation turn
 */
router.post('/data/conversation', async (req: Request, res: Response) => {
  try {
    const { sessionId, speaker, message, intent, confidence } = req.body;

    if (!sessionId || !speaker || !message) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, speaker, and message are required'
      });
    }

    await sessionOrchestrator.addConversationTurn(
      sessionId,
      speaker,
      message,
      intent,
      confidence
    );

    res.json({
      success: true,
      message: 'Conversation turn recorded'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record conversation'
    });
  }
});

/**
 * POST /api/session/data/anatomy
 * Add anatomy interaction
 */
router.post('/data/anatomy', async (req: Request, res: Response) => {
  try {
    const { sessionId, interaction } = req.body;

    if (!sessionId || !interaction) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and interaction are required'
      });
    }

    await sessionOrchestrator.addAnatomyInteraction(sessionId, interaction);

    res.json({
      success: true,
      message: 'Anatomy interaction recorded'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record interaction'
    });
  }
});

/**
 * POST /api/session/data/education
 * Add educational content delivered
 */
router.post('/data/education', async (req: Request, res: Response) => {
  try {
    const { sessionId, content } = req.body;

    if (!sessionId || !content) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and content are required'
      });
    }

    await sessionOrchestrator.addEducation(sessionId, content);

    res.json({
      success: true,
      message: 'Education content recorded'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record education'
    });
  }
});

/**
 * POST /api/session/end
 * End session and get report
 */
router.post('/end', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    const report = await sessionOrchestrator.endSession(sessionId);

    res.json({
      success: true,
      message: 'Session ended successfully',
      report
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end session'
    });
  }
});

/**
 * GET /api/session/:sessionId/status
 * Get session status
 */
router.get('/:sessionId/status', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Try to get active session first
    const activeSession = sessionOrchestrator.getActiveSession(sessionId);

    if (activeSession) {
      res.json({
        success: true,
        session: {
          sessionId: activeSession.sessionId,
          role: activeSession.role,
          useCase: activeSession.useCase,
          startTime: activeSession.startTime,
          status: 'active',
          vitalsCount: activeSession.vitals.length,
          conversationTurns: activeSession.conversation.length,
          symptomsReported: activeSession.symptoms.length,
          anatomyInteractions: activeSession.anatomyInteractions.length,
          educationItems: activeSession.education.length
        }
      });
    } else {
      // Check database for completed session
      const dbSession = sessionOrchestrator.getSessionFromDb(sessionId);

      if (dbSession) {
        res.json({
          success: true,
          session: {
            sessionId: dbSession.id,
            role: dbSession.user_role,
            useCase: dbSession.use_case,
            startTime: dbSession.started_at,
            endTime: dbSession.ended_at,
            status: dbSession.status,
            duration: dbSession.session_duration
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get session status'
    });
  }
});

/**
 * GET /api/session/active
 * Get all active sessions
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const sessions = sessionOrchestrator.getAllActiveSessions();

    res.json({
      success: true,
      count: sessions.length,
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        role: s.role,
        useCase: s.useCase,
        startTime: s.startTime,
        vitalsCount: s.vitals.length,
        conversationTurns: s.conversation.length
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active sessions'
    });
  }
});

/**
 * POST /api/session/upload-report
 * Upload and analyze medical report PDF
 */
router.post('/upload-report', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const file = req.file;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`📄 Processing PDF upload: ${file.originalname}`);

    // Parse PDF
    const dataBuffer = await fs.promises.readFile(file.path);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    console.log(`✅ PDF parsed: ${text.length} characters extracted`);

    // Analyze report using RAG
    let analysis = 'Report uploaded successfully. Analysis pending.';

    if (kbRetriever.isReady()) {
      console.log('🤖 Analyzing report with RAG...');
      const result = await kbRetriever.analyzeReport(text);
      analysis = result.analysis;
      console.log('✅ Report analysis complete');
    } else {
      console.warn('⚠️  RAG not configured, skipping analysis');
      analysis = 'Report uploaded. Enable AWS Bedrock Knowledge Base for detailed analysis.';
    }

    // Store in session
    await sessionOrchestrator.addReportAnalysis(sessionId, {
      fileName: file.originalname,
      text,
      analysis,
    });

    // Clean up uploaded file
    await fs.promises.unlink(file.path);

    res.json({
      success: true,
      message: 'Report analyzed successfully',
      analysis,
      reportInfo: {
        fileName: file.originalname,
        pages: pdfData.numpages,
        textLength: text.length,
      },
    });
  } catch (error: any) {
    console.error('❌ Report upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process report'
    });
  }
});

/**
 * GET /api/session/:sessionId/combined-analysis
 * Get combined analysis of report + live vitals
 */
router.get('/:sessionId/combined-analysis', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const analysis = await sessionOrchestrator.generateCombinedAnalysis(sessionId);

    res.json({
      success: true,
      analysis
    });
  } catch (error: any) {
    console.error('❌ Combined analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate combined analysis'
    });
  }
});

export default router;
