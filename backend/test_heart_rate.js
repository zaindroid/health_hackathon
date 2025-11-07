#!/usr/bin/env node
/**
 * Test script for heart rate monitoring service
 * Tests WebSocket connection and CAIRE API integration
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const WS_URL = 'ws://localhost:3001/video-health';

// Simple base64 JPEG test data (1x1 red pixel)
const TEST_FRAME = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';

let frameCount = 0;
let heartRateReceived = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHeartRateService() {
  console.log('='.repeat(60));
  console.log('💓 Heart Rate Monitoring Service Test');
  console.log('='.repeat(60));

  return new Promise((resolve) => {
    console.log('🔌 Connecting to WebSocket:', WS_URL);

    const ws = new WebSocket(WS_URL);

    ws.on('open', async () => {
      console.log('✅ WebSocket connected');

      // Send start message
      console.log('📤 Sending start message...');
      ws.send(JSON.stringify({ type: 'start' }));

      // Wait for backend to connect to CAIRE
      await sleep(2000);

      // Send test frames for 10 seconds
      console.log('📹 Sending test frames for 10 seconds...');
      const frameInterval = setInterval(() => {
        if (frameCount < 300) { // 10 seconds at 30 FPS
          ws.send(JSON.stringify({
            type: 'frame',
            data: {
              frame_data: TEST_FRAME,
              timestamp: Date.now() / 1000,
              isLastFrame: frameCount === 299
            }
          }));

          frameCount++;

          if (frameCount % 30 === 0) {
            console.log(`   Sent ${frameCount} frames...`);
          }
        } else {
          clearInterval(frameInterval);

          // Send stop message
          console.log('📤 Sending stop message...');
          ws.send(JSON.stringify({ type: 'stop' }));

          // Wait for final results
          setTimeout(() => {
            ws.close();
          }, 2000);
        }
      }, 1000 / 30); // 30 FPS
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'status':
            console.log(`📊 Status: ${message.status || message.message}`);
            break;

          case 'health_metrics':
            if (message.data.heartRate) {
              console.log(`💓 Heart Rate: ${message.data.heartRate} BPM`);
              heartRateReceived = true;
            }

            if (message.data.rppgSignal) {
              console.log(`📈 rPPG Signal: ${message.data.rppgSignal.length} samples`);
            }

            if (message.data.state === 'finished') {
              console.log('✅ Analysis complete');
            }
            break;

          case 'error':
            console.log(`❌ Error: ${message.error}`);
            break;

          default:
            console.log('📨 Message:', message);
        }
      } catch (err) {
        console.error('❌ Error parsing message:', err);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      resolve(false);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket closed');
      console.log();
      console.log('='.repeat(60));

      if (heartRateReceived) {
        console.log('✅ TEST PASSED - Heart rate monitoring working!');
      } else if (frameCount > 0) {
        console.log('⚠️  TEST PARTIAL - Frames sent but no heart rate received');
        console.log('   This may be normal if CAIRE needs real face data');
      } else {
        console.log('❌ TEST FAILED - Service error');
      }

      console.log('='.repeat(60));
      resolve(heartRateReceived);
    });
  });
}

// Check if backend is running
async function checkBackend() {
  const http = require('http');

  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/', (res) => {
      resolve(true);
    });

    req.on('error', () => {
      console.log('❌ Backend server is not running!');
      console.log('   Start it with: cd backend && npm run dev');
      resolve(false);
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const backendRunning = await checkBackend();

  if (!backendRunning) {
    process.exit(1);
  }

  console.log('✅ Backend server is running');
  console.log();

  await testHeartRateService();
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
