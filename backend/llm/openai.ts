/**
 * OpenAI LLM Provider
 * Implements LLM interface using OpenAI GPT models
 */

import OpenAI from 'openai';
import { LLMProvider, LLMResponse, RAGContext } from '../../shared/types';
import { openaiConfig } from '../config/env';

export class OpenAILLMProvider implements LLMProvider {
  public name = 'openai';
  private client!: OpenAI;

  constructor() {
    if (this.isConfigured()) {
      this.client = new OpenAI({
        apiKey: openaiConfig.apiKey,
      });
      console.log('✅ OpenAI LLM Provider initialized');
    } else {
      console.warn('⚠️  OpenAI is not properly configured');
    }
  }

  /**
   * Check if OpenAI is properly configured
   */
  isConfigured(): boolean {
    return !!openaiConfig.apiKey;
  }

  /**
   * Generate a structured response from user transcript
   */
  async generateResponse(transcript: string, context?: RAGContext): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI is not properly configured');
    }

    try {
      // Build the prompts
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(transcript, context);

      console.log('🤖 Sending request to OpenAI...');

      // Create chat completion with JSON mode
      const completion = await this.client.chat.completions.create({
        model: openaiConfig.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      console.log('✅ OpenAI response received');

      // Parse the JSON response
      return this.parseResponse(responseText);
    } catch (error) {
      console.error('❌ OpenAI API error:', error);
      throw new Error(`Failed to generate response: ${error}`);
    }
  }

  /**
   * Build the system prompt for the medical education assistant
   */
  private buildSystemPrompt(): string {
    return `You are a medical education assistant specialized in anatomy, physiology, and clinical diagnostics.

Your role is to:
1. Provide clear, accurate, educational explanations about medical topics
2. Help users understand anatomical structures and their functions
3. Guide diagnostic reasoning (educational purposes only, not actual diagnosis)
4. Maintain a professional yet approachable tone

IMPORTANT RULES:
- Keep responses under 50 words for voice output
- Never provide actual medical diagnoses or treatment advice
- Avoid Protected Health Information (PHI)
- Use clear, jargon-free language when possible
- Always respond with valid JSON only

Response Format:
You must respond with valid JSON containing:
{
  "utterance": "Your spoken response (under 50 words)",
  "intent": "explain_anatomy | diagnose | general_info",
  "tool_action": {
    "op": "highlight | zoom | rotate | navigate",
    "target": "anatomical_structure_name",
    "params": {}
  }
}

The tool_action is optional - only include it when the user wants to interact with a 3D model or visualization.`;
  }

  /**
   * Build the user prompt with optional RAG context
   */
  private buildUserPrompt(transcript: string, context?: RAGContext): string {
    let prompt = '';

    // Add RAG context if available
    if (context && context.documents && context.documents.length > 0) {
      prompt += 'Relevant Context:\n';
      context.documents.forEach((doc, idx) => {
        prompt += `[${idx + 1}] ${doc.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `User Query: ${transcript}\n\n`;
    prompt += 'Respond with valid JSON only.';

    return prompt;
  }

  /**
   * Parse the LLM response into structured format
   */
  private parseResponse(responseText: string): LLMResponse {
    try {
      const parsed = JSON.parse(responseText);
      return {
        utterance: parsed.utterance || responseText,
        intent: parsed.intent || 'general_info',
        tool_action: parsed.tool_action,
      };
    } catch (error) {
      console.warn('⚠️  Failed to parse JSON response, using fallback');
      return {
        utterance: responseText,
        intent: 'general_info',
      };
    }
  }

  /**
   * Test the connection to OpenAI
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generateResponse('Hello, are you working?');
      return true;
    } catch (error) {
      console.error('❌ OpenAI connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let openaiInstance: OpenAILLMProvider | null = null;

export function getOpenAIProvider(): OpenAILLMProvider {
  if (!openaiInstance) {
    openaiInstance = new OpenAILLMProvider();
  }
  return openaiInstance;
}
