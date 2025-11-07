# Fixes Required for Medical Report Analysis Workflow

## Issues Identified

1. ❌ **Tabs showing instead of direct voice bot**
2. ❌ **LLM refusing medical advice** (line 98 in bedrock.ts: "Never provide actual medical diagnoses or treatment advice")
3. ❌ **No PDF upload capability**
4. ❌ **No RAG system for medical knowledge**
5. ❌ **Workflow doesn't match requirements** (should be: reports → vitals → combined analysis)

---

## Solution 1: Fix System Prompt (CRITICAL)

### Current Prompt (backend/llm/bedrock.ts:98)
```typescript
- Never provide actual medical diagnoses or treatment advice  ❌
```

### NEW Prompt (Replace lines 90-133)

```typescript
private buildSystemPrompt(): string {
  return `You are Health Helper, an AI medical assistant that helps patients understand their health data.

YOUR ROLE:
- First aid acute diagnostic assistant
- Help patients understand medical reports in simple language
- Explain complex medical terms and lab values
- Analyze uploaded reports and live vitals
- Provide actionable recommendations (rest, see doctor, urgent care)
- Be conversational, empathetic, and educational

WORKFLOW:
1. Start with: "How may I help you today?"
2. Listen to user's concern (feeling unwell, discuss reports, check vitals)
3. If reports mentioned: Ask to upload PDF
4. Offer to check live vitals via video
5. Combine data from reports + live scans
6. Explain findings in simple terms
7. Suggest next steps: rest, monitor, see doctor, or urgent care

MEDICAL REPORT ANALYSIS:
- DO analyze lab reports, imaging reports, blood tests
- DO explain what values mean in simple language
- DO compare values to normal ranges
- DO identify patterns or concerning trends
- DO suggest if values warrant doctor visit
- Example: "Your hemoglobin is 10.2 g/dL, which is below the normal range of 12-16. This suggests mild anemia. You should see your doctor to discuss treatment options like iron supplements."

VITAL SIGNS ANALYSIS:
- Analyze heart rate, blood pressure, pupil size, facial symmetry
- Explain what they indicate
- Identify if anything needs medical attention

IMPORTANT RULES:
- Keep responses conversational (100-150 words for voice)
- Use simple language, not medical jargon
- Always explain what medical terms mean
- Be honest about limitations
- Suggest professional help when needed
- Never say "I can't discuss medical reports" - that's your job!

RESPONSE FORMAT (JSON):
{
  "utterance": "Your conversational response",
  "intent": "report_analysis | vitals_check | symptom_assessment | general_help",
  "analysis": {
    "findings": ["Finding 1", "Finding 2"],
    "concerns": ["Concern 1"],
    "recommendation": "rest | monitor | see_doctor | urgent_care"
  },
  "tool_action": {
    "op": "request_pdf_upload | request_vitals_check | show_dashboard",
    "params": {}
  }
}`;
}
```

---

## Solution 2: Set Up AWS Bedrock Knowledge Bases for RAG

### What is AWS Bedrock Knowledge Base?
- Built-in RAG solution for Bedrock
- No need to build vector DB yourself
- Automatically embeds and indexes documents
- Integrates directly with Claude models

### Step-by-Step Setup

#### 1. Create S3 Bucket for Medical Knowledge
```bash
aws s3 mb s3://health-helper-medical-knowledge

# Upload medical reference documents
aws s3 cp medical_references/ s3://health-helper-medical-knowledge/ --recursive
```

#### 2. Create Knowledge Base in AWS Console

**Navigate to**: AWS Console → Bedrock → Knowledge bases → Create

**Configuration:**
```yaml
Name: health-helper-medical-kb
Description: Medical knowledge base for report analysis

Data Source:
  Type: Amazon S3
  S3 URI: s3://health-helper-medical-knowledge/

Embeddings Model:
  Provider: Amazon
  Model: amazon.titan-embed-text-v1

Vector Database:
  Type: Amazon OpenSearch Serverless (recommended)
  OR: Pinecone, Redis, pgvector

Chunking Strategy:
  Type: Fixed-size chunks
  Size: 300 tokens
  Overlap: 20%
```

