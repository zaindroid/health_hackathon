/**
 * Shared types for the AI Voice Agent Healthcare System
 */
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
export interface TTSProvider {
    name: string;
    speak(text: string): Promise<void | Buffer>;
    stop(): void;
    isConfigured(): boolean;
}
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
export interface ClientMessage {
    type: 'audio' | 'control';
    data?: any;
    action?: 'start' | 'stop';
}
export interface ServerMessage {
    type: 'transcript' | 'llm_response' | 'error' | 'status' | 'audio' | 'camera_command' | 'viewer_model' | 'viewer_catalog';
    data?: any;
    transcript?: TranscriptEvent;
    llmResponse?: LLMResponse;
    error?: string;
    status?: string;
    audio?: {
        data: string;
        format: string;
        sampleRate: number;
    };
    cameraCommand?: {
        action: 'camera.set' | 'camera.flyTo';
        params: {
            position?: {
                x: number;
                y: number;
                z: number;
            };
            target?: {
                x: number;
                y: number;
                z: number;
            };
            objectId?: string;
            animate?: boolean;
            duration?: number;
        };
        objectName?: string;
    };
        viewerModel?: {
            modelId: string;
            modelName: string;
            biodigitalUrl: string;
            viewpointUrl?: string;
            viewpointId?: string;
            viewpointName?: string;
            camera?: CameraPositionMessage;
            autoSelected?: boolean;
            reason?: string;
            matchedTerms?: string[];
            visible?: boolean;
        };
        viewerCatalog?: {
            models: Array<{
                modelId: string;
                modelName: string;
                biodigitalUrl: string;
                defaultViewId?: string;
                defaultCamera?: CameraPositionMessage;
            }>;
        };
}
    export interface CameraPositionMessage {
        position?: {
            x: number;
            y: number;
            z: number;
        };
        target?: {
            x: number;
            y: number;
            z: number;
        };
    }
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
//# sourceMappingURL=types.d.ts.map