# 🏗️ Health Helper - AWS Architecture Block Diagram

## High-Level Architecture Overview

```mermaid
graph TB
    subgraph "User Devices"
        USER[👤 Patient/Doctor<br/>Web Browser]
        MOBILE[📱 Mobile Device]
    end

    subgraph "AWS Global CDN"
        CF[☁️ CloudFront CDN<br/>Global Edge Locations<br/>HTTPS/SSL]
    end

    subgraph "AWS Frontend - S3 Static Hosting"
        S3_FRONTEND[📦 S3 Bucket<br/>React SPA<br/>Static Assets]
    end

    subgraph "AWS Security & DNS"
        R53[🌐 Route 53<br/>DNS Management<br/>Health Checks]
        ACM[🔐 Certificate Manager<br/>SSL/TLS Certificates]
        WAF[🛡️ WAF<br/>Web Application Firewall<br/>DDoS Protection]
    end

    subgraph "AWS Load Balancing"
        ALB[⚖️ Application Load Balancer<br/>Multi-AZ<br/>WebSocket Support<br/>Health Checks]
    end

    subgraph "AWS Backend - Elastic Beanstalk"
        subgraph "Availability Zone 1"
            EC2_1A[🖥️ EC2 Instance<br/>Node.js Backend<br/>t3.small]
            EC2_1B[🖥️ EC2 Instance<br/>Node.js Backend<br/>t3.small]
        end

        subgraph "Availability Zone 2"
            EC2_2A[🖥️ EC2 Instance<br/>Node.js Backend<br/>t3.small]
            EC2_2B[🖥️ EC2 Instance<br/>Node.js Backend<br/>t3.small]
        end

        ASG[📊 Auto Scaling Group<br/>Min: 2, Max: 20<br/>CPU-based scaling]
    end

    subgraph "AWS AI Services"
        BEDROCK[🤖 AWS Bedrock<br/>Claude 3.5 Sonnet<br/>Serverless LLM]
        BEDROCK_KB[📚 Bedrock Knowledge Base<br/>Vector Database<br/>Medical RAG]
    end

    subgraph "AWS Database - Multi-AZ"
        RDS_PRIMARY[🗄️ RDS PostgreSQL<br/>Primary Instance<br/>us-west-2a]
        RDS_STANDBY[🗄️ RDS PostgreSQL<br/>Standby Instance<br/>us-west-2b<br/>Automatic Failover]
        RDS_REPLICA[📖 Read Replica<br/>Analytics Queries]
    end

    subgraph "AWS Storage"
        S3_REPORTS[📄 S3 Bucket<br/>Medical Reports<br/>PDF/Images<br/>Encrypted]
        S3_BACKUPS[💾 S3 Bucket<br/>Database Backups<br/>Versioned]
    end

    subgraph "AWS Secrets & Config"
        SECRETS[🔑 Secrets Manager<br/>API Keys<br/>Deepgram, Cartesia<br/>Auto-rotation]
        IAM[👥 IAM Roles<br/>EC2 Instance Profile<br/>Service Permissions]
    end

    subgraph "AWS Monitoring"
        CW_METRICS[📊 CloudWatch Metrics<br/>CPU, Memory, Latency]
        CW_LOGS[📝 CloudWatch Logs<br/>Application Logs<br/>Error Tracking]
        CW_ALARMS[🚨 CloudWatch Alarms<br/>Auto-scaling Triggers<br/>Alert SNS]
    end

    subgraph "External APIs"
        DEEPGRAM[🎤 Deepgram API<br/>Real-time STT<br/>Medical Terminology]
        CARTESIA[🔊 Cartesia TTS<br/>Natural Voice<br/>PCM16 Audio]
        CAIRE[📹 CAIRE API<br/>Heart Rate Detection<br/>rPPG Signals]
    end

    %% User to Frontend
    USER --> CF
    MOBILE --> CF
    CF --> S3_FRONTEND

    %% DNS and Security
    R53 --> CF
    ACM --> CF
    WAF --> ALB

    %% Frontend to Backend
    CF -.WebSocket.-> ALB
    S3_FRONTEND -.API Calls.-> ALB

    %% Load Balancer to EC2
    ALB --> EC2_1A
    ALB --> EC2_1B
    ALB --> EC2_2A
    ALB --> EC2_2B

    %% Auto Scaling
    ASG -.Manages.-> EC2_1A
    ASG -.Manages.-> EC2_1B
    ASG -.Manages.-> EC2_2A
    ASG -.Manages.-> EC2_2B

    %% EC2 to AI Services
    EC2_1A --> BEDROCK
    EC2_1B --> BEDROCK
    EC2_2A --> BEDROCK
    EC2_2B --> BEDROCK
    EC2_1A --> BEDROCK_KB

    %% EC2 to Database
    EC2_1A --> RDS_PRIMARY
    EC2_1B --> RDS_PRIMARY
    EC2_2A --> RDS_PRIMARY
    EC2_2B --> RDS_PRIMARY
    RDS_PRIMARY -.Replication.-> RDS_STANDBY
    RDS_PRIMARY -.Async Replication.-> RDS_REPLICA

    %% EC2 to Storage
    EC2_1A --> S3_REPORTS
    EC2_1B --> S3_REPORTS
    RDS_PRIMARY -.Backup.-> S3_BACKUPS

    %% EC2 to Secrets
    EC2_1A --> SECRETS
    EC2_1B --> SECRETS
    IAM -.Authorize.-> EC2_1A
    IAM -.Authorize.-> EC2_1B

    %% EC2 to External APIs
    EC2_1A --> DEEPGRAM
    EC2_1A --> CARTESIA
    EC2_1A --> CAIRE

    %% Monitoring
    EC2_1A --> CW_METRICS
    EC2_1A --> CW_LOGS
    CW_METRICS --> CW_ALARMS
    CW_ALARMS -.Trigger.-> ASG

    style USER fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style MOBILE fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style CF fill:#FF9900,stroke:#CC7A00,color:#fff
    style S3_FRONTEND fill:#569A31,stroke:#3D6D23,color:#fff
    style ALB fill:#FF9900,stroke:#CC7A00,color:#fff
    style EC2_1A fill:#FF9900,stroke:#CC7A00,color:#fff
    style EC2_1B fill:#FF9900,stroke:#CC7A00,color:#fff
    style EC2_2A fill:#FF9900,stroke:#CC7A00,color:#fff
    style EC2_2B fill:#FF9900,stroke:#CC7A00,color:#fff
    style BEDROCK fill:#9D5025,stroke:#6B3718,color:#fff
    style RDS_PRIMARY fill:#527FFF,stroke:#3A59B3,color:#fff
    style RDS_STANDBY fill:#527FFF,stroke:#3A59B3,color:#fff
    style S3_REPORTS fill:#569A31,stroke:#3D6D23,color:#fff
    style SECRETS fill:#DD344C,stroke:#9A2435,color:#fff
    style CW_METRICS fill:#FF9900,stroke:#CC7A00,color:#fff
    style DEEPGRAM fill:#13EF93,stroke:#0EAB6D,color:#000
    style CARTESIA fill:#A78BFA,stroke:#7C3AED,color:#fff
```

