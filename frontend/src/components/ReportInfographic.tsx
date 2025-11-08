/**
 * Report Infographic Component
 * Visual display of medical report analysis with charts and infographics
 */

interface LabValue {
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: 'normal' | 'low' | 'high';
  rawText: string;
}

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

// Parse lab value from text like "Hemoglobin 14.5 g/dL - NORMAL (12-16)"
function parseLabValue(text: string): LabValue | null {
  // Try to extract: name, value, unit, range
  const patterns = [
    // Pattern: "Hemoglobin 14.5 g/dL - NORMAL (12-16)"
    /^(.+?)\s+([\d.]+)\s*([a-zA-Z/%µ]+(?:\/[a-zA-Z]+)?)\s*-\s*(NORMAL|HIGH|LOW|ELEVATED|DECREASED)\s*\(.*?([\d.]+)\s*-\s*([\d.]+)/i,
    // Pattern: "WBC 7200 /uL - NORMAL (4500-11000)" (no space before unit)
    /^(.+?)\s+([\d.]+)\s*([\/a-zA-Z%µ]+)\s*-\s*(NORMAL|HIGH|LOW|ELEVATED|DECREASED)\s*\(.*?([\d.]+)\s*-\s*([\d.]+)/i,
    // Pattern with < or > in range: "Cholesterol 240 mg/dL - HIGH (<200)"
    /^(.+?)\s+([\d.]+)\s*([a-zA-Z/%µ]+(?:\/[a-zA-Z]+)?)\s*-\s*(NORMAL|HIGH|LOW|ELEVATED|DECREASED)\s*\(.*?[<>]?\s*([\d.]+)\s*-?\s*([\d.]+)?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const [, name, valueStr, unit, statusText, minStr, maxStr] = match;
      const value = parseFloat(valueStr);
      let min = parseFloat(minStr);
      let max = maxStr ? parseFloat(maxStr) : min * 2; // If only one number, assume it's max and estimate min

      // If only one value in range (like <200), use it as max and set min to 0
      if (!maxStr || isNaN(max)) {
        max = min;
        min = 0;
      }

      let status: 'normal' | 'low' | 'high' = 'normal';
      if (statusText.match(/HIGH|ELEVATED/i)) status = 'high';
      else if (statusText.match(/LOW|DECREASED/i)) status = 'low';

      // Validate we got valid numbers
      if (!isNaN(value) && !isNaN(min) && !isNaN(max)) {
        return { name: name.trim(), value, unit: unit.trim(), min, max, status, rawText: text };
      }
    }
  }

  return null;
}

// Render a single lab value as a visual chart
function LabValueChart({ labValue }: { labValue: LabValue }) {
  const { name, value, unit, min, max, status } = labValue;

  // Calculate percentage position within range
  const range = max - min;
  const percentage = Math.min(Math.max(((value - min) / range) * 100, 0), 100);

  // Determine colors
  const barColor = status === 'normal' ? '#10b981' : status === 'high' ? '#ef4444' : '#f59e0b';
  const bgColor = status === 'normal' ? '#d1fae5' : status === 'high' ? '#fee2e2' : '#fef3c7';

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '1rem',
      marginBottom: '0.75rem',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      borderLeft: `4px solid ${barColor}`
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>{name}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '0.15rem' }}>
            Range: {min} - {max} {unit}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: barColor }}>
            {value}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{unit}</div>
        </div>
      </div>

      {/* Visual Bar Chart */}
      <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
        {/* Background bar */}
        <div style={{
          height: '24px',
          backgroundColor: bgColor,
          borderRadius: '6px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Normal range indicator (green zone) */}
          <div style={{
            position: 'absolute',
            left: '0%',
            width: '100%',
            height: '100%',
            background: `linear-gradient(90deg,
              rgba(239,68,68,0.2) 0%,
              rgba(16,185,129,0.3) 5%,
              rgba(16,185,129,0.3) 95%,
              rgba(239,68,68,0.2) 100%)`
          }} />

          {/* Value marker */}
          <div style={{
            position: 'absolute',
            left: `${percentage}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '3px',
            height: '30px',
            backgroundColor: barColor,
            borderRadius: '2px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
          }} />

          {/* Value circle */}
          <div style={{
            position: 'absolute',
            left: `${percentage}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            backgroundColor: barColor,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
          }} />
        </div>

        {/* Range labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '10px', color: '#94a3b8' }}>
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'inline-block',
        padding: '0.2rem 0.6rem',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: '600',
        backgroundColor: bgColor,
        color: barColor,
        textTransform: 'uppercase'
      }}>
        {status === 'normal' ? '✓ Normal' : status === 'high' ? '↑ High' : '↓ Low'}
      </div>
    </div>
  );
}

export function ReportInfographic({ analysisText }: ReportInfographicProps) {
  // Try to parse JSON from analysis text
  let reportData: ReportData | null = null;

  console.log('📊 ReportInfographic received:', analysisText?.substring(0, 200));

  try {
    // Remove markdown code block markers if present
    let cleanText = analysisText.trim();

    // Remove ```json ... ``` markers
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/g, '');

    // Try to extract JSON from text
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      console.log('📊 Found JSON:', jsonStr.substring(0, 200));
      reportData = JSON.parse(jsonStr);
      console.log('📊 Parsed report data:', reportData);

      // Validate that we have the expected structure
      if (!reportData?.findings) {
        console.warn('⚠️ Report data missing "findings" field');
        reportData = null;
      }
    } else {
      console.warn('⚠️ No JSON object found in analysis text');
    }
  } catch (e) {
    console.error('❌ Could not parse report JSON:', e);
    console.log('Raw text:', analysisText);
  }

  // If we have structured data, show infographic
  if (reportData?.findings) {
    const normalCount = reportData.findings.normal?.length || 0;
    const abnormalCount = reportData.findings.abnormal?.length || 0;
    const totalCount = normalCount + abnormalCount;
    const healthScore = totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : 0;

    // Parse all lab values from normal and abnormal findings
    const allLabValues: LabValue[] = [];
    const unparsedValues: string[] = [];

    [...(reportData.findings.normal || []), ...(reportData.findings.abnormal || [])].forEach(text => {
      const parsed = parseLabValue(text);
      if (parsed) {
        allLabValues.push(parsed);
      } else {
        unparsedValues.push(text);
      }
    });

    // Sort: abnormal first, then normal
    allLabValues.sort((a, b) => {
      if (a.status !== 'normal' && b.status === 'normal') return -1;
      if (a.status === 'normal' && b.status !== 'normal') return 1;
      return 0;
    });

    return (
      <div
        style={{
          maxWidth: '900px',
          width: '100%',
          backgroundColor: '#f8fafc',
          borderRadius: '16px',
          padding: '0',
          marginBottom: '1rem',
          overflow: 'hidden',
        }}
      >
        {/* Header with gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '1.5rem',
          color: 'white'
        }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>
            Your Health Report
          </h3>
          {reportData.report_type && (
            <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
              {reportData.report_type}
            </p>
          )}
        </div>

        {/* Main content area */}
        <div style={{ padding: '1.5rem' }}>

        {/* Health Score Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            background: healthScore >= 70 ? 'linear-gradient(135deg, #10b981, #059669)' :
                       healthScore >= 50 ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                       'linear-gradient(135deg, #ef4444, #dc2626)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem'
          }}>
            {healthScore}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '0.75rem' }}>
            Health Score
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '13px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{normalCount}</div>
              <div style={{ color: '#64748b' }}>Normal</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>{abnormalCount}</div>
              <div style={{ color: '#64748b' }}>Needs Attention</div>
            </div>
          </div>
        </div>

        {/* Voice prompt - no text explanation shown */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderLeft: '4px solid #667eea',
            textAlign: 'center'
          }}
        >
          <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
            💬 <strong>Listen to me explain your results</strong> - I'll walk you through each value
          </p>
        </div>

        {/* Lab Values with Visual Charts */}
        {allLabValues.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '0.75rem',
            }}>
              📊 Lab Results ({allLabValues.length} values)
            </h4>
            {allLabValues.map((labValue, idx) => (
              <LabValueChart key={idx} labValue={labValue} />
            ))}
          </div>
        )}

        {/* Unparsed values (if any) - shown as simple list */}
        {unparsedValues.length > 0 && (
          <details style={{ marginBottom: '2rem' }}>
            <summary style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#64748b',
              cursor: 'pointer',
              padding: '1rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              listStyle: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              Additional notes ({unparsedValues.length})
            </summary>
            <div style={{
              marginTop: '1rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {unparsedValues.map((value, idx) => (
                <div key={idx} style={{
                  padding: '0.5rem 0',
                  fontSize: '13px',
                  color: '#475569',
                  borderBottom: idx < unparsedValues.length - 1 ? '1px solid #e2e8f0' : 'none'
                }}>
                  • {value}
                </div>
              ))}
            </div>
          </details>
        )}


        {/* Action Recommendation */}
        {reportData.findings.action && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '1rem',
            marginTop: '1rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #f59e0b'
          }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '16px' }}>📋</span> Recommended Action
            </h4>
            <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
              {getActionText(reportData.findings.action)}
            </p>
          </div>
        )}

        {/* Voice Prompt */}
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          borderLeft: '4px solid #667eea'
        }}>
          <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
            💬 <strong>Continue with voice:</strong> Ask questions about your results, or say "yes" to check your vital signs using your camera.
          </p>
        </div>
        </div>
      </div>
    );
  }

  // Fallback: Check if it's raw JSON being displayed
  const isRawJSON = analysisText.trim().startsWith('{') && analysisText.includes('"findings"');

  if (isRawJSON) {
    // Try one more time to parse it directly as JSON
    try {
      const directParse = JSON.parse(analysisText);
      if (directParse?.findings) {
        // Recursively call this component with the parsed data
        return <ReportInfographic analysisText={JSON.stringify(directParse)} />;
      }
    } catch (e) {
      console.error('Failed to parse raw JSON:', e);
    }
  }

  // Fallback: Show error message instead of raw JSON
  return (
    <div style={{
      maxWidth: '800px',
      width: '100%',
      backgroundColor: '#f8fafc',
      borderRadius: '20px',
      padding: '0',
      marginTop: '2rem',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem 2.5rem',
        color: 'white'
      }}>
        <h3 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
          Report Analysis
        </h3>
      </div>

      {/* Content */}
      <div style={{ padding: '2.5rem' }}>
        {isRawJSON ? (
          // Show error for raw JSON - with automatic expansion for debugging
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</div>
              <h4 style={{ fontSize: '20px', color: '#ef4444', marginBottom: '1rem' }}>
                Unable to Display Report Charts
              </h4>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                The report analysis couldn't be formatted as charts. The data structure is missing or incorrect.
              </p>
            </div>

            {/* Always show the raw data for debugging */}
            <div style={{ marginTop: '1rem', textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                📋 Raw Analysis Data:
              </div>
              <pre style={{
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#475569',
                overflow: 'auto',
                maxHeight: '400px',
                border: '1px solid #e2e8f0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {analysisText}
              </pre>
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
              💡 <strong>Tip:</strong> Check the backend logs for LLM response format. The response should have a "findings" field with "normal" and "abnormal" arrays.
            </div>
          </div>
        ) : (
          // Show normal text analysis
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            marginBottom: '2rem',
          }}>
            <div style={{
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#475569',
              whiteSpace: 'pre-wrap',
            }}>
              {analysisText}
            </div>
          </div>
        )}

        <div style={{
          padding: '1.25rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          borderLeft: '4px solid #667eea'
        }}>
          <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: '1.6' }}>
            💬 <strong>Continue with voice:</strong> Ask me questions about your report,
            or say "yes" to check your vital signs.
          </p>
        </div>
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
