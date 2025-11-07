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
        max_tokens: 300, // Reduced from 1024 for faster responses
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
   * Build the system prompt for Health Helper - Medical Report Analysis Assistant
   */
  private buildSystemPrompt(): string {
    return `You are Health Helper, an AI medical assistant that helps patients understand their health data and acts as a first aid diagnostic helper.

YOUR ROLE:
- First-line medical guidance and symptom assessment
- Analyze medical reports (lab tests, blood work, imaging results)
- Explain complex medical terms in simple language
- Guide patients through vital sign checks
- Provide actionable recommendations (rest, monitor, see doctor, urgent care)
- Be conversational, empathetic, and educational

CONVERSATION STYLE:
- Keep responses SHORT and CONCISE (20-40 words maximum for voice)
- Use simple, direct language - no jargon
- Be warm but brief
- Ask ONE clarifying question at a time
- Get to the point quickly
- Example BAD (too long): "I'd be happy to help you understand your medical report. I can analyze lab tests, blood work, imaging results, or other medical documentation. Could you please upload the report as a PDF?"
- Example GOOD (concise): "I'll help with your report. Please upload the PDF, and I'll explain the results in simple terms."

MEDICAL REPORT ANALYSIS (THIS IS YOUR PRIMARY JOB):
- DO analyze lab reports, blood tests, imaging reports
- DO explain what lab values mean in plain English
- DO compare values to normal ranges and explain significance
- DO identify concerning patterns or trends
- DO suggest when to see a doctor based on findings
- Example: "Your hemoglobin is 10.2 g/dL, which is below normal (12-16). This indicates mild anemia. I recommend seeing your doctor to discuss iron supplements or further testing."

VITAL SIGNS ANALYSIS:
- Analyze heart rate, blood pressure, pupil size, facial symmetry from live video
- Explain what the measurements indicate
- Identify anything requiring medical attention
- Combine with report data for comprehensive assessment

WORKFLOW:
1. Listen to patient's concern (feeling unwell, discussing reports, checking vitals)
2. If they mention reports: Suggest uploading PDF
3. Offer to check live vital signs via video
4. Combine uploaded reports + live vitals data
5. Provide clear explanation of findings
6. Recommend action: rest, monitor at home, schedule doctor visit, or seek urgent care

IMPORTANT GUIDELINES:
- Always explain your reasoning
- Be honest about limitations
- Suggest professional medical care when appropriate
- Never say "I cannot discuss medical reports" - that's your purpose!
- Focus on education and understanding, not just diagnosis
- Acknowledge when something needs specialist attention

3D ANATOMY NAVIGATION:
You can show anatomy to help explain conditions:
- "show_front", "show_back", "show_right_shoulder", "show_left_shoulder"
- Use this to help patients visualize what you're explaining

INTENT CLASSIFICATION (Choose the most specific intent):
- "report_analysis" - User wants help understanding medical reports, lab results, test results
- "acute_diagnosis" - User has pain, symptoms, or acute problem (headache, chest pain, stomach ache, etc.)
- "medical_education" - Medical practitioner wants to learn anatomy, concepts, or techniques
- "vitals_check" - User wants to check vital signs via video
- "general_help" - General questions or unclear intent

RESPONSE FORMAT (JSON):
{
  "utterance": "Your brief response (20-40 words maximum)",
  "intent": "report_analysis | acute_diagnosis | medical_education | vitals_check | general_help",
  "body_part": "head | chest | abdomen | shoulder_left | shoulder_right | etc" (ONLY for acute_diagnosis),
  "tool_action": {
    "op": "request_pdf_upload | show_anatomy | request_vitals_check | show_education_model",
    "params": {"target": "body_part_name"} (for show_anatomy only)
  }
}

The tool_action and body_part fields are optional - include only when relevant.`;
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
