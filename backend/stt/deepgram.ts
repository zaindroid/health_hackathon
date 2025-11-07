/**
 * Deepgram Real-Time Speech-to-Text Provider
 * Implements real-time audio transcription using Deepgram API
 */

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { STTProvider, TranscriptEvent } from '../../shared/types';
import { deepgramConfig } from '../config/env';

export class DeepgramSTTProvider implements STTProvider {
  public name = 'deepgram';
  private deepgram: any;
  private connection: any;
  private transcriptCallback?: (transcript: string, isFinal: boolean) => void;
  private isActive = false;
  private audioBuffer: Buffer[] = [];
  private keepAliveInterval?: NodeJS.Timeout;

  constructor() {
    if (this.isConfigured()) {
      this.deepgram = createClient(deepgramConfig.apiKey);
      console.log('✅ Deepgram STT Provider initialized');
    } else {
      console.warn('⚠️  Deepgram API key not configured');
    }
  }

  /**
   * Check if Deepgram is properly configured
   */
  isConfigured(): boolean {
    return !!deepgramConfig.apiKey;
  }

  /**
   * Start a new live transcription stream
   */
  startStream(): void {
    if (!this.isConfigured()) {
      throw new Error('Deepgram is not properly configured');
    }

    if (this.isActive) {
      console.warn('⚠️  Stream already active');
      return;
    }

    try {
      // Clear audio buffer
      this.audioBuffer = [];

      // Create a live transcription connection
      this.connection = this.deepgram.listen.live({
        model: deepgramConfig.model || 'nova-2',
        language: deepgramConfig.language || 'en-US',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
        punctuate: true,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
      });

      // Set up transcript handler BEFORE connection opens
      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const isFinal = data.is_final;

        if (transcript && transcript.trim() !== '' && this.transcriptCallback) {
          this.transcriptCallback(transcript, isFinal);
        }
      });

      // Handle metadata events
      this.connection.on(LiveTranscriptionEvents.Metadata, (data: any) => {
        console.log('📊 Deepgram metadata:', {
          duration: data.duration,
          channels: data.channels,
        });
      });

      // Handle errors
      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('❌ Deepgram error:', error);
        this.isActive = false;
      });

      // Handle close
      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('🔌 Deepgram connection closed');
        this.isActive = false;
        this.stopKeepAlive();
      });

      // Handle connection open
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('🎤 Deepgram connection opened and ready');
        this.isActive = true;

        // Send any buffered audio
        if (this.audioBuffer.length > 0) {
          console.log(`📤 Sending ${this.audioBuffer.length} buffered audio chunks`);
          this.audioBuffer.forEach(chunk => {
            this.connection.send(chunk);
          });
          this.audioBuffer = [];
        }

        // Start keep-alive mechanism
        this.startKeepAlive();
      });

    } catch (error) {
      console.error('❌ Failed to start Deepgram stream:', error);
      throw error;
    }
  }

  /**
   * Stop the live transcription stream
   */
  stopStream(): void {
    this.stopKeepAlive();

    if (this.connection) {
      try {
        if (this.isActive) {
          this.connection.finish();
        }
        this.isActive = false;
        this.audioBuffer = [];
        console.log('🛑 Deepgram stream stopped');
      } catch (error) {
        console.error('❌ Error stopping Deepgram stream:', error);
      }
    }
  }

  /**
   * Send audio data to the stream
   */
  sendAudio(audioData: Buffer): void {
    if (!this.connection) {
      console.warn('⚠️  Cannot send audio: no connection');
      return;
    }

    if (this.isActive) {
      // Connection is ready, send immediately
      try {
        this.connection.send(audioData);
      } catch (error) {
        console.error('❌ Error sending audio:', error);
      }
    } else {
      // Buffer audio until connection is ready
      this.audioBuffer.push(audioData);

      // Limit buffer size to prevent memory issues
      if (this.audioBuffer.length > 100) {
        this.audioBuffer.shift(); // Remove oldest chunk
      }
    }
  }

  /**
   * Start keep-alive mechanism to prevent connection timeout
   */
  private startKeepAlive(): void {
    // Send a small keep-alive packet every 5 seconds
    this.keepAliveInterval = setInterval(() => {
      if (this.connection && this.isActive) {
        try {
          // Send empty buffer as keep-alive
          this.connection.keepAlive();
        } catch (error) {
          console.warn('⚠️  Keep-alive failed:', error);
        }
      }
    }, 5000);
  }

  /**
   * Stop keep-alive mechanism
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }
  }

  /**
   * Register callback for transcript events
   */
  onTranscript(callback: (transcript: string, isFinal: boolean) => void): void {
    this.transcriptCallback = callback;
  }

  /**
   * Get current stream status
   */
  getStatus(): { active: boolean; configured: boolean } {
    return {
      active: this.isActive,
      configured: this.isConfigured(),
    };
  }

  /**
   * Reconnect logic with exponential backoff
   * TODO: Implement automatic reconnection for production use
   */
  private async reconnect(attempt = 1, maxAttempts = 5): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    console.log(`🔄 Attempting to reconnect (${attempt}/${maxAttempts}) in ${delay}ms`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      this.startStream();
    } catch (error) {
      if (attempt < maxAttempts) {
        await this.reconnect(attempt + 1, maxAttempts);
      } else {
        console.error('❌ Max reconnection attempts reached');
        throw error;
      }
    }
  }
}

// Singleton instance
let deepgramInstance: DeepgramSTTProvider | null = null;

export function getDeepgramProvider(): DeepgramSTTProvider {
  if (!deepgramInstance) {
    deepgramInstance = new DeepgramSTTProvider();
  }
  return deepgramInstance;
}
