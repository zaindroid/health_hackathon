/**
 * Session Orchestrator
 *
 * Central service that manages the complete session lifecycle:
 * - Session initialization (with role selection)
 * - Real-time data collection (vitals, conversation, symptoms, anatomy)
 * - Session completion and report generation
 *
 * Supports both patient and doctor workflows
 */

import database from './database';
import { kbRetriever } from '../rag/retriever_bedrock';

interface ReportData {
  fileName: string;
  text: string;
  analysis: string;
  uploadedAt: Date;
}

interface SessionData {
  sessionId: string;
  startTime: Date;
  role: 'patient' | 'doctor';
  useCase?: string;
  vitals: any[];
  conversation: any[];
  symptoms: any[];
  anatomyInteractions: any[];
  education: any[];
  reportData?: ReportData; // NEW: Uploaded medical report
}

class SessionOrchestrator {
  private activeSessions: Map<string, SessionData> = new Map();

  /**
   * Start a new session
   * @param role - 'patient' or 'doctor'
   * @param useCase - Optional use case (e.g., 'headache', 'general_checkup')
   */
  async startSession(role: 'patient' | 'doctor' = 'patient', useCase?: string): Promise<string> {
    const sessionId = database.generateId();

    try {
      // Create in database
      database.query(
        'INSERT INTO sessions (id, status, user_role, use_case) VALUES (?, ?, ?, ?)',
        [sessionId, 'active', role, useCase || null]
      );

      // Initialize in-memory session
      this.activeSessions.set(sessionId, {
        sessionId,
        startTime: new Date(),
        role,
        useCase,
        vitals: [],
        conversation: [],
        symptoms: [],
        anatomyInteractions: [],
        education: [],
      });

      console.log(`✅ New ${role} session started: ${sessionId}`);
      if (useCase) {
        console.log(`   Use case: ${useCase}`);
      }

      return sessionId;
    } catch (error) {
      console.error('❌ Failed to start session:', error);
      throw new Error(`Failed to start session: ${error}`);
    }
  }

  /**
   * Record user consent for vitals check
   */
  async recordVitalsConsent(sessionId: string): Promise<void> {
    const session = this.getActiveSession(sessionId);
    if (!session) throw new Error('Session not found');

    database.query(
      'UPDATE sessions SET vitals_consent = 1, vitals_check_timestamp = CURRENT_TIMESTAMP WHERE id = ?',
      [sessionId]
    );

    console.log(`✅ Vitals consent recorded for session: ${sessionId}`);
  }

  /**
   * Add video analysis data (heart rate, facial scan)
   */
  async addVideoAnalysis(sessionId: string, data: {
    type: 'facial_scan' | 'heart_rate';
    faceDetected?: boolean;
    heartRate?: number;
    pupilDiameterLeft?: number;
    pupilDiameterRight?: number;
    pupilAsymmetry?: number;
    jaundiceScore?: number;
    pallorScore?: number;
    cyanosisDetected?: boolean;
    facialAsymmetry?: number;
    qualityScore?: number;
    heartRateQuality?: number;
    rppgConfidence?: number;
    alerts?: { urgent: string[]; warnings: string[] };
    displayMode?: 'minimal' | 'hidden' | 'full';
    shownToUser?: boolean;
  }): Promise<void> {
    const session = this.getActiveSession(sessionId);
    if (!session) throw new Error('Session not found');

    const id = database.generateId();

    // Store in memory
    session.vitals.push({ id, ...data, timestamp: new Date() });

    // Store in database
    database.query(
      `INSERT INTO video_analysis (
        id, session_id, analysis_type, face_detected,
        heart_rate, pupil_diameter_left, pupil_diameter_right,
        pupil_asymmetry, jaundice_score, pallor_score,
        cyanosis_detected, facial_asymmetry, quality_score,
        heart_rate_quality, rppg_confidence, alerts,
        display_mode, shown_to_user
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sessionId,
        data.type,
        data.faceDetected ? 1 : 0,
        data.heartRate || null,
        data.pupilDiameterLeft || null,
        data.pupilDiameterRight || null,
        data.pupilAsymmetry || null,
        data.jaundiceScore || null,
        data.pallorScore || null,
        data.cyanosisDetected ? 1 : 0,
        data.facialAsymmetry || null,
        data.qualityScore || null,
        data.heartRateQuality || null,
        data.rppgConfidence || null,
        JSON.stringify(data.alerts || { urgent: [], warnings: [] }),
        data.displayMode || 'minimal',
        data.shownToUser ? 1 : 0
      ]
    );

    console.log(`✅ Video analysis recorded: ${data.type} for session ${sessionId}`);
  }

  /**
   * Record what vitals were displayed to user (minimal 4 metrics)
   */
  async addVitalDisplayed(sessionId: string, metric: {
    name: string;
    value: string;
    unit?: string;
  }): Promise<void> {
    const id = database.generateId();

    database.query(
      'INSERT INTO vitals_displayed (id, session_id, metric_name, value, unit) VALUES (?, ?, ?, ?, ?)',
      [id, sessionId, metric.name, metric.value, metric.unit || null]
    );

    console.log(`✅ Vital displayed: ${metric.name} = ${metric.value} ${metric.unit || ''}`);
  }

  /**
   * Add symptom/pain location
   */
  async addSymptom(sessionId: string, symptom: {
    anatomyPart: string;
    type: string;
    intensity: number;
    description?: string;
    coordinates?: { x: number; y: number; z: number };
  }): Promise<void> {
    const session = this.getActiveSession(sessionId);
    if (!session) throw new Error('Session not found');

    const id = database.generateId();
    session.symptoms.push({ id, ...symptom, timestamp: new Date() });

    database.query(
      `INSERT INTO symptom_locations (
        id, session_id, anatomy_part, symptom_type,
        intensity, description, coordinates
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sessionId,
        symptom.anatomyPart,
        symptom.type,
        symptom.intensity,
        symptom.description || null,
        symptom.coordinates ? JSON.stringify(symptom.coordinates) : null
      ]
    );

    console.log(`✅ Symptom recorded: ${symptom.type} in ${symptom.anatomyPart} (intensity: ${symptom.intensity}/10)`);
  }

