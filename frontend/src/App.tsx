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
        setShowMainInterface(true);
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
   * Auto-create session on mount for voice-first flow
   * Start with patient role by default, can be updated via voice
   */
  useEffect(() => {
    handleStartSession('patient');
  }, []);

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
        setSessionInfo(null); // Return to Welcome Screen
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
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '100%', height: '100%', maxWidth: '800px', padding: '20px' }}>
            <VoiceInterface onSessionReady={handleStartSession} isInitialGreeting={true} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app" style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      {/* Header - Minimal, no tabs (voice-controlled navigation) */}
      <header style={{
        backgroundColor: '#1e40af',
        color: '#fff',
        padding: '15px 30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            🏥 Health Helper
          </h1>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            {sessionInfo.role === 'patient' ? '👤 Patient' : '👨‍⚕️ Doctor'} Session
            {sessionInfo.useCase && ` • ${sessionInfo.useCase}`}
          </div>
        </div>
        <button
          onClick={handleEndSession}
          style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          End Session
        </button>
      </header>

      {/* Main Content Area - Voice + 3D Anatomy (no tabs) */}
      <main style={{ flex: 1, overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
          {/* Left Side: 3D Anatomy Viewer */}
          <div style={{ flex: 2, height: '100%', padding: '1rem' }}>
            <BioDigitalViewer />
          </div>

          {/* Right Side: Voice Interface */}
          <div style={{ flex: 1, height: '100%', borderLeft: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <VoiceInterface sessionInfo={sessionInfo} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
