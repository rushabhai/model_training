# 📈 Brand X Inventory Forecasting System

A lightweight FastAPI-based machine learning service that provides daily demand forecasts for Brand X inventory management at the granularity of `day × sku_id × warehouse_id`.

## 🎯 Business Context

This system addresses one of the critical metrics in inventory forecasting by providing probabilistic demand predictions that help optimize stock levels, reduce stockouts, and minimize holding costs for Brand X across multiple warehouses and sales channels.

## 🧠 Machine Learning Models

### Router Model Architecture

The system employs a **router model** that automatically selects the optimal forecasting algorithm based on the time series characteristics:

#### 1. **Holt-Winters Additive Model** 
*For Smooth & Erratic Series*

- **When Used**: Series with `ADI ≤ 1.32` (frequent demand)
- **Algorithm**: Triple exponential smoothing with additive seasonality
- **Parameters**: 
  - α (level): 0.1 - 0.3 (smoothing parameter for level)
  - β (trend): 0.01 - 0.05 (smoothing parameter for trend)
  - γ (seasonal): 0.1 - 0.2 (smoothing parameter for seasonality)
- **Seasonality**: Weekly (7-day cycle) for daily data
- **Best For**: Regular, predictable demand patterns

#### 2. **Croston-SBA Model**
*For Intermittent Series*

- **When Used**: Series with `ADI > 1.32` (sparse demand)
- **Algorithm**: Croston's method with Syntetos-Boylan Approximation
- **Parameters**: 
  - α = 0.1 (smoothing parameter)
  - SBA bias correction: `zhat * (1 - α/2)`
- **Best For**: Sporadic, intermittent demand patterns

### Series Classification System

The router uses **ADI (Average Demand Interval)** and **CV²** (Coefficient of Variation squared) for automatic series classification:

```
ADI ≤ 1.32 & CV² ≤ 0.49  → SMOOTH (use Holt-Winters)
ADI ≤ 1.32 & CV² > 0.49  → ERRATIC (use Holt-Winters)  
ADI > 1.32               → INTERMITTENT (use Croston-SBA)
```

### Probabilistic Forecasting

#### Split-Conformal Prediction
- **Method**: Symmetric intervals using empirical residuals
- **Calibration**: Last 90 days of one-step-ahead residuals
- **Outputs**: P10, P50 (median), P90 quantiles
- **Coverage**: Nominal 80% prediction intervals
- **Non-negativity**: Lower bounds clamped at zero

## 📊 Data Architecture

### Source Data: `brand_x_data` Table
- **Volume**: 6,942,501 rows
- **Grain**: `date × sku_id × warehouse_id × channel_id`
- **Time Range**: 2022-01-01 onwards
- **Key Columns**:
  - `date`: Transaction date
  - `sku_id`: Product identifier
  - `warehouse_id`: Warehouse location
  - `channel_id`: Sales channel (e.g., Myntra)
  - `units_sold`: Actual demand (target variable)
  - `stockout_flag`: Censoring indicator for stockouts
  - 40+ additional features (pricing, promotions, seasonality, etc.)

### Processed Data: `demand_daily` View
```sql
CREATE VIEW demand_daily AS
SELECT 
    date as day,
    sku_id,
    warehouse_id,
    channel_id,
    brand,
    product_category,
    units_sold as demand_qty,
    stockout_flag as censored_oos
FROM brand_x_data
WHERE date IS NOT NULL 
  AND sku_id IS NOT NULL 
  AND warehouse_id IS NOT NULL;
```

## 🔧 System Architecture

### FastAPI Endpoints

#### 1. Health Check
```bash
GET /health
```

#### 2. Single Forecast
```bash
POST /forecast
Content-Type: application/json

{
  "sku_id": "X_003",
  "warehouse_id": "bangalore", 
  "horizon": 7,
  "brand": "X",
  "channel_id": "Myntra",
  "exclude_censored_for_train": true
}
```

#### 3. Batch Forecasting
```bash
POST /forecast/batch
Content-Type: application/json

{
  "items": [
    {"sku_id": "X_003", "warehouse_id": "bangalore"},
    {"sku_id": "X_005", "warehouse_id": "delhi"}
  ],
  "horizon": 7
}
```

