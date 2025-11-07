/**
 * AWS Bedrock Claude LLM Provider
 * Implements LLM interface using Amazon Bedrock with Claude models
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { LLMProvider, LLMResponse, RAGContext } from '../../shared/types';
import { bedrockConfig } from '../config/env';

export class BedrockLLMProvider implements LLMProvider {
  public name = 'bedrock';
  private client!: BedrockRuntimeClient;

  constructor() {
    if (this.isConfigured()) {
      this.client = new BedrockRuntimeClient({
        region: bedrockConfig.region,
        credentials: bedrockConfig.credentials,
      });
      console.log('✅ Bedrock LLM Provider initialized');
    } else {
      console.warn('⚠️  Bedrock is not properly configured');
    }
  }

  /**
   * Check if Bedrock is properly configured
   */
  isConfigured(): boolean {
    return !!bedrockConfig.region && !!bedrockConfig.modelId;
  }

  /**
   * Generate a structured response from user transcript
   */
  async generateResponse(transcript: string, context?: RAGContext): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Bedrock is not properly configured');
    }

    try {
      // Build the prompt with context if available
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(transcript, context);

      // Prepare the request payload for Claude
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId: bedrockConfig.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      console.log('🤖 Sending request to Bedrock...');
      const response = await this.client.send(command);

      // Parse the response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const assistantMessage = responseBody.content[0].text;

      console.log('✅ Bedrock response received');

      // Parse the JSON response from Claude
      return this.parseResponse(assistantMessage);
    } catch (error) {
      console.error('❌ Bedrock API error:', error);
      throw new Error(`Failed to generate response: ${error}`);
    }
  }

  /**
   * Build the system prompt for the medical education assistant
   */
  private buildSystemPrompt(): string {
    return `You are a medical education assistant specialized in anatomy, physiology, and clinical diagnostics.
You control a 3D anatomy viewer that can show different viewpoints.

CRITICAL RULES:
- DO NOT greet or introduce yourself in responses
- Answer ONLY what the user asked - be direct and concise
- Keep responses under 50 words for voice output
- Never provide actual medical diagnoses or treatment advice
- Use clear, jargon-free language when possible
- Always respond with valid JSON only

3D NAVIGATION TOOLS:
You can control the 3D viewer camera with these operations:
- "show_front": Show front view of the anatomy
- "show_back": Show back view of the anatomy
- "show_right_shoulder": Show right shoulder view
- "show_left_shoulder": Show left shoulder view

Examples:
User: "Show me the front view"
Response: {"utterance": "Showing the front view now.", "intent": "navigate", "tool_action": {"op": "show_front"}}

User: "Rotate to the back"
Response: {"utterance": "Rotating to the back view.", "intent": "navigate", "tool_action": {"op": "show_back"}}

User: "What is the trapezius?"
Response: {"utterance": "The trapezius is a large back muscle that moves your shoulders and supports your neck.", "intent": "explain_anatomy"}

User: "Show me the right shoulder"
Response: {"utterance": "Focusing on the right shoulder.", "intent": "navigate", "tool_action": {"op": "show_right_shoulder"}}

Response Format (REQUIRED):
{
  "utterance": "Your direct response (under 50 words, NO greetings)",
  "intent": "explain_anatomy | navigate | general_info",
  "tool_action": {
    "op": "show_front | show_back | show_right_shoulder | show_left_shoulder",
    "params": {}
  }
}

The tool_action is optional - only include it when the user wants to change the 3D view or navigate the model.`;
  }

  /**
   * Build the user prompt with optional RAG context
   */
  private buildUserPrompt(transcript: string, context?: RAGContext): string {
    let prompt = '';

    // Add RAG context if available
    // TODO: Integrate vector store for RAG context retrieval
    if (context && context.documents && context.documents.length > 0) {
      prompt += 'Relevant Context:\n';
      context.documents.forEach((doc, idx) => {
        prompt += `[${idx + 1}] ${doc.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `User Query: ${transcript}\n\n`;
    prompt += 'Respond with valid JSON only:';

    return prompt;
  }

  /**
   * Parse the LLM response into structured format
   */
  private parseResponse(responseText: string): LLMResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          utterance: parsed.utterance || responseText,
          intent: parsed.intent,
          tool_action: parsed.tool_action,
        };
      }

      // Fallback if JSON parsing fails
      return {
        utterance: responseText,
        intent: 'general_info',
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
   * Test the connection to Bedrock
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generateResponse('Hello, are you working?');
      return true;
    } catch (error) {
      console.error('❌ Bedrock connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let bedrockInstance: BedrockLLMProvider | null = null;

export function getBedrockProvider(): BedrockLLMProvider {
  if (!bedrockInstance) {
    bedrockInstance = new BedrockLLMProvider();
  }
  return bedrockInstance;
}
