/**
 * Amazon Polly Neural TTS Provider
 * Human-like text-to-speech using AWS Polly Neural voices
 */

import {
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  OutputFormat,
  TextType,
  VoiceId,
} from '@aws-sdk/client-polly';
import { TTSProvider } from '../../shared/types';
import { bedrockConfig } from '../config/env';
import { Readable } from 'stream';

export class PollyTTSProvider implements TTSProvider {
  public name = 'polly';
  private client!: PollyClient;
  private voiceId: VoiceId = VoiceId.Joanna; // Default: Joanna Neural (US English, Female, warm)
  private engine: Engine = Engine.NEURAL; // Use Neural engine for human-like voices

  constructor() {
    if (this.isConfigured()) {
      this.client = new PollyClient({
        region: bedrockConfig.region || 'us-east-1',
        credentials: bedrockConfig.credentials,
      });
      console.log('✅ Amazon Polly Neural TTS Provider initialized');
      console.log(`   Voice: ${this.voiceId} (${this.engine})`);
      console.log(`   Region: ${bedrockConfig.region}`);
    } else {
      console.warn('⚠️  AWS credentials not configured for Polly');
    }
  }

  isConfigured(): boolean {
    return !!bedrockConfig.region && !!bedrockConfig.credentials;
  }

  /**
   * Generate speech from text and return audio buffer
   */
  async speak(text: string): Promise<Buffer> {
    if (!this.isConfigured()) {
      throw new Error('Amazon Polly is not properly configured');
    }

    try {
      console.log(`🔊 Generating speech with Polly (${this.voiceId}): "${text.substring(0, 50)}..."`);

      const command = new SynthesizeSpeechCommand({
        Engine: this.engine,
        OutputFormat: OutputFormat.PCM,
        SampleRate: '16000',
        Text: text,
        TextType: TextType.TEXT,
        VoiceId: this.voiceId,
      });

      const response = await this.client.send(command);

      if (!response.AudioStream) {
        throw new Error('No audio stream returned from Polly');
      }

      // Convert stream to buffer
      const audioBuffer = await this.streamToBuffer(response.AudioStream);
      console.log(`✅ Polly audio generated (${audioBuffer.length} bytes)`);

      return audioBuffer;
    } catch (error: any) {
      console.error('❌ Polly TTS error:', error.message);
      throw error;
    }
  }

  /**
   * Generate speech with SSML for advanced control
   */
  async speakSSML(ssml: string): Promise<Buffer> {
    if (!this.isConfigured()) {
      throw new Error('Amazon Polly is not properly configured');
    }

    try {
      console.log(`🔊 Generating SSML speech with Polly: "${ssml.substring(0, 50)}..."`);

      const command = new SynthesizeSpeechCommand({
        Engine: this.engine,
        OutputFormat: OutputFormat.PCM,
        SampleRate: '16000',
        Text: ssml,
        TextType: TextType.SSML,
        VoiceId: this.voiceId,
      });

      const response = await this.client.send(command);

      if (!response.AudioStream) {
        throw new Error('No audio stream returned from Polly');
      }

      const audioBuffer = await this.streamToBuffer(response.AudioStream);
      console.log(`✅ Polly SSML audio generated (${audioBuffer.length} bytes)`);

      return audioBuffer;
    } catch (error: any) {
      console.error('❌ Polly SSML TTS error:', error.message);
      throw error;
    }
  }

