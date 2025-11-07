/**
 * AWS Bedrock Knowledge Base RAG Retriever
 *
 * Uses AWS Bedrock Knowledge Bases for medical knowledge retrieval
 * Requires Knowledge Base to be set up in AWS Console first
 */

import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveAndGenerateCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { bedrockConfig } from '../config/env';

export class BedrockKnowledgeBaseRetriever {
  private client!: BedrockAgentRuntimeClient;
  private knowledgeBaseId: string;
  private isConfigured: boolean;

  constructor() {
    // Check if Knowledge Base is configured
    this.knowledgeBaseId = bedrockConfig.knowledgeBaseId || '';
    this.isConfigured = !!this.knowledgeBaseId && this.knowledgeBaseId !== 'OPTIONAL';

    if (this.isConfigured) {
      this.client = new BedrockAgentRuntimeClient({
        region: bedrockConfig.region,
        credentials: bedrockConfig.credentials,
      });
      console.log('✅ Bedrock Knowledge Base RAG initialized');
      console.log(`   Knowledge Base ID: ${this.knowledgeBaseId}`);
    } else {
      console.warn('⚠️  Bedrock Knowledge Base not configured (optional)');
      console.warn('   Set AWS_BEDROCK_KB_ID in .env to enable RAG');
    }
  }

  /**
   * Check if RAG is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Retrieve relevant documents from Knowledge Base
   *
   * @param query - The search query
   * @param maxResults - Maximum number of results to return
   * @returns Array of relevant documents with scores
   */
  async retrieve(query: string, maxResults: number = 5) {
    if (!this.isConfigured) {
      console.warn('⚠️  RAG not configured, returning empty results');
      return { documents: [] };
    }

    try {
      const command = new RetrieveCommand({
        knowledgeBaseId: this.knowledgeBaseId,
        retrievalQuery: {
          text: query,
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: maxResults,
          },
        },
      });

      console.log(`🔍 Retrieving knowledge for: "${query.substring(0, 50)}..."`);
      const response = await this.client.send(command);

      const documents = response.retrievalResults?.map(result => ({
        content: result.content?.text || '',
        score: result.score || 0,
        metadata: result.location || {},
      })) || [];

      console.log(`✅ Retrieved ${documents.length} documents`);
      return { documents };
    } catch (error) {
      console.error('❌ Knowledge Base retrieval error:', error);
      return { documents: [] };
    }
  }

  /**
   * Retrieve AND Generate response in one call (RAG)
   *
   * This uses Bedrock's built-in RAG to:
   * 1. Retrieve relevant documents
   * 2. Generate response using Claude with context
   *
   * @param query - The user's query/question
   * @returns Generated response with citations
   */
  async retrieveAndGenerate(query: string) {
    if (!this.isConfigured) {
      console.warn('⚠️  RAG not configured, using direct LLM response');
      return {
        text: 'RAG is not configured. Please set up AWS Bedrock Knowledge Base.',
        citations: [],
      };
    }

    try {
      const command = new RetrieveAndGenerateCommand({
        input: {
          text: query,
        },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId: this.knowledgeBaseId,
            modelArn: `arn:aws:bedrock:${bedrockConfig.region}::foundation-model/${bedrockConfig.modelId}`,
          },
        },
      });

      console.log(`🤖 RAG Query: "${query.substring(0, 50)}..."`);
      const response = await this.client.send(command);

      const text = response.output?.text || '';
      const citations = response.citations || [];

      console.log(`✅ RAG Response: ${text.substring(0, 100)}...`);
      console.log(`   Citations: ${citations.length}`);

      return {
        text,
        citations,
      };
    } catch (error) {
      console.error('❌ RetrieveAndGenerate error:', error);
      throw error;
    }
  }

  /**
   * Analyze medical report text using RAG
   *
   * @param reportText - Extracted text from PDF report
   * @returns Analysis with findings and recommendations
   */
  async analyzeReport(reportText: string) {
    const query = `
Analyze this medical report and provide:
1. Key findings explained in simple language
2. Any values outside normal ranges
3. What these findings might indicate
4. Whether the patient should see a doctor

Report text:
${reportText}

Please explain in terms a patient can understand.
`;

    try {
      const result = await this.retrieveAndGenerate(query);

      return {
        analysis: result.text,
        citations: result.citations,
        rawReport: reportText,
      };
    } catch (error) {
      console.error('❌ Report analysis error:', error);
      return {
        analysis: 'Unable to analyze report at this time. Please try again.',
        citations: [],
        rawReport: reportText,
      };
    }
  }

  /**
   * Combine report analysis with live vital signs
   *
   * @param reportAnalysis - Analysis from uploaded report
   * @param vitals - Live vital signs data
   * @returns Combined analysis with recommendations
   */
  async combineAnalysis(reportAnalysis: string, vitals: any) {
    const query = `
I have both historical medical data and current vital signs for a patient.

Historical Report Findings:
${reportAnalysis}

Current Vital Signs:
- Heart Rate: ${vitals.heartRate?.avg || 'N/A'} BPM
- Pupil Size: Left ${vitals.facialScan?.pupilLeft || 'N/A'}mm, Right ${vitals.facialScan?.pupilRight || 'N/A'}mm
- Facial Symmetry: ${vitals.facialScan?.symmetry || 'N/A'}%
- Skin Assessment: ${vitals.facialScan?.skinTone || 'Normal'}

Please provide:
1. Combined assessment of historical data + current vitals
2. Are current vitals consistent with report findings?
3. Any concerns or red flags?
4. Recommendation: rest at home, monitor, schedule doctor visit, or seek urgent care

Explain in simple terms a patient can understand.
`;

    try {
      const result = await this.retrieveAndGenerate(query);

      return {
        combinedAnalysis: result.text,
        recommendation: this.extractRecommendation(result.text),
        urgency: this.assessUrgency(result.text),
      };
    } catch (error) {
      console.error('❌ Combined analysis error:', error);
      return {
        combinedAnalysis: 'Unable to complete combined analysis at this time.',
        recommendation: 'see_doctor',
        urgency: 'routine',
      };
    }
  }

  /**
   * Extract recommendation from analysis text
   */
  private extractRecommendation(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes('urgent') || lower.includes('emergency') || lower.includes('911')) {
      return 'urgent_care';
    } else if (lower.includes('see doctor') || lower.includes('consult') || lower.includes('appointment')) {
      return 'see_doctor';
    } else if (lower.includes('monitor') || lower.includes('watch')) {
      return 'monitor';
    } else {
      return 'rest';
    }
  }

  /**
   * Assess urgency level
   */
  private assessUrgency(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes('urgent') || lower.includes('emergency')) {
      return 'urgent';
    } else if (lower.includes('soon') || lower.includes('promptly')) {
      return 'soon';
    } else {
      return 'routine';
    }
  }
}

// Singleton instance
let kbRetrieverInstance: BedrockKnowledgeBaseRetriever | null = null;

export function getKnowledgeBaseRetriever(): BedrockKnowledgeBaseRetriever {
  if (!kbRetrieverInstance) {
    kbRetrieverInstance = new BedrockKnowledgeBaseRetriever();
  }
  return kbRetrieverInstance;
}

// Export singleton
export const kbRetriever = getKnowledgeBaseRetriever();
