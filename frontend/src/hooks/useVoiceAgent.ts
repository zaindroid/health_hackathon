/**
 * Voice Agent Hook
 * Manages WebSocket connection, audio recording, and real-time interaction
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ServerMessage, TranscriptEvent, LLMResponse } from '../../../shared/types';

interface VoiceAgentState {
  isConnected: boolean;
  isRecording: boolean;
  transcript: TranscriptEvent[];
  llmResponse: LLMResponse | null;
  error: string | null;
}

interface VoiceAgentActions {
  connect: () => void;
  disconnect: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useVoiceAgent(): VoiceAgentState & VoiceAgentActions {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEvent[]>([]);
  const [llmResponse, setLlmResponse] = useState<LLMResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️  WebSocket already connected');
      return;
    }

    console.log('🔌 Connecting to WebSocket...');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (err) {
        console.error('❌ Failed to parse server message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, []);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  /**
   * Handle incoming server messages
   */
  const handleServerMessage = (message: ServerMessage) => {
    switch (message.type) {
      case 'transcript':
        if (message.transcript) {
          setTranscript((prev) => {
            // Replace interim results or append final ones
            if (message.transcript!.isFinal) {
              return [...prev, message.transcript!];
            } else {
              // Update last interim or add new
              const lastIdx = prev.findIndex((t) => !t.isFinal);
              if (lastIdx >= 0) {
                const updated = [...prev];
                updated[lastIdx] = message.transcript!;
                return updated;
              }
              return [...prev, message.transcript!];
            }
          });
        }
        break;

      case 'llm_response':
        if (message.llmResponse) {
          console.log('🤖 LLM Response:', message.llmResponse);
          setLlmResponse(message.llmResponse);

          // Note: Audio will come from Cartesia in separate 'audio' message
          // Do NOT use Web Speech API - only use Cartesia audio when received
        }
        break;

      case 'audio':
        if (message.audio) {
          console.log('🔊 Received audio from Cartesia');
          playCartesiaAudio(message.audio);
        }
        break;

      case 'error':
        console.error('❌ Server error:', message.error);
        setError(message.error || 'Unknown error');
        break;

      case 'status':
        console.log('📊 Status:', message.status);
        break;

      case 'camera_command':
        if (message.cameraCommand) {
          console.log('📹 Received camera command:', message.cameraCommand);
          executeCameraCommand(message.cameraCommand);
        }
        break;

      default:
        console.warn('⚠️  Unknown message type:', message.type);
    }
  };

  /**
   * Start audio recording and streaming
   */
  const startRecording = useCallback(async () => {
    if (!isConnected) {
      setError('Not connected to server. Please connect first.');
      return;
    }

    if (isRecording) {
      console.warn('⚠️  Already recording');
      return;
    }

    try {
      console.log('🎤 Starting audio recording...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context and processor
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Process audio data and send to server
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = convertFloat32ToInt16(inputData);
          wsRef.current.send(pcm16.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Send start control message
      wsRef.current?.send(JSON.stringify({
        type: 'control',
        action: 'start',
      }));

      setIsRecording(true);
      setError(null);
      console.log('✅ Recording started');
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      setError('Failed to access microphone');
    }
  }, [isConnected, isRecording]);

  /**
   * Stop audio recording
   */
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    console.log('🛑 Stopping audio recording...');

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Send stop control message
    wsRef.current?.send(JSON.stringify({
      type: 'control',
      action: 'stop',
    }));

    setIsRecording(false);
    console.log('✅ Recording stopped');
  }, [isRecording]);

  /**
   * Clear transcript history
   */
  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setLlmResponse(null);
  }, []);

  /**
   * Convert Float32Array to Int16Array (PCM16)
   */
  const convertFloat32ToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  /**
   * Play audio from Cartesia (PCM data)
   */
  const playCartesiaAudio = async (audioData: { data: string; format: string; sampleRate: number }) => {
    try {
      // STOP any currently playing audio first!
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
          currentSourceRef.current.disconnect();
        } catch (e) {
          // Ignore if already stopped
        }
        currentSourceRef.current = null;
      }

      // Create or reuse audio context
      if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
        playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: audioData.sampleRate,
        });
        console.log('🔊 Created new playback AudioContext');
      }

      const audioContext = playbackContextRef.current;

      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Decode base64 audio
      const binaryString = atob(audioData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0; // Convert to -1.0 to 1.0 range
      }

      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, float32.length, audioData.sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      // Create source and play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      // Track current source
      currentSourceRef.current = source;

      // Auto-cleanup when done
      source.onended = () => {
        if (currentSourceRef.current === source) {
          currentSourceRef.current = null;
        }
      };

      source.start(0);

      console.log(`🔊 Playing Cartesia audio (${bytes.length} bytes)`);
    } catch (error) {
      console.error('❌ Error playing Cartesia audio:', error);
    }
  };

  /**
   * Execute camera command on BioDigital viewer
   */
  const executeCameraCommand = (cameraCommand: any) => {
    // Dispatch custom event for 3D viewer component to listen to
    const event = new CustomEvent('biodigital-camera-command', {
      detail: cameraCommand,
    });
    window.dispatchEvent(event);
    console.log('📹 Dispatched camera command event:', cameraCommand.action);
  };

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    connect();
    return () => {
      // Cleanup: stop recording, disconnect, and close audio contexts
      stopRecording();
      disconnect();

      // Stop any playing audio
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
          currentSourceRef.current.disconnect();
        } catch (e) {
          // Ignore
        }
      }

      // Close playback audio context
      if (playbackContextRef.current) {
        playbackContextRef.current.close();
        playbackContextRef.current = null;
      }
    };
  }, []);

  return {
    isConnected,
    isRecording,
    transcript,
    llmResponse,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
