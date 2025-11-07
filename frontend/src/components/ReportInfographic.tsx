/**
 * Report Infographic Component
 * Visual display of medical report analysis with color-coded indicators
 */

interface ReportData {
  utterance?: string;
  intent?: string;
  report_type?: string;
  findings?: {
    normal?: string[];
    abnormal?: string[];
    action?: string;
  };
}

interface ReportInfographicProps {
  analysisText: string;
}

export function ReportInfographic({ analysisText }: ReportInfographicProps) {
  // Try to parse JSON from analysis text
  let reportData: ReportData | null = null;
  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      reportData = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.log('Could not parse report JSON, using text format');
  }

  // If we have structured data, show infographic
  if (reportData?.findings) {
    return (
      <div
        style={{
          maxWidth: '900px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
          marginTop: '2rem',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 0.5rem 0' }}>
            📊 Your Health Report
          </h3>
          {reportData.report_type && (
            <p style={{ fontSize: '16px', color: '#64748b', margin: 0 }}>
              {reportData.report_type}
            </p>
          )}
        </div>

        {/* Summary Message */}
        {reportData.utterance && (
          <div
            style={{
              backgroundColor: '#f0f9ff',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <p style={{ fontSize: '16px', color: '#1e40af', margin: 0, lineHeight: '1.6' }}>
              💡 <strong>Quick Summary:</strong> {reportData.utterance}
            </p>
          </div>
        )}

        {/* Normal Values Section */}
        {reportData.findings.normal && reportData.findings.normal.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h4
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#10b981',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '24px' }}>✅</span> Normal Values ({reportData.findings.normal.length})
            </h4>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {reportData.findings.normal.map((value, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #86efac',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px', color: 'white' }}>✓</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', color: '#166534', margin: 0, lineHeight: '1.5' }}>
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Abnormal Values Section */}
        {reportData.findings.abnormal && reportData.findings.abnormal.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h4
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#ef4444',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '24px' }}>⚠️</span> Values Needing Attention ({reportData.findings.abnormal.length})
            </h4>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {reportData.findings.abnormal.map((value, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '2px solid #fca5a5',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px', color: 'white' }}>!</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', color: '#991b1b', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Recommendation */}
        {reportData.findings.action && (
          <div
            style={{
              backgroundColor: '#fef3c7',
              border: '2px solid #fbbf24',
              borderRadius: '12px',
              padding: '1.5rem',
              marginTop: '2rem',
            }}
          >
            <h4
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#92400e',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '20px' }}>📋</span> What You Should Do
            </h4>
            <p style={{ fontSize: '15px', color: '#78350f', margin: 0, lineHeight: '1.6' }}>
              {getActionText(reportData.findings.action)}
            </p>
          </div>
        )}

        {/* Voice Prompt */}
        <div
          style={{
            marginTop: '2rem',
            padding: '1.25rem',
            backgroundColor: '#f0f9ff',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '8px',
          }}
        >
          <p style={{ fontSize: '15px', color: '#1e40af', margin: 0, lineHeight: '1.6' }}>
            💬 <strong>Talk to me:</strong> Ask questions about your results, or say "yes" to check your current vital signs using your camera.
          </p>
        </div>
      </div>
    );
  }

  // Fallback to text display if no structured data
  return (
    <div
      style={{
        maxWidth: '800px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        marginTop: '2rem',
        textAlign: 'left',
      }}
    >
      <h3
        style={{
          fontSize: '24px',
          marginBottom: '1.5rem',
          color: '#1e293b',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '0.75rem',
        }}
      >
        📊 Report Analysis
      </h3>

      <div
        style={{
          fontSize: '15px',
          lineHeight: '1.8',
          color: '#475569',
          whiteSpace: 'pre-wrap',
        }}
      >
        {analysisText}
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f0f9ff',
          borderLeft: '4px solid #3b82f6',
          borderRadius: '4px',
        }}
      >
        <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
          💬 <strong>Continue with voice:</strong> Ask me questions about your report,
          or say "check my vitals" for a comprehensive health assessment.
        </p>
      </div>
    </div>
  );
}

function getActionText(action: string): string {
  const actionMap: Record<string, string> = {
    'rest': '🛌 Get plenty of rest and monitor your symptoms. Drink water and eat nutritious meals.',
    'monitor': '👀 Keep track of these values at home. Note any symptoms and how you feel.',
    'see_doctor': '🏥 Schedule an appointment with your doctor to discuss these results. They can provide guidance and treatment.',
    'urgent_care': '⚠️ Some values are concerning. Please seek medical attention soon - visit urgent care or call your doctor today.',
  };

  return actionMap[action] || action;
}
