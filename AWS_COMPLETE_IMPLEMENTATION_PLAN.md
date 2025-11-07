# 🏥 Complete AWS Healthcare Platform Implementation Plan

## 🎯 System Overview

Your healthcare platform will include:
1. **Voice-Controlled 3D Anatomy Navigator** (✅ Done)
2. **Patient History Management** (Database + UI)
3. **RAG System** (Medical Knowledge Base)
4. **Real-Time Video Health Analysis** (Heart Rate, Arrhythmia Detection)
5. **Multi-Tab Interface** (Anatomy, Patient Records, Video Analysis)

---

## 🏗️ Complete AWS Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────┬──────────────┬─────────────┬──────────────────┐  │
│  │ Voice UI │ 3D Anatomy   │ Patient     │ Video Analysis   │  │
│  │          │ Viewer       │ Records Tab │ Tab              │  │
│  └──────────┴──────────────┴─────────────┴──────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │  CloudFront    │
                    │  (CDN + HTTPS) │
                    └───────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼──────┐   ┌───────▼───────┐
│   API GW     │   │  WebSocket    │   │  Video WS     │
│  (REST API)  │   │  (Voice Agent)│   │  (CAIRE API)  │
└───────┬──────┘   └───────┬───────┘   └───────┬───────┘
        │                  │                   │
┌───────▼──────────────────▼───────────────────▼───────┐
│              ALB (Application Load Balancer)          │
└───────┬───────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────┐
│         ECS Fargate / EC2 (Backend Services)         │
│  ┌──────────┬──────────┬──────────┬─────────────┐   │
│  │ Voice    │ Patient  │ RAG      │ Video       │   │
│  │ Agent    │ History  │ Service  │ Proxy       │   │
│  └──────────┴──────────┴──────────┴─────────────┘   │
└────┬─────────┬──────────┬──────────┬────────────────┘
     │         │          │          │
     │         │          │          └──────────┐
     │         │          │                     │
