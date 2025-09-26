#!/bin/bash

# AI Agent Setup Script
# This script helps you set up your OpenAI API key and configure the environment

set -e

echo "🤖 AI Agent Setup"
echo "=================="

# Check if .envrc exists
if [ ! -f .envrc ]; then
    echo "❌ Error: .envrc file not found!"
    echo "Please ensure you're in the correct project directory."
    exit 1
fi

# Check if direnv is installed
if ! command -v direnv &> /dev/null; then
    echo "⚠️  direnv is not installed."
    echo "Install it with: brew install direnv (macOS) or apt install direnv (Ubuntu)"
    echo "Continuing with manual setup..."
fi

echo ""
echo "📝 Current configuration:"
grep -E "^export" .envrc | sed 's/export //' | sed 's/=/: /'

echo ""
echo "🔑 To set up your OpenAI API key:"
echo "1. Get your API key from: https://platform.openai.com/api-keys"
echo "2. Edit the .envrc file: nano .envrc"
echo "3. Replace 'your_openai_api_key_here' with your actual API key"
echo "4. Save and exit the editor"
echo ""

read -p "Do you want to edit the .envrc file now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v nano &> /dev/null; then
        nano .envrc
    elif command -v vim &> /dev/null; then
        vim .envrc
    elif command -v code &> /dev/null; then
        code .envrc
    else
        echo "Please edit .envrc manually with your preferred text editor."
    fi
fi

echo ""
echo "🔄 Reloading environment..."
if command -v direnv &> /dev/null; then
    direnv reload
    echo "✅ Environment reloaded with direnv!"
else
    echo "⚠️  direnv not available. Please source manually:"
    echo "   source .envrc"
fi

echo ""
echo "🧪 Testing configuration..."
if [ -n "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "your_openai_api_key_here" ]; then
    echo "✅ OpenAI API key is configured!"
    echo "🚀 Ready to start the server with: npm run dev"
else
    echo "⚠️  Please set your OPENAI_API_KEY in the .envrc file"
    echo "📝 Get your key from: https://platform.openai.com/api-keys"
fi

echo ""
echo "📊 Server will run on: http://localhost:$PORT"
echo "🏥 Health check: http://localhost:$PORT/health"
echo "📈 Metrics: http://localhost:$PORT/metrics"