  /**
   * Add conversation turn
   */
  async addConversationTurn(
    sessionId: string,
    speaker: 'user' | 'agent',
    message: string,
    intent?: string,
    confidence?: number
  ): Promise<void> {
    const session = this.getActiveSession(sessionId);
    if (!session) throw new Error('Session not found');

    const id = database.generateId();
    const turn = { id, speaker, message, intent, confidence, timestamp: new Date() };
    session.conversation.push(turn);

    database.query(
      `INSERT INTO conversation_turns (
        id, session_id, turn_number, speaker, message, intent, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, sessionId, session.conversation.length, speaker, message, intent || null, confidence || null]
    );

    console.log(`✅ Conversation: ${speaker} said "${message.substring(0, 50)}..."`);
  }

  /**
   * Add anatomy interaction
   */
  async addAnatomyInteraction(sessionId: string, interaction: {
    modelId: string;
    action: string;
    details?: any;
    triggeredBy: 'voice' | 'agent' | 'user_touch';
  }): Promise<void> {
    const session = this.getActiveSession(sessionId);
    if (!session) throw new Error('Session not found');

    const id = database.generateId();
    session.anatomyInteractions.push({ id, ...interaction, timestamp: new Date() });

    database.query(
      `INSERT INTO anatomy_interactions (
        id, session_id, model_id, action, details, triggered_by
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        sessionId,
        interaction.modelId,
        interaction.action,
        interaction.details ? JSON.stringify(interaction.details) : null,
        interaction.triggeredBy
      ]
    );

    console.log(`✅ Anatomy interaction: ${interaction.action} on ${interaction.modelId}`);
  }

  /**
   * Add educational content delivered
   */
  async addEducation(sessionId: string, content: {
    type: string;
    topic: string;
    duration?: number;
    userConsented?: boolean;
    engagementScore?: number;
  }): Promise<void> {
    const session = this.getActiveSession(sessionId);
    if (!session) throw new Error('Session not found');

    const id = database.generateId();
    session.education.push({ id, ...content, timestamp: new Date() });

    database.query(
      `INSERT INTO education_delivered (
        id, session_id, content_type, topic, duration, user_consented, engagement_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sessionId,
        content.type,
        content.topic,
        content.duration || null,
        content.userConsented !== false ? 1 : 0,
        content.engagementScore || null
      ]
    );

    console.log(`✅ Education delivered: ${content.type} on ${content.topic}`);
  }

  /**
   * End session and generate report
   */
  async endSession(sessionId: string): Promise<any> {
    const session = this.getActiveSession(sessionId);
    if (!session) throw new Error('Session not found');

    // Update session status
    database.query(
      'UPDATE sessions SET status = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', sessionId]
    );

    // Generate report
    const report = await this.generateReport(sessionId, session);

    // Clean up in-memory session
    this.activeSessions.delete(sessionId);

    console.log(`✅ Session ended: ${sessionId}`);
    console.log(`   Duration: ${report.duration} seconds`);
    console.log(`   Vitals collected: ${session.vitals.length}`);
    console.log(`   Symptoms reported: ${session.symptoms.length}`);
    console.log(`   Conversation turns: ${session.conversation.length}`);

    return report;
  }

  /**
   * Generate session report
   */
  private async generateReport(sessionId: string, session: SessionData): Promise<any> {
    const reportId = database.generateId();

    // Aggregate vitals
    const vitalsSummary = {
      heartRate: this.aggregateHeartRate(session.vitals),
      facialScan: this.aggregateFacialScan(session.vitals),
      totalChecks: session.vitals.length
    };

    // Aggregate symptoms
    const symptomsSummary = {
      primary: session.symptoms[0] || null,
      locations: session.symptoms.map(s => s.anatomyPart),
      averageIntensity: session.symptoms.reduce((sum, s) => sum + s.intensity, 0) / session.symptoms.length || 0
    };

    // Educational summary
    const topicsCovered = session.education.map(e => e.topic);
    const totalEducationTime = session.education.reduce((sum, e) => sum + (e.duration || 0), 0);

    // Dashboard data
    const dashboardData = {
      session: {
        id: sessionId,
        role: session.role,
        useCase: session.useCase,
        startTime: session.startTime,
        duration: Math.floor((Date.now() - session.startTime.getTime()) / 1000)
      },
      vitals: vitalsSummary,
      symptoms: symptomsSummary,
      conversation: {
        turns: session.conversation.length,
        userMessages: session.conversation.filter(c => c.speaker === 'user').length,
        agentMessages: session.conversation.filter(c => c.speaker === 'agent').length
      },
      education: {
        topics: topicsCovered,
        totalTime: totalEducationTime
      },
      anatomy: {
        interactions: session.anatomyInteractions.length
      }
    };

    // Store report
    database.query(
      `INSERT INTO session_reports (
        id, session_id, report_type, vitals_summary,
        symptoms_summary, topics_covered, total_education_time, dashboard_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        sessionId,
        'comprehensive',
        JSON.stringify(vitalsSummary),
        JSON.stringify(symptomsSummary),
        JSON.stringify(topicsCovered),
        totalEducationTime,
        JSON.stringify(dashboardData)
      ]
    );

    return dashboardData;
  }

