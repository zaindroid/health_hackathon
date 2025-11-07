/**
 * Main Application Component
 * Multi-tab healthcare platform with voice-controlled 3D anatomy and video health monitoring
 */

import { useState } from 'react';
import { VoiceInterface } from './components/VoiceInterface';
import { BioDigitalViewer } from './components/BioDigitalViewer';
import { VideoAnalysis } from './components/VideoAnalysis';
import './App.css';

type Tab = 'voice-3d' | 'video-analysis' | 'dashboard';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('voice-3d');

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
          padding: '15px 30px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            🏥 Healthcare AI Platform
          </h1>
        </div>

        <nav style={{ display: 'flex', gap: 0 }}>
          <TabButton
            active={activeTab === 'voice-3d'}
            onClick={() => setActiveTab('voice-3d')}
            icon="🗣️"
            label="Voice & 3D Anatomy"
          />
          <TabButton
            active={activeTab === 'video-analysis'}
            onClick={() => setActiveTab('video-analysis')}
            icon="📹"
            label="Video Health Analysis"
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
