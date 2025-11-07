/**
 * Text-to-Speech Provider (Placeholder)
 *
 * NOTE: TTS is primarily handled on the frontend using Web Speech API
 * This module serves as a placeholder for potential backend TTS solutions
 */

import { TTSProvider } from '../../shared/types';

export class WebSpeechTTSProvider implements TTSProvider {
  public name = 'webspeech';

  constructor() {
    console.log('ℹ️  Web Speech TTS Provider (Frontend-based)');
  }

  isConfigured(): boolean {
    // Web Speech API is available in most modern browsers
    return true;
  }

  async speak(text: string): Promise<void> {
    // This method is a placeholder - actual TTS happens on frontend
    console.log(`🔊 TTS requested: "${text}"`);
    // Frontend will use: window.speechSynthesis.speak(utterance)
  }

  stop(): void {
    // Placeholder for stopping TTS
    console.log('🛑 TTS stop requested');
  }
}

/**
 * External TTS Provider (Placeholder for future implementation)
 * TODO: Implement external TTS services
 */
export class ExternalTTSProvider implements TTSProvider {
  public name = 'external';

  constructor() {
    console.log('⚠️  External TTS Provider (PLACEHOLDER)');
  }

  isConfigured(): boolean {
    return false;
  }

  async speak(text: string): Promise<void> {
    // TODO: Implement external TTS integration options:
    //
    // 1. Amazon Polly:
    //    - Use @aws-sdk/client-polly
    //    - Generate audio stream
    //    - Return audio data to frontend
    //
    // 2. Google Cloud TTS:
    //    - Use @google-cloud/text-to-speech
    //    - Synthesize speech
    //    - Stream or return audio file
    //
    // 3. ElevenLabs:
    //    - Use elevenlabs package
    //    - High-quality voice synthesis
    //    - Great for natural-sounding medical education
    //
    // 4. Azure Speech Services:
    //    - Use microsoft-cognitiveservices-speech-sdk
    //    - Neural voices available
    //
    // 5. OpenAI TTS:
    //    - Use OpenAI API
    //    - /v1/audio/speech endpoint
    //    - Multiple voice options

    console.warn('⚠️  External TTS not yet implemented');
    throw new Error('External TTS provider not implemented');
  }

  stop(): void {
    // Placeholder
  }
}

// Factory function
export function getTTSProvider(type: 'webspeech' | 'external' = 'webspeech'): TTSProvider {
  if (type === 'external') {
    return new ExternalTTSProvider();
  }
  return new WebSpeechTTSProvider();
}
