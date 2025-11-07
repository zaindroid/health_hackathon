/**
 * Voice Interface Component
 * Minimal UI for voice interaction testing
 */

import { useVoiceAgent } from '../hooks/useVoiceAgent';
import './VoiceInterface.css';

export function VoiceInterface() {
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

  // Get interim transcript (most recent)
  const interimTranscript = transcript.find((t) => !t.isFinal);

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