---

## Simplified Data Flow Diagram

```mermaid
sequenceDiagram
    participant User as 👤 User Browser
    participant CF as ☁️ CloudFront
    participant ALB as ⚖️ Load Balancer
    participant EC2 as 🖥️ EC2 Backend
    participant Bedrock as 🤖 Bedrock AI
    participant RDS as 🗄️ PostgreSQL
    participant S3 as 📄 S3 Storage
    participant Deepgram as 🎤 Deepgram STT
    participant Cartesia as 🔊 Cartesia TTS

    User->>CF: 1. Load React App
    CF->>User: Return HTML/JS/CSS

    User->>ALB: 2. WebSocket Connect
    ALB->>EC2: Route to Backend
    EC2->>User: WebSocket Connected

    User->>EC2: 3. Stream Audio (PCM16)
    EC2->>Deepgram: Real-time Transcription
    Deepgram->>EC2: Transcript Text

    EC2->>Bedrock: 4. Generate AI Response
    Bedrock->>EC2: LLM Response JSON

    EC2->>RDS: 5. Save Session Data
    RDS->>EC2: Confirmation

    EC2->>Cartesia: 6. Text-to-Speech
    Cartesia->>EC2: Audio Buffer

    EC2->>User: 7. Stream Audio Response

    Note over User,EC2: Report Upload Flow
    User->>ALB: 8. Upload PDF Report
    ALB->>EC2: Forward Upload
    EC2->>S3: Store PDF
    S3->>EC2: File URL
    EC2->>Bedrock: Analyze Report
    Bedrock->>EC2: Analysis Results
    EC2->>User: Display Findings
```

---

