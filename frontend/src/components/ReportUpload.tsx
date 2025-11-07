/**
 * Report Upload Component
 * Screen for uploading and analyzing medical reports
 */

import { useState } from 'react';

export function ReportUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:3001/api/upload/report', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('✅ Report uploaded:', data);

      // TODO: Handle successful upload - show analysis
    } catch (error) {
      console.error('❌ Error uploading report:', error);
    } finally {
      setUploading(false);
    }
  };

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
