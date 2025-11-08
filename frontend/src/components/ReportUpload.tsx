/**
 * Report Upload Component
 * Screen for uploading and analyzing medical reports
 */

import { useState } from 'react';
import { ReportInfographic } from './ReportInfographic';

interface ReportUploadProps {
  sessionId?: string;
}

export function ReportUpload({ sessionId }: ReportUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    if (!sessionId) {
      setError('No active session. Please start talking first.');
      return;
    }

    setUploading(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sessionId', sessionId);

      console.log('📤 Uploading report...');
      const response = await fetch('http://localhost:3001/api/session/upload-report', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Report uploaded and analyzed:', data);
        setAnalysis(data.analysis);
      } else {
        setError(data.error || 'Failed to process report');
      }
    } catch (error) {
      console.error('❌ Error uploading report:', error);
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Show loading screen during upload
  if (uploading) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#f5f5f5',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '3rem',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          {/* Animated spinner */}
          <div
            style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 2rem',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

          <h3 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '1rem' }}>
            Analyzing Your Report
          </h3>
          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6' }}>
            Please wait while I read and analyze your medical report...
          </p>

          {selectedFile && (
            <div
              style={{
                marginTop: '2rem',
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#475569',
              }}
            >
              📄 {selectedFile.name}
            </div>
          )}
        </div>
      </div>
    );
  }

  // If analysis is complete, show full-screen report analysis
  if (analysis) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Back button */}
        <div style={{ maxWidth: '900px', width: '100%', marginBottom: '0.5rem' }}>
          <button
            onClick={() => {
              setAnalysis(null);
              setSelectedFile(null);
              setError(null);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'white',
              color: '#475569',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            ← Upload Another Report
          </button>
        </div>

        {/* Report Analysis */}
        <ReportInfographic analysisText={analysis} />
      </div>
    );
  }

  // Show upload screen
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#f5f5f5',
      }}
    >
      {/* Upload Card */}
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '3rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '28px', marginBottom: '1rem', color: '#1e293b' }}>
          Upload Medical Report
        </h2>
        <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '2rem' }}>
          Upload your lab results, blood work, or imaging reports as a PDF
        </p>

        {/* File Input */}
        <div style={{ marginBottom: '2rem' }}>
          <label
            htmlFor="file-upload"
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            📄 Choose PDF File
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Selected File Display */}
        {selectedFile && (
          <div
            style={{
              backgroundColor: '#f1f5f9',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
              📎 {selectedFile.name}
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            padding: '1rem 3rem',
            backgroundColor: selectedFile && !uploading ? '#10b981' : '#cbd5e1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (selectedFile && !uploading) {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedFile && !uploading) {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {uploading ? 'Uploading...' : 'Upload & Analyze'}
        </button>

        {/* Error Display */}
        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '8px',
              marginTop: '1.5rem',
              fontSize: '14px',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Info Text */}
        <p
          style={{
            fontSize: '13px',
            color: '#94a3b8',
            marginTop: '2rem',
            lineHeight: '1.5',
          }}
        >
          I'll analyze your report and explain the results in simple terms.
          <br />
          Keep talking with me via voice while viewing the analysis.
        </p>
      </div>
    </div>
  );
}
