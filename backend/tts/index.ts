/**
 * TTS Provider Factory
 * Returns the appropriate TTS provider based on configuration
 */

import { TTSProvider } from '../../shared/types';
import { appConfig } from '../config/env';
import { getCartesiaProvider } from './cartesia';
import { getPollyProvider } from './polly';

/**
 * Get the configured TTS provider
 */
export function getTTSProvider(): TTSProvider {
  const provider = appConfig.ttsProvider;

  switch (provider) {
    case 'webspeech':
      console.log('ℹ️  WebSpeech TTS is browser-based (no server-side provider)');
      // Return a no-op provider for server side
      return {
        name: 'webspeech',
        speak: async () => {},
        stop: () => {},
        isConfigured: () => true,
      };
    case 'cartesia':
      return getCartesiaProvider();
    case 'polly':
      return getPollyProvider();
    default:
      console.warn(`⚠️  Unknown TTS provider: ${provider}, falling back to WebSpeech`);
      return {
        name: 'webspeech',
        speak: async () => {},
        stop: () => {},
        isConfigured: () => true,
      };
  }
}

/**
 * Test the current TTS provider
 */
export async function testTTSProvider(): Promise<boolean> {
  try {
    const provider = getTTSProvider();

    if (provider.name === 'webspeech') {
      console.log('ℹ️  WebSpeech TTS is browser-based, skipping server test');
      return true;
    }

    if (!provider.isConfigured()) {
      console.error(`❌ TTS provider ${provider.name} is not configured`);
      return false;
    }

    console.log(`✅ TTS provider ${provider.name} is configured and ready`);
    return true;
  } catch (error) {
    console.error('❌ TTS provider test failed:', error);
    return false;
  }
}
