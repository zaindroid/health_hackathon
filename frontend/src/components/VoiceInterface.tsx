/**
 * Voice Interface Component
 * Voice-first interaction with initial greeting support
 */

import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { useEffect } from 'react';
import './VoiceInterface.css';

interface VoiceInterfaceProps {
  sessionInfo?: {
    sessionId: string;
    role: 'patient' | 'doctor';
    useCase?: string;
  };
  onSessionReady?: (role: 'patient' | 'doctor', useCase?: string) => void;
  isInitialGreeting?: boolean;
  onConversationStarted?: () => void; // Called after first LLM response
}

export function VoiceInterface({ sessionInfo, onSessionReady, isInitialGreeting = false, onConversationStarted }: VoiceInterfaceProps) {
  const {
    isConnected,
    isRecording,
    transcript,
    llmResponse,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useVoiceAgent();

  // Get final transcripts only
  const finalTranscripts = transcript.filter((t) => t.isFinal);

  // Don't auto-start - user must click "Start Talking" button
  // Removed auto-start recording

  // Smart transition: Only show 3D anatomy when user asks about it
  useEffect(() => {
    if (isInitialGreeting && llmResponse && onConversationStarted) {
      // Check if response is about anatomy/3D visualization
      const isAnatomyRequest =
        llmResponse.tool_action?.op?.includes('show_') || // show_front, show_back, etc.
        llmResponse.intent?.includes('anatomy') ||
        llmResponse.intent?.includes('navigate') ||
        llmResponse.utterance?.toLowerCase().includes('anatomy') ||
        llmResponse.utterance?.toLowerCase().includes('showing') ||
        llmResponse.utterance?.toLowerCase().includes('view');

      if (isAnatomyRequest) {
        // User asked about anatomy - transition to 3D view
        const timer = setTimeout(() => {
          onConversationStarted();
        }, 1000); // Quick 1 second transition
        return () => clearTimeout(timer);
      }
    }
  }, [isInitialGreeting, llmResponse, onConversationStarted]);

  // Get interim transcript (most recent)
  const interimTranscript = transcript.find((t) => !t.isFinal);

  // Initial greeting mode - simplified UI
  if (isInitialGreeting) {
    return (
      <div className="voice-interface" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        padding: 'clamp(10px, 2vh, 20px)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* End Session Button - Top Right - Responsive */}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to end this session?')) {
              window.location.reload();
            }
          }}
          style={{
            position: 'absolute',
            top: 'clamp(15px, 3vw, 20px)',
            right: 'clamp(15px, 3vw, 20px)',
            padding: 'clamp(8px, 2vw, 10px) clamp(15px, 3vw, 20px)',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: 'clamp(12px, 2vw, 14px)',
            fontWeight: '500',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#dc2626';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          End Session
        </button>

        {/* Top Section - Welcome Text - Responsive */}
        <div style={{
          textAlign: 'center',
          width: '100%',
          maxWidth: '800px',
          paddingTop: 'clamp(20px, 5vh, 40px)',
          flexShrink: 0
        }}>
          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 40px)',
            marginBottom: 'clamp(8px, 2vh, 12px)',
            fontWeight: 'bold',
            color: '#1e293b'
          }}>
            👋 Welcome!
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 2.5vw, 20px)',
            color: '#64748b',
            marginBottom: 'clamp(4px, 1vh, 8px)',
            lineHeight: '1.3'
          }}>
            I'm your AI health assistant
          </p>
          <p style={{
            fontSize: 'clamp(12px, 2vw, 16px)',
            color: '#94a3b8',
            lineHeight: '1.3'
          }}>
            How may I help you today?
          </p>
        </div>

        {/* Center Section - Large Microphone Animation - Responsive */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 1 auto',
          width: '100%',
          position: 'relative',
          minHeight: '0',
          padding: 'clamp(10px, 3vh, 30px) 0'
        }}>
          {/* Animated pulsing circles when listening - Responsive */}
          {isRecording && (
            <>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'clamp(140px, 30vmin, 300px)',
                height: 'clamp(140px, 30vmin, 300px)',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                animation: 'pulse-ring 2s infinite'
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'clamp(120px, 25vmin, 260px)',
                height: 'clamp(120px, 25vmin, 260px)',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                animation: 'pulse-ring 2s infinite 0.5s'
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'clamp(100px, 20vmin, 220px)',
                height: 'clamp(100px, 20vmin, 220px)',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                animation: 'pulse-ring 2s infinite 1s'
              }} />
            </>
          )}

          {/* Large Microphone Icon - Responsive */}
          <div style={{
            position: 'relative',
            width: 'clamp(100px, 20vmin, 200px)',
            height: 'clamp(100px, 20vmin, 200px)',
            borderRadius: '50%',
            backgroundColor: isRecording ? '#3b82f6' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isRecording
              ? '0 20px 40px rgba(59, 130, 246, 0.3), 0 0 60px rgba(59, 130, 246, 0.2)'
              : '0 10px 30px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            zIndex: 1
          }}>
            <svg
              width="clamp(50px, 10vmin, 100px)"
              height="clamp(50px, 10vmin, 100px)"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
        </div>

        {/* Bottom Section - Controls & Status - Responsive */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'clamp(12px, 2vh, 16px)',
          width: '100%',
          maxWidth: '400px',
          paddingBottom: 'clamp(15px, 3vh, 25px)',
          flexShrink: 0
        }}>
          {/* Control Button - Responsive */}
          {isRecording ? (
            <button
              onClick={stopRecording}
              style={{
                padding: 'clamp(12px, 2.5vh, 16px) clamp(24px, 5vw, 32px)',
                fontSize: 'clamp(14px, 2.5vw, 18px)',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                fontWeight: '600',
                transition: 'all 0.2s',
                width: '100%',
                maxWidth: '300px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#d97706';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f59e0b';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
              }}
            >
              ⏸️ Pause
            </button>
          ) : (
            <button
              onClick={async () => {
                if (isInitialGreeting && onSessionReady) {
                  await onSessionReady('patient');
                }
                startRecording();
              }}
              disabled={!isConnected}
              style={{
                padding: 'clamp(12px, 2.5vh, 16px) clamp(24px, 5vw, 32px)',
                fontSize: 'clamp(14px, 2.5vw, 18px)',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: isConnected ? 'pointer' : 'not-allowed',
                opacity: isConnected ? 1 : 0.5,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                fontWeight: '600',
                transition: 'all 0.2s',
                width: '100%',
                maxWidth: '300px'
              }}
              onMouseEnter={(e) => {
                if (isConnected) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
              }}
            >
              🎤 Start Talking
            </button>
          )}

          {/* Connection Status - Responsive */}
          <div style={{
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            color: isConnected ? '#10b981' : '#ef4444',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            {isConnected ? (isRecording ? '🟢 Listening...' : '🟢 Ready to start') : '🔴 Connecting...'}
          </div>

          {/* Error display - Responsive */}
          {error && (
            <div style={{
              padding: 'clamp(12px, 3vw, 16px) clamp(18px, 4vw, 24px)',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              width: '100%',
              textAlign: 'center',
              fontSize: 'clamp(12px, 2.5vw, 14px)'
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Enhanced CSS animation */}
        <style>{`
          @keyframes pulse-ring {
            0% {
              transform: translate(-50%, -50%) scale(0.7);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.5);
              opacity: 0;
            }
          }

          /* Mobile-specific adjustments */
          @media (max-width: 768px) {
            .voice-interface {
              padding: 15px !important;
            }
          }

          /* Touch targets for mobile */
          @media (hover: none) and (pointer: coarse) {
            button {
              min-height: 48px !important;
              min-width: 48px !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // Regular mode - full interface
  return (
    <div className="voice-interface">
      <div className="header">
        <h1>🏥 AI Voice Agent</h1>
        <p className="subtitle">Healthcare Education Assistant</p>
      </div>

      {/* Connection Status */}
      <div className="status-bar">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        {isRecording && <div className="recording-indicator">🎤 Recording...</div>}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Controls */}
      <div className="controls">
        {!isRecording ? (
          <button
            className="btn btn-primary btn-start"
            onClick={startRecording}
            disabled={!isConnected}
          >
            🎤 Start Talking
          </button>
        ) : (
          <button
            className="btn btn-danger btn-stop"
            onClick={stopRecording}
          >
            🛑 Stop
          </button>
        )}

        <button
          className="btn btn-secondary"
          onClick={clearTranscript}
          disabled={transcript.length === 0}
        >
          🗑️ Clear
        </button>
      </div>

      {/* Transcript Display */}
      <div className="transcript-section">
        <h2>📝 Transcript</h2>
        <div className="transcript-box">
          {finalTranscripts.length === 0 && !interimTranscript ? (
            <p className="placeholder">Your speech will appear here...</p>
          ) : (
            <>
              {finalTranscripts.map((t, idx) => (
                <div key={idx} className="transcript-item final">
                  {t.text}
                </div>
              ))}
              {interimTranscript && (
                <div className="transcript-item interim">
                  {interimTranscript.text}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* AI Response Display */}
      {llmResponse && (
        <div className="response-section">
          <h2>🤖 AI Response</h2>
          <div className="response-box">
            <div className="response-utterance">
              {llmResponse.utterance}
            </div>

            {llmResponse.intent && (
              <div className="response-meta">
                <span className="label">Intent:</span>
                <span className="badge">{llmResponse.intent}</span>
              </div>
            )}

            {llmResponse.tool_action && (
              <div className="response-meta">
                <span className="label">Tool Action:</span>
                <code className="tool-action">
                  {llmResponse.tool_action.op} → {llmResponse.tool_action.target}
                </code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="instructions">
        <h3>💡 Instructions</h3>
        <ul>
          <li>Click "Start Talking" to begin voice interaction</li>
          <li>Speak clearly about anatomy, physiology, or medical topics</li>
          <li>The AI will respond with educational information</li>
          <li>Example: "Tell me about the heart" or "What does the left ventricle do?"</li>
        </ul>
      </div>
    </div>
  );
}
