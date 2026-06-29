#!/bin/bash

# JAGGER SWAP Frontend Setup Script

set -e

echo "🔧 Setting up JAGGER SWAP Frontend..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"
echo "✓ npm version: $(npm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
cd frontend
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
fi

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "To start the development server:"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Frontend will be available at: http://localhost:3000"
