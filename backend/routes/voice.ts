/**
 * Voice Agent WebSocket Route
 * Handles real-time voice interaction: Audio → STT → LLM → Response
 */

import { WebSocket } from 'ws';
import { getSTTProvider } from '../stt';
import { getLLMProvider } from '../llm';
import { getBioDigitalHandler } from '../tools/biodigital_placeholder';
import { getMedicalRetriever } from '../rag/retriever_placeholder';
import { getTTSProvider } from '../tts';
import { ServerMessage, ClientMessage, STTProvider, TTSProvider } from '../../shared/types';
import { appConfig } from '../config/env';
import sessionOrchestrator from '../services/sessionOrchestrator';

export class VoiceSessionHandler {
  private ws: WebSocket;
  private sessionId: string;
  private sttProvider: STTProvider;
  private llmProvider: ReturnType<typeof getLLMProvider>;
  private toolHandler: ReturnType<typeof getBioDigitalHandler>;
  private ragRetriever: ReturnType<typeof getMedicalRetriever>;
  private ttsProvider: TTSProvider;
  private isActive = false;
  private greetingSent = false; // Track if greeting has been sent

  constructor(ws: WebSocket, sessionId: string) {
    this.ws = ws;
    this.sessionId = sessionId;
    this.sttProvider = getSTTProvider();
    this.llmProvider = getLLMProvider();
    this.toolHandler = getBioDigitalHandler();
    this.ragRetriever = getMedicalRetriever();
    this.ttsProvider = getTTSProvider();

    console.log(`🎙️  New voice session: ${sessionId}`);
    this.setupHandlers();
  }

  /**
   * Set up WebSocket and STT event handlers
   */
  private setupHandlers(): void {
    // Handle incoming WebSocket messages
    this.ws.on('message', async (data: Buffer) => {
      try {
        // Check if it's a control message (JSON) or audio data (binary)
        if (this.isJSON(data)) {
          const message: ClientMessage = JSON.parse(data.toString());
          await this.handleControlMessage(message);
        } else {
          // Binary audio data - forward to STT
          if (this.isActive) {
            this.sttProvider.sendAudio(data);
          }
        }
      } catch (error) {
        console.error('❌ Error handling message:', error);
        this.sendError('Failed to process message');
      }
    });

    // Handle WebSocket close
    this.ws.on('close', () => {
      console.log(`🔌 Voice session closed: ${this.sessionId}`);
      this.cleanup();
    });

    // Set up STT transcript callback
    this.sttProvider.onTranscript(async (transcript: string, isFinal: boolean) => {
      console.log(`📝 Transcript (${isFinal ? 'final' : 'interim'}): ${transcript}`);

      // Send transcript to client
      this.sendMessage({
        type: 'transcript',
        transcript: {
          text: transcript,
          isFinal,
          timestamp: Date.now(),
        },
      });

      // Process final transcripts with LLM
      if (isFinal && transcript.trim() !== '') {
        await this.processTranscript(transcript);
      }
    });
  }

  /**
   * Handle control messages from client
   */
  private async handleControlMessage(message: ClientMessage): Promise<void> {
    if (message.type === 'control') {
      if (message.action === 'start') {
        await this.startSession();
      } else if (message.action === 'stop') {
        await this.stopSession();
      } else if (message.action === 'set_session_id' && (message as any).sessionId) {
        // Update the sessionId to match the database session
        this.sessionId = (message as any).sessionId;
        console.log(`🔗 Voice session linked to database session: ${this.sessionId}`);
      }
    }
  }