  /**
   * Helper: Aggregate heart rate data
   */
  private aggregateHeartRate(vitals: any[]): any {
    const hrData = vitals.filter(v => v.type === 'heart_rate' && v.heartRate);
    if (hrData.length === 0) return null;

    const values = hrData.map(v => v.heartRate);
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      samples: values.length
    };
  }

  /**
   * Helper: Aggregate facial scan data
   */
  private aggregateFacialScan(vitals: any[]): any {
    const faceData = vitals.filter(v => v.type === 'facial_scan' && v.faceDetected);
    if (faceData.length === 0) return null;

    return {
      pupilAsymmetry: this.avg(faceData.map(v => v.pupilAsymmetry).filter(Boolean)),
      jaundiceScore: this.avg(faceData.map(v => v.jaundiceScore).filter(Boolean)),
      pallorScore: this.avg(faceData.map(v => v.pallorScore).filter(Boolean)),
      facialAsymmetry: this.avg(faceData.map(v => v.facialAsymmetry).filter(Boolean)),
      qualityScore: this.avg(faceData.map(v => v.qualityScore).filter(Boolean)),
      samples: faceData.length
    };
  }

  private avg(arr: number[]): number | null {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  }

  /**
   * Get active session data
   */
  getActiveSession(sessionId: string): SessionData | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get session from database (for completed sessions)
   */
  getSessionFromDb(sessionId: string): any {
    return database.queryOne('SELECT * FROM sessions WHERE id = ?', [sessionId]);
  }

  /**
   * Get all active sessions
   */
  getAllActiveSessions(): SessionData[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Add medical report to session
   */
  async addReportAnalysis(sessionId: string, report: {
    fileName: string;
    text: string;
    analysis: string;
  }): Promise<void> {
    const session = this.getActiveSession(sessionId);
    if (!session) throw new Error('Session not found');

    session.reportData = {
      ...report,
      uploadedAt: new Date(),
    };

    console.log(`✅ Report added to session: ${report.fileName} (${report.text.length} chars)`);
  }

  /**
   * Generate combined analysis from report + live vitals
   */
  async generateCombinedAnalysis(sessionId: string): Promise<any> {
    const session = this.getActiveSession(sessionId);
    if (!session) throw new Error('Session not found');

    // Get report analysis
    const reportAnalysis = session.reportData?.analysis || 'No report uploaded';

    // Get live vitals
    const vitalsSummary = {
      heartRate: this.aggregateHeartRate(session.vitals),
      facialScan: this.aggregateFacialScan(session.vitals),
    };

    // Use RAG to combine and analyze
    if (kbRetriever.isReady()) {
      const combined = await kbRetriever.combineAnalysis(reportAnalysis, vitalsSummary);

      console.log(`✅ Combined analysis generated`);
      console.log(`   Recommendation: ${combined.recommendation}`);
      console.log(`   Urgency: ${combined.urgency}`);

      return {
        report: session.reportData,
        vitals: vitalsSummary,
        combinedAnalysis: combined.combinedAnalysis,
        recommendation: combined.recommendation,
        urgency: combined.urgency,
      };
    } else {
      // Fallback without RAG
      console.warn('⚠️  RAG not configured, using basic combined analysis');
      return {
        report: session.reportData,
        vitals: vitalsSummary,
        combinedAnalysis: 'Combined analysis requires AWS Bedrock Knowledge Base setup.',
        recommendation: session.reportData ? 'see_doctor' : 'rest',
        urgency: 'routine',
      };
    }
  }
}

// Export singleton instance
export default new SessionOrchestrator();
