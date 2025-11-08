#!/bin/bash

# Health Helper - Quick AWS Deployment Script
# This script deploys both frontend and backend to AWS

set -e  # Exit on error

echo "🚀 Starting Health Helper AWS Deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_DEFAULT_REGION:-us-west-2}"
APP_NAME="health-helper"
FRONTEND_BUCKET="${APP_NAME}-frontend-$(date +%s)"
BACKEND_ZIP="${APP_NAME}-backend.zip"

echo -e "${BLUE}📍 Region: $REGION${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Installing with pipx...${NC}"
    # Try pipx first, fallback to manual installation
    if command -v pipx &> /dev/null; then
        pipx install awscli
    else
        echo -e "${RED}Please install AWS CLI manually: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html${NC}"
        exit 1
    fi
fi

# Check credentials
echo -e "${BLUE}🔐 Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured properly${NC}"
    exit 1
fi
echo -e "${GREEN}✅ AWS credentials verified${NC}"

# ====================
# DEPLOY BACKEND
# ====================

echo -e "\n${BLUE}📦 Deploying Backend with Elastic Beanstalk...${NC}"

cd backend

# Install dependencies and build
echo "Installing dependencies..."
npm install

echo "Building TypeScript..."
npm run build

# Create deployment package
echo "Creating deployment package..."
zip -r ../$BACKEND_ZIP . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "*.db" \
  -x "*.db-shm" \
  -x "*.db-wal" \
  -x "uploads/*" \
  -x "dist/*" \
  -x ".env*" \
  -x ".elasticbeanstalk/*" \
  -x "venv/*" \
  -x "venv-deploy/*" \
  -x "python-services/venv/*" \
  -x "*__pycache__*" \
  -x "*.pyc" \
  -x "*.pyo" \
  -x "*:Zone.Identifier" \
  -x "video health signals/*" \
  -x "navigation_tests/*"

cd ..

# Install EB CLI if not present
if ! command -v eb &> /dev/null; then
    echo "Installing Elastic Beanstalk CLI..."
    # Try pipx first (cleanest approach)
    if command -v pipx &> /dev/null; then
        pipx install awsebcli
        # Ensure pipx bin directory is in PATH
        export PATH="$HOME/.local/bin:$PATH"
    else
        # Fallback to virtual environment
        echo "Using Python virtual environment for EB CLI..."
        if [ ! -d "/tmp/eb-venv" ]; then
            python3 -m venv /tmp/eb-venv
        fi
        /tmp/eb-venv/bin/pip install --quiet awsebcli
        # Add to PATH for this session
        export PATH="/tmp/eb-venv/bin:$PATH"
    fi

    # Verify installation
    if ! command -v eb &> /dev/null; then
        echo -e "${RED}❌ Failed to install EB CLI. Please install manually: pip install awsebcli --user${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ EB CLI installed successfully${NC}"
fi

# Initialize EB application (if not exists)
if [ ! -d "backend/.elasticbeanstalk" ]; then
    echo "Initializing Elastic Beanstalk..."
    cd backend
    # Use Node.js platform branch (EB will select latest compatible version)
    eb init -p node.js $APP_NAME --region $REGION
    cd ..
fi

# Create environment or deploy
cd backend
if ! eb list | grep -q "${APP_NAME}-env"; then
    echo "Creating new Elastic Beanstalk environment..."
    eb create ${APP_NAME}-env \
      --instance-type t3.small \
      --envvars NODE_ENV=production,PORT=8080 \
      --region $REGION
else
    echo "Deploying to existing environment..."
    eb deploy
fi

# Get backend URL
BACKEND_URL=$(eb status | grep "CNAME:" | awk '{print $2}')
echo -e "${GREEN}✅ Backend deployed at: http://$BACKEND_URL${NC}"

cd ..

# ====================
# DEPLOY FRONTEND
# ====================

echo -e "\n${BLUE}📦 Deploying Frontend to S3...${NC}"

cd frontend

# Create .env.production with backend URL
echo "Creating production environment file..."
cat > .env.production <<EOF
VITE_WS_URL=ws://$BACKEND_URL
VITE_API_URL=http://$BACKEND_URL
EOF

# Install and build
echo "Installing frontend dependencies..."
npm install

echo "Building frontend..."
npm run build

# Create S3 bucket
echo "Creating S3 bucket: $FRONTEND_BUCKET..."
aws s3 mb s3://$FRONTEND_BUCKET --region $REGION || echo "Bucket may already exist"

# Configure as static website
aws s3 website s3://$FRONTEND_BUCKET \
  --index-document index.html \
  --error-document index.html

# Upload files
echo "Uploading files to S3..."
aws s3 sync dist/ s3://$FRONTEND_BUCKET --delete

# Make bucket public
echo "Making bucket public..."
aws s3api put-bucket-policy --bucket $FRONTEND_BUCKET --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"PublicReadGetObject\",
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$FRONTEND_BUCKET/*\"
  }]
}"

# Get website URL
FRONTEND_URL="http://$FRONTEND_BUCKET.s3-website-$REGION.amazonaws.com"

cd ..

# ====================
# SUMMARY
# ====================

echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo -e "\n======================================"
echo -e "${BLUE}Frontend URL:${NC} $FRONTEND_URL"
echo -e "${BLUE}Backend URL:${NC} http://$BACKEND_URL"
echo -e "======================================"

echo -e "\n${BLUE}⚙️  Next Steps:${NC}"
echo "1. Configure environment variables in Elastic Beanstalk:"
echo "   eb setenv DEEPGRAM_API_KEY=your_key AWS_BEDROCK_MODEL_ID=your_model"
echo ""
echo "2. Visit your frontend: $FRONTEND_URL"
echo ""
echo "3. Monitor logs: eb logs --stream"
echo ""
echo -e "${RED}⚠️  Note: URLs use HTTP. For HTTPS, set up CloudFront + ACM certificate.${NC}"

# Save deployment info
cat > deployment-info.txt <<EOF
Health Helper Deployment Info
=============================
Deployed: $(date)
Region: $REGION

Frontend:
  URL: $FRONTEND_URL
  S3 Bucket: $FRONTEND_BUCKET

Backend:
  URL: http://$BACKEND_URL
  Elastic Beanstalk App: $APP_NAME
  Environment: ${APP_NAME}-env

Next Steps:
1. Set environment variables:
   cd backend && eb setenv DEEPGRAM_API_KEY=your_key

2. View logs:
   cd backend && eb logs --stream

3. Update backend:
   cd backend && eb deploy

4. Update frontend:
   cd frontend && npm run build && aws s3 sync dist/ s3://$FRONTEND_BUCKET
EOF

echo -e "\n${GREEN}📝 Deployment info saved to: deployment-info.txt${NC}"
