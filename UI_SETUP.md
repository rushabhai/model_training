# 🎨 Brand X Forecasting UI - Complete Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd ui
npm install
```

### 2. Set Environment Variables
```bash
# Create .env file in ui/ directory
echo "REACT_APP_API_URL=http://localhost:8000" > .env
```

### 3. Start the Development Server
```bash
npm start
```

The UI will be available at `http://localhost:3000`

## 🏗️ Architecture Overview

### Component Structure
```
src/
├── components/
│   ├── Dashboard.tsx           # Main dashboard container
│   ├── GlobalFilters.tsx       # Global filter component
│   ├── KPICard.tsx            # Individual KPI metric cards
│   ├── ForecastChart.tsx      # Forecast accuracy trend chart
│   ├── RiskDistributionChart.tsx # Risk level pie chart
│   ├── TopSeriesTable.tsx     # Top performing series table
│   └── ForecastDialog.tsx     # Detailed forecast modal
├── theme.ts                   # Material-UI theme with risk colors
├── types.ts                   # TypeScript interfaces
├── api.ts                     # API service layer
├── App.tsx                    # Root application component
└── index.tsx                  # Application entry point
```

## 🎯 Key Features Implemented

### ✅ Global Filters
- **Brand**, **Channel**, **Warehouse**, **Category** dropdowns
- **Date Range** picker with default 1-year lookback
- **Apply to All APIs**: All forecast and validation requests inherit global filters
- **Filter State Management**: Persistent across all components
- **Clear All**: Reset all filters to default state

### ✅ KPI Dashboard (13 Brand X Metrics)
1. **WAPE** - Weighted Absolute Percentage Error
2. **MAPE** - Mean Absolute Percentage Error  
3. **Bias (ME%)** - Forecast bias percentage
4. **Service Level** - Inventory availability percentage
5. **Fill Rate** - Demand fulfillment rate
6. **Stockout Risk** - Probability of stockout
7. **Overstock %** - Excess inventory percentage
8. **Inventory Turns** - Annual inventory turnover
9. **Days of Cover** - Days of inventory remaining
10. **Revenue at Risk** - Potential lost revenue
11. **Lost Sales** - Units lost due to stockouts
12. **Forecast Value Add** - Model improvement over baseline
13. **Cycle Service Level** - Service probability per SKU

### ✅ Color Coding System
- **🔴 RED (risk.high)**: Stockout risk ≥ 50%, Service level < 90%
- **🟡 AMBER (risk.medium)**: Stockout risk 20-49%
- **🟢 GREEN (risk.low)**: Stockout risk < 20%, Healthy levels
- **🔵 BLUE (overstock)**: Days of Cover > 90, Overstock % > 25%
- **Border Coloring**: Table rows have colored left borders by risk level
- **Value Coloring**: KPI values are colored based on risk thresholds

### ✅ Interactive Components
- **Trend Indicators**: Up/down arrows with percentage changes
- **Clickable Series**: Click any row in top series table to view detailed forecast
- **Forecast Dialog**: Modal with detailed forecast chart and validation
- **Real-time Updates**: Data refreshes when filters change
- **Responsive Design**: Works on desktop, tablet, and mobile

### ✅ Charts & Visualizations
- **Forecast Accuracy Trend**: WAPE/MAPE over time line chart
- **Risk Distribution**: Pie chart showing SKU count by risk level
- **Forecast Chart**: P10/P50/P90 with confidence intervals
- **Performance Indicators**: Visual risk badges and performance scores

## 🎨 Color Palette & Design System

### Risk-Based Colors
```typescript
const riskColors = {
  high: '#d32f2f',     // RED - High risk/stockout
  medium: '#ed6c02',   // AMBER - Medium risk  
  low: '#2e7d32',      // GREEN - Low risk/healthy
  overstock: '#0288d1' // BLUE - Overstock situation
};
```

### KPI Card Styling
- **Left Border**: Colored by risk level
- **Value Color**: Matches risk assessment
- **Trend Chips**: Green (positive) / Red (negative) with arrows
- **Tooltips**: Detailed explanations for each metric

## 📊 API Integration

