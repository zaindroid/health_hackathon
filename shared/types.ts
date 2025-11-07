/**
 * Shared types for the AI Voice Agent Healthcare System
 */

// ============================================================================
// LLM Interfaces
// ============================================================================

export interface LLMResponse {
  utterance: string;
  intent?: 'explain_anatomy' | 'diagnose' | 'general_info' | string;
  tool_action?: ToolAction;
}

export interface ToolAction {
  op: string;
  target?: string;
  params?: Record<string, any>;
}

export interface LLMProvider {
  name: string;
  generateResponse(transcript: string, context?: RAGContext): Promise<LLMResponse>;
  isConfigured(): boolean;
}

// ============================================================================
// STT Interfaces
// ============================================================================

export interface STTProvider {
  name: string;
  startStream(): void;
  stopStream(): void;
  onTranscript(callback: (transcript: string, isFinal: boolean) => void): void;
  isConfigured(): boolean;
}

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

// ============================================================================
// TTS Interfaces
// ============================================================================

export interface TTSProvider {
  name: string;
  speak(text: string): Promise<void | any>; // Returns void or Buffer (Node.js)
  stop(): void;
  isConfigured(): boolean;
}

// ============================================================================
// RAG Interfaces
// ============================================================================

export interface RAGContext {
  documents?: Document[];
  metadata?: Record<string, any>;
}

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface RAGRetriever {
  name: string;
  retrieve(query: string, topK?: number): Promise<Document[]>;
  isConfigured(): boolean;
}

// ============================================================================
// Tool Handler Interfaces
// ============================================================================

export interface ToolHandler {
  name: string;
  execute(action: ToolAction): Promise<ToolResult>;
  canHandle(action: ToolAction): boolean;
}

export interface ToolResult {
  success: boolean;
  message?: string;
  data?: any;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export interface ClientMessage {
  type: 'audio' | 'control';
  data?: any;
  action?: 'start' | 'stop';
}

export interface ServerMessage {
  type: 'transcript' | 'llm_response' | 'error' | 'status' | 'audio' | 'camera_command';
  data?: any;
  transcript?: TranscriptEvent;
  llmResponse?: LLMResponse;
  error?: string;
  status?: string;
  audio?: {
    data: string; // Base64 encoded audio
    format: string;
    sampleRate: number;
  };
  cameraCommand?: {
    action: 'camera.set' | 'camera.flyTo';
    params: {
      position?: { x: number; y: number; z: number };
      target?: { x: number; y: number; z: number };
      objectId?: string;
      animate?: boolean;
      duration?: number;
    };
    objectName?: string;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  llmProvider: 'bedrock' | 'openai' | 'local' | 'mock';
  sttProvider: 'deepgram';
  ttsProvider: 'webspeech' | 'external';
  enableRAG: boolean;
  enableTools: boolean;
}

export interface DeepgramConfig {
  apiKey: string;
  model?: string;
  language?: string;
}

export interface BedrockConfig {
  region: string;
  modelId: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
}

// ============================================================================
// Video Health Monitoring Types (CAIRE API)
// ============================================================================

export interface VideoHealthConfig {
  apiKey: string;
  wsUrl: string;
}

export interface VideoFramePayload {
  datapt_id: string;
  state: 'stream' | 'end';
  frame_data: string; // base64 JPEG (no prefix)
  timestamp: string; // UNIX timestamp as string
  advanced: boolean; // true to get rPPG signals
}

export interface VideoHealthResponse {
  state: 'ok' | 'finished';
  socket_id: string;
  datapt_id: string;
  inference: {
    hr?: number; // Heart rate in BPM
  };
  advanced?: {
    rppg?: number[]; // rPPG signal array
    rppg_timestamps?: number[]; // Timestamps for each rPPG sample
  } | null;
  confidence?: Record<string, any>;
  feedback?: string | null;
  model_version?: string;
}

export interface VideoHealthMetrics {
  heartRate?: number;
  rppgSignal?: number[];
  rppgTimestamps?: number[];
  timestamp: number;
  confidence?: number;
}
