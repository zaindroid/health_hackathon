/**
 * Environment Configuration and Validation
 * Loads and validates all required environment variables
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { AppConfig, DeepgramConfig, BedrockConfig, OpenAIConfig } from '../../shared/types';

// Load .env file - try current directory first, then parent
config();
config({ path: resolve(__dirname, '../../.env') });

/**
 * Validates that required environment variables are present
 */
function validateEnv(key: string, required: boolean = true): string | undefined {
  const value = process.env[key];
  if (required && !value) {
    console.warn(`⚠️  Warning: Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Application Configuration
 */
export const appConfig: AppConfig = {
  llmProvider: (process.env.LLM_PROVIDER as any) || 'bedrock',
  sttProvider: 'deepgram',
  ttsProvider: (process.env.TTS_PROVIDER as any) || 'webspeech',
  enableRAG: process.env.ENABLE_RAG === 'true',
  enableTools: process.env.ENABLE_TOOLS === 'true',
};

/**
 * Deepgram Configuration
 */
export const deepgramConfig: DeepgramConfig = {
  apiKey: validateEnv('DEEPGRAM_API_KEY', true) || '',
  model: process.env.DEEPGRAM_MODEL || 'nova-2',
  language: process.env.DEEPGRAM_LANGUAGE || 'en-US',
};

/**
 * AWS Bedrock Configuration
 */
export const bedrockConfig: BedrockConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
  knowledgeBaseId: process.env.AWS_BEDROCK_KB_ID || 'OPTIONAL', // Optional: Set up Knowledge Base in AWS Console
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN, // Support for temporary credentials
      }
    : undefined,
};

/**
 * OpenAI Configuration
 */
export const openaiConfig: OpenAIConfig = {
  apiKey: validateEnv('OPENAI_API_KEY', false) || '',
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
};

/**
 * Server Configuration
 */
export const serverConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
};

/**
 * Checks if the application is properly configured
 */
export function checkConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check STT configuration
  if (!deepgramConfig.apiKey) {
    errors.push('Deepgram API key is not configured');
  }

  // Check LLM configuration based on provider
  if (appConfig.llmProvider === 'bedrock') {
    if (!bedrockConfig.region) {
      errors.push('AWS region is not configured for Bedrock');
    }
  } else if (appConfig.llmProvider === 'openai') {
    if (!openaiConfig.apiKey) {
      errors.push('OpenAI API key is not configured');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Prints configuration status
 */
export function printConfig() {
  console.log('\n🔧 Configuration Status:');
  console.log(`  LLM Provider: ${appConfig.llmProvider}`);
  console.log(`  STT Provider: ${appConfig.sttProvider}`);
  console.log(`  TTS Provider: ${appConfig.ttsProvider}`);
  console.log(`  RAG Enabled: ${appConfig.enableRAG}`);
  console.log(`  Tools Enabled: ${appConfig.enableTools}`);
  console.log(`  Server Port: ${serverConfig.port}`);

  const configCheck = checkConfiguration();
  if (!configCheck.valid) {
    console.log('\n⚠️  Configuration Warnings:');
    configCheck.errors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('\n✅ All required configurations are set\n');
  }
}
