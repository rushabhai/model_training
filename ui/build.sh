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
