#!/bin/bash
# Startup script for Render deployment
echo "=== Render Startup Script ==="
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""
echo "Changing to backend directory..."
cd backend || exit 1
echo "Current directory: $(pwd)"
echo ""
echo "Starting server..."
npm start

