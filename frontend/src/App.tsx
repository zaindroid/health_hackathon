/**
 * Main Application Component
 * Voice-controlled 3D anatomy learning interface
 */

import { VoiceInterface } from './components/VoiceInterface';
import { BioDigitalViewer } from './components/BioDigitalViewer';
import './App.css';

function App() {
  return (
    <div className="app">
      <div className="viewer-pane">
        <BioDigitalViewer />
      </div>
      <div className="interface-pane">
        <VoiceInterface />
      </div>
    </div>
  );
}

export default App;
