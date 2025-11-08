#!/bin/bash

# Setup script to run on EC2 instance
echo "🚀 Setting up Health Helper Backend on EC2..."

# Update system
sudo yum update -y

# Install Node.js 18
echo "Installing Node.js..."
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git

# Verify installation
node --version
npm --version

# Create app directory
mkdir -p /home/ec2-user/health-helper
cd /home/ec2-user/health-helper

echo "✅ System setup complete!"
echo "Backend will run on port 3001"
