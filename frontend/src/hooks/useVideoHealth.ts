/**
 * useVideoHealth Hook
 *
 * React hook for managing video health monitoring WebSocket connection.
 * Handles connection to backend, frame sending, and metric updates.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface VideoHealthMetrics {
  heartRate?: number;
  rppgSignal?: number[];
  rppgTimestamps?: number[];
  state?: 'ok' | 'finished';
  timestamp?: number;
  model_version?: string;
}

interface UseVideoHealthResult {
  // Connection state
  isConnected: boolean;
  status: string | null;
  error: string | null;

  // Health metrics
  heartRate: number | null;
  rppgSignal: number[] | null;
  rppgTimestamps: number[] | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  sendFrame: (frameData: string, timestamp?: number, isLastFrame?: boolean) => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

export function useVideoHealth(wsUrl: string): UseVideoHealthResult {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [rppgSignal, setRppgSignal] = useState<number[] | null>(null);
  const [rppgTimestamps, setRppgTimestamps] = useState<number[] | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to video health WebSocket:', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ Video health WebSocket connected');
          setIsConnected(true);
          setError(null);
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleMessage(message);
          } catch (err) {
            console.error('❌ Error parsing message:', err);
          }
        };

        ws.onerror = (event) => {
          console.error('❌ WebSocket error:', event);
          setError('WebSocket connection error');
          setIsConnected(false);
          reject(new Error('WebSocket connection error'));
        };

        ws.onclose = () => {
          console.log('🔌 Video health WebSocket closed');
          setIsConnected(false);
          wsRef.current = null;
        };

      } catch (err) {
        console.error('❌ Failed to connect:', err);
        setError(`Connection failed: ${err}`);
        reject(err);
      }
    });
  }, [wsUrl]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setStatus(null);
    console.log('🔌 Disconnected from video health service');
  }, []);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'status':
        setStatus(message.status || message.message);
        console.log('📊 Status:', message.status || message.message);
        break;

      case 'health_metrics':
        handleHealthMetrics(message.data);
        break;

      case 'error':
        setError(message.error);
        console.error('❌ Error:', message.error);
        break;

      default:
        console.log('📨 Received message:', message);
    }
  }, []);

  /**
   * Handle health metrics update
   */
  const handleHealthMetrics = useCallback((data: VideoHealthMetrics) => {
    if (data.heartRate) {
      setHeartRate(data.heartRate);
      console.log(`💓 Heart Rate: ${data.heartRate} BPM`);
    }

    if (data.rppgSignal) {
      setRppgSignal(data.rppgSignal);
    }

    if (data.rppgTimestamps) {
      setRppgTimestamps(data.rppgTimestamps);
    }

    if (data.state === 'finished') {
      setStatus('Analysis complete');
      console.log('✅ Video health analysis finished');
    }
  }, []);

  /**
   * Send video frame to backend
   */
  const sendFrame = useCallback((frameData: string, timestamp?: number, isLastFrame: boolean = false) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️  WebSocket not connected, cannot send frame');
      return;
    }

    try {
      wsRef.current.send(JSON.stringify({
        type: 'frame',
        data: {
          frame_data: frameData,
          timestamp: timestamp || Date.now() / 1000,
          isLastFrame,
        },
      }));
    } catch (err) {
      console.error('❌ Error sending frame:', err);
      setError('Failed to send frame');
    }
  }, []);

  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️  WebSocket not connected');
      return;
    }

    try {
      wsRef.current.send(JSON.stringify({
        type: 'start',
      }));
      setStatus('Starting monitoring...');
      console.log('📹 Starting video health monitoring');
    } catch (err) {
      console.error('❌ Error starting monitoring:', err);
      setError('Failed to start monitoring');
    }
  }, []);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current.send(JSON.stringify({
        type: 'stop',
      }));
      setStatus('Stopping monitoring...');
      console.log('🛑 Stopping video health monitoring');
    } catch (err) {
      console.error('❌ Error stopping monitoring:', err);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    status,
    error,
    heartRate,
    rppgSignal,
    rppgTimestamps,
    connect,
    disconnect,
    sendFrame,
    startMonitoring,
    stopMonitoring,
  };
}
