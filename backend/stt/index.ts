/**
 * STT Provider Factory
 * Returns the appropriate STT provider based on configuration
 */

import { STTProvider } from '../../shared/types';
import { appConfig } from '../config/env';
import { getDeepgramProvider } from './deepgram';
import { getTranscribeProvider } from './transcribe';

/**
 * Get the configured STT provider
 */
export function getSTTProvider(): STTProvider {
  const provider = appConfig.sttProvider;

  switch (provider) {
    case 'deepgram':
      return getDeepgramProvider();
    case 'transcribe':
      return getTranscribeProvider();
    default:
      console.warn(`⚠️  Unknown STT provider: ${provider}, falling back to Deepgram`);
      return getDeepgramProvider();
  }
}

/**
 * Test the current STT provider
 */
export function testSTTProvider(): boolean {
  try {
    const provider = getSTTProvider();
    if (!provider.isConfigured()) {
      console.error(`❌ STT provider ${provider.name} is not configured`);
      return false;
    }

    console.log(`✅ STT provider ${provider.name} is configured and ready`);
    return true;
  } catch (error) {
    console.error('❌ STT provider test failed:', error);
    return false;
  }
}
