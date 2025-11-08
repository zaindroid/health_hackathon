/**
 * Session API Routes
 *
 * RESTful endpoints for session management
 * Works alongside WebSocket handlers for real-time communication
 */

import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import sessionOrchestrator from '../services/sessionOrchestrator';
import { kbRetriever } from '../rag/retriever_bedrock';
import { getLLMProvider } from '../llm';

// pdf-parse v2 exports PDFParse class
const { PDFParse } = require('pdf-parse');

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

    return res.json({
      success: true,
      sessionId,
      role: role || 'patient',
      useCase: useCase || null,
      message: 'Session started successfully'
    });
  } catch (error: any) {
    console.error('❌ Error starting session:', error);
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Vitals consent recorded'
    });
  } catch (error: any) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Video analysis data recorded'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to record video data'
    });
  }
});

/**
 * POST /api/session/vitals/complete
 * Trigger voice explanation of vitals + report combined analysis
 */
router.post('/vitals/complete', async (req: Request, res: Response) => {
  try {
    const { sessionId, vitals } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId required' });
    }

    console.log(`📊 Vitals complete for session: ${sessionId}`);

    // Store vitals summary in session
    const session = sessionOrchestrator.getActiveSession(sessionId);
    if (session) {
      session.vitals.push({
        type: 'video_vitals_complete',
        heartRate: vitals.heartRate,
        pupilLeft: vitals.eyeMetrics?.pupil_diameter_left,
        pupilRight: vitals.eyeMetrics?.pupil_diameter_right,
        blinkRate: vitals.eyeMetrics?.blink_rate,
        timestamp: new Date(),
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Vitals complete error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
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

    return res.json({
      success: true,
      message: 'Vital display recorded'
    });
  } catch (error: any) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Symptom recorded'
    });
  } catch (error: any) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Conversation turn recorded'
    });
  } catch (error: any) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Anatomy interaction recorded'
    });
  } catch (error: any) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Education content recorded'
    });
  } catch (error: any) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: 'Session ended successfully',
      report
    });
  } catch (error: any) {
    return res.status(500).json({
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
      return res.json({
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
        return res.json({
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
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
    }
  } catch (error: any) {
    return res.status(500).json({
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

    return res.json({
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
    return res.status(500).json({
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

    // Parse PDF using pdf-parse v2 API
    const dataBuffer = await fs.promises.readFile(file.path);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfResult = await parser.getText();
    const text = pdfResult.text;
    await parser.destroy(); // Clean up resources

    console.log(`✅ PDF parsed: ${text.length} characters extracted`);

    // Analyze report using RAG or LLM
    let analysis = 'Report uploaded successfully. Analysis pending.';

    if (kbRetriever.isReady()) {
      console.log('🤖 Analyzing report with RAG...');
      const result = await kbRetriever.analyzeReport(text);
      analysis = result.analysis;
      console.log('✅ Report analysis complete');
    } else {
      // Use LLM directly for analysis when RAG not configured
      console.log('🤖 Analyzing report with LLM...');
      const llmProvider = getLLMProvider();
      if (llmProvider.isConfigured()) {
        try {
          // Truncate text if too long (keep first 3000 chars for analysis)
          const textToAnalyze = text.length > 3000 ? text.substring(0, 3000) + '...' : text;

          const analysisPrompt = `You are analyzing a medical report. Read it carefully and provide a comprehensive analysis in JSON format.

REPORT TEXT:
${textToAnalyze}

CRITICAL INSTRUCTIONS:
1. Identify the report type (CBC, metabolic panel, lipid panel, imaging, etc.)
2. For EACH lab value, you MUST include the exact numeric range in parentheses
3. Format MUST be: "Name Value Unit - STATUS (min-max)"
4. Examples:
   - "Hemoglobin 14.5 g/dL - NORMAL (12-16)"
   - "Glucose 126 mg/dL - HIGH (70-100)"
   - "Vitamin B12 150 pg/mL - LOW (200-900)"
5. Status must be: NORMAL, HIGH, LOW, ELEVATED, or DECREASED
6. ALWAYS include min-max range in parentheses with a dash between numbers

REQUIRED JSON FORMAT (respond with ONLY valid JSON, no markdown, no extra text):
{
  "utterance": "Brief 1-2 sentence summary of the report and key findings",
  "intent": "report_analysis",
  "report_type": "Complete Blood Count | Metabolic Panel | Lipid Panel | etc",
  "findings": {
    "normal": ["Hemoglobin 14.5 g/dL - NORMAL (12-16)", "WBC 7200 /uL - NORMAL (4500-11000)"],
    "abnormal": ["Cholesterol 240 mg/dL - HIGH (0-200)", "Glucose 126 mg/dL - ELEVATED (70-100)"],
    "action": "rest | monitor | see_doctor | urgent_care"
  }
}

Return ONLY the JSON object, no code blocks, no markdown formatting.`;

          const llmResponse = await llmProvider.generateResponse(analysisPrompt);
          console.log('📊 LLM Response type:', typeof llmResponse);
          console.log('📊 LLM Response:', JSON.stringify(llmResponse).substring(0, 300));

          // Handle cases where LLM returns JSON as a string in utterance
          let parsedResponse = llmResponse;

          // Check if utterance contains JSON string
          if (llmResponse.utterance && typeof llmResponse.utterance === 'string') {
            const utteranceStr = llmResponse.utterance.trim();
            if (utteranceStr.startsWith('{')) {
              try {
                // Try to parse the utterance as JSON
                const parsed = JSON.parse(utteranceStr);
                if (parsed.findings) {
                  console.log('✅ Parsed JSON from utterance string');
                  parsedResponse = parsed;
                }
              } catch (e) {
                console.log('⚠️  Utterance looks like JSON but failed to parse');
              }
            }
          }

          // Return structured JSON for frontend to display as infographic
          if (parsedResponse.utterance) {
            // If we have structured findings, return as JSON for ReportInfographic component
            if ((parsedResponse as any).findings) {
              analysis = JSON.stringify(parsedResponse);
              console.log('✅ Returning structured JSON analysis');
              console.log('📊 Normal values:', (parsedResponse as any).findings.normal?.length || 0);
              console.log('📊 Abnormal values:', (parsedResponse as any).findings.abnormal?.length || 0);
            } else {
              // Fallback to text if no structured data
              analysis = parsedResponse.utterance;
              console.warn('⚠️  No findings in LLM response, using utterance only');
            }
          } else {
            console.warn('⚠️  No utterance in LLM response');
            analysis = 'Unable to analyze report. Please try again.';
          }
          console.log('✅ LLM analysis complete');
        } catch (llmError) {
          console.error('❌ LLM analysis failed:', llmError);
          analysis = 'Report uploaded successfully. Basic analysis: ' + text.substring(0, 200) + '...';
        }
      } else {
        console.warn('⚠️  Neither RAG nor LLM configured');
        analysis = 'Report uploaded. Please configure AWS Bedrock for analysis.';
      }
    }

    // Store in session
    await sessionOrchestrator.addReportAnalysis(sessionId, {
      fileName: file.originalname,
      text,
      analysis,
    });

    // Clean up uploaded file
    await fs.promises.unlink(file.path);

    return res.json({
      success: true,
      message: 'Report analyzed successfully',
      analysis,
      reportInfo: {
        fileName: file.originalname,
        pages: pdfResult.total, // Total number of pages from pdf-parse v2
        textLength: text.length,
      },
    });
  } catch (error: any) {
    console.error('❌ Report upload error:', error);
    return res.status(500).json({
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

    return res.json({
      success: true,
      analysis
    });
  } catch (error: any) {
    console.error('❌ Combined analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate combined analysis'
    });
  }
});

export default router;
