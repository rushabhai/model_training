#!/bin/bash

# This script automates the setup and execution of the Brand X Inventory Forecasting UI.

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting Brand X UI Setup..."

# 1. Navigate to the UI directory
if [ -d "ui" ]; then
  echo " entrando en el directorio ui..."
  cd ui
else
  echo "Error: 'ui' directory not found. Please run this script from the project root."
  exit 1
fi

# 2. Install npm dependencies
echo " instalando las dependencias npm..."
if command -v npm &> /dev/null
then
    npm install
elif command -v yarn &> /dev/null
then
    yarn install
else
    echo "Error: npm or Yarn not found. Please install Node.js and npm/Yarn."
    exit 1
fi

# 3. Start the React development server
echo " iniciando el servidor de desarrollo de React..."
npm start

echo "✅ Brand X UI Setup Complete! The UI should be running at http://localhost:3000"
