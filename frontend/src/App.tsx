/**
 * Main Application Component
 * Voice-controlled 3D anatomy learning interface
 */

import { VoiceInterface } from './components/VoiceInterface';
import { BioDigitalViewer } from './components/BioDigitalViewer';
import './App.css';

function App() {
  return (
    <div className="app" style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* Left Side: 3D Anatomy Viewer */}
      <div style={{ flex: 2, height: '100%', padding: '1rem' }}>
        <BioDigitalViewer />
      </div>

      {/* Right Side: Voice Interface */}
      <div style={{ flex: 1, height: '100%', borderLeft: '1px solid #e5e7eb' }}>
        <VoiceInterface />
      </div>
    </div>
  );
}

export default App;