### Response Format
```json
{
  "sku_id": "X_003",
  "warehouse_id": "bangalore",
  "model": "HoltWintersAdditive(a=0.2,b=0.05,g=0.2)",
  "bucket": "SMOOTH", 
  "history_days": 420,
  "train_days": 400,
  "horizon": 7,
  "forecasts": [
    {"day": "2025-09-11", "p10": 8.0, "p50": 10.5, "p90": 13.2},
    {"day": "2025-09-12", "p10": 7.5, "p50": 11.0, "p90": 14.1}
  ]
}
```

## ⚡ Performance Optimizations

### Database Optimizations
- **Indexing**: Multi-column indexes on `(sku_id, warehouse_id, date)`
- **Materialized Views**: Pre-aggregated demand_daily for faster access
- **Connection Pooling**: SQLAlchemy with pool_size=5, max_overflow=10

### Computational Efficiency
- **On-demand Forecasting**: No pre-training required
- **Efficient Algorithms**: O(n) time complexity for both models
- **Memory Management**: Streaming data processing for large series

## 🚀 Deployment

### Environment Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Set database connection
export PG_URI='postgresql+psycopg2://user:password@host:5432/StackLogix'

# Start server
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Dependencies
- **FastAPI**: Web framework
- **SQLAlchemy**: Database ORM
- **pandas**: Data manipulation
- **numpy**: Numerical computing
- **psycopg2**: PostgreSQL adapter
- **pydantic**: Data validation

## 📋 Configuration Parameters

### Model Tuning
```python
DEFAULT_SEASON = 7              # Weekly seasonality
DEFAULT_MIN_TRAIN = 56          # Minimum training days
DEFAULT_MAX_HORIZON = 28        # Maximum forecast horizon
CALIBRATION_TAIL = 90           # Days for conformal calibration
```

### Holt-Winters Grid Search
```python
HW_GRID = [
    (0.2, 0.05, 0.2),  # (α, β, γ)
    (0.3, 0.05, 0.2),
    (0.2, 0.05, 0.1), 
    (0.1, 0.05, 0.2),
    (0.2, 0.01, 0.2)
]
```

## 🔍 Model Validation

### Cross-Validation Strategy
- **Method**: Rolling time series validation
- **Window**: Minimum 56 days training
- **Step**: 7 days (weekly)
- **Horizon**: 1-28 days ahead

### Performance Metrics
- **WAPE**: Weighted Absolute Percentage Error
- **SMAPE**: Symmetric MAPE
- **MAE**: Mean Absolute Error
- **RMSE**: Root Mean Square Error
- **MASE**: Mean Absolute Scaled Error (seasonal baseline)
- **Bias %**: Percentage bias

## 🛡️ Error Handling & Guardrails

### Data Quality Checks
- **Missing Data**: Graceful handling of gaps in time series
- **Insufficient History**: 422 error if < min_train days
- **Invalid Requests**: 404 error if series not found

### Business Rules
- **Non-negative Forecasts**: Lower bounds clamped at zero
- **Reasonable Horizons**: Maximum 28 days ahead
- **Stockout Exclusion**: Optional censoring of stockout periods

## 📈 Use Cases

### Primary Applications
1. **Inventory Planning**: Optimal stock level determination
2. **Procurement**: Purchase order quantities and timing
3. **Allocation**: Distribution across warehouses
4. **Financial Planning**: Revenue and margin forecasting

### Business Value
- **Reduced Stockouts**: Better availability through accurate demand prediction
- **Lower Holding Costs**: Optimized inventory levels
- **Improved Cash Flow**: Better working capital management
- **Enhanced Customer Satisfaction**: Consistent product availability

## 🔧 Maintenance & Monitoring

### Recommended Monitoring
- **Forecast Accuracy**: Regular backtesting on recent data
- **API Performance**: Response times and error rates
- **Data Freshness**: Monitoring of source data updates
- **Model Drift**: Periodic validation of model assumptions

### Scaling Considerations
- **High QPS**: Consider caching popular forecasts
- **Large Catalogs**: Implement batch processing for bulk updates
- **Real-time**: Move to streaming architecture for sub-second latency

---

## 📞 Support

For questions or issues related to the forecasting system:
- **Technical**: Model implementation and API usage
- **Business**: Forecasting methodology and interpretation
- **Data**: Source data quality and transformations
