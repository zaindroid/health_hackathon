/**
 * Main Application Component
 * Multi-tab healthcare platform with voice-controlled 3D anatomy and video health monitoring
 *
 * NEW: Added Welcome Screen for role selection and session management
 */

import { useState } from 'react';
import { VoiceInterface } from './components/VoiceInterface';
import { BioDigitalViewer } from './components/BioDigitalViewer';
import { VideoAnalysis } from './components/VideoAnalysis';
import { MedicalScanner } from './components/MedicalScanner';
import WelcomeScreen from './components/WelcomeScreen';
import './App.css';

type Tab = 'voice-3d' | 'medical-scanner' | 'video-analysis' | 'dashboard';

interface SessionInfo {
  sessionId: string;
  role: 'patient' | 'doctor';
  useCase?: string;
}

function App() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('voice-3d');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle session start from Welcome Screen
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
      } else {
        console.error('❌ Failed to start session:', data.error);
        alert('Failed to start session. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error starting session:', error);
      alert('Error connecting to server. Please check if backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show Welcome Screen if no active session
  if (!sessionInfo) {
    return <WelcomeScreen onStart={handleStartSession} />;
  }

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

  return (
    <div className="app" style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Navigation Tabs */}
      <header style={{
        backgroundColor: '#1e40af',
        color: '#fff',
        padding: '0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '15px 30px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
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
        </div>

        <nav style={{ display: 'flex', gap: 0 }}>
          <TabButton
            active={activeTab === 'voice-3d'}
            onClick={() => setActiveTab('voice-3d')}
            icon="🗣️"
            label="Voice & 3D Anatomy"
          />
          <TabButton
            active={activeTab === 'medical-scanner'}
            onClick={() => setActiveTab('medical-scanner')}
            icon="🔬"
            label="Medical Face Scanner"
          />
          <TabButton
            active={activeTab === 'video-analysis'}
            onClick={() => setActiveTab('video-analysis')}
            icon="📹"
            label="Heart Rate Monitor"
          />
          <TabButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon="📊"
            label="Dashboard"
          />
        </nav>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
        {activeTab === 'voice-3d' && (
          <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            {/* Left Side: 3D Anatomy Viewer */}
            <div style={{ flex: 2, height: '100%', padding: '1rem' }}>
              <BioDigitalViewer />
            </div>

            {/* Right Side: Voice Interface */}
            <div style={{ flex: 1, height: '100%', borderLeft: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
              <VoiceInterface />
            </div>
          </div>
        )}

        {activeTab === 'medical-scanner' && (
          <div style={{ height: '100%', width: '100%', overflow: 'auto', backgroundColor: '#fff' }}>
            <MedicalScanner
              onAnatomyTarget={(target) => {
                // Auto-switch to 3D anatomy view when finding detected
                console.log('🎯 Anatomy target:', target);
                // Could implement tab switch + navigation here
              }}
              onVoiceGuidance={(text) => {
                console.log('🗣️ Voice guidance:', text);
                // Could trigger voice agent to speak this
              }}
            />
          </div>
        )}

        {activeTab === 'video-analysis' && (
          <div style={{ height: '100%', width: '100%', overflow: 'auto', backgroundColor: '#fff' }}>
            <VideoAnalysis />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div style={{ height: '100%', width: '100%', overflow: 'auto', padding: '30px' }}>
            <DashboardPlaceholder />
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Tab Button Component
 */
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 24px',
        backgroundColor: active ? '#fff' : 'transparent',
        color: active ? '#1e40af' : '#fff',
        border: 'none',
        borderBottom: active ? 'none' : '2px solid transparent',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: active ? 'bold' : 'normal',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
        opacity: active ? 1 : 0.8,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/**
 * Dashboard Placeholder
 */
function DashboardPlaceholder() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>📊 Dashboard</h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
      }}>
        {/* Stat Cards */}
        <StatCard
          title="Total Sessions"
          value="0"
          icon="🗣️"
          color="#4CAF50"
        />
        <StatCard
          title="Video Scans"
          value="0"
          icon="📹"
          color="#2196F3"
        />
        <StatCard
          title="Avg Heart Rate"
          value="-- BPM"
          icon="💓"
          color="#ff4444"
        />
      </div>

      <div style={{
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <h3>Coming Soon</h3>
        <p>Dashboard features will include:</p>
        <ul>
          <li>Session history and analytics</li>
          <li>Patient records management</li>
          <li>Video health scan history</li>
          <li>Heart rate trends and statistics</li>
          <li>3D anatomy learning progress</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Stat Card Component
 */
interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: color }}>
            {value}
          </div>
        </div>
        <div style={{ fontSize: '40px', opacity: 0.2 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default App;
