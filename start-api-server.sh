#!/bin/bash

# Start API Server Script
echo "🚀 Starting API Server on port 3002..."

# Set environment variables for development
export NODE_ENV=development

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Loaded environment variables from .env"
else
    echo "⚠️ Warning: .env file not found"
fi

# Check if Cloudinary environment variables are set
if [ -z "$VITE_CLOUDINARY_CLOUD_NAME" ]; then
    echo "⚠️ Warning: VITE_CLOUDINARY_CLOUD_NAME not set"
else
    echo "✅ Cloudinary Cloud Name: $VITE_CLOUDINARY_CLOUD_NAME"
fi

if [ -z "$VITE_CLOUDINARY_API_KEY" ]; then
    echo "⚠️ Warning: VITE_CLOUDINARY_API_KEY not set"  
else
    echo "✅ Cloudinary API Key configured"
fi

if [ -z "$VITE_CLOUDINARY_API_SECRET" ]; then
    echo "⚠️ Warning: VITE_CLOUDINARY_API_SECRET not set"
else
    echo "✅ Cloudinary API Secret configured"
fi

# Force port 3002 for API server
export PORT=3002

# Start the server
node server.js
