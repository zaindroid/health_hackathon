/**
 * Voice Interface Component
 * Minimal UI for voice interaction testing
 */

import { useEffect, useRef } from 'react';
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
    conversation,
  } = useVoiceAgent();
  const interimTranscript = transcript.find((t) => !t.isFinal);
  const userTurns = conversation.filter((turn) => turn.role === 'user');
  const assistantTurns = conversation.filter((turn) => turn.role === 'assistant');

  const userFeedRef = useRef<HTMLDivElement | null>(null);
  const assistantFeedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (userFeedRef.current) {
      userFeedRef.current.scrollTo({
        top: userFeedRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [userTurns, interimTranscript]);

  useEffect(() => {
    if (assistantFeedRef.current) {
      assistantFeedRef.current.scrollTo({
        top: assistantFeedRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [assistantTurns]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="voice-interface">
      <div className="panel-scroll">
        <div className="header">
          <h1>🏥 AI Voice Agent</h1>
          <p className="subtitle">Healthcare Education Assistant</p>
        </div>

        <div className="status-bar">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
          {isRecording && <div className="recording-indicator">🎤 Recording...</div>}
        </div>

        {error && <div className="error-banner">⚠️ {error}</div>}

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
            disabled={conversation.length === 0 && !interimTranscript}
          >
            🗑️ Clear
          </button>
        </div>

        <div className="conversation-section">
          <div className="conversation-header">
            <h2>📝 Live Transcript</h2>
            <p>Monitor what you say and how the agent answers with synchronized panels.</p>
          </div>

          <div className="conversation-columns">
            <div className="conversation-column">
              <div className="column-header">You</div>
              <div className="conversation-feed" ref={userFeedRef}>
                {userTurns.length === 0 && !interimTranscript ? (
                  <p className="placeholder">Your speech will appear here.</p>
                ) : (
                  <>
                    {userTurns.map((turn, idx) => (
                      <div key={`user-${idx}-${turn.timestamp}`} className="message-bubble user">
                        <p>{turn.text}</p>
                        <span className="message-meta">{formatTimestamp(turn.timestamp)}</span>
                      </div>
                    ))}
                    {interimTranscript && (
                      <div className="message-bubble interim">
                        <p>{interimTranscript.text}</p>
                        <span className="message-meta">listening…</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="conversation-column">
              <div className="column-header">Assistant</div>
              <div className="conversation-feed" ref={assistantFeedRef}>
                {assistantTurns.length === 0 ? (
                  <p className="placeholder">Assistant replies will appear here.</p>
                ) : (
                  assistantTurns.map((turn, idx) => (
                    <div key={`assistant-${idx}-${turn.timestamp}`} className="message-bubble assistant">
                      <p>{turn.text}</p>
                      <span className="message-meta">{formatTimestamp(turn.timestamp)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="insight-section">
          <h3>🤖 Assistant Details</h3>
          <div className="insight-card">
            {llmResponse ? (
              <>
                <p className="insight-utterance">{llmResponse.utterance}</p>
                <div className="insight-meta">
                  <span className="label">Intent</span>
                  <span className="badge">{llmResponse.intent || 'n/a'}</span>
                </div>
                {llmResponse.tool_action && (
                  <div className="insight-meta">
                    <span className="label">Tool Action</span>
                    <code className="tool-action">
                      {llmResponse.tool_action.op}
                      {llmResponse.tool_action.target ? ` → ${llmResponse.tool_action.target}` : ''}
                    </code>
                  </div>
                )}
              </>
            ) : (
              <p className="placeholder">Assistant insights will appear after your first question.</p>
            )}
          </div>
        </div>

        <div className="instructions">
          <h3>💡 Instructions</h3>
          <ul>
            <li>Click "Start Talking" to begin voice interaction.</li>
            <li>Speak clearly about anatomy, physiology, or medical topics.</li>
            <li>The AI will respond with educational information and visuals.</li>
            <li>Try prompts like "Show the skeletal head view" or "Explain migraine pain".</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
