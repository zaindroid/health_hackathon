# 🚀 Health Helper - Ready to Deploy to AWS!

## ✅ Pre-Deployment Checklist

- [x] AWS credentials configured
- [x] Backend updated with latest fixes
- [x] Frontend updated with report visualization
- [x] Deployment scripts created
- [x] Architecture documented

---

## 🎯 AWS Services That Will Be Used

### **Core Infrastructure**
| Service | Purpose | Scaling |
|---------|---------|---------|
| **AWS ECS Fargate** | Backend containers | 2-10 tasks (auto-scale) |
| **Application Load Balancer** | Traffic distribution | Automatic |
| **Amazon ECR** | Container images | Unlimited storage |
| **Amazon S3** | Frontend + uploads | Unlimited |
| **AWS CloudFront** | CDN (optional) | Global edge locations |

### **AI/ML Services**
| Service | Purpose | Usage |
|---------|---------|-------|
| **AWS Bedrock** | Claude 3.5 Sonnet LLM | Pay per token |
| **Amazon Polly** | Text-to-speech | Pay per character |
| **Amazon Transcribe** | Speech-to-text (future) | Pay per minute |

### **Data & Storage**
| Service | Purpose | Scaling |
|---------|---------|---------|
| **Amazon RDS Aurora** | PostgreSQL database (future) | 0.5-4 ACUs |
| **Amazon S3** | File storage | Unlimited |
| **Amazon ElastiCache** | Session cache (future) | Redis |

### **Monitoring & Security**
| Service | Purpose |
|---------|---------|
| **AWS CloudWatch** | Logs, metrics, alarms |
| **AWS X-Ray** | Distributed tracing |
| **AWS WAF** | Web firewall |
| **AWS IAM** | Access management |
| **AWS Secrets Manager** | API keys |

---

## 💰 Cost Breakdown

### **Option 1: Simple Deployment (Elastic Beanstalk)**
```
Monthly Cost: $15-30
- t3.small instance: $15/month
- S3: $1/month
- Data transfer: $5/month
- Bedrock API: $10/month (estimated)

Best for: MVP, Testing, Low Traffic
```

### **Option 2: Scalable Deployment (ECS Fargate)**
```
Monthly Cost: $150-400
- ECS Fargate (2-10 tasks): $35-175/month
- Application Load Balancer: $20/month
- RDS Aurora Serverless: $40-160/month
- S3 + CloudFront: $15/month
- Bedrock + Polly: $20/month
- CloudWatch: $10/month

Best for: Production, High Availability, Growth
```

---

## 🚀 How to Deploy

### **Quick Start (Recommended for Testing)**

```bash
# Simple deployment - Elastic Beanstalk + S3
./deploy-to-aws.sh
```

**Time:** 10-15 minutes
**Cost:** ~$20/month
**Scalability:** Limited

---

### **Production Deployment (Scalable)**

```bash
# Scalable deployment - ECS Fargate + ALB + Aurora
./deploy-scalable.sh
```

**Time:** 20-30 minutes
**Cost:** ~$150-400/month
**Scalability:** Auto-scales 2-10 containers
**High Availability:** Multi-AZ

---

## 📋 Deployment Steps (Scalable)

The `deploy-scalable.sh` script will automatically:

1. ✅ **Create ECR Repository** - Store container images
2. ✅ **Build Docker Image** - Package backend application
3. ✅ **Push to ECR** - Upload to container registry
4. ✅ **Create VPC & Networking** - Set up network infrastructure
5. ✅ **Create Security Groups** - Configure firewall rules
6. ✅ **Deploy Load Balancer** - Set up traffic distribution
7. ✅ **Create ECS Cluster** - Launch container platform
8. ✅ **Deploy ECS Service** - Start backend containers (2 tasks)
9. ✅ **Configure Auto-Scaling** - Set up 2-10 task scaling
10. ✅ **Deploy Frontend to S3** - Upload React app
11. ✅ **Configure Monitoring** - Set up CloudWatch logs

---

## 🔧 What You Need Before Deploying

### 1. AWS CLI Configured ✅
```bash
aws configure
# Already done!
```

### 2. Docker Installed ✅
```bash
docker --version
# Should show Docker version
```

### 3. Environment Variables

The deployment script will use your existing `.env` file for:
- `AWS_REGION` - us-west-2 ✅
- `AWS_BEDROCK_MODEL_ID` - Claude 3.5 Sonnet ✅
- `DEEPGRAM_API_KEY` - Your API key ✅

---

## 📊 What Gets Deployed

### **Backend (ECS Fargate)**
```
Container Specifications:
- Image: Node.js 18 Alpine
- CPU: 0.5 vCPU per task
- Memory: 1 GB per task
- Count: 2 tasks (min), 10 tasks (max)
- Port: 3001 (internal)
- Health Check: /health endpoint

Auto-Scaling Triggers:
- CPU > 70% → Add 2 tasks
- CPU < 30% for 5 min → Remove 1 task
- Memory > 80% → Add 2 tasks
```

### **Load Balancer**
```
Configuration:
- Type: Application Load Balancer
- Scheme: Internet-facing
- Ports: 80 (HTTP), 443 (HTTPS - future)
- Health Check: /health every 30s
- Targets: ECS tasks
- Stickiness: Enabled for WebSockets
```

### **Frontend (S3)**
```
Configuration:
- Bucket: health-helper-frontend-{timestamp}
- Website hosting: Enabled
- Index: index.html
- Error document: index.html (SPA)
- Public access: Enabled
- CORS: Configured for API
```

---

## 🎯 After Deployment

