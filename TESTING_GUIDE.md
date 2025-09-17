# 🧪 Testing Guide - Brand X Forecasting API

## Quick Start Testing

### 1. Start the API Server
```bash
# Set environment variable
export PG_URI='postgresql+psycopg2://rushabh:Root%40123@localhost:5432/StackLogix'

# Start server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Basic Health Check
```bash
curl http://localhost:8000/health
```

## 📊 Monitoring & Data Exploration

### System Metrics
```bash
# Get system performance metrics
curl http://localhost:8000/metrics

# Get data statistics and recommendations
curl http://localhost:8000/data/stats
```

## 🔮 Forecasting Tests

### Basic Forecast
```bash
# Simple 7-day forecast
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "X_003",
    "warehouse_id": "bangalore",
    "horizon": 7
  }'
```

### Forecast with Filters
```bash
# Forecast with brand and channel filters
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "X_003",
    "warehouse_id": "bangalore",
    "horizon": 14,
    "brand": "X",
    "channel_id": "Myntra"
  }'
```

### Date Range Filtering
```bash
# Use only 2023 data for training
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "X_003",
    "warehouse_id": "bangalore",
    "horizon": 7,
    "start_date": "2023-01-01",
    "end_date": "2023-12-31"
  }'
```

### Multi-Warehouse Batch Forecast
```bash
curl -X POST http://localhost:8000/forecast/batch \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"sku_id": "X_003", "warehouse_id": "bangalore"},
      {"sku_id": "X_003", "warehouse_id": "delhi"},
      {"sku_id": "X_003", "warehouse_id": "mumbai"}
    ],
    "horizon": 7,
    "brand": "X"
  }'
```

## 📈 Model Validation & Efficiency Testing

### 3-Year Data Split Validation
```bash
# Train on 2022-2023, test on 2024 (your requirement)
curl -X POST http://localhost:8000/validate \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "X_003",
    "warehouse_id": "bangalore",
    "train_end_date": "2023-12-31",
    "test_start_date": "2024-01-01",
    "test_end_date": "2024-12-31"
  }'
```

### Alternative Validation Splits
```bash
# Test with different split points
curl -X POST http://localhost:8000/validate \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "X_003",
    "warehouse_id": "delhi",
    "train_end_date": "2023-06-30",
    "test_start_date": "2023-07-01", 
    "test_end_date": "2024-06-30"
  }'
```

## 🎯 Test Scenarios for Different Data Patterns

### Test Different Warehouses
```bash
# Test each warehouse separately
for warehouse in bangalore delhi mumbai chennai ahmedabad; do
  echo "Testing warehouse: $warehouse"
  curl -X POST http://localhost:8000/forecast \
    -H "Content-Type: application/json" \
    -d "{
      \"sku_id\": \"X_003\",
      \"warehouse_id\": \"$warehouse\",
      \"horizon\": 7
    }"
  echo ""
done
```

### Test Different SKUs (if available)
```bash
# Find top SKUs first
curl http://localhost:8000/data/stats | jq '.top_series_by_demand'

# Test top performing SKU
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "TOP_SKU_FROM_STATS",
    "warehouse_id": "bangalore",
    "horizon": 7
  }'
```

## ⚡ Performance Testing

### Single Request Performance
```bash
# Test response time
time curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "X_003",
    "warehouse_id": "bangalore",
    "horizon": 7
  }'
```

### Load Testing (Simple)
```bash
# Run 10 consecutive requests
for i in {1..10}; do
  echo "Request $i:"
  time curl -s -X POST http://localhost:8000/forecast \
    -H "Content-Type: application/json" \
    -d '{
      "sku_id": "X_003",
      "warehouse_id": "bangalore",
      "horizon": 7
    }' > /dev/null
done

# Check metrics after load test
curl http://localhost:8000/metrics
```

## 🔍 Error Testing

### Test Error Scenarios
```bash
# Non-existent SKU (should return 404)
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "FAKE_SKU",
    "warehouse_id": "bangalore",
    "horizon": 7
  }'

# Invalid horizon (should return 422)
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "X_003",
    "warehouse_id": "bangalore",
    "horizon": 100
  }'
```

## 📊 Understanding Model Efficiency Results

When you run validation tests, you'll get these key metrics:

### Accuracy Metrics
- **WAPE** (Weighted Absolute Percentage Error): Lower is better, < 30% is good
- **SMAPE** (Symmetric MAPE): Lower is better, < 25% is good  
- **MAE** (Mean Absolute Error): Average absolute difference
- **RMSE** (Root Mean Square Error): Penalizes large errors more
- **MASE** (Mean Absolute Scaled Error): < 1.0 means better than naive forecast
- **Bias %**: Positive = over-forecasting, Negative = under-forecasting

### Prediction Interval Coverage
- **P10 Coverage**: Should be ~10% (% of actuals ≥ P10)
- **P90 Coverage**: Should be ~90% (% of actuals ≤ P90)  
- **Interval Coverage**: Should be ~80% (% of actuals in [P10, P90])

### Example Validation Result
```json
{
  "sku_id": "X_003",
  "warehouse_id": "bangalore",
  "model": "Croston-SBA",
  "bucket": "INTERMITTENT",
  "wape": 25.5,        // 25.5% error - Good for intermittent demand
  "smape": 31.2,       // 31.2% symmetric error
  "mae": 0.12,         // Average error of 0.12 units
  "bias_pct": -5.3,    // Slight under-forecasting
  "interval_coverage": 78.5  // 78.5% coverage - close to target 80%
}
```

## 🚀 Automated Testing

### Run Complete Test Suite
```bash
# Make sure script is executable
chmod +x test_curl_commands.sh

# Run all tests
./test_curl_commands.sh
```

### Run Python Test Suite
```bash
# Install dependencies
pip install requests

# Run comprehensive tests
python test_scenarios.py
```

## 📈 Business Scenario Testing

### Holiday Season Forecast
```bash
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "X_003",
    "warehouse_id": "bangalore",
    "horizon": 14,
    "start_date": "2024-10-01",
    "end_date": "2024-12-31"
  }'
```

### New Product Launch Simulation
```bash
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "X_003",
    "warehouse_id": "bangalore",
    "horizon": 7,
    "min_train": 30,
    "start_date": "2024-06-01"
  }'
```

---

## 🎯 Your 3-Year Validation Scenario

Based on your requirement to "apply on 2 years of data and check forecasting for rest one year":

```bash
# Perfect test for your 3-year dataset
curl -X POST http://localhost:8000/validate \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "X_003",
    "warehouse_id": "bangalore",
    "train_end_date": "2023-12-31",
    "test_start_date": "2024-01-01", 
    "test_end_date": "2024-12-31"
  }'
```

This will:
- ✅ Train on 2022-2023 data (2 years)
- ✅ Test on 2024 data (1 year)  
- ✅ Give you comprehensive accuracy metrics
- ✅ Show model efficiency and error percentages
- ✅ Validate prediction interval coverage

The response will show exactly how well your model performs on unseen data! 🎉