┌────▼───┐ ┌──▼────┐ ┌───▼────┐  ┌────────────▼──────┐
│Bedrock │ │RDS/   │ │OpenSearch│  │ CAIRE Video API  │
│Claude  │ │DynamoDB│ │(Vector  │  │ ws://3.67.186... │
│        │ │       │ │Database) │  └──────────────────┘
└────────┘ └───────┘ └────────┘
```

---

## 📊 AWS Services Breakdown

### 1. **Compute & Hosting**

| Service | Purpose | Why |
|---------|---------|-----|
| **EC2 / ECS Fargate** | Backend hosting | WebSocket support, full control |
| **Lambda** | Serverless functions | Patient record CRUD, RAG queries |
| **CloudFront** | CDN for frontend | Fast global delivery, HTTPS |
| **S3** | Static hosting | Frontend build, patient files |

### 2. **Database & Storage**

| Service | Purpose | Schema |
|---------|---------|--------|
| **RDS PostgreSQL** | Patient records | Structured patient data |
| **DynamoDB** | Session data | Voice sessions, user state |
| **OpenSearch** | Vector database | RAG embeddings |
| **S3** | File storage | Medical images, videos |

### 3. **AI & ML Services**

| Service | Purpose | Use Case |
|---------|---------|----------|
| **Bedrock** | LLM (Claude 3.5) | Voice agent, diagnosis assistance |
| **Bedrock Embeddings** | Text embeddings | RAG knowledge base |
| **SageMaker** | Custom ML models | Arrhythmia detection model |
| **Rekognition** | Image analysis | Medical image processing |

### 4. **Networking & Security**

| Service | Purpose |
|---------|---------|
| **ALB** | Load balancing, WebSocket support |
| **VPC** | Private network isolation |
| **Secrets Manager** | API keys, credentials |
| **Cognito** | User authentication |
| **IAM** | Access control |

### 5. **Monitoring & Operations**

| Service | Purpose |
|---------|---------|
| **CloudWatch** | Logs, metrics, alarms |
| **X-Ray** | Distributed tracing |
| **CloudTrail** | Audit logging |

---

## 🗄️ Database Schema

### **RDS PostgreSQL Schema**

#### **Patients Table**
```sql
CREATE TABLE patients (
  patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_dob ON patients(date_of_birth);
```

#### **Medical History Table**
```sql
CREATE TABLE medical_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(patient_id),
  condition_name VARCHAR(200) NOT NULL,
  diagnosed_date DATE,
  severity VARCHAR(50), -- 'mild', 'moderate', 'severe'
  status VARCHAR(50), -- 'active', 'resolved', 'chronic'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_patient ON medical_history(patient_id);
```

#### **Vital Signs Table**
```sql
CREATE TABLE vital_signs (
  vital_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(patient_id),
  session_id UUID, -- Links to voice/video session

  -- Video health signals (from CAIRE API)
  heart_rate INTEGER,
  rppg_signal JSONB, -- Store rPPG array
  arrhythmia_detected BOOLEAN DEFAULT FALSE,
  arrhythmia_confidence FLOAT,

  -- Additional vitals
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  temperature FLOAT,
  oxygen_saturation INTEGER,

  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(50) -- 'video_analysis', 'manual', 'device'
);

CREATE INDEX idx_vitals_patient ON vital_signs(patient_id);
CREATE INDEX idx_vitals_session ON vital_signs(session_id);
CREATE INDEX idx_vitals_time ON vital_signs(recorded_at DESC);
```

#### **Voice Sessions Table**
```sql
CREATE TABLE voice_sessions (
  session_id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients(patient_id),
  transcript TEXT,
  llm_responses JSONB, -- Array of LLM interactions
  tool_actions JSONB, -- 3D navigation actions
  duration_seconds INTEGER,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE INDEX idx_sessions_patient ON voice_sessions(patient_id);
```

#### **Video Analysis Sessions Table**
```sql
CREATE TABLE video_sessions (
  video_session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(patient_id),

  -- CAIRE API data
  caire_datapt_id UUID,
  frames_analyzed INTEGER,
  duration_seconds FLOAT,

  -- Results
  avg_heart_rate FLOAT,
  heart_rate_min INTEGER,
  heart_rate_max INTEGER,
  arrhythmia_segments JSONB, -- Array of detected arrhythmia timestamps

  -- Metadata
  video_quality VARCHAR(50), -- 'good', 'fair', 'poor'
  analysis_status VARCHAR(50), -- 'in_progress', 'completed', 'failed'

  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_video_patient ON video_sessions(patient_id);
```

---

## 🧠 RAG System Implementation

### **Architecture**

```
Medical Documents → S3 → Lambda (Processing) → Bedrock Embeddings → OpenSearch
                                                                          │
User Query → Voice Agent → Bedrock Claude ← Semantic Search ←────────────┘
```

### **Implementation Steps**

#### **1. Set Up OpenSearch Domain**

```bash
aws opensearch create-domain \
  --domain-name medical-knowledge-base \
  --engine-version OpenSearch_2.11 \
  --cluster-config InstanceType=t3.small.search,InstanceCount=2 \
  --ebs-options EBSEnabled=true,VolumeType=gp3,VolumeSize=100 \
  --access-policies '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"AWS": "*"},
      "Action": "es:*",
      "Resource": "arn:aws:es:us-west-2:*:domain/medical-knowledge-base/*"
    }]
  }' \
  --region us-west-2
```

#### **2. Create Index Schema**

```json
PUT /medical_knowledge
{
  "mappings": {
    "properties": {
      "content": {"type": "text"},
      "embedding": {
        "type": "knn_vector",
        "dimension": 1536
      },
      "metadata": {
        "properties": {
          "source": {"type": "keyword"},
          "category": {"type": "keyword"},
          "title": {"type": "text"},
          "date": {"type": "date"}
        }
      }
    }
  },
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 512
    }
  }
}
```

#### **3. Document Processing Lambda**

```typescript
// backend/rag/document_processor.ts
import { S3, OpenSearch, Bedrock } from 'aws-sdk';

