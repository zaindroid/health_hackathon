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

  // Transition to main interface after first user interaction
  // ONLY if user has actually spoken (finalTranscripts exist)
  useEffect(() => {
    const userHasSpoken = finalTranscripts.length > 0;

    if (isInitialGreeting && llmResponse && userHasSpoken && onConversationStarted) {
      // User has spoken AND received a response - transition after a delay
      const timer = setTimeout(() => {
        onConversationStarted();
      }, 3000); // Give user 3 seconds to see the response
      return () => clearTimeout(timer);
    }
  }, [isInitialGreeting, llmResponse, finalTranscripts.length, onConversationStarted]);

  // Get interim transcript (most recent)
  const interimTranscript = transcript.find((t) => !t.isFinal);

  // Initial greeting mode - simplified UI
  if (isInitialGreeting) {
    return (
      <div className="voice-interface" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', padding: '40px', position: 'relative' }}>
        {/* End Session Button - Top Right */}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to end this session?')) {
              window.location.reload();
            }
          }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s'
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

        {/* Welcoming header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>👋 Welcome!</h1>
          <p style={{ fontSize: '20px', color: '#666', marginBottom: '8px' }}>
            I'm your AI health assistant
          </p>
          <p style={{ fontSize: '16px', color: '#888' }}>
            How may I help you today?
          </p>
        </div>

        {/* Microphone Animation - Visual indicator */}
        <div style={{
          position: 'relative',
          marginBottom: '40px'
        }}>
          {/* Animated pulsing circles when listening */}
          {isRecording && (
            <>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                animation: 'pulse-ring 2s infinite'
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                animation: 'pulse-ring 2s infinite 0.5s'
              }} />
            </>
          )}

          {/* Microphone Icon */}
          <div style={{
            position: 'relative',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: isRecording ? '#3b82f6' : '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
            transition: 'all 0.3s'
          }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="white">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
        </div>

        {/* Control Buttons */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '30px' }}>
          {isRecording ? (
            <button
              onClick={stopRecording}
              style={{
                padding: '16px 32px',
                fontSize: '18px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#d97706';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f59e0b';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ⏸️ Pause
            </button>
          ) : (
            <button
              onClick={async () => {
                // Start session first if this is the initial greeting
                if (isInitialGreeting && onSessionReady) {
                  await onSessionReady('patient');
                }
                // Then start recording
                startRecording();
              }}
              disabled={!isConnected}
              style={{
                padding: '16px 32px',
                fontSize: '18px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: isConnected ? 'pointer' : 'not-allowed',
                opacity: isConnected ? 1 : 0.5,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (isConnected) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🎤 Start Talking
            </button>
          )}
        </div>

        {/* Connection status */}
        <div style={{ fontSize: '14px', color: isConnected ? '#10b981' : '#ef4444' }}>
          {isConnected ? (isRecording ? '🟢 Listening...' : '🟢 Ready to start') : '🔴 Connecting...'}
        </div>

        {/* Error display */}
        {error && (
          <div style={{
            marginTop: '20px',
            padding: '16px 24px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            maxWidth: '500px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Add CSS animation */}
        <style>{`
          @keyframes pulse-ring {
            0% {
              transform: translate(-50%, -50%) scale(0.8);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.3);
              opacity: 0;
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
