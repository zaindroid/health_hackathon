# 🚀 Deploy Health Helper to AWS - Quick Start

## Prerequisites ✅

You already have:
- ✅ AWS credentials configured
- ✅ Region set to `us-west-2`

## Option 1: Automated Deployment (Recommended)

Run the deployment script:

```bash
cd /home/user/health_hackathon
chmod +x deploy-to-aws.sh
./deploy-to-aws.sh
```

This will:
1. Deploy backend to Elastic Beanstalk
2. Deploy frontend to S3
3. Give you URLs for both

**Time**: ~10-15 minutes

---

## Option 2: Manual Step-by-Step

### Step 1: Install Required Tools

```bash
# Install EB CLI
pip install awsebcli awscli

# Verify installation
eb --version
aws --version
```

### Step 2: Deploy Backend

```bash
cd backend

# Initialize Elastic Beanstalk
eb init -p "Node.js 18" health-helper --region us-west-2

# Create environment
eb create health-helper-env \
  --instance-type t3.small \
  --region us-west-2

# Set environment variables
eb setenv \
  DEEPGRAM_API_KEY=your_deepgram_key_here \
  AWS_REGION=us-west-2 \
  AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v2:0 \
  NODE_ENV=production

# Get backend URL
eb status | grep CNAME
```

### Step 3: Deploy Frontend

```bash
cd ../frontend

# Create production env file with backend URL
echo "VITE_WS_URL=ws://YOUR-EB-URL.elasticbeanstalk.com" > .env.production
echo "VITE_API_URL=http://YOUR-EB-URL.elasticbeanstalk.com" >> .env.production

# Build
npm run build

# Create S3 bucket
BUCKET_NAME="health-helper-frontend-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region us-west-2

# Configure as website
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document index.html

# Upload files
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Make public
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"PublicReadGetObject\",
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$BUCKET_NAME/*\"
  }]
}"

# Get URL
echo "Frontend URL: http://$BUCKET_NAME.s3-website-us-west-2.amazonaws.com"
```

---

## Important: Set API Keys

After deployment, set your API keys in Elastic Beanstalk:

```bash
cd backend
eb setenv \
  DEEPGRAM_API_KEY=your_actual_deepgram_key \
  AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v2:0
```

---

## Monitoring & Logs

```bash
# View logs
cd backend
eb logs --stream

# Check health
eb health

# Open in browser
eb open
```

---

## Update/Redeploy

### Update Backend
```bash
cd backend
eb deploy
```

### Update Frontend
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://YOUR-BUCKET-NAME --delete
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
cd backend
eb logs

# Common issues:
# 1. Missing DEEPGRAM_API_KEY - run: eb setenv DEEPGRAM_API_KEY=your_key
# 2. Port mismatch - EB uses port 8080, update server.ts if needed
```

### Frontend can't connect
```bash
# 1. Check backend URL in .env.production
# 2. Verify backend is running: curl http://YOUR-EB-URL.elasticbeanstalk.com/health
# 3. Check CORS settings in backend
```

### WebSocket connection fails
```bash
# Ensure using ws:// (not wss://) for HTTP backend
# For HTTPS, need to set up CloudFront
```

---

## Cost Warning ⚠️

Current setup costs approximately **$15-25/month**:
- Elastic Beanstalk (t3.small): ~$15/month
- S3 storage: ~$1/month
- Data transfer: ~$5/month

**To minimize costs:**
- Use `t3.micro` instead of `t3.small`
- Delete resources when not in use: `eb terminate health-helper-env`

---

## Clean Up (When Done)

```bash
# Delete backend
cd backend
eb terminate health-helper-env

# Delete frontend
aws s3 rb s3://YOUR-BUCKET-NAME --force
```

---

## Need HTTPS?

See full guide: `deployment/aws-deployment-guide.md`

Quick CloudFront setup:
```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name YOUR-BUCKET-NAME.s3.us-west-2.amazonaws.com \
  --default-root-object index.html
```
