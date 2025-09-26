#!/bin/bash

# AI Agent Deployment Script
# This script helps deploy the application to production

set -e  # Exit on any error

echo "🚀 Starting AI Agent deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Please create it with your OpenAI API key."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building application..."
npm run build

# Run tests (if available)
if npm test --silent 2>/dev/null; then
    echo "🧪 Running tests..."
    npm test
else
    echo "⚠️  No tests found, skipping test phase..."
fi

# Start the application
echo "🌟 Starting production server..."
echo "📝 Server will be available at http://localhost:3001"
echo "📊 Health check: http://localhost:3001/health"

# Production start
npm start
