#!/bin/bash

# Simple EC2 Deployment for AWS Learner Lab
# This works within Learner Lab constraints

set -e

echo "🚀 Deploying Health Helper Backend to EC2..."

# Create security group
SG_NAME="health-helper-sg"
echo "Creating security group..."

SG_ID=$(aws ec2 create-security-group \
    --group-name ${SG_NAME} \
    --description "Health Helper Security Group" \
    --region us-west-2 \
    --query 'GroupId' \
    --output text 2>/dev/null || \
aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${SG_NAME}" \
    --query 'SecurityGroups[0].GroupId' \
    --output text --region us-west-2)

echo "Security Group: $SG_ID"

# Allow SSH, HTTP, and backend port
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp --port 22 --cidr 0.0.0.0/0 --region us-west-2 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp --port 80 --cidr 0.0.0.0/0 --region us-west-2 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp --port 3001 --cidr 0.0.0.0/0 --region us-west-2 2>/dev/null || true

# Create key pair if doesn't exist
KEY_NAME="health-helper-key"
if [ ! -f "${KEY_NAME}.pem" ]; then
    echo "Creating SSH key pair..."
    aws ec2 create-key-pair \
        --key-name ${KEY_NAME} \
        --query 'KeyMaterial' \
        --output text \
        --region us-west-2 > ${KEY_NAME}.pem
    chmod 400 ${KEY_NAME}.pem
    echo "✅ SSH key saved to ${KEY_NAME}.pem"
fi

# Launch EC2 instance
echo "Launching EC2 instance..."

# Get latest Amazon Linux 2023 AMI
AMI_ID=$(aws ec2 describe-images \
    --owners amazon \
    --filters "Name=name,Values=al2023-ami-2023.*-x86_64" \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
    --output text \
    --region us-west-2)

echo "Using AMI: $AMI_ID"

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ${AMI_ID} \
    --count 1 \
    --instance-type t3.small \
    --key-name ${KEY_NAME} \
    --security-group-ids ${SG_ID} \
    --region us-west-2 \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=health-helper-backend}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance launched: $INSTANCE_ID"
echo "Waiting for instance to be running..."

aws ec2 wait instance-running \
    --instance-ids $INSTANCE_ID \
    --region us-west-2

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region us-west-2)

echo "✅ Instance is running!"
echo "Public IP: $PUBLIC_IP"
echo ""
echo "📝 Next steps:"
echo "1. Wait 30 seconds for instance to fully initialize"
echo "2. SSH into instance: ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo "3. Install Node.js and deploy backend manually"
echo ""
echo "Or run the automated setup script:"
echo "  ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP 'bash -s' < setup-backend-on-ec2.sh"
echo ""
echo "Backend URL will be: http://$PUBLIC_IP:3001"
echo "Frontend can connect to: ws://$PUBLIC_IP:3001"