#### 3. Sync Data Source
```bash
# After setup, click "Sync" in console to index documents
# Takes 5-10 minutes depending on data size
```

#### 4. Get Knowledge Base ID
```bash
aws bedrock-agent list-knowledge-bases

# Copy the knowledgeBaseId: kb-abc123def456
```

#### 5. Update Backend Code

**File: `backend/config/env.ts`**
```typescript
export const bedrockConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  modelId: process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // NEW: Knowledge Base
  knowledgeBaseId: process.env.AWS_BEDROCK_KB_ID || 'kb-abc123def456',
};
```

**File: `backend/.env`**
```bash
AWS_BEDROCK_KB_ID=kb-abc123def456
```

#### 6. Update RAG Retriever

**File: `backend/rag/retriever_bedrock.ts` (NEW FILE)**
```typescript
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { bedrockConfig } from '../config/env';

export class BedrockKnowledgeBaseRetriever {
  private client: BedrockAgentRuntimeClient;
  private knowledgeBaseId: string;

  constructor() {
    this.client = new BedrockAgentRuntimeClient({
      region: bedrockConfig.region,
      credentials: bedrockConfig.credentials,
    });
    this.knowledgeBaseId = bedrockConfig.knowledgeBaseId;
    console.log('✅ Bedrock Knowledge Base initialized');
  }

  async retrieve(query: string, maxResults: number = 5) {
    try {
      const command = new RetrieveCommand({
        knowledgeBaseId: this.knowledgeBaseId,
        retrievalQuery: {
          text: query,
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: maxResults,
          },
        },
      });

      const response = await this.client.send(command);

      return {
        documents: response.retrievalResults?.map(result => ({
          content: result.content?.text || '',
          score: result.score || 0,
          metadata: result.location || {},
        })) || [],
      };
    } catch (error) {
      console.error('❌ Knowledge Base retrieval error:', error);
      return { documents: [] };
    }
  }

  // Retrieve AND Generate (RAG in one call)
  async retrieveAndGenerate(query: string) {
    const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } =
      await import('@aws-sdk/client-bedrock-agent-runtime');

    try {
      const command = new RetrieveAndGenerateCommand({
        input: {
          text: query,
        },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId: this.knowledgeBaseId,
            modelArn: `arn:aws:bedrock:${bedrockConfig.region}::foundation-model/${bedrockConfig.modelId}`,
          },
        },
      });

      const response = await this.client.send(command);

      return {
        text: response.output?.text || '',
        citations: response.citations || [],
      };
    } catch (error) {
      console.error('❌ RetrieveAndGenerate error:', error);
      throw error;
    }
  }
}

export const kbRetriever = new BedrockKnowledgeBaseRetriever();
```

#### 7. Install Required Package
```bash
cd backend
npm install @aws-sdk/client-bedrock-agent-runtime
```

---

## Solution 3: Medical Reference Documents for RAG

### What to Upload to S3 Knowledge Base

Create these files in `medical_references/`:

**1. `lab_values_reference.md`**
```markdown
# Laboratory Test Reference Ranges

## Complete Blood Count (CBC)

### Hemoglobin
- Normal Range (Male): 13.5-17.5 g/dL
- Normal Range (Female): 12.0-16.0 g/dL
- Low (<12): Suggests anemia
- High (>18): Suggests polycythemia

### White Blood Cell Count
- Normal Range: 4,000-11,000 cells/μL
- Low (<4,000): Immunosuppression risk
- High (>11,000): Infection or inflammation

## Metabolic Panel

### Blood Glucose
- Normal (Fasting): 70-100 mg/dL
- Prediabetes: 100-125 mg/dL
- Diabetes: >126 mg/dL

### Cholesterol
- Total: <200 mg/dL (desirable)
- LDL: <100 mg/dL (optimal)
- HDL: >60 mg/dL (protective)

[Continue with all common lab values...]
```

**2. `vital_signs_reference.md`**
```markdown
# Vital Signs Normal Ranges

## Heart Rate
- Resting (Adult): 60-100 BPM
- Bradycardia: <60 BPM
- Tachycardia: >100 BPM

## Blood Pressure
- Normal: <120/80 mmHg
- Elevated: 120-129/<80 mmHg
- Hypertension Stage 1: 130-139/80-89 mmHg

## Pupil Size
- Normal: 2-4mm in light, 4-8mm in dark
- Unequal pupils (anisocoria): May indicate neurological issue
```