  /**
   * Convert readable stream to buffer
   */
  private async streamToBuffer(stream: Readable | ReadableStream<any> | Blob): Promise<Buffer> {
    const chunks: Uint8Array[] = [];

    // Handle different stream types
    if (stream instanceof Readable) {
      // Node.js Readable stream
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
    } else if (stream instanceof ReadableStream) {
      // Web ReadableStream
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } else if (stream instanceof Blob) {
      // Blob
      const arrayBuffer = await stream.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Stop speaking (not applicable for server-side generation)
   */
  stop(): void {
    console.log('🛑 Polly TTS stop requested (server-side)');
  }

  /**
   * Set voice ID
   */
  setVoice(voiceId: VoiceId): void {
    this.voiceId = voiceId;
    console.log(`🎙️  Polly voice changed to: ${voiceId}`);
  }

  /**
   * Set engine type (neural, generative, standard)
   */
  setEngine(engine: Engine): void {
    this.engine = engine;
    console.log(`⚙️  Polly engine changed to: ${engine}`);
  }

  /**
   * Get available neural voices optimized for medical/healthcare
   */
  getRecommendedVoices(): Array<{
    id: VoiceId;
    name: string;
    gender: string;
    language: string;
    description: string;
    engine: Engine;
  }> {
    return [
      {
        id: VoiceId.Joanna,
        name: 'Joanna',
        gender: 'Female',
        language: 'en-US',
        description: 'Warm, professional, most popular - Excellent for healthcare',
        engine: Engine.NEURAL,
      },
      {
        id: VoiceId.Ruth,
        name: 'Ruth',
        gender: 'Female',
        language: 'en-US',
        description: 'Conversational, friendly, empathetic - Great for patient education',
        engine: Engine.NEURAL,
      },
      {
        id: VoiceId.Matthew,
        name: 'Matthew',
        gender: 'Male',
        language: 'en-US',
        description: 'Clear, authoritative, reassuring - Good for medical information',
        engine: Engine.NEURAL,
      },
      {
        id: VoiceId.Gregory,
        name: 'Gregory',
        gender: 'Male',
        language: 'en-US',
        description: 'Deep, calm, trustworthy - Excellent for health guidance',
        engine: Engine.NEURAL,
      },
      {
        id: VoiceId.Kendra,
        name: 'Kendra',
        gender: 'Female',
        language: 'en-US',
        description: 'Professional, articulate - Good for clinical information',
        engine: Engine.NEURAL,
      },
      {
        id: VoiceId.Stephen,
        name: 'Stephen',
        gender: 'Male',
        language: 'en-US',
        description: 'Intelligent, clear - Good for medical education',
        engine: Engine.NEURAL,
      },
    ];
  }

  /**
   * Get all available neural voices (US English)
   */
  getAllNeuralVoices(): VoiceId[] {
    return [
      VoiceId.Joanna,
      VoiceId.Matthew,
      VoiceId.Ivy,
      VoiceId.Kendra,
      VoiceId.Kimberly,
      VoiceId.Salli,
      VoiceId.Joey,
      VoiceId.Justin,
      VoiceId.Kevin,
      VoiceId.Ruth,
      VoiceId.Stephen,
      VoiceId.Gregory,
    ];
  }

  /**
   * Wrap text with SSML for better control
   */
  createSSML(text: string, options?: {
    speakingRate?: 'x-slow' | 'slow' | 'medium' | 'fast' | 'x-fast';
    pitch?: 'x-low' | 'low' | 'medium' | 'high' | 'x-high';
    volume?: 'x-soft' | 'soft' | 'medium' | 'loud' | 'x-loud';
    pauseBefore?: string; // e.g., '500ms', '1s'
    pauseAfter?: string;
    emphasis?: 'strong' | 'moderate' | 'reduced';
  }): string {
    let ssml = '<speak>';

    if (options?.pauseBefore) {
      ssml += `<break time="${options.pauseBefore}"/>`;
    }

    let prosodyAttrs = [];
    if (options?.speakingRate) prosodyAttrs.push(`rate="${options.speakingRate}"`);
    if (options?.pitch) prosodyAttrs.push(`pitch="${options.pitch}"`);
    if (options?.volume) prosodyAttrs.push(`volume="${options.volume}"`);

    if (prosodyAttrs.length > 0) {
      ssml += `<prosody ${prosodyAttrs.join(' ')}>`;
    }

    if (options?.emphasis) {
      ssml += `<emphasis level="${options.emphasis}">${text}</emphasis>`;
    } else {
      ssml += text;
    }

    if (prosodyAttrs.length > 0) {
      ssml += '</prosody>';
    }

    if (options?.pauseAfter) {
      ssml += `<break time="${options.pauseAfter}"/>`;
    }

    ssml += '</speak>';
    return ssml;
  }
}

// Singleton instance
let pollyInstance: PollyTTSProvider | null = null;

export function getPollyProvider(): PollyTTSProvider {
  if (!pollyInstance) {
    pollyInstance = new PollyTTSProvider();
  }
  return pollyInstance;
}