export async function processDocument(s3Key: string) {
  // 1. Download document from S3
  const doc = await s3.getObject({
    Bucket: 'medical-knowledge-base',
    Key: s3Key
  }).promise();

  // 2. Extract text (PDF, DOCX, etc.)
  const text = await extractText(doc.Body);

  // 3. Chunk text into segments
  const chunks = chunkText(text, 512); // 512 tokens per chunk

  // 4. Generate embeddings using Bedrock
  const embeddings = await Promise.all(
    chunks.map(chunk =>
      bedrock.invokeModel({
        modelId: 'amazon.titan-embed-text-v1',
        body: JSON.stringify({ inputText: chunk })
      }).promise()
    )
  );

  // 5. Store in OpenSearch
  await Promise.all(
    embeddings.map((embedding, i) =>
      opensearch.index({
        index: 'medical_knowledge',
        body: {
          content: chunks[i],
          embedding: embedding.embedding,
          metadata: {
            source: s3Key,
            category: extractCategory(s3Key),
            title: extractTitle(text)
          }
        }
      })
    )
  );
}
```

#### **4. RAG Retriever Service**

```typescript
// backend/rag/retriever.ts
import { OpenSearchClient } from '@opensearch-project/opensearch';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export class RAGRetriever {
  private opensearch: OpenSearchClient;
  private bedrock: BedrockRuntimeClient;

  async retrieve(query: string, topK: number = 5): Promise<Document[]> {
    // 1. Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // 2. Semantic search in OpenSearch
    const searchResults = await this.opensearch.search({
      index: 'medical_knowledge',
      body: {
        size: topK,
        query: {
          knn: {
            embedding: {
              vector: queryEmbedding,
              k: topK
            }
          }
        }
      }
    });

    // 3. Return relevant documents
    return searchResults.body.hits.hits.map(hit => ({
      id: hit._id,
      content: hit._source.content,
      metadata: hit._source.metadata,
      score: hit._score
    }));
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.bedrock.send(new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v1',
      body: JSON.stringify({ inputText: text })
    }));

    const result = JSON.parse(new TextDecoder().decode(response.body));
    return result.embedding;
  }
}
```

#### **5. Knowledge Base Sources**

Upload to S3:
- Medical textbooks (Gray's Anatomy, Harrison's Principles)
- Research papers (PubMed articles)
- Clinical guidelines (NIH, WHO)
- Drug databases (FDA drug information)
- Anatomy descriptions

---

## 🎥 Video Health Signals Integration

### **Backend Service**

```typescript
// backend/video/caire_client.ts
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

const CAIRE_API_KEY = '_gskosjmOYnzNJ_4bieNyGrJZrbpmLuYfscfFZdOHZA';
const CAIRE_WS_URL = 'ws://3.67.186.245:8003/ws/';

export class CaireVideoAnalyzer {
  private ws: WebSocket | null = null;
  private datapt_id: string;