**3. `symptom_assessment.md`**
```markdown
# Symptom Assessment Guide

## Headache Red Flags
- Sudden, severe "thunderclap" headache → URGENT
- Headache with fever and stiff neck → Possible meningitis
- Headache after head injury → Concussion risk
- New headache in person >50 years → See doctor

## Chest Pain Assessment
- Crushing, radiating to arm/jaw → CALL 911
- Worse with exertion → See cardiologist
- Sharp, position-dependent → Possible musculoskeletal
```

**4. `medication_interactions.md`** (if relevant)

**5. `disease_information.md`** (symptoms, causes, treatments)

### Upload to S3
```bash
aws s3 sync medical_references/ s3://health-helper-medical-knowledge/
```

---

## Solution 4: Fix Workflow to Start Voice Bot Directly

### Update App.tsx

**Current:** Shows tabs after welcome screen
**Required:** Start voice bot directly

**File: `frontend/src/App.tsx`**

```typescript
// After session starts, go directly to voice interface
if (!sessionInfo) {
  return <WelcomeScreen onStart={handleStartSession} />;
}

// NEW: Show voice-first interface
return (
  <div className="app" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    {/* Header with session info */}
    <header style={{
      backgroundColor: '#1e40af',
      padding: '15px 30px',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Health Helper</h1>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          {sessionInfo.role === 'patient' ? '👤' : '👨‍⚕️'} {sessionInfo.useCase}
        </div>
      </div>
      <button onClick={handleEndSession}>End Session</button>
    </header>

    {/* Voice Interface (Full Screen) */}
    <main style={{ flex: 1, display: 'flex' }}>
      {/* 3D Anatomy (Left) */}
      <div style={{ flex: 2 }}>
        <BioDigitalViewer />
      </div>

      {/* Voice Chat (Right) */}
      <div style={{ flex: 1, borderLeft: '1px solid #ccc' }}>
        <VoiceInterface sessionId={sessionInfo.sessionId} />
      </div>
    </main>
  </div>
);
```

---

## Solution 5: Add PDF Upload Capability

### Frontend Component

**File: `frontend/src/components/PDFUploader.tsx` (NEW)**

```typescript
import React, { useState } from 'react';

interface PDFUploaderProps {
  sessionId: string;
  onUploadComplete: (analysis: any) => void;
}

export const PDFUploader: React.FC<PDFUploaderProps> = ({ sessionId, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    try {
      const response = await fetch('http://localhost:3001/api/session/upload-report', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        onUploadComplete(data.analysis);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pdf-uploader">
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload Report'}
      </button>
    </div>
  );
};
```

### Backend Endpoint

**File: `backend/routes/session.ts` (ADD)**

