# 🚀 AWS Deployment Guide - Voice Agent Backend

## ✅ Current Configuration

Your backend is now configured to use:
- **LLM**: AWS Bedrock (Claude 3.5 Sonnet)
- **Region**: us-west-2
- **Credentials**: Temporary AWS STS credentials (will expire!)

---

## ⚠️ Important: Temporary Credentials

Your current AWS credentials are **temporary** (session token expires):
```
AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEPL...
```

**These credentials will expire!** For production deployment, you need:
1. **IAM User** with permanent access keys, OR
2. **IAM Role** attached to EC2/ECS instance

---

## 🎯 Deployment Options

### Option 1: AWS EC2 (Recommended for Full Control)
### Option 2: AWS App Runner (Easiest, Fully Managed)
### Option 3: AWS ECS Fargate (Serverless Containers)
### Option 4: AWS Lambda + API Gateway (Serverless, Requires Modifications)

---

## 📦 Option 1: AWS EC2 Deployment

**Best for**: Full control, long-running WebSocket connections

### Step 1: Create EC2 Instance

```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name voice-agent-key \
  --region us-west-2 \
  --query 'KeyMaterial' \
  --output text > voice-agent-key.pem

chmod 400 voice-agent-key.pem

# Create security group
aws ec2 create-security-group \
  --group-name voice-agent-sg \
  --description "Security group for voice agent backend" \
  --region us-west-2

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups \
  --group-names voice-agent-sg \
  --region us-west-2 \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Allow SSH (port 22)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0 \
  --region us-west-2

# Allow backend (port 3001)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0 \
  --region us-west-2

# Launch EC2 instance (Ubuntu 22.04)
aws ec2 run-instances \
  --image-id ami-0c65adc9a5c1b5d7c \
  --count 1 \
  --instance-type t3.medium \
  --key-name voice-agent-key \
  --security-group-ids $SG_ID \
  --region us-west-2 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=voice-agent-backend}]' \
  --iam-instance-profile Name=BedrockAccessRole
```

### Step 2: Create IAM Role for EC2

Create a file `bedrock-trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ec2.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
```

Create IAM role:
```bash
# Create role
aws iam create-role \
  --role-name BedrockAccessRole \
  --assume-role-policy-document file://bedrock-trust-policy.json

# Attach Bedrock policy
aws iam attach-role-policy \
  --role-name BedrockAccessRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name BedrockAccessRole

# Add role to instance profile
aws iam add-role-to-instance-profile \
  --instance-profile-name BedrockAccessRole \
  --role-name BedrockAccessRole
```

### Step 3: SSH and Deploy

```bash
# Get instance public IP
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=voice-agent-backend" \
  --region us-west-2 \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region us-west-2 \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "Instance IP: $PUBLIC_IP"

# SSH into instance
ssh -i voice-agent-key.pem ubuntu@$PUBLIC_IP
```

**On EC2 instance:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone or upload your code
mkdir -p healthy_hack
cd healthy_hack
# Upload your backend code here (use scp or git)

# Install dependencies
cd backend
npm install

# Update .env with IAM role (no need for credentials!)
cat > .env << 'EOF'
PORT=3001
HOST=0.0.0.0
CORS_ORIGINS=*

LLM_PROVIDER=bedrock
AWS_REGION=us-west-2
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
# No need for AWS credentials - IAM role handles it!

DEEPGRAM_API_KEY=3763c0d7cb5fd4216bf9ae964e353e7bfc2985dc
DEEPGRAM_MODEL=nova-2
DEEPGRAM_LANGUAGE=en-US

TTS_PROVIDER=external
CARTESIA_API_KEY=sk_car_SavSUBUsuChkr8BYKyVdQN

ENABLE_RAG=false
ENABLE_TOOLS=true
EOF

# Build and start
npm run build
pm2 start dist/server.js --name voice-agent
pm2 save
pm2 startup

# Check logs
pm2 logs voice-agent
```

### Step 4: Update Frontend

Update `/home/zainey/healthy_hack/frontend/.env`:
```bash
VITE_WS_URL=ws://<PUBLIC_IP>:3001
```

---

## 📦 Option 2: AWS App Runner (Easiest)

**Best for**: Quick deployment, auto-scaling, fully managed

### Step 1: Build and Push Docker Image to ECR

```bash
cd /home/zainey/healthy_hack/backend

# Create ECR repository
aws ecr create-repository \
  --repository-name voice-agent-backend \
  --region us-west-2

# Get ECR login
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin \
  425413565951.dkr.ecr.us-west-2.amazonaws.com

# Build image
docker build -t voice-agent-backend .

# Tag image
docker tag voice-agent-backend:latest \
  425413565951.dkr.ecr.us-west-2.amazonaws.com/voice-agent-backend:latest

# Push image
docker push 425413565951.dkr.ecr.us-west-2.amazonaws.com/voice-agent-backend:latest
```

### Step 2: Create App Runner Service

```bash
# Create apprunner-service.json
cat > apprunner-service.json << 'EOF'
{
  "ServiceName": "voice-agent-backend",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "425413565951.dkr.ecr.us-west-2.amazonaws.com/voice-agent-backend:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "3001",
        "RuntimeEnvironmentVariables": {
          "PORT": "3001",
          "HOST": "0.0.0.0",
          "LLM_PROVIDER": "bedrock",
          "AWS_REGION": "us-west-2",
          "BEDROCK_MODEL_ID": "anthropic.claude-3-5-sonnet-20241022-v2:0",
          "DEEPGRAM_API_KEY": "3763c0d7cb5fd4216bf9ae964e353e7bfc2985dc",
          "CARTESIA_API_KEY": "sk_car_SavSUBUsuChkr8BYKyVdQN",
          "TTS_PROVIDER": "external",
          "ENABLE_TOOLS": "true"
        }
      }
    },
    "AutoDeploymentsEnabled": false
  },
  "InstanceConfiguration": {
    "Cpu": "1024",
    "Memory": "2048",
    "InstanceRoleArn": "arn:aws:iam::425413565951:role/AppRunnerBedrockRole"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }
}
EOF

