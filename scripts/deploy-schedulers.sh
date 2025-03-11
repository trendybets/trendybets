#!/bin/bash

# Deploy schedulers for TrendyBets data synchronization

# Ensure we're in the right directory
cd "$(dirname "$0")"
SCRIPT_DIR=$(pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")

echo "===== TrendyBets Scheduler Deployment ====="
echo "Setting up in directory: $SCRIPT_DIR"

# Check if .env.local exists in the project root
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    echo "Found .env.local in project root"
    
    # Create a symbolic link in the scripts directory
    echo "Creating symbolic link to .env.local in scripts directory..."
    ln -sf "$PROJECT_ROOT/.env.local" "$SCRIPT_DIR/.env.local"
else
    echo "Warning: .env.local not found in project root"
    echo "Make sure environment variables are accessible to the scripts"
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
else
    echo "PM2 already installed"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "Dependencies already installed"
fi

# Stop existing schedulers if running
echo "Stopping any existing schedulers..."
pm2 stop game-stats-sync api-sync 2>/dev/null || true

# Start the game stats scheduler
echo "Starting Game Statistics Sync scheduler..."
pm2 start npm --name "game-stats-sync" -- run start-scheduler

# Start the API sync scheduler
echo "Starting API Endpoint Sync scheduler..."
pm2 start npm --name "api-sync" -- run start-api-scheduler

# Save PM2 configuration
echo "Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on system boot if not already configured
PM2_STARTUP_PATH=$(pm2 startup | grep -o "sudo .*")
if [ -n "$PM2_STARTUP_PATH" ]; then
    echo "Setting up PM2 to start on system boot..."
    echo "You may need to run the following command with sudo:"
    echo "$PM2_STARTUP_PATH"
fi

# Display status
echo "===== Deployment Complete ====="
echo "Scheduler Status:"
pm2 status

echo ""
echo "To monitor logs:"
echo "  pm2 logs game-stats-sync"
echo "  pm2 logs api-sync"
echo ""
echo "To stop schedulers:"
echo "  pm2 stop game-stats-sync api-sync"

# Make the script executable
chmod +x "$0" 