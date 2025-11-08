# 🚀 AWS Scalable Architecture - Health Helper App

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS / CLIENTS                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  AWS CloudFront (CDN) - Global Edge Locations                   │
│  - HTTPS/WSS Termination                                        │
│  - DDoS Protection (AWS Shield Standard)                        │
│  - Web Application Firewall (WAF)                               │
└─────────────┬────────────────────────────┬──────────────────────┘
              │                            │
              │ Static Content             │ API/WebSocket
              ▼                            ▼
┌─────────────────────────┐   ┌──────────────────────────────────┐
│  AWS S3 Bucket          │   │  Application Load Balancer (ALB) │
│  - Frontend (React)     │   │  - Health Checks                 │
│  - PDFs/Uploads         │   │  - Path-based Routing            │
│  - Versioning Enabled   │   │  - WebSocket Support             │
└─────────────────────────┘   └─────────────┬────────────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────────────┐
                              │  AWS ECS Fargate (Auto Scaling)  │
                              │  - Backend Containers (Node.js)  │
                              │  - Task Definition               │
                              │  - Service Auto Scaling          │
                              │  - Min: 2, Max: 10 tasks         │
                              └─────────────┬────────────────────┘
                                            │
                     ┌──────────────────────┼──────────────────────┐
                     │                      │                      │
                     ▼                      ▼                      ▼
         ┌─────────────────────┐  ┌──────────────────┐  ┌────────────────┐
         │  Amazon RDS          │  │  AWS Bedrock     │  │  AWS Polly     │
         │  - SQLite → Aurora   │  │  - Claude 3.5    │  │  - TTS         │
         │  - Multi-AZ          │  │  - Sonnet        │  │                │
         │  - Read Replicas     │  └──────────────────┘  └────────────────┘
         └─────────────────────┘            │
                                            ▼
                                   ┌──────────────────┐
                                   │  Amazon Bedrock  │
                                   │  Knowledge Base  │
                                   │  - Medical RAG   │
                                   │  - S3 + Vector   │
                                   └──────────────────┘
```

---

## 🎯 AWS Services Used

### **1. Frontend Layer**
- **AWS S3** - Static website hosting for React frontend
- **AWS CloudFront** - CDN for global low-latency delivery
- **AWS Route 53** - DNS management and routing

### **2. Backend Layer**
- **AWS ECS Fargate** - Serverless container orchestration
- **Application Load Balancer (ALB)** - Traffic distribution, health checks
- **AWS ECR** - Container image registry
- **AWS Auto Scaling** - Automatic capacity management

### **3. AI/ML Services**
- **AWS Bedrock** - Claude 3.5 Sonnet LLM
- **AWS Bedrock Knowledge Base** - RAG for medical information
- **Amazon Polly** - Text-to-speech
- **Amazon Transcribe** - Speech-to-text (replacing Deepgram)

### **4. Data Layer**
- **Amazon RDS Aurora Serverless v2** - PostgreSQL database (replacing SQLite)
- **Amazon S3** - File storage (PDF uploads, medical reports)
- **Amazon ElastiCache (Redis)** - Session management and caching

### **5. Monitoring & Logging**
- **AWS CloudWatch** - Logs, metrics, dashboards
- **AWS X-Ray** - Distributed tracing
- **AWS CloudTrail** - API audit logs
- **Amazon SNS** - Alerts and notifications

### **6. Security**
- **AWS WAF** - Web application firewall
- **AWS Shield** - DDoS protection
- **AWS IAM** - Access management
- **AWS Secrets Manager** - API keys and secrets
- **AWS KMS** - Encryption keys

### **7. CI/CD**
- **AWS CodePipeline** - Automated deployment pipeline
- **AWS CodeBuild** - Build automation
- **AWS CodeDeploy** - Blue/green deployments
- **GitHub Actions** - Alternative CI/CD

---

## 💰 Cost Estimation (Monthly)

### **Production Environment**

| Service | Configuration | Est. Cost |
|---------|--------------|-----------|
| **ECS Fargate** | 2-10 tasks (0.5 vCPU, 1GB) | $35-175 |
| **ALB** | 1 load balancer | $20 |
| **RDS Aurora Serverless** | 0.5-4 ACUs | $40-160 |
| **S3** | 10GB storage, 100K requests | $3 |
| **CloudFront** | 100GB transfer | $10 |
| **Bedrock (Claude)** | 1M tokens input, 500K output | $15 |
| **Polly** | 1M characters | $4 |
| **Transcribe** | 100 hours | $24 |
| **CloudWatch** | Logs & metrics | $10 |
| **Route 53** | Hosted zone | $0.50 |
| | **TOTAL** | **~$161-421/month** |

### **Development Environment**

| Service | Configuration | Est. Cost |
|---------|--------------|-----------|
| **ECS Fargate** | 1 task (0.25 vCPU, 0.5GB) | $10 |
| **No ALB** | Use direct ECS endpoint | $0 |
| **No RDS** | Use Aurora Serverless min | $15 |
| **S3** | 1GB storage | $0.50 |
| **No CloudFront** | Direct S3 access | $0 |
| | **TOTAL** | **~$25-30/month** |

---

## 🏗️ Deployment Architecture Details

### **1. ECS Fargate Configuration**

```yaml
Service:
  Name: health-helper-backend
  LaunchType: FARGATE
  DesiredCount: 2
  MinCapacity: 2
  MaxCapacity: 10

