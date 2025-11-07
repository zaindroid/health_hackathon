/**
 * Voice Agent WebSocket Route
 * Handles real-time voice interaction: Audio → STT → LLM → Response
 */

import { WebSocket } from 'ws';
import { getDeepgramProvider } from '../stt/deepgram';
import { getLLMProvider } from '../llm';
import { getBioDigitalHandler } from '../tools/biodigital_placeholder';
import { getMedicalRetriever } from '../rag/retriever_placeholder';
import { getCartesiaProvider } from '../tts/cartesia';
import { getTTSProvider } from '../tts/webspeech_placeholder';
import { ServerMessage, ClientMessage } from '../../shared/types';
import { appConfig } from '../config/env';

export class VoiceSessionHandler {
  private ws: WebSocket;
  private sessionId: string;
  private sttProvider: ReturnType<typeof getDeepgramProvider>;
  private llmProvider: ReturnType<typeof getLLMProvider>;
  private toolHandler: ReturnType<typeof getBioDigitalHandler>;
  private ragRetriever: ReturnType<typeof getMedicalRetriever>;
  private ttsProvider: ReturnType<typeof getCartesiaProvider> | ReturnType<typeof getTTSProvider>;
  private isActive = false;

  constructor(ws: WebSocket, sessionId: string) {
    this.ws = ws;
    this.sessionId = sessionId;
    this.sttProvider = getDeepgramProvider();
    this.llmProvider = getLLMProvider();
    this.toolHandler = getBioDigitalHandler();
    this.ragRetriever = getMedicalRetriever();

    // Choose TTS provider based on configuration
    if (appConfig.ttsProvider === 'external') {
      this.ttsProvider = getCartesiaProvider();
    } else {
      // webspeech (frontend) or any future frontend-based provider
      this.ttsProvider = getTTSProvider('webspeech');
    }

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

      // Send initial greeting ONCE when session starts
      this.sendMessage({
        type: 'llm_response',
        llmResponse: {
          utterance: 'Hello! Welcome to Health Helper. How may I help you today?',
          intent: 'greeting',
        },
      });

      // Generate greeting audio if using Cartesia
      if (appConfig.ttsProvider === 'external' && this.ttsProvider.isConfigured()) {
        try {
          const greetingText = 'Hello! Welcome to Health Helper. How may I help you today?';
          const audioBuffer = await this.ttsProvider.speak(greetingText);

          if (audioBuffer && Buffer.isBuffer(audioBuffer)) {
            this.sendMessage({
              type: 'audio',
              audio: {
                data: audioBuffer.toString('base64'),
                format: 'pcm_s16le',
                sampleRate: 24000,
              },
            });
            console.log(`🔊 Greeting audio sent to client`);
          }
        } catch (error) {
          console.error('❌ Error generating greeting audio:', error);
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

      // RAG (optional)
      let ragContext;
      if (appConfig.enableRAG && this.ragRetriever.isConfigured()) {
        const documents = await this.ragRetriever.retrieve(transcript);
        ragContext = { documents };
        console.log(`📚 Retrieved ${documents.length} relevant documents`);
      }

      // Generate LLM response
      const llmResponse = await this.llmProvider.generateResponse(transcript, ragContext);
      console.log(`✅ LLM response: ${llmResponse.utterance}`);

      // Send response to client (always send the structured JSON response)
      this.sendMessage({
        type: 'llm_response',
        llmResponse,
      });

      // Only generate/send server-side audio when configured for external TTS
      if (appConfig.ttsProvider === 'external' && this.ttsProvider.isConfigured()) {
        try {
          const audioBuffer = await this.ttsProvider.speak(llmResponse.utterance);

          // Check if audioBuffer is a Buffer (Cartesia returns Buffer, webspeech returns void)
          if (audioBuffer && Buffer.isBuffer(audioBuffer)) {
            // Send audio to client
            this.sendMessage({
              type: 'audio',
              audio: {
                data: audioBuffer.toString('base64'),
                format: 'pcm_s16le',
                sampleRate: 24000,
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
