/**
 * Local LLM Provider
 * Supports OpenAI-compatible endpoints (Ollama, LM Studio, vLLM, etc.)
 */

import OpenAI from 'openai';
import { LLMProvider, LLMResponse, RAGContext } from '../../shared/types';

export class LocalLLMProvider implements LLMProvider {
  public name = 'local';
  private client: OpenAI;
  private endpoint: string;
  private modelName: string;

  constructor(
    endpoint: string = process.env.LOCAL_MODEL_ENDPOINT || 'http://localhost:11434/v1',
    modelName: string = process.env.LOCAL_MODEL_NAME || 'qwen3'
  ) {
    this.endpoint = endpoint;
    this.modelName = modelName;

    // Create OpenAI client pointing to local endpoint
    this.client = new OpenAI({
      baseURL: this.endpoint,
      apiKey: 'not-needed', // Most local models don't need an API key
      timeout: 60000, // 60 second timeout to prevent infinite hanging
      maxRetries: 0, // Don't retry on failure
    });

    console.log(`✅ Local LLM Provider initialized`);
    console.log(`   Endpoint: ${this.endpoint}`);
    console.log(`   Model: ${this.modelName}`);
  }

  isConfigured(): boolean {
    return !!this.endpoint;
  }

  async generateResponse(transcript: string, context?: RAGContext): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Local LLM endpoint is not configured');
    }

    try {
      console.log(`🤖 Sending request to local model (${this.modelName})...`);

      // Build prompts
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(transcript, context);

      // Call the local model using OpenAI-compatible API
      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      console.log('✅ Local model response received');

      // Parse the response
      return this.parseResponse(responseText);
    } catch (error: any) {
      console.error('❌ Local model error:', error.message);

      // Provide helpful error messages
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to local model at ${this.endpoint}. Is the server running?`);
      }

      throw new Error(`Failed to generate response: ${error.message}`);
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
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          utterance: parsed.utterance || responseText,
          intent: parsed.intent || 'general_info',
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
   * Test connection to local model server
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`🧪 Testing connection to ${this.endpoint}...`);

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: 'Hello, are you working?' }],
        max_tokens: 50,
      });

      if (response.choices[0]?.message?.content) {
        console.log('✅ Local model connection successful');
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Local model connection test failed:', error.message);
      return false;
    }
  }
}

// Singleton instance
let localInstance: LocalLLMProvider | null = null;

export function getLocalProvider(endpoint?: string): LocalLLMProvider {
  if (!localInstance) {
    localInstance = new LocalLLMProvider(endpoint);
  }
  return localInstance;
}
