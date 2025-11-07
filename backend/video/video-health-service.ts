/**
 * Video Health Service - CAIRE API Integration
 *
 * This service manages the WebSocket connection to CAIRE API for real-time
 * heart rate monitoring and rPPG signal extraction from video frames.
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  VideoHealthConfig,
  VideoFramePayload,
  VideoHealthResponse,
  VideoHealthMetrics,
} from '../../shared/types';

export class VideoHealthService {
  private config: VideoHealthConfig;
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private isConnected: boolean = false;
  private messageHandlers: Map<string, (response: VideoHealthResponse) => void> = new Map();

  constructor(config: VideoHealthConfig) {
    this.config = config;
  }

  /**
   * Connect to CAIRE WebSocket API
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL with API key
        const url = new URL(this.config.wsUrl);
        url.searchParams.set('api_key', this.config.apiKey);

        console.log('🔌 Connecting to CAIRE API:', url.toString().replace(this.config.apiKey, '***'));

        this.ws = new WebSocket(url.toString(), {
          handshakeTimeout: 10000,
        });

        this.ws.on('open', () => {
          console.log('✅ CAIRE WebSocket connected');
          this.isConnected = true;
          this.sessionId = uuidv4();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          console.error('❌ CAIRE WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('🔌 CAIRE WebSocket closed');
          this.isConnected = false;
          this.ws = null;
        });

      } catch (error) {
        console.error('❌ Failed to connect to CAIRE:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages from CAIRE API
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as VideoHealthResponse;

      // Log heart rate if available
      if (message.inference?.hr) {
        console.log(`💓 Heart Rate: ${message.inference.hr} BPM`);
      }

      // Notify all registered handlers
      this.messageHandlers.forEach((handler) => {
        handler(message);
      });

    } catch (error) {
      console.error('❌ Error parsing CAIRE response:', error);
    }
  }

  /**
   * Send a video frame to CAIRE API
   */
  async sendFrame(frameData: string, timestamp?: number, isLastFrame: boolean = false): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to CAIRE API');
    }

    const payload: VideoFramePayload = {
      datapt_id: this.sessionId || uuidv4(),
      state: isLastFrame ? 'end' : 'stream',
      frame_data: frameData, // base64 JPEG without prefix
      timestamp: (timestamp || Date.now() / 1000).toString(),
      advanced: true, // Enable rPPG signals
    };

    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Register a callback for health metric updates
   */
  onMetrics(callback: (response: VideoHealthResponse) => void): () => void {
    const id = uuidv4();
    this.messageHandlers.set(id, callback);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(id);
    };
  }

  /**
   * Disconnect from CAIRE API
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.sessionId = null;
    this.messageHandlers.clear();
  }

  /**
   * Check if service is connected
   */
  isReady(): boolean {
    return this.isConnected && this.ws !== null;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
}

/**
 * Factory function to create VideoHealthService
 */
export function createVideoHealthService(config: VideoHealthConfig): VideoHealthService {
  return new VideoHealthService(config);
}
