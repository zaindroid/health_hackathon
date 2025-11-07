# AWS Deployment Guide - Health Helper

## Architecture Overview

This guide walks through deploying the Health Helper voice-first healthcare application on AWS.

### Current Stack
- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express + WebSocket
- **Database**: SQLite (needs migration to RDS)
- **APIs**: Deepgram (STT), AWS Bedrock (LLM), Cartesia (TTS)

---

## Option 1: Quick Deploy (Elastic Beanstalk) - RECOMMENDED FOR HACKATHONS

### Step 1: Prepare Backend for Deployment

1. **Update package.json**:
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "deploy:build": "npm install && npm run build"
  },
  "engines": {
    "node": "18.x"
  }
}
```

2. **Create `.ebignore`**:
```
node_modules/
.git/
.env
*.db
uploads/
dist/
```

3. **Create `.ebextensions/01_environment.config`**:
```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /: public
```

4. **Build and package**:
```bash
cd backend
npm run build
zip -r ../health-helper-backend.zip . -x "node_modules/*" -x ".git/*"
```

### Step 2: Deploy Backend with Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
cd backend
eb init -p node.js-18 health-helper --region us-east-1

# Create environment with WebSocket support
eb create health-helper-env \
  --instance-type t3.small \
  --envvars DEEPGRAM_API_KEY=your_key,AWS_REGION=us-east-1

# Deploy
eb deploy
```

### Step 3: Configure Environment Variables

```bash
eb setenv \
  DEEPGRAM_API_KEY=your_deepgram_key \
  AWS_REGION=us-east-1 \
  AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v2:0 \
  NODE_ENV=production
```

### Step 4: Deploy Frontend to S3 + CloudFront

```bash
cd frontend

# Update .env.production with backend URL
echo "VITE_WS_URL=wss://your-eb-url.elasticbeanstalk.com" > .env.production
echo "VITE_API_URL=https://your-eb-url.elasticbeanstalk.com" >> .env.production

# Build
npm run build

# Create S3 bucket
aws s3 mb s3://health-helper-frontend-YOUR_NAME

# Enable static website hosting
aws s3 website s3://health-helper-frontend-YOUR_NAME \
  --index-document index.html \
  --error-document index.html

# Upload
aws s3 sync dist/ s3://health-helper-frontend-YOUR_NAME --delete

# Make public
aws s3api put-bucket-policy --bucket health-helper-frontend-YOUR_NAME --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::health-helper-frontend-YOUR_NAME/*"
  }]
}'

# Create CloudFront distribution (optional, for HTTPS)
aws cloudfront create-distribution \
  --origin-domain-name health-helper-frontend-YOUR_NAME.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html
```

---

## Option 2: Production Deploy (ECS Fargate + RDS)

### Step 1: Create Dockerfile for Backend

**backend/Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/server.js"]
```

### Step 2: Push to ECR (Elastic Container Registry)

```bash
# Create ECR repository
aws ecr create-repository --repository-name health-helper-backend

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Build and push
cd backend
docker build -t health-helper-backend .
docker tag health-helper-backend:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/health-helper-backend:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/health-helper-backend:latest
```

### Step 3: Create ECS Cluster and Task Definition

**task-definition.json**:
```json
{
  "family": "health-helper-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [{
    "name": "backend",
    "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/health-helper-backend:latest",
    "portMappings": [{
      "containerPort": 3001,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "NODE_ENV", "value": "production"}
    ],
    "secrets": [
      {
        "name": "DEEPGRAM_API_KEY",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:deepgram-api-key"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/health-helper",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "backend"
      }
    }
  }]
}
```

### Step 4: Create RDS Database

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier health-helper-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-YOUR_SG \
  --publicly-accessible false
```

**Migrate SQLite to PostgreSQL**:
1. Update backend code to use `pg` instead of `better-sqlite3`
2. Update connection string in `database.ts`
3. Run migration scripts

### Step 5: Create Application Load Balancer

```bash
# Create ALB with WebSocket support
aws elbv2 create-load-balancer \
  --name health-helper-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name health-helper-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /health

# Create listener (HTTP)
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

### Step 6: Deploy ECS Service

```bash
aws ecs create-service \
  --cluster health-helper-cluster \
  --service-name health-helper-service \
  --task-definition health-helper-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=3001
```

---

## Secrets Management

### Store API Keys in Secrets Manager

```bash
# Create secrets
aws secretsmanager create-secret \
  --name deepgram-api-key \
  --secret-string "your_deepgram_key"