  constructor() {
    this.datapt_id = uuidv4();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${CAIRE_WS_URL}?api_key=${CAIRE_API_KEY}`);

      this.ws.on('open', () => {
        console.log('✅ Connected to CAIRE API');
        resolve();
      });

      this.ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        this.handleResponse(response);
      });

      this.ws.on('error', reject);
    });
  }

  async sendFrame(frameData: Buffer, timestamp: number, isLast: boolean = false) {
    const payload = {
      datapt_id: this.datapt_id,
      state: isLast ? 'end' : 'stream',
      frame_data: frameData.toString('base64'),
      timestamp: timestamp.toString(),
      advanced: true // Get rPPG signals
    };

    this.ws?.send(JSON.stringify(payload));
  }

  private async handleResponse(response: any) {
    console.log('📊 Video analysis response:', response);

    // Store in database
    if (response.inference?.hr) {
      await storeVitalSigns({
        patient_id: this.currentPatientId,
        session_id: this.datapt_id,
        heart_rate: response.inference.hr,
        rppg_signal: response.advanced?.rppg,
        recorded_at: new Date(),
        source: 'video_analysis'
      });
    }

    // Check for arrhythmia
    if (response.advanced?.rppg) {
      const arrhythmia = await detectArrhythmia(response.advanced.rppg);
      if (arrhythmia.detected) {
        await storeVitalSigns({
          patient_id: this.currentPatientId,
          session_id: this.datapt_id,
          arrhythmia_detected: true,
          arrhythmia_confidence: arrhythmia.confidence,
          recorded_at: new Date()
        });

        // Alert medical staff
        await sendAlert({
          patient_id: this.currentPatientId,
          alert_type: 'arrhythmia_detected',
          severity: arrhythmia.severity
        });
      }
    }
  }
}
```

### **Arrhythmia Detection (SageMaker)**

```python
# Deploy trained model to SageMaker
import sagemaker
from sagemaker.sklearn import SKLearnModel

# Train model from notebook
model = train_arrhythmia_model()  # From CAIRE notebook

# Save model
import joblib
joblib.dump(model, 'arrhythmia_model.pkl')

# Deploy to SageMaker
sklearn_model = SKLearnModel(
    model_data='s3://my-bucket/arrhythmia_model.pkl',
    role='SageMakerRole',
    entry_point='inference.py',
    framework_version='1.0-1'
)

predictor = sklearn_model.deploy(
    instance_type='ml.t2.medium',
    initial_instance_count=1
)
```

---

## 🎨 Frontend Architecture

### **Multi-Tab React Application**

```typescript
// frontend/src/App.tsx
import { Tabs, TabList, Tab, TabPanel } from 'react-tabs';

function App() {
  return (
    <div className="app">
      <Tabs>
        <TabList>
          <Tab>🎙️ Voice & 3D Anatomy</Tab>
          <Tab>📋 Patient Records</Tab>
          <Tab>🎥 Video Health Analysis</Tab>
          <Tab>📊 Dashboard</Tab>
        </TabList>

        <TabPanel>
          {/* Existing voice + 3D viewer */}
          <VoiceAnatomy3DTab />
        </TabPanel>

        <TabPanel>
          {/* Patient history management */}
          <PatientRecordsTab />
        </TabPanel>

        <TabPanel>
          {/* Real-time video analysis */}
          <VideoHealthTab />
        </TabPanel>

        <TabPanel>
          {/* Analytics and insights */}
          <DashboardTab />
        </TabPanel>
      </Tabs>
    </div>
  );
}
```

### **Patient Records Tab**

```typescript
// frontend/src/components/PatientRecordsTab.tsx
export function PatientRecordsTab() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Patient List */}
      <div className="col-span-1">
        <PatientList
          patients={patients}
          onSelect={setSelectedPatient}
        />
      </div>

      {/* Patient Details */}
      <div className="col-span-2">
        {selectedPatient && (
          <>
            <PatientInfo patient={selectedPatient} />
            <MedicalHistory patientId={selectedPatient.id} />
            <VitalSignsChart patientId={selectedPatient.id} />
            <VoiceSessionHistory patientId={selectedPatient.id} />
          </>
        )}
      </div>
    </div>
  );
}
```

### **Video Health Analysis Tab**

```typescript
// frontend/src/components/VideoHealthTab.tsx
export function VideoHealthTab() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [heartRate, setHeartRate] = useState(null);
  const [arrhythmia, setArrhythmia] = useState(null);

  const startAnalysis = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const ws = new WebSocket('ws://your-backend/video-analysis');

    // Capture frames and send to backend
    const videoTrack = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(videoTrack);

    const intervalId = setInterval(async () => {
      const frame = await imageCapture.grabFrame();
      const canvas = document.createElement('canvas');
      canvas.width = frame.width;
      canvas.height = frame.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(frame, 0, 0);

      // Convert to JPEG base64
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      // Send to backend (which forwards to CAIRE API)
      ws.send(JSON.stringify({
        type: 'video_frame',
        frame_data: base64,
        timestamp: Date.now() / 1000
      }));
    }, 1000 / 30); // 30 FPS

    // Listen for results
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setHeartRate(data.heart_rate);
      setArrhythmia(data.arrhythmia);
    };
  };

  return (
    <div className="p-4">
      <h2>Real-Time Video Health Analysis</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Video Feed */}
        <div>
          <video id="webcam" autoPlay></video>
          <button onClick={startAnalysis}>
            {isAnalyzing ? 'Stop Analysis' : 'Start Analysis'}
          </button>
        </div>

        {/* Live Results */}
        <div>
          <HeartRateDisplay heartRate={heartRate} />
          <ArrhythmiaAlert arrhythmia={arrhythmia} />
          <RPPGWaveform />
        </div>
      </div>
    </div>
  );
}
```

---

## 📦 Complete Deployment Plan

### **Step 1: Infrastructure Setup**

```bash
# Create VPC and networking
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --vpc-id vpc-xxx --internet-gateway-id igw-xxx

# Create RDS database
aws rds create-db-instance \
  --db-instance-identifier healthcare-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username admin \
  --master-user-password 'SecurePassword123!' \
  --allocated-storage 100 \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name my-subnet-group \
  --publicly-accessible false \
  --region us-west-2

# Create OpenSearch domain (already shown above)

# Create S3 buckets
aws s3 mb s3://healthcare-frontend
aws s3 mb s3://healthcare-patient-files
aws s3 mb s3://healthcare-knowledge-base
```

### **Step 2: Deploy Backend**

```bash
# Build Docker image
cd /home/zainey/healthy_hack/backend
docker build -t healthcare-backend .

# Push to ECR
aws ecr create-repository --repository-name healthcare-backend
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 425413565951.dkr.ecr.us-west-2.amazonaws.com
docker tag healthcare-backend:latest 425413565951.dkr.ecr.us-west-2.amazonaws.com/healthcare-backend:latest
docker push 425413565951.dkr.ecr.us-west-2.amazonaws.com/healthcare-backend:latest

# Deploy to ECS Fargate
aws ecs create-cluster --cluster-name healthcare-cluster
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs create-service --cluster healthcare-cluster --service-name healthcare-service --task-definition healthcare-task --desired-count 2
```

### **Step 3: Deploy Frontend**

```bash
cd /home/zainey/healthy_hack/frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://healthcare-frontend --delete

# Create CloudFront distribution
aws cloudfront create-distribution --origin-domain-name healthcare-frontend.s3.amazonaws.com
```

### **Step 4: Set Up Databases**

```sql
-- Connect to RDS
psql -h healthcare-db.xxx.us-west-2.rds.amazonaws.com -U admin -d postgres

-- Run schema creation scripts (from Database Schema section above)
```

### **Step 5: Load Knowledge Base**

```bash
# Upload medical documents to S3
aws s3 cp medical_textbooks/ s3://healthcare-knowledge-base/textbooks/ --recursive
aws s3 cp research_papers/ s3://healthcare-knowledge-base/papers/ --recursive

# Trigger Lambda to process and create embeddings
aws lambda invoke --function-name ProcessMedicalDocuments --payload '{}'
```

---

## 💰 Cost Estimate (Monthly)

| Service | Configuration | Cost |
|---------|--------------|------|
| **ECS Fargate** | 2 tasks, 1 vCPU, 2GB RAM | $60 |
| **RDS PostgreSQL** | db.t3.medium, 100GB | $80 |
| **OpenSearch** | 2 t3.small.search instances | $140 |
| **S3** | 100GB storage, 1TB transfer | $15 |
| **CloudFront** | 1TB transfer | $85 |
| **Bedrock Claude** | 5M tokens/month | $15-75 |
| **Bedrock Embeddings** | 1M tokens | $0.10 |
| **SageMaker** | ml.t2.medium inference | $35 |
| **CloudWatch** | Logs and metrics | $20 |
| **ALB** | Load balancer | $20 |
| **Lambda** | 1M requests | $0.20 |
| **Data Transfer** | Inter-service | $30 |

**Total: ~$500-600/month**

**Cost Optimization:**
- Use Spot Instances for dev/test environments (-70%)
- Enable S3 Intelligent Tiering (-50% storage)
- Use Reserved Instances for RDS (-40%)
- Optimize with monthly cost: ~$300-350

---

## 🚀 Quick Start Implementation

### **Phase 1: Patient Records (Week 1)**
1. Set up RDS database
2. Create REST API for CRUD operations
3. Build Patient Records tab UI
4. Deploy to AWS

### **Phase 2: RAG System (Week 2)**
1. Set up OpenSearch
2. Upload medical knowledge base
3. Implement RAG retriever
4. Integrate with voice agent

### **Phase 3: Video Analysis (Week 3)**
1. Integrate CAIRE API
2. Build video analysis UI
3. Deploy arrhythmia model to SageMaker
4. Connect to patient records

### **Phase 4: Polish & Deploy (Week 4)**
1. Add analytics dashboard
2. Implement user authentication
3. Performance optimization
4. Production deployment

---

## 📝 Next Steps

1. **Review this plan** - Confirm architecture matches your vision
2. **Set up AWS account** - Ensure billing alerts are configured
3. **Start with Phase 1** - Get patient records working first
4. **Iterate incrementally** - Deploy and test each phase

---

## 📚 Additional Resources

- AWS Well-Architected Framework: https://aws.amazon.com/architecture/well-architected/
- Bedrock Documentation: https://docs.aws.amazon.com/bedrock/
- OpenSearch RAG Guide: https://opensearch.org/docs/latest/ml-commons-plugin/
- SageMaker Deployment: https://docs.aws.amazon.com/sagemaker/

---

**Ready to build the complete healthcare platform!** 🏥✨

Let me know which phase you want to start with, and I'll provide detailed implementation code!
