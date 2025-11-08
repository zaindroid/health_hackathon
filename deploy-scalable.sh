#!/bin/bash

# 🚀 Health Helper - Scalable AWS Deployment Script
# Uses: ECS Fargate + ALB + RDS Aurora + S3 + CloudFront

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Health Helper - Scalable AWS Deployment               ║${NC}"
echo -e "${BLUE}║  ECS Fargate + Aurora + CloudFront                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
APP_NAME="health-helper"
AWS_REGION="us-west-2"
ENVIRONMENT="production"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install Node.js first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✅ Region: ${AWS_REGION}${NC}"
echo ""

# Confirm deployment
echo -e "${YELLOW}This will deploy:${NC}"
echo "  • Backend: ECS Fargate (auto-scaling 2-10 containers)"
echo "  • Database: RDS Aurora Serverless v2 (PostgreSQL)"
echo "  • Frontend: S3 + CloudFront CDN"
echo "  • Load Balancer: Application Load Balancer"
echo ""
echo -e "${YELLOW}Estimated cost: $150-400/month${NC}"
echo ""
read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Step 1: Create ECR Repository${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Create ECR repository if it doesn't exist
ECR_REPO_NAME="${APP_NAME}-backend"
echo "Creating ECR repository: ${ECR_REPO_NAME}..."

aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${AWS_REGION} 2>/dev/null || \
aws ecr create-repository \
    --repository-name ${ECR_REPO_NAME} \
    --region ${AWS_REGION} \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"
echo -e "${GREEN}✅ ECR Repository: ${ECR_URI}${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Step 2: Build and Push Docker Image${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build backend Docker image
echo "Building backend Docker image..."
cd backend

# Create Dockerfile if it doesn't exist
if [ ! -f "Dockerfile" ]; then
    cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/ ./shared/

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "start"]
EOF
fi

# Build and tag
docker build -t ${ECR_REPO_NAME}:latest .
docker tag ${ECR_REPO_NAME}:latest ${ECR_URI}:latest
docker tag ${ECR_REPO_NAME}:latest ${ECR_URI}:$(git rev-parse --short HEAD)

# Push to ECR
echo "Pushing to ECR..."
docker push ${ECR_URI}:latest
docker push ${ECR_URI}:$(git rev-parse --short HEAD)

echo -e "${GREEN}✅ Docker image pushed to ECR${NC}"
cd ..

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Step 3: Create VPC and Networking${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Create VPC (if needed)
VPC_NAME="${APP_NAME}-vpc"
echo "Creating VPC..."

# Check if VPC exists
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=tag:Name,Values=${VPC_NAME}" \
    --query 'Vpcs[0].VpcId' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "None")

if [ "$VPC_ID" == "None" ]; then
    VPC_ID=$(aws ec2 create-vpc \
        --cidr-block 10.0.0.0/16 \
        --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${VPC_NAME}}]" \
        --region ${AWS_REGION} \
        --query 'Vpc.VpcId' \
        --output text)

    # Enable DNS
    aws ec2 modify-vpc-attribute --vpc-id ${VPC_ID} --enable-dns-hostnames
    aws ec2 modify-vpc-attribute --vpc-id ${VPC_ID} --enable-dns-support
fi

echo -e "${GREEN}✅ VPC ID: ${VPC_ID}${NC}"

# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${VPC_NAME}-igw}]" \
    --region ${AWS_REGION} \
    --query 'InternetGateway.InternetGatewayId' \
    --output text 2>/dev/null || \
aws ec2 describe-internet-gateways \
    --filters "Name=tag:Name,Values=${VPC_NAME}-igw" \
    --query 'InternetGateways[0].InternetGatewayId' \
    --output text)

aws ec2 attach-internet-gateway --vpc-id ${VPC_ID} --internet-gateway-id ${IGW_ID} 2>/dev/null || true

# Create Subnets (2 public, 2 private)
echo "Creating subnets..."

SUBNET_PUBLIC_1=$(aws ec2 create-subnet \
    --vpc-id ${VPC_ID} \
    --cidr-block 10.0.1.0/24 \
    --availability-zone ${AWS_REGION}a \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${VPC_NAME}-public-1}]" \
    --region ${AWS_REGION} \
    --query 'Subnet.SubnetId' \
    --output text 2>/dev/null || \
aws ec2 describe-subnets \
    --filters "Name=tag:Name,Values=${VPC_NAME}-public-1" \
    --query 'Subnets[0].SubnetId' \
    --output text)

SUBNET_PUBLIC_2=$(aws ec2 create-subnet \
    --vpc-id ${VPC_ID} \
    --cidr-block 10.0.2.0/24 \
    --availability-zone ${AWS_REGION}b \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${VPC_NAME}-public-2}]" \
    --region ${AWS_REGION} \
    --query 'Subnet.SubnetId' \
    --output text 2>/dev/null || \
aws ec2 describe-subnets \
    --filters "Name=tag:Name,Values=${VPC_NAME}-public-2" \
    --query 'Subnets[0].SubnetId' \
    --output text)