TaskDefinition:
  CPU: 512  # 0.5 vCPU
  Memory: 1024  # 1 GB
  Image: ECR_REPO/health-helper-backend:latest

AutoScaling:
  - TargetCPU: 70%
  - TargetMemory: 80%
  - ScaleOutCooldown: 60s
  - ScaleInCooldown: 300s
```

### **2. Application Load Balancer**

```yaml
LoadBalancer:
  Type: Application
  Scheme: internet-facing

Listeners:
  - Port: 80
    Protocol: HTTP
    DefaultAction: Redirect to HTTPS

  - Port: 443
    Protocol: HTTPS
    Certificate: ACM Certificate
    TargetGroups:
      - /api/* → ECS Backend
      - /ws → ECS Backend (WebSocket)

HealthCheck:
  Path: /health
  Interval: 30s
  Timeout: 5s
  HealthyThreshold: 2
  UnhealthyThreshold: 3
```

### **3. Database Migration (SQLite → Aurora)**

```sql
-- Aurora Serverless v2 Configuration
Engine: aurora-postgresql
Version: 15.3
MinCapacity: 0.5 ACU
MaxCapacity: 4 ACU
AutoPause: After 5 minutes

-- Migration Steps:
1. Export SQLite data
2. Transform schema for PostgreSQL
3. Import to Aurora
4. Update connection strings
```

### **4. S3 Bucket Configuration**

```yaml
FrontendBucket:
  Name: health-helper-frontend-prod
  Versioning: Enabled
  Encryption: AES-256
  PublicAccess: Blocked (CloudFront only)

UploadsBucket:
  Name: health-helper-uploads-prod
  Versioning: Enabled
  Encryption: KMS
  Lifecycle:
    - DeleteAfter: 90 days (for temp uploads)
  CORS: Enabled for frontend domain
```

---

## 🔒 Security Best Practices

### **1. IAM Roles & Policies**

```json
{
  "ECSTaskRole": {
    "Permissions": [
      "bedrock:InvokeModel",
      "polly:SynthesizeSpeech",
      "transcribe:StartStreamTranscription",
      "s3:PutObject (uploads bucket)",
      "s3:GetObject (uploads bucket)",
      "secretsmanager:GetSecretValue",
      "rds:DescribeDBClusters"
    ]
  }
}
```

### **2. Secrets Management**

```bash
# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name health-helper/prod/env \
  --secret-string '{
    "DEEPGRAM_API_KEY": "xxx",
    "DATABASE_URL": "postgresql://...",
    "SESSION_SECRET": "xxx"
  }'
```

### **3. WAF Rules**

```yaml
WebACL:
  Rules:
    - AWS Managed Rules (Core Rule Set)
    - Rate Limiting (100 req/5min per IP)
    - Geo-blocking (if needed)
    - SQL injection protection
    - XSS protection
```

---

## 📈 Scalability Features

### **1. Auto Scaling Policies**

```yaml
ECS_Service_Scaling:
  - Metric: CPU > 70%
    Action: Add 2 tasks

  - Metric: Memory > 80%
    Action: Add 2 tasks

  - Metric: ALB RequestCount > 1000/min
    Action: Add 1 task

  - Metric: All metrics normal for 5 min
    Action: Remove 1 task (down to min=2)
```

### **2. Database Scaling**

```yaml
Aurora_Auto_Scaling:
  - Metric: CPU > 70%
    Action: Increase ACU capacity

  - Low traffic
    Action: Scale down to 0.5 ACU

  - Auto Pause: After 5 min inactivity (dev env only)
```

### **3. CDN Caching**

```yaml
CloudFront_Cache:
  Static Assets: 1 year
  API Responses: No cache
  WebSocket: No cache

  Origins:
    - S3 (static): Cache everything
    - ALB (API): Cache-Control headers
```

---

## 🚀 Deployment Strategy

### **Blue/Green Deployment**

```yaml
1. Build new container image
2. Push to ECR
3. Create new ECS task definition version
4. Deploy to 10% of tasks (canary)
5. Monitor metrics for 5 minutes
6. If healthy: Roll out to 100%
7. If unhealthy: Rollback automatically
```

### **Zero-Downtime Updates**

```yaml
ECS Service Update:
  MinimumHealthyPercent: 100
  MaximumPercent: 200

Process:
  1. Start new tasks (2 new + 2 old = 4 total)
  2. Wait for new tasks to be healthy
  3. Drain connections from old tasks
  4. Terminate old tasks
  5. Return to desired count (2)
```

---

## 📊 Monitoring & Alerts

### **CloudWatch Dashboards**

```yaml
Dashboard: Health-Helper-Production

Widgets:
  - ECS CPU/Memory utilization
  - ALB request count, latency, errors
  - RDS connections, CPU, IOPS
  - Bedrock API calls, tokens
  - S3 request count
  - CloudFront cache hit ratio
```

### **Alarms**

```yaml
Critical_Alarms:
  - ECS CPU > 90% for 5 min
  - ALB 5XX errors > 10/min
  - RDS connections > 90%
  - Health check failures > 3

Warning_Alarms:
  - ECS CPU > 70% for 10 min
  - ALB latency > 1s
  - S3 4XX errors increasing
```

---

## 🔧 Infrastructure as Code

We'll use **AWS CDK (TypeScript)** for infrastructure:

```typescript
// lib/health-helper-stack.ts
export class HealthHelperStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // Aurora Database
    const db = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      }),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      vpc,
    });

    // ALB
    const alb = new elb.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
    });

    // ECS Fargate Service
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      'Service',
      {
        cluster,
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 2,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(ecrRepo),
          environment: {
            NODE_ENV: 'production',
          },
        },
        loadBalancer: alb,
      }
    );

    // Auto Scaling
    const scaling = fargateService.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });
  }
}
```

---

## 🎯 Next Steps - Deployment Order

1. **Set up AWS CDK** ✅
2. **Create ECR repository** ✅
3. **Build & push container images** ✅
4. **Deploy infrastructure with CDK** ✅
5. **Migrate database** ✅
6. **Deploy frontend to S3/CloudFront** ✅
7. **Configure DNS** ✅
8. **Set up monitoring** ✅
9. **Load testing** ✅
10. **Go live!** 🚀

---

## 📝 Comparison: Simple vs Scalable

| Aspect | Elastic Beanstalk (Simple) | ECS Fargate (Scalable) |
|--------|---------------------------|------------------------|
| **Setup Time** | 15 minutes | 1-2 hours |
| **Scalability** | Limited (single instance) | Excellent (2-100+ tasks) |
| **Cost (Low Traffic)** | $15/month | $40/month |
| **Cost (High Traffic)** | $30/month | Scales automatically |
| **Availability** | Single AZ | Multi-AZ |
| **Downtime Updates** | Yes (few seconds) | No (blue/green) |
| **WebSocket Support** | Limited | Full support |
| **Monitoring** | Basic | Advanced (CloudWatch) |
| **Best For** | MVP, Testing | Production, Growth |

---

## 🚀 Quick Deploy Commands

Ready to deploy? Choose your path:

### **Option A: Simple Deployment (Elastic Beanstalk)**
```bash
./deploy-to-aws.sh
```

### **Option B: Scalable Deployment (ECS Fargate + CDK)**
```bash
./deploy-scalable.sh
```

I'll create both scripts for you!
