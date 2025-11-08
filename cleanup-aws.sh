#!/bin/bash

# 🗑️ Health Helper - AWS Resource Cleanup Script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         AWS Resource Cleanup - Health Helper            ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

APP_NAME="health-helper"
AWS_REGION="us-west-2"

echo -e "${YELLOW}⚠️  This will DELETE all AWS resources for Health Helper:${NC}"
echo "  • ECS Cluster and Services"
echo "  • Load Balancer and Target Groups"
echo "  • ECR Repository (container images)"
echo "  • S3 Buckets (frontend and uploads)"
echo "  • VPC, Subnets, Security Groups"
echo "  • IAM Roles"
echo ""
read -p "Are you sure? Type 'DELETE' to confirm: " confirm

if [ "$confirm" != "DELETE" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting cleanup...${NC}"

# 1. Delete ECS Service
echo "Deleting ECS service..."
CLUSTER_NAME="${APP_NAME}-cluster"
SERVICE_NAME="${APP_NAME}-service"

aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --desired-count 0 \
    --region ${AWS_REGION} 2>/dev/null || true

aws ecs delete-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --force \
    --region ${AWS_REGION} 2>/dev/null || true

echo "Waiting for service to drain..."
sleep 30

# 2. Delete ECS Cluster
echo "Deleting ECS cluster..."
aws ecs delete-cluster \
    --cluster ${CLUSTER_NAME} \
    --region ${AWS_REGION} 2>/dev/null || true

# 3. Delete Load Balancer
echo "Deleting load balancer..."
ALB_NAME="${APP_NAME}-alb"
ALB_ARN=$(aws elbv2 describe-load-balancers \
    --names ${ALB_NAME} \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "")

if [ -n "$ALB_ARN" ]; then
    aws elbv2 delete-load-balancer \
        --load-balancer-arn ${ALB_ARN} \
        --region ${AWS_REGION}

    echo "Waiting for ALB to be deleted..."
    sleep 30
fi

# 4. Delete Target Group
echo "Deleting target group..."
TG_NAME="${APP_NAME}-tg"
TG_ARN=$(aws elbv2 describe-target-groups \
    --names ${TG_NAME} \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "")

if [ -n "$TG_ARN" ]; then
    aws elbv2 delete-target-group \
        --target-group-arn ${TG_ARN} \
        --region ${AWS_REGION} 2>/dev/null || true
fi

# 5. Delete ECR Repository
echo "Deleting ECR repository..."
ECR_REPO_NAME="${APP_NAME}-backend"
aws ecr delete-repository \
    --repository-name ${ECR_REPO_NAME} \
    --force \
    --region ${AWS_REGION} 2>/dev/null || true

# 6. Delete S3 Buckets
echo "Deleting S3 buckets..."
for bucket in $(aws s3 ls | grep ${APP_NAME} | awk '{print $3}'); do
    echo "  Deleting bucket: $bucket"
    aws s3 rb s3://$bucket --force 2>/dev/null || true
done

# 7. Delete Security Groups
echo "Deleting security groups..."
VPC_NAME="${APP_NAME}-vpc"
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=tag:Name,Values=${VPC_NAME}" \
    --query 'Vpcs[0].VpcId' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "")

if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "None" ]; then
    for sg in $(aws ec2 describe-security-groups \
        --filters "Name=vpc-id,Values=${VPC_ID}" \
        --query 'SecurityGroups[?GroupName!=`default`].GroupId' \
        --output text \
        --region ${AWS_REGION} 2>/dev/null); do

        echo "  Deleting security group: $sg"
        aws ec2 delete-security-group --group-id $sg --region ${AWS_REGION} 2>/dev/null || true
    done
fi

# 8. Delete Subnets
if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "None" ]; then
    echo "Deleting subnets..."
    for subnet in $(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=${VPC_ID}" \
        --query 'Subnets[].SubnetId' \
        --output text \
        --region ${AWS_REGION} 2>/dev/null); do

        echo "  Deleting subnet: $subnet"
        aws ec2 delete-subnet --subnet-id $subnet --region ${AWS_REGION} 2>/dev/null || true
    done
fi

# 9. Delete Internet Gateway
if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "None" ]; then
    echo "Deleting internet gateway..."
    IGW_ID=$(aws ec2 describe-internet-gateways \
        --filters "Name=attachment.vpc-id,Values=${VPC_ID}" \
        --query 'InternetGateways[0].InternetGatewayId' \
        --output text \
        --region ${AWS_REGION} 2>/dev/null || echo "")

    if [ -n "$IGW_ID" ] && [ "$IGW_ID" != "None" ]; then
        aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region ${AWS_REGION} 2>/dev/null || true
        aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID --region ${AWS_REGION} 2>/dev/null || true
    fi
fi

# 10. Delete VPC
if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "None" ]; then
    echo "Deleting VPC..."
    aws ec2 delete-vpc --vpc-id ${VPC_ID} --region ${AWS_REGION} 2>/dev/null || true
fi

# 11. Delete IAM Roles
echo "Deleting IAM roles..."
TASK_EXEC_ROLE_NAME="${APP_NAME}-task-execution-role"
TASK_ROLE_NAME="${APP_NAME}-task-role"

# Detach policies and delete execution role
aws iam detach-role-policy \
    --role-name ${TASK_EXEC_ROLE_NAME} \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true

aws iam delete-role --role-name ${TASK_EXEC_ROLE_NAME} 2>/dev/null || true

# Delete inline policy and task role
aws iam delete-role-policy \
    --role-name ${TASK_ROLE_NAME} \
    --policy-name ${APP_NAME}-task-permissions 2>/dev/null || true

aws iam delete-role --role-name ${TASK_ROLE_NAME} 2>/dev/null || true

# 12. Delete CloudWatch Log Groups
echo "Deleting CloudWatch logs..."
aws logs delete-log-group --log-group-name /ecs/${APP_NAME} --region ${AWS_REGION} 2>/dev/null || true

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            CLEANUP COMPLETE! ✅                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "All Health Helper resources have been deleted."
echo ""
