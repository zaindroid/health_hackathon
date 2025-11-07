/**
 * Cartesia Sonic TTS Provider
 * Ultra-low latency text-to-speech using Cartesia's Sonic API
 */

import { TTSProvider } from '../../shared/types';

export class CartesiaTTSProvider implements TTSProvider {
  public name = 'cartesia';
  private apiKey: string;
  private apiUrl = 'https://api.cartesia.ai/tts/bytes';

  // Cartesia voice IDs - you can customize these
  private voiceId = '79a125e8-cd45-4c13-8a67-188112f4dd22'; // British Lady (professional female voice)

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.CARTESIA_API_KEY || '';

    if (this.isConfigured()) {
      console.log('✅ Cartesia Sonic TTS Provider initialized');
      console.log(`   Voice: ${this.getVoiceName()}`);
    } else {
      console.warn('⚠️  Cartesia API key not configured');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate speech from text and return audio data
   */
  async speak(text: string): Promise<Buffer> {
    if (!this.isConfigured()) {
      throw new Error('Cartesia is not properly configured');
    }

    try {
      console.log(`🔊 Generating speech with Cartesia: "${text.substring(0, 50)}..."`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Cartesia-Version': '2024-06-10',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: 'sonic-english',
          transcript: text,
          voice: {
            mode: 'id',
            id: this.voiceId,
          },
          output_format: {
            container: 'raw',
            encoding: 'pcm_s16le',
            sample_rate: 24000,
          },
          language: 'en',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cartesia API error (${response.status}): ${error}`);
      }

      const audioBuffer = await response.arrayBuffer();
      console.log(`✅ Cartesia audio generated (${audioBuffer.byteLength} bytes)`);

      return Buffer.from(audioBuffer);
    } catch (error: any) {
      console.error('❌ Cartesia TTS error:', error.message);
      throw error;
    }
  }

  /**
   * Stop speaking (not applicable for server-side generation)
   */
  stop(): void {
    // No-op for server-side TTS
    console.log('🛑 Cartesia TTS stop requested (server-side)');
  }

  /**
   * Set voice ID
   */
  setVoice(voiceId: string): void {
    this.voiceId = voiceId;
    console.log(`🎙️  Cartesia voice changed to: ${voiceId}`);
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): Array<{ id: string; name: string; description: string }> {
    return [
      {
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091',
        name: 'Barbershop Man',
        description: 'Warm, friendly male voice',
      },
      {
        id: '79a125e8-cd45-4c13-8a67-188112f4dd22',
        name: 'British Lady',
        description: 'Professional female voice with British accent',
      },
      {
        id: '87748186-23bb-4158-a1eb-332911b0b708',
        name: 'Calm Lady',
        description: 'Soothing, calm female voice',
      },
      {
        id: '638efaaa-4d0c-442e-b701-3fae16aad012',
        name: 'Doctor Mischief',
        description: 'Authoritative male voice (good for medical!)',
      },
      {
        id: '2ee87190-8f84-4925-97da-e52547f9462c',
        name: 'Friendly Reading Man',
        description: 'Clear, articulate male voice',
      },
    ];
  }

  /**
   * Get current voice name
   */
  private getVoiceName(): string {
    const voices = this.getAvailableVoices();
    const voice = voices.find(v => v.id === this.voiceId);
    return voice ? voice.name : 'Custom Voice';
  }

  /**
   * Stream audio (for future WebSocket implementation)
   */
  async streamSpeak(text: string): Promise<AsyncIterable<Buffer>> {
    // TODO: Implement WebSocket streaming for even lower latency
    // Cartesia supports streaming via WebSocket for real-time generation
    throw new Error('Streaming not yet implemented');
  }
}

// Singleton instance
let cartesiaInstance: CartesiaTTSProvider | null = null;

export function getCartesiaProvider(): CartesiaTTSProvider {
  if (!cartesiaInstance) {
    cartesiaInstance = new CartesiaTTSProvider();
  }
  return cartesiaInstance;
}