  /**
   * Start voice session and STT stream
   */
  private async startSession(): Promise<void> {
    if (this.isActive) {
      console.warn('⚠️  Session already active');
      return;
    }

    try {
      console.log(`🚀 Starting voice session: ${this.sessionId}`);
      this.sttProvider.startStream();
      this.isActive = true;

      this.sendMessage({
        type: 'status',
        status: 'session_started',
      });

      // Send initial greeting ONLY once per WebSocket connection
      if (!this.greetingSent) {
        this.greetingSent = true;

        this.sendMessage({
          type: 'llm_response',
          llmResponse: {
            utterance: 'Hello! Welcome to Health Helper. How may I help you today?',
            intent: 'greeting',
          },
        });

        // Generate greeting audio if using server-side TTS (Cartesia or Polly)
        if ((appConfig.ttsProvider === 'cartesia' || appConfig.ttsProvider === 'polly') && this.ttsProvider.isConfigured()) {
          try {
            const greetingText = 'Hello! Welcome to Health Helper. How may I help you today?';
            const audioBuffer = await this.ttsProvider.speak(greetingText);

            if (audioBuffer && Buffer.isBuffer(audioBuffer)) {
              // Polly uses 16000Hz, Cartesia uses 24000Hz
              const sampleRate = appConfig.ttsProvider === 'polly' ? 16000 : 24000;
              this.sendMessage({
                type: 'audio',
                audio: {
                  data: audioBuffer.toString('base64'),
                  format: 'pcm_s16le',
                  sampleRate,
                },
              });
              console.log(`🔊 Greeting audio sent to client (${sampleRate}Hz)`);
            }
          } catch (error) {
            console.error('❌ Error generating greeting audio:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to start session:', error);
      this.sendError('Failed to start voice session');
    }
  }

  /**
   * Stop voice session and STT stream
   */
  private async stopSession(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      console.log(`🛑 Stopping voice session: ${this.sessionId}`);
      this.sttProvider.stopStream();
      this.isActive = false;

      this.sendMessage({
        type: 'status',
        status: 'session_stopped',
      });
    } catch (error) {
      console.error('❌ Error stopping session:', error);
    }
  }

  /**
   * Process transcript with LLM and optional RAG
   */
  private async processTranscript(transcript: string): Promise<void> {
    try {
      console.log(`🤖 Processing transcript with LLM: ${transcript}`);

      // Get session data to check for uploaded reports
      const session = sessionOrchestrator.getActiveSession(this.sessionId);

      // Build context with uploaded report info AND vitals
      let contextPrefix = '';

      // Add report context
      if (session?.reportData) {
        // Include full analysis (truncated at 2000 chars if too long)
        const analysisText = session.reportData.analysis.length > 2000
          ? session.reportData.analysis.substring(0, 2000) + '...[truncated]'
          : session.reportData.analysis;

        contextPrefix += `[CONTEXT: User has already uploaded their medical report "${session.reportData.fileName}".

REPORT ANALYSIS:
${analysisText}

The report is ALREADY uploaded and analyzed. DO NOT ask them to upload again.`;
        console.log(`📄 Including uploaded report context (${session.reportData.fileName}) in LLM prompt`);
      }

      // Add vitals context
      const recentVitals = session?.vitals.filter(v => v.type === 'video_vitals_complete');
      if (recentVitals && recentVitals.length > 0) {
        const latestVitals = recentVitals[recentVitals.length - 1];
        contextPrefix += `\n\nCURRENT VITALS (just measured):
- Heart Rate: ${latestVitals.heartRate} BPM
- Pupil Size (Left): ${latestVitals.pupilLeft?.toFixed(1)} mm
- Pupil Size (Right): ${latestVitals.pupilRight?.toFixed(1)} mm
- Blink Rate: ${latestVitals.blinkRate} per minute

IMPORTANT: User just completed their vitals check. Explain the COMBINED analysis:
1. Compare current vitals with the blood report findings
2. Are the vitals normal or concerning?
3. Do the vitals match what we'd expect from the report?
4. Give clear recommendation: rest, monitor at home, see doctor soon, or urgent care
Be specific and reassuring. Connect the dots between their test results and current vitals.`;
        console.log(`📊 Including vitals context in LLM prompt`);
      }

      if (contextPrefix) {
        contextPrefix += `]\n\nUser says: `;
      }

      // Prepend context to transcript
      const enhancedTranscript = contextPrefix + transcript;

      // RAG (optional)
      let ragContext;
      if (appConfig.enableRAG && this.ragRetriever.isConfigured()) {
        const documents = await this.ragRetriever.retrieve(transcript);
        ragContext = { documents };
        console.log(`📚 Retrieved ${documents.length} relevant documents`);
      }

      // Generate LLM response with enhanced context
      const llmResponse = await this.llmProvider.generateResponse(enhancedTranscript, ragContext);
      console.log(`✅ LLM response: ${llmResponse.utterance}`);

      // Send response to client (always send the structured JSON response)
      this.sendMessage({
        type: 'llm_response',
        llmResponse,
      });

      // Only generate/send server-side audio when configured for server-side TTS (Cartesia or Polly)
      if ((appConfig.ttsProvider === 'cartesia' || appConfig.ttsProvider === 'polly') && this.ttsProvider.isConfigured()) {
        try {
          const audioBuffer = await this.ttsProvider.speak(llmResponse.utterance);

          // Check if audioBuffer is a Buffer (Cartesia/Polly return Buffer, webspeech returns void)
          if (audioBuffer && Buffer.isBuffer(audioBuffer)) {
            // Polly uses 16000Hz, Cartesia uses 24000Hz
            const sampleRate = appConfig.ttsProvider === 'polly' ? 16000 : 24000;
            // Send audio to client
            this.sendMessage({
              type: 'audio',
              audio: {
                data: audioBuffer.toString('base64'),
                format: 'pcm_s16le',
                sampleRate,
              },
            });

            console.log(`🔊 Audio sent to client (${audioBuffer.length} bytes)`);
          }
        } catch (audioError) {
          console.error('❌ TTS error:', audioError);
          // Do not fail the flow if TTS fails
        }
      } else {
        // If using webspeech (frontend), do not send 'audio' — frontend will speak llm_response
      }

      // Handle vitals consent
      if (llmResponse.intent === 'vitals_consent_yes' ||
          (llmResponse.tool_action && llmResponse.tool_action.op === 'start_video_vitals')) {
        console.log(`✅ User consented to vitals check`);

        // Send message to frontend to start video vitals
        this.sendMessage({
          type: 'start_video_vitals',
        });
        console.log(`📹 Video vitals request sent to frontend`);
      } else if (llmResponse.intent === 'vitals_consent_no') {
        console.log(`❌ User declined vitals check`);

        // Send message to frontend to show alternative options
        this.sendMessage({
          type: 'vitals_declined',
        });
        console.log(`📝 Vitals declined - offering alternatives`);
      }

      // Tool actions...
      if (appConfig.enableTools && llmResponse.tool_action) {
        if (this.toolHandler.canHandle(llmResponse.tool_action)) {
          const result = await this.toolHandler.execute(llmResponse.tool_action);
          console.log(`🔧 Tool execution result:`, result);

          // If tool returned camera command, send it to frontend
          if (result.success && result.data) {
            // Check if it's a camera command (has action property)
            if (result.data.action && (result.data.action === 'camera.set' || result.data.action === 'camera.flyTo')) {
              this.sendMessage({
                type: 'camera_command',
                cameraCommand: result.data,
              });
              console.log(`📹 Camera command sent to frontend:`, result.data.action);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing transcript:', error);
      this.sendError('Failed to process your request');
    }
  }

  /**
   * Send message to client
   */
  private sendMessage(message: ServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to client
   */
  private sendError(error: string): void {
    this.sendMessage({
      type: 'error',
      error,
    });
  }

  /**
   * Check if buffer contains JSON
   */
  private isJSON(buffer: Buffer): boolean {
    try {
      const str = buffer.toString();
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.isActive) {
      this.sttProvider.stopStream();
    }
    this.isActive = false;
  }
}
