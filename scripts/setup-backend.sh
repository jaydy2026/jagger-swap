#!/bin/bash

# JAGGER SWAP Backend Setup Script

set -e

echo "🔧 Setting up JAGGER SWAP Backend..."

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PYTHON_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
PYTHON_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 11 ]); then
    echo "❌ Python 3.11+ is required. Current version: $PYTHON_VERSION"
    exit 1
fi

echo "✓ Python version: $PYTHON_VERSION"
echo "✓ pip version: $(pip --version | cut -d' ' -f2)"

# Create virtual environment
echo "📦 Creating virtual environment..."
cd backend
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
fi

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "To start the development server:"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  uvicorn app.main:app --reload"
echo ""
echo "API will be available at: http://localhost:8000"
echo "API docs at: http://localhost:8000/docs"
