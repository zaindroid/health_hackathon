/**
 * Main Backend Server
 * Sets up Express HTTP server with WebSocket support for real-time voice interaction
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { serverConfig, printConfig, checkConfiguration } from './config/env';
import { VoiceSessionHandler } from './routes/voice';
import { VideoHealthHandler } from './routes/video-health';
import { testLLMProvider } from './llm';

class VoiceAgentServer {
  private app: Express;
  private httpServer: HTTPServer;
  private wss: WebSocketServer;
  private activeSessions: Map<string, VoiceSessionHandler> = new Map();

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: serverConfig.corsOrigins,
      credentials: true,
    }));

    // JSON body parser
    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Set up HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      const configCheck = checkConfiguration();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        configuration: {
          valid: configCheck.valid,
          errors: configCheck.errors,
        },
        sessions: {
          active: this.activeSessions.size,
        },
      });
    });

    // Configuration status endpoint
    this.app.get('/config', (req: Request, res: Response) => {
      const configCheck = checkConfiguration();
      res.json({
        valid: configCheck.valid,
        errors: configCheck.errors,
      });
    });

    // Test LLM endpoint
    this.app.post('/test/llm', async (req: Request, res: Response) => {
      try {
        const success = await testLLMProvider();
        res.json({ success });
      } catch (error) {
        res.status(500).json({ success: false, error: String(error) });
      }
    });

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'AI Voice Agent Healthcare System',
        version: '1.0.0',
        endpoints: {
          health: 'GET /health',
          config: 'GET /config',
          testLLM: 'POST /test/llm',
          websocket: 'WS /voice',
        },
      });
    });
  }

  /**
   * Set up WebSocket server for voice interaction and video health
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const sessionId = uuidv4();
      const path = req.url?.split('?')[0] || '/';

      console.log(`\n🔌 New WebSocket connection: ${sessionId}`);
      console.log(`   Path: ${path}`);
      console.log(`   Active sessions: ${this.activeSessions.size + 1}`);

      // Route to appropriate handler based on path
      if (path === '/video-health' || path === '/video-health/') {
        // Video health monitoring handler
        const handler = new VideoHealthHandler(ws, sessionId);
        // Note: VideoHealthHandler manages its own lifecycle
        console.log(`📹 Video health session created: ${sessionId}`);
      } else {
        // Default: Voice session handler
        const handler = new VoiceSessionHandler(ws, sessionId);
        this.activeSessions.set(sessionId, handler);

        // Clean up on disconnect
        ws.on('close', () => {
          this.activeSessions.delete(sessionId);
          console.log(`📊 Active sessions: ${this.activeSessions.size}`);
        });
      }
    });

    console.log('✅ WebSocket server configured');
    console.log('   - Voice Agent: ws://HOST:PORT/');
    console.log('   - Video Health: ws://HOST:PORT/video-health');
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    // Print configuration status
    printConfig();

    // Check configuration
    const configCheck = checkConfiguration();
    if (!configCheck.valid) {
      console.error('\n❌ Server cannot start due to configuration errors:');
      configCheck.errors.forEach(error => console.error(`   - ${error}`));
      console.error('\nPlease check your .env file and ensure all required variables are set.\n');
      process.exit(1);
    }

    // Start HTTP server
    this.httpServer.listen(serverConfig.port, serverConfig.host, () => {
      console.log('\n🚀 Voice Agent Server Started!');
      console.log(`   HTTP Server: http://${serverConfig.host}:${serverConfig.port}`);
      console.log(`   WebSocket: ws://${serverConfig.host}:${serverConfig.port}/voice`);
      console.log(`   Health Check: http://${serverConfig.host}:${serverConfig.port}/health`);
      console.log('\n📡 Ready to accept connections\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Gracefully shut down the server
   */
  private shutdown(): void {
    console.log('\n🛑 Shutting down server...');

    // Close all WebSocket connections
    this.activeSessions.forEach((handler, sessionId) => {
      console.log(`   Closing session: ${sessionId}`);
    });

    // Close WebSocket server
    this.wss.close(() => {
      console.log('   WebSocket server closed');
    });

    // Close HTTP server
    this.httpServer.close(() => {
      console.log('   HTTP server closed');
      console.log('✅ Server shut down gracefully\n');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }
}

// Start the server
if (require.main === module) {
  const server = new VoiceAgentServer();
  server.start().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export { VoiceAgentServer };
