/**
 * Amazon Transcribe Real-Time Speech-to-Text Provider
 * Implements real-time audio transcription using AWS Transcribe Streaming
 */

import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  AudioStream,
  AudioEvent,
  LanguageCode,
} from '@aws-sdk/client-transcribe-streaming';
import { STTProvider } from '../../shared/types';
import { bedrockConfig } from '../config/env';
import { PassThrough } from 'stream';

export class TranscribeSTTProvider implements STTProvider {
  public name = 'transcribe';
  private client!: TranscribeStreamingClient;
  private transcriptCallback?: (transcript: string, isFinal: boolean) => void;
  private isActive = false;
  private audioStream?: PassThrough;
  private audioBuffer: Buffer[] = [];
  private readonly MAX_CHUNK_SIZE = 8192; // 8KB - safe size for Transcribe

  constructor() {
    if (this.isConfigured()) {
      this.client = new TranscribeStreamingClient({
        region: bedrockConfig.region || 'us-east-1',
        credentials: bedrockConfig.credentials,
      });
      console.log('✅ Amazon Transcribe STT Provider initialized');
      console.log(`   Region: ${bedrockConfig.region}`);
    } else {
      console.warn('⚠️  AWS credentials not configured for Transcribe');
    }
  }

  /**
   * Check if Transcribe is properly configured
   */
  isConfigured(): boolean {
    return !!bedrockConfig.region && !!bedrockConfig.credentials;
  }

  /**
   * Start a new live transcription stream
   */
  async startStream(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Amazon Transcribe is not properly configured');
    }

    if (this.isActive) {
      console.warn('⚠️  Stream already active');
      return;
    }

    try {
      // Clear audio buffer
      this.audioBuffer = [];

      // Create a PassThrough stream for audio data
      this.audioStream = new PassThrough();

      // Create async generator for audio stream
      const audioGenerator = this.createAudioStreamGenerator();

      console.log('🎤 Starting Amazon Transcribe stream...');

      // Start stream transcription
      const command = new StartStreamTranscriptionCommand({
        LanguageCode: LanguageCode.EN_US,
        MediaEncoding: 'pcm',
        MediaSampleRateHertz: 16000,
        AudioStream: audioGenerator,
        EnablePartialResultsStabilization: true,
        PartialResultsStability: 'medium',
        VocabularyName: undefined, // You can add medical vocabulary here
      });

      const response = await this.client.send(command);
      this.isActive = true;
      console.log('✅ Amazon Transcribe stream started');

      // Process transcription results
      if (response.TranscriptResultStream) {
        this.processTranscriptStream(response.TranscriptResultStream);
      }

      // Send buffered audio one chunk at a time with delay
      if (this.audioBuffer.length > 0) {
        console.log(`📤 Sending ${this.audioBuffer.length} buffered audio chunks with rate limiting`);

        // Send buffered audio asynchronously to avoid overwhelming the stream
        setImmediate(async () => {
          for (const chunk of this.audioBuffer) {
            if (this.audioStream && this.isActive) {
              // Split into safe-sized chunks
              for (let i = 0; i < chunk.length; i += this.MAX_CHUNK_SIZE) {
                const smallChunk = chunk.slice(i, Math.min(i + this.MAX_CHUNK_SIZE, chunk.length));
                this.audioStream.write(smallChunk);
                // Small delay between chunks to avoid overwhelming the stream
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }
          }
        });
        this.audioBuffer = [];
      }

    } catch (error) {
      console.error('❌ Failed to start Transcribe stream:', error);
      this.isActive = false;
      throw error;
    }
  }

  /**
   * Create async generator for audio stream
   */
  private async *createAudioStreamGenerator(): AsyncGenerator<AudioStream> {
    if (!this.audioStream) {
      throw new Error('Audio stream not initialized');
    }

    for await (const chunk of this.audioStream) {
      if (chunk instanceof Buffer) {
        const audioEvent: AudioEvent = {
          AudioChunk: chunk,
        };
        yield { AudioEvent: audioEvent };
      }
    }
  }

  /**
   * Process transcript results from Transcribe
   */
  private async processTranscriptStream(stream: AsyncIterable<any>): Promise<void> {
    try {
      for await (const event of stream) {
        if (event.TranscriptEvent) {
          const results = event.TranscriptEvent.Transcript?.Results || [];

          for (const result of results) {
            const isFinal = !result.IsPartial;
            const alternatives = result.Alternatives || [];

            if (alternatives.length > 0) {
              const transcript = alternatives[0].Transcript || '';

              if (transcript.trim() !== '' && this.transcriptCallback) {
                this.transcriptCallback(transcript, isFinal);
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Transcribe stream error:', error);
      }
      this.isActive = false;
    }
  }

  /**
   * Stop the live transcription stream
   */
  stopStream(): void {
    if (this.audioStream) {
      try {
        this.audioStream.end();
        this.audioStream.destroy();
        this.audioStream = undefined;
        this.isActive = false;
        this.audioBuffer = [];
        console.log('🛑 Transcribe stream stopped');
      } catch (error) {
        console.error('❌ Error stopping Transcribe stream:', error);
      }
    }
  }

  /**
   * Send audio data to the stream
   * Amazon Transcribe requires chunks to be reasonable size (8KB recommended)
   */
  sendAudio(audioData: Buffer): void {
    if (!this.audioStream) {
      // Buffer audio until stream is ready (but limit size)
      if (this.audioBuffer.length < 10) { // Very limited buffering
        this.audioBuffer.push(audioData);
      }
      return;
    }

    if (this.isActive && this.audioStream) {
      try {
        // Split large chunks into safe-sized pieces
        if (audioData.length <= this.MAX_CHUNK_SIZE) {
          this.audioStream.write(audioData);
        } else {
          // Split into smaller chunks
          for (let i = 0; i < audioData.length; i += this.MAX_CHUNK_SIZE) {
            const chunk = audioData.slice(i, Math.min(i + this.MAX_CHUNK_SIZE, audioData.length));
            this.audioStream.write(chunk);
          }
        }
      } catch (error) {
        console.error('❌ Error sending audio to Transcribe:', error);
      }
    } else {
      // Buffer audio if not active yet (but limit size)
      if (this.audioBuffer.length < 10) {
        this.audioBuffer.push(audioData);
      }
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
}

// Singleton instance
let transcribeInstance: TranscribeSTTProvider | null = null;

export function getTranscribeProvider(): TranscribeSTTProvider {
  if (!transcribeInstance) {
    transcribeInstance = new TranscribeSTTProvider();
  }
  return transcribeInstance;
}