### **You'll get:**
```bash
✅ Backend URL:  http://health-helper-alb-xxxxxxxxx.us-west-2.elb.amazonaws.com
✅ Frontend URL: http://health-helper-frontend-{timestamp}.s3-website-us-west-2.amazonaws.com

📊 Monitoring:
- CloudWatch Logs: /ecs/health-helper
- ECS Console: https://console.aws.amazon.com/ecs/
```

### **Test Your Deployment:**
```bash
# 1. Test backend health
curl http://YOUR-ALB-DNS/health

# 2. Open frontend in browser
open http://YOUR-FRONTEND-URL

# 3. Check logs
aws logs tail /ecs/health-helper --follow --region us-west-2
```

---

## 🔄 Update Deployment

### **Backend Update:**
```bash
cd backend
# Make your changes
git commit -am "Update backend"

# Re-run deployment (will build new image and deploy)
cd ..
./deploy-scalable.sh
```

### **Frontend Update:**
```bash
cd frontend
# Make your changes
npm run build

# Upload to S3
aws s3 sync dist/ s3://YOUR-BUCKET-NAME --delete
```

---

## 🗑️ Clean Up Resources

When you're done testing or want to remove everything:

```bash
./cleanup-aws.sh
```

This will delete **ALL** resources:
- ECS cluster and services
- Load balancer
- ECR repository
- S3 buckets
- VPC and networking
- IAM roles
- CloudWatch logs

**⚠️ Warning:** This is irreversible!

---

## 🛠️ Troubleshooting

### **Backend won't start?**
```bash
# Check ECS service status
aws ecs describe-services \
  --cluster health-helper-cluster \
  --services health-helper-service \
  --region us-west-2

# Check task logs
aws logs tail /ecs/health-helper --follow --region us-west-2

# Common issues:
# 1. Missing environment variables
# 2. Docker image not found in ECR
# 3. Health check failing
```

### **Can't access frontend?**
```bash
# Check if bucket exists
aws s3 ls | grep health-helper

# Check bucket policy (must be public)
aws s3api get-bucket-policy --bucket YOUR-BUCKET-NAME

# Re-upload frontend
cd frontend
npm run build
aws s3 sync dist/ s3://YOUR-BUCKET-NAME --delete
```

### **Load balancer shows unhealthy?**
```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn YOUR-TG-ARN \
  --region us-west-2

# Common issues:
# 1. Health check path wrong (/health must exist)
# 2. Security group blocking traffic
# 3. Tasks not starting properly
```

---

## 📈 Monitoring & Scaling

### **View Metrics in CloudWatch:**
```bash
# Open CloudWatch dashboard
https://console.aws.amazon.com/cloudwatch/home?region=us-west-2

# Key metrics to watch:
- ECS CPU Utilization
- ECS Memory Utilization
- ALB Request Count
- ALB Target Response Time
- ALB 5XX Errors
```

### **Scale Manually (if needed):**
```bash
# Increase to 5 tasks
aws ecs update-service \
  --cluster health-helper-cluster \
  --service health-helper-service \
  --desired-count 5 \
  --region us-west-2
```

---

## 🔒 Security Best Practices

✅ **Already Implemented:**
- IAM roles for ECS tasks (not using root credentials)
- Security groups (least privilege access)
- Private subnets for tasks (future)
- CloudWatch logging enabled

🚧 **To Add for Production:**
- [ ] HTTPS/SSL certificate (ACM + CloudFront)
- [ ] WAF rules for DDoS protection
- [ ] Secrets Manager for API keys
- [ ] VPC endpoints for AWS services
- [ ] Database encryption at rest
- [ ] Multi-AZ deployment
- [ ] Backup automation

---

## 🎯 Next Steps After Deployment

1. **Test the Application**
   - Upload a sample medical report
   - Try voice interaction
   - Test video analysis
   - Check all features work

2. **Set Up Custom Domain (Optional)**
   ```bash
   # Buy domain in Route 53
   # Create ACM certificate
   # Set up CloudFront distribution
   # Point domain to CloudFront
   ```

3. **Enable HTTPS**
   ```bash
   # Request ACM certificate
   # Update ALB to use HTTPS
   # Update frontend to use wss:// for WebSocket
   ```

4. **Set Up CI/CD**
   ```bash
   # Option 1: GitHub Actions (recommended)
   # Option 2: AWS CodePipeline
   # Automatically deploy on git push
   ```

5. **Monitor and Optimize**
   - Set up CloudWatch alarms
   - Configure auto-scaling thresholds
   - Optimize container size
   - Enable caching where appropriate

---

## 📞 Need Help?

- **AWS Documentation:** https://docs.aws.amazon.com/
- **ECS Troubleshooting:** https://docs.aws.amazon.com/ecs/latest/userguide/troubleshooting.html
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#logsV2:log-groups

---

## ⚡ Quick Command Reference

```bash
# Deploy everything
./deploy-scalable.sh

# View logs
aws logs tail /ecs/health-helper --follow --region us-west-2

# Check service status
aws ecs describe-services --cluster health-helper-cluster --services health-helper-service --region us-west-2

# Update frontend
cd frontend && npm run build && aws s3 sync dist/ s3://YOUR-BUCKET --delete

# Scale up
aws ecs update-service --cluster health-helper-cluster --service health-helper-service --desired-count 5 --region us-west-2

# Clean everything
./cleanup-aws.sh
```

---

## 🚀 Ready to Deploy?

Run this command to start:

```bash
./deploy-scalable.sh
```

**Estimated time:** 20-30 minutes
**Estimated cost:** $150-400/month

Good luck! 🎉
