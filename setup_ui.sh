#!/bin/bash

# 🎨 Brand X Forecasting UI - Automated Setup Script
# ==================================================

echo "🚀 Setting up Brand X Forecasting UI..."
echo "======================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16+ and try again.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}❌ Node.js version 16+ is required. Current version: $(node --version)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) detected${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm --version) detected${NC}"

# Create ui directory if it doesn't exist
if [ ! -d "ui" ]; then
    echo -e "${BLUE}📁 Creating ui directory...${NC}"
    mkdir ui
fi

cd ui

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed successfully${NC}"

# Create .env file
echo -e "${BLUE}⚙️  Creating environment configuration...${NC}"
cat > .env << EOL
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENABLE_VALIDATION=true
REACT_APP_ENABLE_ADVANCED_CHARTS=true
EOL

echo -e "${GREEN}✅ Environment configuration created${NC}"

# Create a simple start script
cat > start.sh << 'EOL'
#!/bin/bash
echo "🎨 Starting Brand X Forecasting UI..."
echo "======================================"
echo ""
echo "🌐 UI will be available at: http://localhost:3000"
echo "🔗 API should be running at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
npm start
EOL

chmod +x start.sh

# Create production build script
cat > build.sh << 'EOL'
#!/bin/bash
echo "🏗️  Building Brand X Forecasting UI for production..."
echo "===================================================="
npm run build
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo "📁 Production files are in: ./build/"
    echo ""
    echo "🚀 To serve the build:"
    echo "   npx serve -s build -l 3000"
    echo ""
else
    echo "❌ Build failed!"
    exit 1
fi
EOL

chmod +x build.sh

echo ""
echo -e "${GREEN}🎉 UI Setup Complete!${NC}"
echo "===================="
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1️⃣  Start the API server:"
echo "   export PG_URI='postgresql+psycopg2://rushabh:Root%40123@localhost:5432/StackLogix'"
echo "   uvicorn app:app --host 0.0.0.0 --port 8000"
echo ""
echo "2️⃣  Start the UI (in another terminal):"
echo "   cd ui && ./start.sh"
echo "   # OR: npm start"
echo ""
echo "3️⃣  Access the dashboard:"
echo "   🌐 http://localhost:3000"
echo ""
echo -e "${YELLOW}📋 Available Scripts:${NC}"
echo "   ./start.sh    - Start development server"
echo "   ./build.sh    - Build for production"
echo "   npm test      - Run tests"
echo ""
echo -e "${GREEN}✨ Your Brand X Forecasting Dashboard is ready!${NC}"