### Global Filter Application
```typescript
// All API calls automatically include global filters
const forecastRequest = {
  sku_id: "X_003",
  warehouse_id: "bangalore", 
  horizon: 7,
  // Global filters are merged automatically
  brand: globalFilters.brand,
  channel_id: globalFilters.channel_id,
  start_date: globalFilters.start_date,
  end_date: globalFilters.end_date
};
```

### Endpoints Used
- `POST /dashboard` - Main KPI and dashboard data
- `GET /filters/options` - Available filter values
- `POST /forecast` - Individual series forecasting
- `POST /validate` - Model validation (3-year split)
- `GET /metrics` - System health monitoring

## 🔧 Development Features

### Error Handling
- **API Errors**: Graceful error messages with retry options
- **Loading States**: Spinners and skeleton loading
- **Form Validation**: Input validation with helpful messages
- **Network Issues**: Timeout handling and connectivity checks

### Performance Optimizations
- **Lazy Loading**: Components load on demand
- **API Caching**: Prevents duplicate requests
- **Debounced Filters**: Reduces API calls during typing
- **Virtual Scrolling**: For large data tables

## 📱 Responsive Design

### Breakpoints
- **xs (0px+)**: Mobile portrait
- **sm (600px+)**: Mobile landscape
- **md (960px+)**: Tablet
- **lg (1280px+)**: Desktop
- **xl (1920px+)**: Large desktop

### Mobile Adaptations
- **Stacked KPIs**: Cards stack vertically on mobile
- **Simplified Tables**: Essential columns only on small screens
- **Touch-Friendly**: Larger touch targets and spacing
- **Responsive Charts**: Charts adapt to screen size

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables
```bash
# Production API URL
REACT_APP_API_URL=https://your-api-domain.com

# Optional: Enable/disable features
REACT_APP_ENABLE_VALIDATION=true
REACT_APP_ENABLE_ADVANCED_CHARTS=true
```

### Docker Deployment
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🧪 Testing the UI

### Manual Testing Checklist
1. ✅ **Load Dashboard**: Verify all KPIs load correctly
2. ✅ **Apply Filters**: Test each filter type
3. ✅ **View Forecasts**: Click series to open forecast dialog
4. ✅ **Run Validation**: Test 3-year model validation
5. ✅ **Check Colors**: Verify risk-based color coding
6. ✅ **Mobile View**: Test responsive design
7. ✅ **Error Cases**: Test with invalid data/filters

### Test Scenarios
```bash
# 1. Start both API and UI
# Terminal 1: API
export PG_URI='postgresql+psycopg2://rushabh:Root%40123@localhost:5432/StackLogix'
uvicorn app:app --host 0.0.0.0 --port 8000

# Terminal 2: UI  
cd ui && npm start

# 2. Test different filter combinations
Brand: X, Channel: Myntra, Date: Last 6 months
Brand: All, Warehouse: bangalore, Date: 2024 only

# 3. Test forecast scenarios
Click on X_003 @ bangalore in top series table
Change horizon to 14 days
Run validation for 2024 test year
```

## 📈 Business Value

### Executive Dashboard
- **Real-time KPIs**: 13 key metrics at a glance
- **Risk Assessment**: Immediate identification of problem areas
- **Trend Analysis**: Historical performance tracking
- **Drill-down Capability**: From overview to detailed forecasts

### Operational Benefits
- **Proactive Management**: Early warning system for stockouts
- **Optimized Planning**: Data-driven inventory decisions  
- **Performance Monitoring**: Track forecast accuracy improvements
- **Resource Allocation**: Focus efforts on high-risk SKUs

### Technical Advantages
- **Modern Tech Stack**: React + Material-UI + TypeScript
- **API-First Design**: Clean separation of concerns
- **Scalable Architecture**: Easy to extend with new features
- **Production Ready**: Error handling, monitoring, responsive design

---

## 🎉 You now have a complete, production-ready inventory forecasting dashboard!

The UI provides:
- **Real-time insights** into Brand X inventory performance
- **Risk-based visual indicators** for immediate action
- **Comprehensive KPI tracking** with all required metrics
- **Interactive forecasting** with validation capabilities
- **Global filtering** that applies across all components
- **Professional design** with semantic color coding

**Ready for immediate use by Brand X inventory management teams!** 🚀
