/**
 * Welcome Screen - Role Selection
 *
 * First screen users see to choose their role:
 * - Patient: General user seeking health assistance
 * - Doctor: Professional reviewing patient sessions (Phase 2)
 */

import React, { useState } from 'react';
import '../styles/WelcomeScreen.css';

interface WelcomeScreenProps {
  onStart: (role: 'patient' | 'doctor', useCase?: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | null>(null);
  const [useCase, setUseCase] = useState<string>('');
  const [showUseCaseInput, setShowUseCaseInput] = useState(false);

  const handleRoleSelect = (role: 'patient' | 'doctor') => {
    setSelectedRole(role);
    if (role === 'patient') {
      setShowUseCaseInput(true);
    } else {
      // Doctor workflow - Phase 2
      setShowUseCaseInput(false);
    }
  };

  const handleStart = () => {
    if (selectedRole) {
      onStart(selectedRole, useCase || undefined);
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        {/* Header */}
        <div className="welcome-header">
          <h1 className="welcome-title">Health Helper</h1>
          <p className="welcome-subtitle">
            Voice-First Health Assistant
          </p>
        </div>

        {/* Role Selection */}
        {!selectedRole && (
          <div className="role-selection">
            <h2 className="role-question">How can we help you today?</h2>

            <div className="role-cards">
              {/* Patient Card */}
              <button
                className="role-card patient-card"
                onClick={() => handleRoleSelect('patient')}
              >
                <div className="role-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="role-title">I'm a Patient</h3>
                <p className="role-description">
                  Get help understanding your symptoms and learn about your health
                </p>
                <div className="role-features">
                  <span className="feature-tag">Symptom Assessment</span>
                  <span className="feature-tag">Health Education</span>
                  <span className="feature-tag">3D Anatomy</span>
                </div>
              </button>

              {/* Doctor Card */}
              <button
                className="role-card doctor-card"
                onClick={() => handleRoleSelect('doctor')}
              >
                <div className="role-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="role-title">I'm a Doctor</h3>
                <p className="role-description">
                  Review patient sessions and provide professional diagnosis
                </p>
                <div className="role-features">
                  <span className="feature-tag">Patient Data</span>
                  <span className="feature-tag">Review Tools</span>
                  <span className="feature-tag">Coming Soon</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Use Case Input (Patient only) */}
        {selectedRole === 'patient' && showUseCaseInput && (
          <div className="use-case-section">
            <button
              className="back-button"
              onClick={() => {
                setSelectedRole(null);
                setShowUseCaseInput(false);
                setUseCase('');
              }}
            >
              ← Back
            </button>

            <h2 className="use-case-question">What brings you here today?</h2>
            <p className="use-case-hint">
              Optional - helps personalize your experience
            </p>

            <div className="use-case-options">
              <button
                className={`use-case-btn ${useCase === 'headache' ? 'selected' : ''}`}
                onClick={() => setUseCase('headache')}
              >
                🤕 Headache
              </button>
              <button
                className={`use-case-btn ${useCase === 'general_checkup' ? 'selected' : ''}`}
                onClick={() => setUseCase('general_checkup')}
              >
                🩺 General Checkup
              </button>
              <button
                className={`use-case-btn ${useCase === 'pain' ? 'selected' : ''}`}
                onClick={() => setUseCase('pain')}
              >
                😣 Pain
              </button>
              <button
                className={`use-case-btn ${useCase === 'eye_health' ? 'selected' : ''}`}
                onClick={() => setUseCase('eye_health')}
              >
                👁️ Eye Health
              </button>
            </div>

            <button
              className="start-button"
              onClick={handleStart}
            >
              Start Session
            </button>

            <button
              className="skip-button"
              onClick={() => onStart('patient')}
            >
              Skip - Start General Session
            </button>
          </div>
        )}

        {/* Doctor Workflow (Phase 2) */}
        {selectedRole === 'doctor' && (
          <div className="doctor-section">
            <button
              className="back-button"
              onClick={() => setSelectedRole(null)}
            >
              ← Back
            </button>

            <h2 className="doctor-title">Doctor Workflow</h2>
            <p className="doctor-message">
              Doctor review features are coming in Phase 2. Stay tuned!
            </p>

            <div className="coming-soon-features">
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span className="feature-text">Patient Dashboard</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔍</span>
                <span className="feature-text">Session Review Tools</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📝</span>
                <span className="feature-text">Diagnosis Notes</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💊</span>
                <span className="feature-text">Treatment Plans</span>
              </div>
            </div>

            <button
              className="back-to-selection"
              onClick={() => setSelectedRole(null)}
            >
              Back to Role Selection
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="welcome-footer">
          <p className="disclaimer">
            This is an educational tool. Not a substitute for professional medical advice.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