aws secretsmanager create-secret \
  --name health-helper/env \
  --secret-string '{
    "DEEPGRAM_API_KEY": "your_key",
    "AWS_BEDROCK_MODEL_ID": "anthropic.claude-3-5-sonnet-20240620-v2:0",
    "DATABASE_URL": "postgresql://user:pass@host:5432/db"
  }'
```

---

## Cost Estimation

### Minimal Setup (Hackathon/Demo)
- **Elastic Beanstalk** (t3.small): $15/month
- **S3 + CloudFront**: $5/month
- **Deepgram**: Pay per usage
- **Total**: ~$20-30/month

### Production Setup
- **ECS Fargate** (2 tasks): $40/month
- **RDS PostgreSQL** (db.t3.micro): $15/month
- **ALB**: $20/month
- **S3 + CloudFront**: $10/month
- **Secrets Manager**: $2/month
- **Total**: ~$90-120/month

### Enterprise Setup (with auto-scaling)
- **ECS Fargate** (2-10 tasks): $100-500/month
- **RDS Aurora Serverless**: $50-200/month
- **ALB + CloudFront**: $50/month
- **S3 + EFS**: $20/month
- **Total**: $220-770/month

---

## Environment Variables Setup

Create `.env.production` files:

**Backend `.env.production`**:
```bash
NODE_ENV=production
PORT=3001

# Speech-to-Text
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY}

# LLM
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v2:0

# Text-to-Speech
TTS_PROVIDER=external
CARTESIA_API_KEY=${CARTESIA_API_KEY}

# Database
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/health_helper

# Optional
AWS_BEDROCK_KB_ID=${KB_ID}
ENABLE_RAG=false
ENABLE_TOOLS=true
```

**Frontend `.env.production`**:
```bash
VITE_WS_URL=wss://your-backend-url.com
VITE_API_URL=https://your-backend-url.com
```

---

## Monitoring & Logging

### CloudWatch Setup

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/health-helper

# Set retention
aws logs put-retention-policy \
  --log-group-name /ecs/health-helper \
  --retention-in-days 7
```

### X-Ray Tracing (Optional)

Add AWS X-Ray SDK to backend for distributed tracing:
```bash
npm install aws-xray-sdk
```

---

## CI/CD Pipeline (GitHub Actions)

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        run: |
          aws ecr get-login-password --region us-east-1 | \
          docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}

      - name: Build and push Docker image
        run: |
          cd backend
          docker build -t health-helper-backend .
          docker tag health-helper-backend:latest ${{ secrets.ECR_REGISTRY }}/health-helper-backend:latest
          docker push ${{ secrets.ECR_REGISTRY }}/health-helper-backend:latest

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster health-helper-cluster \
            --service health-helper-service \
            --force-new-deployment

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build

      - name: Deploy to S3
        run: |
          aws s3 sync frontend/dist/ s3://health-helper-frontend --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/*"
```

---

## Security Checklist

- [ ] Enable HTTPS/WSS (use CloudFront or ACM certificate on ALB)
- [ ] Configure CORS properly (allow only your frontend domain)
- [ ] Use Security Groups to restrict access
- [ ] Enable CloudWatch logging
- [ ] Use Secrets Manager for sensitive data
- [ ] Enable VPC for RDS (no public access)
- [ ] Use IAM roles instead of access keys
- [ ] Enable AWS Shield Standard (DDoS protection)
- [ ] Set up CloudWatch alarms for errors
- [ ] Configure backup retention for RDS

---

## Troubleshooting

### WebSocket Connection Issues
- Ensure ALB is configured for WebSocket upgrade
- Check Security Group allows inbound on port 3001
- Verify frontend uses `wss://` not `ws://`

### File Upload Issues
- Use S3 instead of local filesystem
- Update multer to use S3 storage:
```javascript
const multerS3 = require('multer-s3');
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: 'health-helper-uploads',
    key: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  })
});
```

### Database Migration Issues
- Export SQLite data: `sqlite3 database.db .dump > dump.sql`
- Convert to PostgreSQL format
- Import to RDS: `psql -h rds-endpoint -U admin -d health_helper < dump.sql`

---

## Next Steps

1. ✅ Test locally with production environment variables
2. ✅ Create AWS account and set up billing alerts
3. ✅ Deploy backend to Elastic Beanstalk (quick start)
4. ✅ Deploy frontend to S3
5. ✅ Test end-to-end workflow
6. ✅ Set up monitoring and alarms
7. ✅ Migrate to ECS + RDS for production
8. ✅ Configure CI/CD pipeline
9. ✅ Set up custom domain with Route 53
10. ✅ Enable auto-scaling based on traffic