## Network Architecture - VPC Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AWS Region: us-west-2                       │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    VPC (10.0.0.0/16)                          │ │
│  │                                                               │ │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐   │ │
│  │  │  Availability Zone 2a   │  │  Availability Zone 2b   │   │ │
│  │  │                         │  │                         │   │ │
│  │  │  ┌──────────────────┐   │  │  ┌──────────────────┐   │   │ │
│  │  │  │ Public Subnet    │   │  │  │ Public Subnet    │   │   │ │
│  │  │  │ 10.0.1.0/24      │   │  │  │ 10.0.2.0/24      │   │   │ │
│  │  │  │                  │   │  │  │                  │   │   │ │
│  │  │  │ ┌──────────────┐ │   │  │  │ ┌──────────────┐ │   │   │ │
│  │  │  │ │ ALB (public) │ │   │  │  │ │ ALB (public) │ │   │   │ │
│  │  │  │ └──────────────┘ │   │  │  │ └──────────────┘ │   │   │ │
│  │  │  │ ┌──────────────┐ │   │  │  │ ┌──────────────┐ │   │   │ │
│  │  │  │ │ NAT Gateway  │ │   │  │  │ │ NAT Gateway  │ │   │   │ │
│  │  │  │ └──────────────┘ │   │  │  │ └──────────────┘ │   │   │ │
│  │  │  └──────────────────┘   │  │  └──────────────────┘   │   │ │
│  │  │                         │  │                         │   │ │
│  │  │  ┌──────────────────┐   │  │  ┌──────────────────┐   │   │ │
│  │  │  │ Private Subnet   │   │  │  │ Private Subnet   │   │   │ │
│  │  │  │ 10.0.11.0/24     │   │  │  │ 10.0.12.0/24     │   │   │ │
│  │  │  │                  │   │  │  │                  │   │   │ │
│  │  │  │ ┌──────────────┐ │   │  │  │ ┌──────────────┐ │   │   │ │
│  │  │  │ │   EC2 x2     │ │   │  │  │ │   EC2 x2     │ │   │   │ │
│  │  │  │ │  (Backend)   │ │   │  │  │ │  (Backend)   │ │   │   │ │
│  │  │  │ └──────────────┘ │   │  │  │ └──────────────┘ │   │   │ │
│  │  │  └──────────────────┘   │  │  └──────────────────┘   │   │ │
│  │  │                         │  │                         │   │ │
│  │  │  ┌──────────────────┐   │  │  ┌──────────────────┐   │   │ │
│  │  │  │ Database Subnet  │   │  │  │ Database Subnet  │   │   │ │
│  │  │  │ 10.0.21.0/24     │   │  │  │ 10.0.22.0/24     │   │   │ │
│  │  │  │                  │   │  │  │                  │   │   │ │
│  │  │  │ ┌──────────────┐ │   │  │  │ ┌──────────────┐ │   │   │ │
│  │  │  │ │ RDS Primary  │ │   │  │  │ │ RDS Standby  │ │   │   │ │
│  │  │  │ └──────────────┘ │   │  │  │ └──────────────┘ │   │   │ │
│  │  │  └──────────────────┘   │  │  └──────────────────┘   │   │ │
│  │  └─────────────────────────┘  └─────────────────────────┘   │ │
│  │                                                               │ │
│  │  Internet Gateway ←→ Public Subnets                          │ │
│  │  NAT Gateway ←→ Private Subnets (outbound only)              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  External Services (AWS Managed - Outside VPC)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Bedrock    │  │      S3      │  │   Secrets    │            │
│  │   (AI/ML)    │  │   Storage    │  │   Manager    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────────────┘

External APIs (Outside AWS):
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Deepgram   │  │   Cartesia   │  │  CAIRE API   │
│  (STT/ASR)   │  │    (TTS)     │  │ (Heart Rate) │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Component Interaction Matrix

| Component | Connects To | Protocol | Purpose |
|-----------|------------|----------|---------|
| **CloudFront** | S3 Frontend | HTTPS | Serve React app |
| **CloudFront** | ALB | WSS/HTTPS | Proxy API/WebSocket |
| **ALB** | EC2 Instances | HTTP/WS | Route traffic |
| **EC2** | Bedrock | HTTPS | AI inference |
| **EC2** | RDS | PostgreSQL | Data persistence |
| **EC2** | S3 Reports | HTTPS | Store/retrieve PDFs |
| **EC2** | Secrets Manager | HTTPS | Get API keys |
| **EC2** | Deepgram | WSS | Real-time STT |
| **EC2** | Cartesia | HTTPS | TTS generation |
| **EC2** | CAIRE | WSS | Video vitals |
| **EC2** | CloudWatch | HTTPS | Logs/metrics |
| **RDS Primary** | RDS Standby | PostgreSQL | Sync replication |
| **Auto Scaling** | CloudWatch | HTTPS | Scale triggers |

