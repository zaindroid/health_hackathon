/**
 * Main Application Component
 * Voice-First Healthcare Platform
 *
 * NO Welcome Screen - Voice bot starts immediately
 * Role selection and navigation done via voice
 */

import { useState, useEffect } from 'react';
import { VoiceInterface } from './components/VoiceInterface';
import { BioDigitalViewer } from './components/BioDigitalViewer';
import { VideoAnalysis } from './components/VideoAnalysis';
import { MedicalScanner } from './components/MedicalScanner';
import './App.css';

interface SessionInfo {
  sessionId: string;
  role: 'patient' | 'doctor';
  useCase?: string;
}

function App() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMainInterface, setShowMainInterface] = useState(false);

  /**
   * Handle session start (called by voice bot after role detection)
   */
  const handleStartSession = async (role: 'patient' | 'doctor', useCase?: string) => {
    setIsLoading(true);

    try {
      // Call session API to create new session
      const response = await fetch('http://localhost:3001/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role, useCase }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Session started:', data.sessionId);
        setSessionInfo({
          sessionId: data.sessionId,
          role: data.role,
          useCase: data.useCase,
        });
        // Don't set showMainInterface=true here - let user interact first
        // Main interface will show after user speaks or clicks
      } else {
        console.error('❌ Failed to start session:', data.error);
      }
    } catch (error) {
      console.error('❌ Error starting session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Session will be created when user clicks "Start Talking"
   * Not automatically on mount
   */
  // Removed auto-start - user must click "Start Talking" button

  /**
   * Handle transition from greeting screen to main interface
   * Called after user's first interaction with the voice bot
   */
  const handleConversationStarted = () => {
    console.log('🎤 User has interacted - showing main interface');
    setShowMainInterface(true);
  };

  /**
   * Handle session end
   */
  const handleEndSession = async () => {
    if (!sessionInfo) return;

    const confirmEnd = window.confirm('Are you sure you want to end this session?');
    if (!confirmEnd) return;

    try {
      const response = await fetch('http://localhost:3001/api/session/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: sessionInfo.sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Session ended:', data.report);
        alert('Session ended. Thank you!');
        setSessionInfo(null);
        setShowMainInterface(false); // Return to greeting screen
      } else {
        console.error('❌ Failed to end session:', data.error);
      }
    } catch (error) {
      console.error('❌ Error ending session:', error);
    }
  };

  // Show full-screen voice interface until session is ready
  if (!sessionInfo || !showMainInterface) {
    return (
      <div className="app" style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5'
      }}>
        {/* Simple header */}
        <header style={{
          backgroundColor: '#1e40af',
          color: '#fff',
          padding: '20px 30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
            🏥 Health Helper
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
            Voice-Powered Health Assistant
          </p>
        </header>

        {/* Full-screen voice interface */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}>
          <div style={{ width: '100%', height: '100%', maxWidth: '800px', display: 'flex' }}>
            <VoiceInterface
              onSessionReady={handleStartSession}
              isInitialGreeting={true}
              onConversationStarted={handleConversationStarted}
            />
          </div>
        </main>
      </div>
    );
  }

  // Main interface - Clean 3D anatomy view with subtle header
  return (
    <div className="app" style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5',
      transition: 'opacity 0.5s ease-in-out'
    }}>
      {/* Minimal Header - matches greeting screen style */}
      <header style={{
        backgroundColor: '#1e40af',
        color: '#fff',
        padding: '20px 30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
              🏥 Health Helper
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
              Voice-Powered Health Assistant
            </p>
          </div>

          {/* End Session Button - minimal */}
          <button
            onClick={handleEndSession}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s',
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
        </div>
      </header>

      {/* Full-screen 3D Anatomy - Clean, no clutter */}
      <main style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        position: 'relative'
      }}>
        {/* 3D Anatomy Model - Full Screen */}
        <div style={{ height: '100%', width: '100%', padding: '1rem' }}>
          <BioDigitalViewer />
        </div>

        {/* Hidden voice interface - runs in background */}
        <div style={{ display: 'none' }}>
          <VoiceInterface sessionInfo={sessionInfo} />
        </div>
      </main>
    </div>
  );
}

export default App;
