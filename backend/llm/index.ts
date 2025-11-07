/**
 * LLM Provider Factory
 * Returns the appropriate LLM provider based on configuration
 */

import { LLMProvider } from '../../shared/types';
import { appConfig } from '../config/env';
import { getBedrockProvider } from './bedrock';
import { getOpenAIProvider } from './openai';
import { getLocalProvider } from './local';
import { getMockProvider } from './mock';

/**
 * Get the configured LLM provider
 */
export function getLLMProvider(): LLMProvider {
  const provider = appConfig.llmProvider;

  switch (provider) {
    case 'bedrock':
      return getBedrockProvider();
    case 'openai':
      return getOpenAIProvider();
    case 'local':
      return getLocalProvider();
    case 'mock':
      return getMockProvider();
    default:
      console.warn(`⚠️  Unknown LLM provider: ${provider}, falling back to Mock`);
      return getMockProvider();
  }
}

/**
 * Test the current LLM provider
 */
export async function testLLMProvider(): Promise<boolean> {
  try {
    const provider = getLLMProvider();
    if (!provider.isConfigured()) {
      console.error(`❌ LLM provider ${provider.name} is not configured`);
      return false;
    }

    console.log(`🧪 Testing LLM provider: ${provider.name}`);
    const response = await provider.generateResponse('Hello, this is a test.');
    console.log('✅ LLM provider test successful:', response);
    return true;
  } catch (error) {
    console.error('❌ LLM provider test failed:', error);
    return false;
  }
}
