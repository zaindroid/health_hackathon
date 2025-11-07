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

  // Auto-start recording in initial greeting mode
  useEffect(() => {
    if (isInitialGreeting && isConnected && !isRecording) {
      // Small delay to let user see the interface
      const timer = setTimeout(() => {
        startRecording();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInitialGreeting, isConnected, isRecording]);

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
      <div className="voice-interface" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        {/* Welcoming header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>👋 Welcome!</h1>
          <p style={{ fontSize: '20px', color: '#666', marginBottom: '8px' }}>
            I'm your AI health assistant
          </p>
          <p style={{ fontSize: '16px', color: '#888' }}>
            How may I help you today?
          </p>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div style={{
            padding: '20px 40px',
            backgroundColor: '#eff6ff',
            borderRadius: '12px',
            border: '2px solid #3b82f6',
            marginBottom: '30px',
            animation: 'pulse 2s infinite'
          }}>
            <div style={{ fontSize: '18px', color: '#1e40af', fontWeight: '500' }}>
              🎤 Listening...
            </div>
          </div>
        )}

        {/* Connection status */}
        <div style={{ fontSize: '14px', color: isConnected ? '#10b981' : '#ef4444', marginBottom: '20px' }}>
          {isConnected ? '🟢 Connected - Ready to listen' : '🔴 Connecting...'}
        </div>

        {/* Error display */}
        {error && (
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Manual controls (if needed) */}
        {!isRecording && (
          <button
            onClick={startRecording}
            disabled={!isConnected}
            style={{
              marginTop: '30px',
              padding: '16px 32px',
              fontSize: '18px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: isConnected ? 'pointer' : 'not-allowed',
              opacity: isConnected ? 1 : 0.5,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
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