---

## Security Flow - IAM Roles & Permissions

```
┌─────────────────────────────────────────────────────────────┐
│                   IAM Role: EC2-Backend-Role                │
│                                                             │
│  Permissions:                                               │
│  ✓ Bedrock: InvokeModel, InvokeModelWithResponseStream     │
│  ✓ S3: GetObject, PutObject (reports bucket)               │
│  ✓ RDS: Connect (IAM authentication)                        │
│  ✓ Secrets Manager: GetSecretValue                         │
│  ✓ CloudWatch: PutMetricData, PutLogEvents                 │
│  ✗ No admin permissions                                     │
│  ✗ No cross-account access                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  EC2 Instances (Auto Scaling Group)  │
        │  Assume role automatically           │
        └──────────────────────────────────────┘
```

---

## Monitoring Dashboard - CloudWatch Metrics

```
┌────────────────────────────────────────────────────────────────┐
│              Health Helper - CloudWatch Dashboard              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  EC2 Metrics:                    │  Application Metrics:       │
│  ─────────────                   │  ────────────────────       │
│  • CPU Utilization: 45%          │  • Active Sessions: 127     │
│  • Memory Usage: 62%             │  • AI Requests/min: 340     │
│  • Network In: 12 MB/s           │  • Avg Response Time: 1.8s  │
│  • Healthy Instances: 4/4        │  • Heart Rate Scans: 23     │
│                                  │  • Reports Analyzed: 56     │
│  RDS Metrics:                    │                             │
│  ─────────────                   │  Error Metrics:             │
│  • Connections: 45/100           │  • 5xx Errors: 0.02%        │
│  • Read IOPS: 234                │  • Failed AI Calls: 2       │
│  • Write IOPS: 89                │  • WebSocket Drops: 0       │
│  • Replication Lag: 0.3s         │                             │
│                                                                │
│  Alarms:                                                       │
│  🟢 All Systems Operational                                    │
│  🟡 High CPU (>80%) - Ready to scale                          │
│  🔴 Critical Errors - None                                     │
└────────────────────────────────────────────────────────────────┘
```

---

## Cost Breakdown by Service (Monthly)

```
┌─────────────────────────────────────────────────────────┐
│         AWS Service Cost Allocation (10K Users)         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  EC2 (4x t3.small)              │ ████████░░  $120     │
│  RDS PostgreSQL (Multi-AZ)      │ ██████████  $180     │
│  Elastic Beanstalk              │ ░░░░░░░░░░  $0       │
│  S3 Storage (100GB)             │ ██░░░░░░░░  $25      │
│  CloudFront (1TB transfer)      │ ████░░░░░░  $85      │
│  ALB (Load Balancer)            │ ███░░░░░░░  $50      │
│  Bedrock (Claude 3.5)           │ ████░░░░░░  $90      │
│  CloudWatch (Logs + Metrics)    │ ██░░░░░░░░  $30      │
│  Secrets Manager                │ █░░░░░░░░░  $10      │
│  Data Transfer                  │ ███░░░░░░░  $60      │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Total:                                        $650/mo  │
│                                                         │
│  Cost per user: $0.065/month                           │
│  Cost per session: ~$0.008                             │
└─────────────────────────────────────────────────────────┘
```

---

## Scalability Tiers

```
┌──────────────┬─────────────┬─────────────┬─────────────┐
│ Tier         │ Development │ Production  │ Enterprise  │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Users        │ <100        │ 10,000      │ 100,000+    │
│ EC2 Count    │ 2           │ 4-8         │ 20-50       │
│ RDS Size     │ db.t3.micro │ db.m5.large │ db.r5.xlarge│
│ Multi-AZ     │ No          │ Yes         │ Yes         │
│ Multi-Region │ No          │ No          │ Yes         │
│ Cost/Month   │ $80         │ $650        │ $4,500      │
└──────────────┴─────────────┴─────────────┴─────────────┘
```

---

**🎯 Key Architecture Benefits:**

✅ **High Availability**: Multi-AZ deployment with auto-failover
✅ **Auto-Scaling**: Handles 10x traffic spikes automatically
✅ **Global Performance**: CloudFront CDN for <50ms latency
✅ **Security**: Encrypted at rest (S3, RDS) and in transit (TLS)
✅ **Cost Optimized**: Pay only for actual usage
✅ **HIPAA Compliant**: All services support BAA agreements
✅ **Zero Downtime**: Rolling deployments via Elastic Beanstalk
✅ **Disaster Recovery**: Automated backups to S3 with versioning

