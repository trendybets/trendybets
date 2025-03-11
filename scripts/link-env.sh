#!/bin/bash

# Create a symbolic link from the project root .env.local to the scripts directory

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Get the project root directory (one level up)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if .env.local exists in the project root
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    echo "Found .env.local in project root: $PROJECT_ROOT/.env.local"
    
    # Create a symbolic link in the scripts directory
    echo "Creating symbolic link in scripts directory..."
    ln -sf "$PROJECT_ROOT/.env.local" "$SCRIPT_DIR/.env.local"
    
    # Check if the link was created successfully
    if [ -L "$SCRIPT_DIR/.env.local" ]; then
        echo "✅ Symbolic link created successfully!"
        echo "You can now run the scripts from the scripts directory"
    else
        echo "❌ Failed to create symbolic link"
    fi
else
    echo "❌ .env.local not found in project root: $PROJECT_ROOT/.env.local"
    echo "Please create the .env.local file in the project root first"
fi 