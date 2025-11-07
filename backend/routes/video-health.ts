/**
 * Video Health WebSocket Route
 *
 * Handles real-time video health monitoring using CAIRE API.
 * Acts as a proxy between frontend webcam and CAIRE API.
 */

import WebSocket from 'ws';
import { VideoHealthService } from '../video/video-health-service';
import type { VideoHealthConfig, VideoHealthResponse } from '../../shared/types';

export class VideoHealthHandler {
  private ws: WebSocket;
  private sessionId: string;
  private caireService: VideoHealthService | null = null;
  private frameCount: number = 0;

  constructor(ws: WebSocket, sessionId: string) {
    this.ws = ws;
    this.sessionId = sessionId;

    console.log(`📹 New video health session: ${sessionId}`);

    // Set up WebSocket message handler
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('close', () => this.cleanup());
    this.ws.on('error', (error) => {
      console.error(`❌ Video health session ${sessionId} error:`, error);
      this.cleanup();
    });

    // Send ready message
    this.sendMessage({
      type: 'status',
      status: 'ready',
      message: 'Video health monitoring ready',
    });
  }

  /**
   * Handle incoming messages from frontend
   */
  private async handleMessage(data: WebSocket.RawData): Promise<void> {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'start':
          await this.startMonitoring();
          break;

        case 'frame':
          await this.handleFrame(message.data);
          break;

        case 'stop':
          await this.stopMonitoring();
          break;

        default:
          console.warn(`⚠️  Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Error handling video health message:', error);
      this.sendMessage({
        type: 'error',
        error: 'Failed to process message',
      });
    }
  }

  /**
   * Start monitoring by connecting to CAIRE API
   */
  private async startMonitoring(): Promise<void> {
    try {
      // Get CAIRE config from environment
      const config: VideoHealthConfig = {
        apiKey: process.env.CAIRE_API_KEY || '',
        wsUrl: process.env.CAIRE_WS_URL || 'ws://3.67.186.245:8003/ws/',
      };

      if (!config.apiKey) {
        throw new Error('CAIRE_API_KEY not configured');
      }

      // Create and connect to CAIRE service
      this.caireService = new VideoHealthService(config);
      await this.caireService.connect();

      // Subscribe to health metrics
      this.caireService.onMetrics((response: VideoHealthResponse) => {
        this.handleHealthMetrics(response);
      });

      this.frameCount = 0;

      this.sendMessage({
        type: 'status',
        status: 'monitoring',
        message: 'Video health monitoring started',
      });

      console.log(`✅ Video health monitoring started for session ${this.sessionId}`);

    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      this.sendMessage({
        type: 'error',
        error: `Failed to start monitoring: ${error}`,
      });
    }
  }

  /**
   * Handle incoming video frame from frontend
   */
  private async handleFrame(frameData: any): Promise<void> {
    if (!this.caireService || !this.caireService.isReady()) {
      console.warn('⚠️  CAIRE service not ready, skipping frame');
      return;
    }

    try {
      // Extract base64 JPEG data (remove data URL prefix if present)
      let base64Data = frameData.frame_data || frameData;
      if (typeof base64Data === 'string' && base64Data.startsWith('data:image')) {
        base64Data = base64Data.split(',')[1];
      }

      const timestamp = frameData.timestamp || Date.now() / 1000;
      const isLastFrame = frameData.isLastFrame || false;

      // Send frame to CAIRE API
      await this.caireService.sendFrame(base64Data, timestamp, isLastFrame);

      this.frameCount++;

      // Log progress every 30 frames (~1 second at 30 FPS)
      if (this.frameCount % 30 === 0) {
        console.log(`📹 Sent ${this.frameCount} frames to CAIRE`);
      }

    } catch (error) {
      console.error('❌ Error sending frame to CAIRE:', error);
    }
  }

  /**
   * Handle health metrics from CAIRE API
   */
  private handleHealthMetrics(response: VideoHealthResponse): void {
    // Send metrics to frontend
    this.sendMessage({
      type: 'health_metrics',
      data: {
        heartRate: response.inference?.hr,
        rppgSignal: response.advanced?.rppg,
        rppgTimestamps: response.advanced?.rppg_timestamps,
        state: response.state,
        timestamp: Date.now(),
        model_version: response.model_version,
      },
    });

    // Log final results
    if (response.state === 'finished') {
      console.log(`✅ Video health analysis complete for session ${this.sessionId}`);
      console.log(`💓 Final Heart Rate: ${response.inference?.hr} BPM`);
    }
  }

  /**
   * Stop monitoring and disconnect from CAIRE API
   */
  private async stopMonitoring(): Promise<void> {
    if (this.caireService) {
      this.caireService.disconnect();
      this.caireService = null;
    }

    this.sendMessage({
      type: 'status',
      status: 'stopped',
      message: 'Video health monitoring stopped',
    });

    console.log(`🛑 Video health monitoring stopped for session ${this.sessionId}`);
  }

  /**
   * Send message to frontend
   */
  private sendMessage(message: any): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    console.log(`🧹 Cleaning up video health session ${this.sessionId}`);
    if (this.caireService) {
      this.caireService.disconnect();
      this.caireService = null;
    }
  }
}