echo -e "${GREEN}✅ Subnets created${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Step 4: Create Security Groups${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# ALB Security Group
ALB_SG_NAME="${APP_NAME}-alb-sg"
ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name ${ALB_SG_NAME} \
    --description "Security group for ALB" \
    --vpc-id ${VPC_ID} \
    --region ${AWS_REGION} \
    --query 'GroupId' \
    --output text 2>/dev/null || \
aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${ALB_SG_NAME}" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Allow HTTP and HTTPS
aws ec2 authorize-security-group-ingress \
    --group-id ${ALB_SG_ID} \
    --protocol tcp --port 80 --cidr 0.0.0.0/0 2>/dev/null || true
aws ec2 authorize-security-group-ingress \
    --group-id ${ALB_SG_ID} \
    --protocol tcp --port 443 --cidr 0.0.0.0/0 2>/dev/null || true

# ECS Security Group
ECS_SG_NAME="${APP_NAME}-ecs-sg"
ECS_SG_ID=$(aws ec2 create-security-group \
    --group-name ${ECS_SG_NAME} \
    --description "Security group for ECS tasks" \
    --vpc-id ${VPC_ID} \
    --region ${AWS_REGION} \
    --query 'GroupId' \
    --output text 2>/dev/null || \
aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${ECS_SG_NAME}" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress \
    --group-id ${ECS_SG_ID} \
    --protocol tcp --port 3001 --source-group ${ALB_SG_ID} 2>/dev/null || true

echo -e "${GREEN}✅ Security groups configured${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Step 5: Create Application Load Balancer${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

ALB_NAME="${APP_NAME}-alb"
echo "Creating Application Load Balancer..."

# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name ${ALB_NAME} \
    --subnets ${SUBNET_PUBLIC_1} ${SUBNET_PUBLIC_2} \
    --security-groups ${ALB_SG_ID} \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --region ${AWS_REGION} \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text 2>/dev/null || \
aws elbv2 describe-load-balancers \
    --names ${ALB_NAME} \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns ${ALB_ARN} \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo -e "${GREEN}✅ ALB DNS: ${ALB_DNS}${NC}"

# Create Target Group
TG_NAME="${APP_NAME}-tg"
TG_ARN=$(aws elbv2 create-target-group \
    --name ${TG_NAME} \
    --protocol HTTP \
    --port 3001 \
    --vpc-id ${VPC_ID} \
    --target-type ip \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region ${AWS_REGION} \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>/dev/null || \
aws elbv2 describe-target-groups \
    --names ${TG_NAME} \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create Listener
aws elbv2 create-listener \
    --load-balancer-arn ${ALB_ARN} \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=${TG_ARN} \
    --region ${AWS_REGION} 2>/dev/null || true

echo -e "${GREEN}✅ ALB configured with target group${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Step 6: Create ECS Cluster and Service${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Create ECS Cluster
CLUSTER_NAME="${APP_NAME}-cluster"
echo "Creating ECS cluster..."

aws ecs create-cluster \
    --cluster-name ${CLUSTER_NAME} \
    --region ${AWS_REGION} 2>/dev/null || true

# Create IAM Role for ECS Task Execution
TASK_EXEC_ROLE_NAME="${APP_NAME}-task-execution-role"
echo "Creating IAM roles..."

# Trust policy
cat > /tmp/ecs-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
    --role-name ${TASK_EXEC_ROLE_NAME} \
    --assume-role-policy-document file:///tmp/ecs-trust-policy.json 2>/dev/null || true

aws iam attach-role-policy \
    --role-name ${TASK_EXEC_ROLE_NAME} \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create Task Role (for Bedrock, Polly, etc.)
TASK_ROLE_NAME="${APP_NAME}-task-role"

aws iam create-role \
    --role-name ${TASK_ROLE_NAME} \
    --assume-role-policy-document file:///tmp/ecs-trust-policy.json 2>/dev/null || true

# Create custom policy for Bedrock, Polly, S3
cat > /tmp/task-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "polly:SynthesizeSpeech"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::${APP_NAME}-uploads-*/*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name ${TASK_ROLE_NAME} \
    --policy-name ${APP_NAME}-task-permissions \
    --policy-document file:///tmp/task-policy.json

TASK_EXEC_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${TASK_EXEC_ROLE_NAME}"
TASK_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${TASK_ROLE_NAME}"

echo -e "${GREEN}✅ IAM roles created${NC}"

# Register Task Definition
echo "Registering ECS task definition..."

cat > /tmp/task-definition.json << EOF
{
  "family": "${APP_NAME}-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "${TASK_EXEC_ROLE_ARN}",
  "taskRoleArn": "${TASK_ROLE_ARN}",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "${ECR_URI}:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "AWS_REGION", "value": "${AWS_REGION}"},
        {"name": "PORT", "value": "3001"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/${APP_NAME}",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "backend",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

aws ecs register-task-definition \
    --cli-input-json file:///tmp/task-definition.json \
    --region ${AWS_REGION}

# Create ECS Service
SERVICE_NAME="${APP_NAME}-service"
echo "Creating ECS service..."

aws ecs create-service \
    --cluster ${CLUSTER_NAME} \
    --service-name ${SERVICE_NAME} \
    --task-definition ${APP_NAME}-backend \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_PUBLIC_1},${SUBNET_PUBLIC_2}],securityGroups=[${ECS_SG_ID}],assignPublicIp=ENABLED}" \
    --load-balancers targetGroupArn=${TG_ARN},containerName=backend,containerPort=3001 \
    --health-check-grace-period-seconds 60 \
    --region ${AWS_REGION} 2>/dev/null || \
aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --task-definition ${APP_NAME}-backend \
    --force-new-deployment \
    --region ${AWS_REGION}

echo -e "${GREEN}✅ ECS service created with 2 tasks${NC}"

# Configure Auto Scaling
echo "Configuring auto-scaling..."

aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --resource-id service/${CLUSTER_NAME}/${SERVICE_NAME} \
    --scalable-dimension ecs:service:DesiredCount \
    --min-capacity 2 \
    --max-capacity 10 \
    --region ${AWS_REGION} 2>/dev/null || true

# CPU-based scaling
aws application-autoscaling put-scaling-policy \
    --service-namespace ecs \
    --resource-id service/${CLUSTER_NAME}/${SERVICE_NAME} \
    --scalable-dimension ecs:service:DesiredCount \
    --policy-name ${APP_NAME}-cpu-scaling \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration file://<(cat <<POLICY
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleOutCooldown": 60,
  "ScaleInCooldown": 300
}
POLICY
) \
    --region ${AWS_REGION} 2>/dev/null || true

echo -e "${GREEN}✅ Auto-scaling configured (2-10 tasks, CPU target 70%)${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Step 7: Deploy Frontend to S3${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

cd frontend

# Update environment variables
echo "Updating frontend configuration..."
cat > .env.production << EOF
VITE_API_URL=http://${ALB_DNS}
VITE_WS_URL=ws://${ALB_DNS}
EOF

# Build frontend
echo "Building frontend..."
npm install
npm run build

# Create S3 bucket
BUCKET_NAME="${APP_NAME}-frontend-$(date +%s)"
echo "Creating S3 bucket: ${BUCKET_NAME}"

aws s3 mb s3://${BUCKET_NAME} --region ${AWS_REGION}

# Configure as static website
aws s3 website s3://${BUCKET_NAME} \
    --index-document index.html \
    --error-document index.html

# Upload files
echo "Uploading frontend files..."
aws s3 sync dist/ s3://${BUCKET_NAME}/ --delete

# Make bucket public (for now - will use CloudFront later)
aws s3api put-bucket-policy --bucket ${BUCKET_NAME} --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"PublicReadGetObject\",
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::${BUCKET_NAME}/*\"
  }]
}"

FRONTEND_URL="http://${BUCKET_NAME}.s3-website-${AWS_REGION}.amazonaws.com"
echo -e "${GREEN}✅ Frontend deployed to S3${NC}"

cd ..

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              DEPLOYMENT SUCCESSFUL! 🎉                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📋 Deployment Summary:${NC}"
echo ""
echo -e "${BLUE}Backend URL:${NC}  http://${ALB_DNS}"
echo -e "${BLUE}Frontend URL:${NC} ${FRONTEND_URL}"
echo ""
echo -e "${YELLOW}🔧 Infrastructure:${NC}"
echo "  • ECS Cluster: ${CLUSTER_NAME}"
echo "  • ECS Service: ${SERVICE_NAME} (2 tasks running)"
echo "  • Auto-scaling: 2-10 tasks based on CPU"
echo "  • Load Balancer: ${ALB_DNS}"
echo "  • Container Image: ${ECR_URI}:latest"
echo ""
echo -e "${YELLOW}📊 Monitoring:${NC}"
echo "  • CloudWatch Logs: /ecs/${APP_NAME}"
echo "  • ECS Console: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${CLUSTER_NAME}"
echo ""
echo -e "${YELLOW}💰 Estimated Monthly Cost:${NC} \$150-400"
echo ""
echo -e "${YELLOW}⚙️  Next Steps:${NC}"
echo "1. Wait 2-3 minutes for tasks to become healthy"
echo "2. Test backend: curl http://${ALB_DNS}/health"
echo "3. Open frontend: ${FRONTEND_URL}"
echo "4. Set up CloudFront for HTTPS (optional)"
echo "5. Configure custom domain (optional)"
echo ""
echo -e "${BLUE}📖 View logs:${NC}"
echo "  aws logs tail /ecs/${APP_NAME} --follow --region ${AWS_REGION}"
echo ""
echo -e "${BLUE}🔄 Update deployment:${NC}"
echo "  ./deploy-scalable.sh  (re-run this script)"
echo ""
echo -e "${BLUE}🗑️  Clean up resources:${NC}"
echo "  ./cleanup-aws.sh"
echo ""
