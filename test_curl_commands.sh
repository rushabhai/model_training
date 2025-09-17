#!/bin/bash

# 🧪 Brand X Forecasting API - Comprehensive Test Script
# =======================================================

# Configuration
API_BASE="http://localhost:8000"
CONTENT_TYPE="Content-Type: application/json"

echo "🚀 Brand X Forecasting API Test Suite"
echo "======================================"
echo "Base URL: $API_BASE"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run curl command with error handling
run_test() {
    local test_name="$1"
    local curl_cmd="$2"
    local expected_status="${3:-200}"
    
    echo -e "${BLUE}🧪 Testing: $test_name${NC}"
    echo "Command: $curl_cmd"
    
    # Run the command and capture response
    response=$(eval $curl_cmd 2>/dev/null)
    status_code=$(eval "$curl_cmd -w '%{http_code}' -o /dev/null -s")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS (Status: $status_code)${NC}"
        echo "Response: $response" | jq . 2>/dev/null || echo "Response: $response"
    else
        echo -e "${RED}❌ FAIL (Expected: $expected_status, Got: $status_code)${NC}"
        echo "Response: $response"
    fi
    echo ""
}

# 1. Health Check
echo -e "${YELLOW}=== 1. BASIC HEALTH CHECKS ===${NC}"

run_test "Health Check" \
    "curl -s $API_BASE/health"

run_test "API Documentation" \
    "curl -s $API_BASE/docs -w '%{http_code}' -o /dev/null"

run_test "OpenAPI Schema" \
    "curl -s $API_BASE/openapi.json"

# 2. Monitoring and Metrics
echo -e "${YELLOW}=== 2. MONITORING & METRICS ===${NC}"

run_test "System Metrics" \
    "curl -s $API_BASE/metrics"

run_test "Data Statistics" \
    "curl -s $API_BASE/data/stats"

# 3. Basic Forecasting
echo -e "${YELLOW}=== 3. BASIC FORECASTING ===${NC}"

run_test "Simple Forecast - Intermittent Series" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 7
    }'"

run_test "Forecast with Brand Filter" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 7,
        \"brand\": \"X\"
    }'"

run_test "Forecast with Channel Filter" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 14,
        \"channel_id\": \"Myntra\"
    }'"

# 4. Date Range Filtering
echo -e "${YELLOW}=== 4. DATE RANGE FILTERING ===${NC}"

run_test "Forecast with Date Range (2023 data only)" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 7,
        \"start_date\": \"2023-01-01\",
        \"end_date\": \"2023-12-31\"
    }'"

run_test "Forecast with Recent Data (Last 6 months)" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 7,
        \"start_date\": \"2024-06-01\",
        \"end_date\": \"2024-12-31\"
    }'"

# 5. Different Horizons and Parameters
echo -e "${YELLOW}=== 5. HORIZON & PARAMETER VARIATIONS ===${NC}"

run_test "1-Day Forecast" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 1
    }'"

run_test "Maximum Horizon (28 days)" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 28
    }'"

run_test "Custom Seasonality (14 days)" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 7,
        \"season\": 14
    }'"

run_test "Reduced Training Period" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 7,
        \"min_train\": 30
    }'"

# 6. Multiple Warehouses
echo -e "${YELLOW}=== 6. MULTI-WAREHOUSE TESTING ===${NC}"

for warehouse in "delhi" "mumbai" "chennai" "ahmedabad"; do
    run_test "Forecast for $warehouse" \
        "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
            \"sku_id\": \"X_003\",
            \"warehouse_id\": \"'$warehouse'\",
            \"horizon\": 7
        }'"
done

# 7. Batch Forecasting
echo -e "${YELLOW}=== 7. BATCH FORECASTING ===${NC}"

run_test "Batch Forecast (Multiple Warehouses)" \
    "curl -s -X POST $API_BASE/forecast/batch -H '$CONTENT_TYPE' -d '{
        \"items\": [
            {\"sku_id\": \"X_003\", \"warehouse_id\": \"bangalore\"},
            {\"sku_id\": \"X_003\", \"warehouse_id\": \"delhi\"},
            {\"sku_id\": \"X_003\", \"warehouse_id\": \"mumbai\"}
        ],
        \"horizon\": 7,
        \"brand\": \"X\"
    }'"

# 8. Error Scenarios
echo -e "${YELLOW}=== 8. ERROR HANDLING ===${NC}"

run_test "Non-existent SKU" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"NONEXISTENT_SKU\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 7
    }'" 404

run_test "Non-existent Warehouse" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"nonexistent_warehouse\",
        \"horizon\": 7
    }'" 404

run_test "Invalid Horizon (too large)" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 100
    }'" 422

run_test "Invalid Date Format" \
    "curl -s -X POST $API_BASE/forecast -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"horizon\": 7,
        \"start_date\": \"invalid-date\"
    }'" 422

# 9. Model Validation (3-year test scenario)
echo -e "${YELLOW}=== 9. MODEL VALIDATION (3-YEAR SPLIT) ===${NC}"

run_test "Validate X_003@bangalore (2 years train, 1 year test)" \
    "curl -s -X POST $API_BASE/validate -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"bangalore\",
        \"train_end_date\": \"2023-12-31\",
        \"test_start_date\": \"2024-01-01\",
        \"test_end_date\": \"2024-12-31\"
    }'"

run_test "Validate X_003@delhi (Alternative warehouse)" \
    "curl -s -X POST $API_BASE/validate -H '$CONTENT_TYPE' -d '{
        \"sku_id\": \"X_003\",
        \"warehouse_id\": \"delhi\",
        \"train_end_date\": \"2023-12-31\",
        \"test_start_date\": \"2024-01-01\",
        \"test_end_date\": \"2024-12-31\"
    }'"

# 10. Performance Testing
echo -e "${YELLOW}=== 10. PERFORMANCE TESTING ===${NC}"

echo "🏃 Running 10 consecutive forecasts to test performance..."
for i in {1..10}; do
    start_time=$(date +%s.%N)
    curl -s -X POST $API_BASE/forecast -H "$CONTENT_TYPE" -d '{
        "sku_id": "X_003",
        "warehouse_id": "bangalore",
        "horizon": 7
    }' > /dev/null
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc)
    echo "Request $i: ${duration}s"
done

# Check metrics after performance test
run_test "Final Metrics Check" \
    "curl -s $API_BASE/metrics"

echo -e "${GREEN}🎉 Test Suite Complete!${NC}"
echo ""
echo "📊 Summary:"
echo "- Check the final metrics above for success rates"
echo "- All validation tests show model accuracy"
echo "- Performance tests show response times"
echo ""
echo "💡 Tips:"
echo "- Use the validation endpoint to test different SKU/warehouse combinations"
echo "- Monitor the /metrics endpoint for system health"
echo "- Check /data/stats for available series and recommended test splits"