# Create service
aws apprunner create-service \
  --cli-input-json file://apprunner-service.json \
  --region us-west-2
```

**Note**: App Runner may have issues with WebSocket connections. EC2 or ECS is recommended for WebSocket support.

---

## 📦 Option 3: AWS ECS Fargate

**Best for**: Container orchestration, auto-scaling, managed infrastructure

### Step 1: Build and Push to ECR (same as App Runner)

### Step 2: Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name voice-agent-cluster \
  --region us-west-2
```

### Step 3: Create Task Definition

Create `task-definition.json`:
```json
{
  "family": "voice-agent-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "taskRoleArn": "arn:aws:iam::425413565951:role/ECSBedrockRole",
  "executionRoleArn": "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
  "containerDefinitions": [{
    "name": "voice-agent",
    "image": "425413565951.dkr.ecr.us-west-2.amazonaws.com/voice-agent-backend:latest",
    "portMappings": [{
      "containerPort": 3001,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "PORT", "value": "3001"},
      {"name": "LLM_PROVIDER", "value": "bedrock"},
      {"name": "AWS_REGION", "value": "us-west-2"},
      {"name": "BEDROCK_MODEL_ID", "value": "anthropic.claude-3-5-sonnet-20241022-v2:0"},
      {"name": "DEEPGRAM_API_KEY", "value": "3763c0d7cb5fd4216bf9ae964e353e7bfc2985dc"},
      {"name": "CARTESIA_API_KEY", "value": "sk_car_SavSUBUsuChkr8BYKyVdQN"},
      {"name": "TTS_PROVIDER", "value": "external"},
      {"name": "ENABLE_TOOLS", "value": "true"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/voice-agent",
        "awslogs-region": "us-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

Register task:
```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region us-west-2
```

### Step 4: Create ECS Service

```bash
aws ecs create-service \
  --cluster voice-agent-cluster \
  --service-name voice-agent-service \
  --task-definition voice-agent-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --region us-west-2
```

---

## 🔑 IAM Permissions Needed

Create Bedrock access policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream"
    ],
    "Resource": "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
  }]
}
```

---

## ✅ Quick Start (Local Docker Test)

Test the Docker image locally before deploying:

```bash
cd /home/zainey/healthy_hack/backend

# Build image
docker build -t voice-agent-backend .

# Run container
docker run -p 3001:3001 \
  -e AWS_REGION=us-west-2 \
  -e AWS_ACCESS_KEY_ID=ASIAWGDE73X7TY4K3EB2 \
  -e AWS_SECRET_ACCESS_KEY=OVWKvEgDWtOK7UJ8cj2QdxYxN1u2CN2fa44fI6co \
  -e AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEPL... \
  -e BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0 \
  -e LLM_PROVIDER=bedrock \
  -e DEEPGRAM_API_KEY=3763c0d7cb5fd4216bf9ae964e353e7bfc2985dc \
  -e CARTESIA_API_KEY=sk_car_SavSUBUsuChkr8BYKyVdQN \
  -e TTS_PROVIDER=external \
  -e ENABLE_TOOLS=true \
  voice-agent-backend

# Test
curl http://localhost:3001/health
```

---

## 🚨 Before Production

1. **Remove temporary credentials** from .env
2. **Use IAM roles** for EC2/ECS instead of access keys
3. **Enable HTTPS** (use ALB with SSL certificate)
4. **Set proper CORS origins** (not `*`)
5. **Use AWS Secrets Manager** for API keys
6. **Enable CloudWatch logs**
7. **Set up auto-scaling**

---

## 📊 Cost Estimates (us-west-2)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| EC2 t3.medium | 24/7 running | ~$30 |
| ECS Fargate | 1 vCPU, 2GB RAM | ~$30-40 |
| App Runner | 1 vCPU, 2GB RAM | ~$25-35 |
| Bedrock Claude | ~1M tokens/month | ~$3-15 |
| Data Transfer | 10GB/month | ~$1 |

**Estimated Total**: $60-90/month

---

## 🎯 Recommended Approach

**For your use case (WebSocket + voice agent):**

1. **Use EC2** - Best for WebSocket support
2. **Attach IAM role** - No need for credentials in code
3. **Use Application Load Balancer** - For HTTPS and scaling
4. **Enable CloudWatch** - For monitoring and logs

---

## 🔄 Quick Deploy Script

Save this as `deploy.sh`:

```bash
#!/bin/bash

cd /home/zainey/healthy_hack/backend

# Build Docker image
docker build -t voice-agent-backend .

# Tag for ECR
docker tag voice-agent-backend:latest \
  425413565951.dkr.ecr.us-west-2.amazonaws.com/voice-agent-backend:latest

# Push to ECR
docker push 425413565951.dkr.ecr.us-west-2.amazonaws.com/voice-agent-backend:latest

echo "✅ Image pushed to ECR"
echo "Next: Deploy to EC2/ECS/App Runner"
```

---

## 📞 Support

For deployment issues:
- Check CloudWatch logs
- Verify IAM permissions
- Test Bedrock access: `aws bedrock list-foundation-models --region us-west-2`

---

**Ready to deploy!** 🚀

Choose your preferred option and follow the steps above.
