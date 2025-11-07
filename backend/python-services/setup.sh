#!/bin/bash

# Medical Video Analysis Service - Setup Script

echo "🔬 Setting up Medical Video Analysis Service..."

# Check Python version
python_version=$(python3.10 --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3.10 -m venv venv

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the service:"
echo "  1. Activate venv: source venv/bin/activate"
echo "  2. Run server: uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "Or use Docker:"
echo "  docker build -t medical-analyzer ."
echo "  docker run -p 8000:8000 medical-analyzer"
echo ""
