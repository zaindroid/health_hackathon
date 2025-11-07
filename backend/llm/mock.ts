/**
 * Mock LLM Provider for Testing
 * Generates realistic responses without API calls - FREE!
 */

import { LLMProvider, LLMResponse, RAGContext } from '../../shared/types';

export class MockLLMProvider implements LLMProvider {
  public name = 'mock';

  constructor() {
    console.log('✅ Mock LLM Provider initialized (FREE - No API costs!)');
  }

  isConfigured(): boolean {
    return true; // Always ready
  }

  async generateResponse(transcript: string, context?: RAGContext): Promise<LLMResponse> {
    // Simulate API delay for realism
    await new Promise(resolve => setTimeout(resolve, 500));

    const lowerTranscript = transcript.toLowerCase();

    // Medical knowledge responses based on keywords
    if (lowerTranscript.includes('heart')) {
      return this.getHeartResponse(lowerTranscript);
    } else if (lowerTranscript.includes('lung') || lowerTranscript.includes('respiratory')) {
      return this.getLungResponse(lowerTranscript);
    } else if (lowerTranscript.includes('brain') || lowerTranscript.includes('nervous')) {
      return this.getBrainResponse(lowerTranscript);
    } else if (lowerTranscript.includes('liver')) {
      return this.getLiverResponse(lowerTranscript);
    } else if (lowerTranscript.includes('kidney')) {
      return this.getKidneyResponse(lowerTranscript);
    } else if (lowerTranscript.includes('circulat')) {
      return this.getCirculatoryResponse(lowerTranscript);
    } else if (lowerTranscript.includes('digest')) {
      return this.getDigestiveResponse(lowerTranscript);
    } else if (lowerTranscript.includes('skeletal') || lowerTranscript.includes('bone')) {
      return this.getSkeletalResponse(lowerTranscript);
    } else {
      return this.getGeneralResponse(lowerTranscript);
    }
  }

  private getHeartResponse(transcript: string): LLMResponse {
    if (transcript.includes('ventricle')) {
      return {
        utterance: 'The left ventricle pumps oxygenated blood to the body through the aorta. It has the thickest muscular walls of all heart chambers.',
        intent: 'explain_anatomy',
        tool_action: {
          op: 'highlight',
          target: 'left_ventricle',
        },
      };
    } else if (transcript.includes('chamber')) {
      return {
        utterance: 'The heart has four chambers: two atria that receive blood, and two ventricles that pump it out to the body and lungs.',
        intent: 'explain_anatomy',
        tool_action: {
          op: 'highlight',
          target: 'heart',
        },
      };
    } else if (transcript.includes('function')) {
      return {
        utterance: 'The heart pumps blood throughout the body, delivering oxygen and nutrients while removing waste products. It beats about 100,000 times per day.',
        intent: 'explain_anatomy',
        tool_action: {
          op: 'highlight',
          target: 'heart',
        },
      };
    } else {
      return {
        utterance: 'The heart is a muscular organ that pumps blood through the circulatory system, consisting of four chambers and several major vessels.',
        intent: 'explain_anatomy',
        tool_action: {
          op: 'navigate',
          target: 'heart',
        },
      };
    }
  }

  private getLungResponse(transcript: string): LLMResponse {
    return {
      utterance: 'The lungs facilitate gas exchange, absorbing oxygen from inhaled air and releasing carbon dioxide. They contain millions of tiny air sacs called alveoli.',
      intent: 'explain_anatomy',
      tool_action: {
        op: 'highlight',
        target: 'lungs',
      },
    };
  }

  private getBrainResponse(transcript: string): LLMResponse {
    if (transcript.includes('function')) {
      return {
        utterance: 'The brain controls all body functions, processes sensory information, enables thought and emotion, and coordinates movement. It contains about 86 billion neurons.',
        intent: 'explain_anatomy',
        tool_action: {
          op: 'highlight',
          target: 'brain',
        },
      };
    } else {
      return {
        utterance: 'The brain is the control center of the nervous system, divided into regions like the cerebrum, cerebellum, and brain stem, each with specific functions.',
        intent: 'explain_anatomy',
        tool_action: {
          op: 'navigate',
          target: 'brain',
        },
      };
    }
  }

  private getLiverResponse(transcript: string): LLMResponse {
    return {
      utterance: 'The liver detoxifies chemicals, produces bile for digestion, stores vitamins and minerals, and helps regulate blood sugar. It can regenerate itself.',
      intent: 'explain_anatomy',
      tool_action: {
        op: 'highlight',
        target: 'liver',
      },
    };
  }

  private getKidneyResponse(transcript: string): LLMResponse {
    return {
      utterance: 'The kidneys filter waste and excess water from blood to produce urine. They also regulate blood pressure and red blood cell production.',
      intent: 'explain_anatomy',
      tool_action: {
        op: 'highlight',
        target: 'kidneys',
      },
    };
  }

  private getCirculatoryResponse(transcript: string): LLMResponse {
    return {
      utterance: 'The circulatory system transports blood throughout the body via the heart, arteries, veins, and capillaries, delivering oxygen and nutrients to tissues.',
      intent: 'explain_anatomy',
      tool_action: {
        op: 'show',
        target: 'circulatory_system',
      },
    };
  }

  private getDigestiveResponse(transcript: string): LLMResponse {
    return {
      utterance: 'The digestive system breaks down food into nutrients, absorbs them into the bloodstream, and eliminates waste. It includes organs from mouth to intestines.',
      intent: 'explain_anatomy',
      tool_action: {
        op: 'show',
        target: 'digestive_system',
      },
    };
  }

  private getSkeletalResponse(transcript: string): LLMResponse {
    return {
      utterance: 'The skeletal system provides structure, protects organs, enables movement, stores minerals, and produces blood cells. Adults have 206 bones.',
      intent: 'explain_anatomy',
      tool_action: {
        op: 'show',
        target: 'skeletal_system',
      },
    };
  }

  private getGeneralResponse(transcript: string): LLMResponse {
    return {
      utterance: `I understand you asked about: ${transcript.substring(0, 30)}. I can explain anatomy, physiology, and organ systems. Try asking about the heart, lungs, or brain!`,
      intent: 'general_info',
    };
  }
}

// Singleton instance
let mockInstance: MockLLMProvider | null = null;

export function getMockProvider(): MockLLMProvider {
  if (!mockInstance) {
    mockInstance = new MockLLMProvider();
  }
  return mockInstance;
}