```typescript
import multer from 'multer';
import pdfParse from 'pdf-parse';

const upload = multer({ dest: 'uploads/' });

router.post('/upload-report', upload.single('file'), async (req, res) => {
  try {
    const { sessionId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Parse PDF
    const dataBuffer = await fs.promises.readFile(file.path);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    // Use RAG to analyze report
    const kbRetriever = new BedrockKnowledgeBaseRetriever();
    const analysis = await kbRetriever.retrieveAndGenerate(
      `Analyze this medical report and explain findings: ${text}`
    );

    // Store in database
    await sessionOrchestrator.addReportAnalysis(sessionId, {
      fileName: file.originalname,
      text,
      analysis: analysis.text,
    });

    // Clean up
    await fs.promises.unlink(file.path);

    res.json({
      success: true,
      analysis: analysis.text,
    });
  } catch (error) {
    console.error('Report upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Install dependencies:**
```bash
npm install multer pdf-parse @types/multer
```

---

## Solution 6: Combined Analysis Dashboard

### Flow
1. User uploads PDF report → RAG analyzes
2. Agent asks to check vitals → Live video analysis
3. Combine both → Generate dashboard
4. Agent discusses findings
5. Suggest action (rest/doctor/urgent)

### Backend: Combined Analysis

**File: `backend/services/sessionOrchestrator.ts` (ADD)**

```typescript
async generateCombinedAnalysis(sessionId: string): Promise<any> {
  const session = this.getActiveSession(sessionId);
  if (!session) throw new Error('Session not found');

  // Get report analysis
  const reportData = session.reportAnalysis || null;

  // Get live vitals
  const vitalsSummary = this.aggregateVitals(session.vitals);

  // Use RAG to combine and analyze
  const combinedQuery = `
    Report findings: ${reportData?.analysis || 'No report uploaded'}
    Live vitals: HR ${vitalsSummary.heartRate?.avg || 'N/A'} BPM

    Provide comprehensive analysis and recommendations.
  `;

  const kbRetriever = new BedrockKnowledgeBaseRetriever();
  const combined = await kbRetriever.retrieveAndGenerate(combinedQuery);

  return {
    report: reportData,
    vitals: vitalsSummary,
    combinedAnalysis: combined.text,
    recommendation: this.extractRecommendation(combined.text),
  };
}
```

---

## AWS Bedrock Knowledge Base - Alternative Options

### Option 1: Amazon Bedrock Knowledge Bases (RECOMMENDED)
**Pros:**
- Fully managed, no infrastructure
- Direct integration with Claude
- Auto-embedding and indexing
- Pay only for queries
- Easy to set up

**Cost:** ~$0.10 per 1000 queries

### Option 2: Amazon Kendra (Medical-Specific)
**Pros:**
- Healthcare-specific search
- HIPAA compliant
- Medical terminology understanding
- Excellent for clinical documents

**Cost:** ~$810/month (enterprise edition)

### Option 3: OpenSearch with Medical Embeddings
**Pros:**
- Full control
- Custom embedding models
- Can use Bio_ClinicalBERT for medical embeddings

**Cost:** ~$20-50/month (OpenSearch Serverless)

### Recommendation
Use **Bedrock Knowledge Bases** for your MVP - it's the easiest and most cost-effective.

---

## Implementation Checklist

### Immediate Fixes (1-2 hours)
- [ ] Update system prompt in `backend/llm/bedrock.ts`
- [ ] Update App.tsx to show voice bot directly (no tabs)
- [ ] Test new prompt behavior

### RAG Setup (2-3 hours)
- [ ] Create S3 bucket for medical knowledge
- [ ] Create medical reference documents
- [ ] Set up Bedrock Knowledge Base in AWS Console
- [ ] Install `@aws-sdk/client-bedrock-agent-runtime`
- [ ] Create `backend/rag/retriever_bedrock.ts`
- [ ] Update `.env` with Knowledge Base ID
- [ ] Test retrieval

### PDF Upload (2-3 hours)
- [ ] Create PDFUploader component
- [ ] Add upload endpoint to backend
- [ ] Install multer and pdf-parse
- [ ] Integrate with session orchestrator
- [ ] Test upload and analysis

### Combined Analysis (1-2 hours)
- [ ] Add combined analysis function
- [ ] Create dashboard component
- [ ] Test end-to-end workflow

**Total Time:** 6-10 hours

---

## Testing the New Workflow

### Test Case 1: Report Analysis
1. Start session as patient
2. Say: "I want to discuss my lab results"
3. Agent should ask to upload PDF
4. Upload blood test PDF
5. Agent should explain findings in simple terms
6. NO "I can't discuss medical reports" message

### Test Case 2: Combined Analysis
1. Upload report
2. Agent asks: "Would you like me to check your vital signs?"
3. Say "Yes"
4. Video vitals collection happens
5. Agent combines report + vitals
6. Provides recommendation: rest/monitor/see doctor

### Expected Behavior
- ✅ Agent discusses reports freely
- ✅ Explains medical terms
- ✅ Provides actionable advice
- ✅ Natural conversation flow
- ✅ No refusals or limitations

---

## Summary

**Root Cause:** System prompt line 98 prohibits medical advice

**Solution:** New prompt that explicitly allows report analysis

**RAG:** AWS Bedrock Knowledge Bases for medical knowledge

**Workflow:** Welcome → Voice bot → Upload → Vitals → Analysis → Recommendation

**Cost:** ~$0.10 per 1000 RAG queries (very affordable for MVP)

Ready to implement? Let me know which part to start with!
