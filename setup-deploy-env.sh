#!/bin/bash

# Setup script for AWS deployment tools
# This creates a virtual environment and installs deployment dependencies

set -e

echo "🔧 Setting up deployment environment..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv-deploy" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv-deploy
else
    echo "Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv-deploy/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install deployment tools
echo "Installing AWS deployment tools..."
pip install -r requirements-deploy.txt

echo ""
echo "✅ Deployment environment setup complete!"
echo ""
echo "To use this environment:"
echo "  1. Activate it:  source venv-deploy/bin/activate"
echo "  2. Run deployment:  ./deploy-to-aws.sh"
echo "  3. When done:  deactivate"
echo ""
