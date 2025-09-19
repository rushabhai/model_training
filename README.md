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

## 🏗️ Architecture & Runbook

This section details the system's architecture, data flow, operational procedures, and monitoring guidelines.

### 1. System Architecture & Data Flow

```mermaid
graph TD
    A[Brand X Raw Data (PostgreSQL)] --> B{Data Transformation & Feature Engineering}
    B --> C1[Materialized View: brand_x_gold] --> D1[Materialized View: demand_daily]
    B --> C2[Materialized View: product_metadata]
    D1 --> E[ML Training Pipeline (train_router.py)]
    D1 --> E2[LightGBM Training Pipeline (train_ml.py)]
    E -- Models & Metrics --> F[FastAPI Serving API (app.py)]
    E2 -- LightGBM Models & Features --> F
    F -- Forecasts & Insights --> G[React Frontend UI]
    G -- User Filters & Requests --> F
    F --> H{Model Selection Logic}
    H -->|SKU in Worst 50| I[LightGBM Quantile Models]
    H -->|SKU not in Worst 50| J[Router Models (Holt-Winters/Croston)]
    I --> K[P10/P50/P90 Forecasts]
    J --> K
    K --> L[SHAP Explanations & Groq AI]
```

**Data Flow Description:**

1.  **Brand X Raw Data**: Raw transactional and inventory data from the PostgreSQL database (`brand_x_data` table).
2.  **Data Transformation & Feature Engineering**: Raw data is processed and enriched. This involves:
    *   Creating a leakage-safe demand proxy (`demand_qty`).
    *   Identifying `censored_oos` (stockout days hiding demand).
    *   Adding calendar features, pricing indexes, etc.
3.  **Materialized Views**: Optimized views for performance and data consistency:
    *   `brand_x_gold`: Contains cleaned, feature-engineered historical data.
    *   `demand_daily`: A slim, modeling-ready slice of `brand_x_gold` used by the ML trainer.
    *   `product_metadata`: (Implicit, for additional product attributes if used for filtering/grouping).
4.  **ML Training Pipeline (`train_router.py`)**: This Python script:
    *   Fetches data from `demand_daily`.
    *   Classifies each SKU series by **ADI (Average Demand Interval)** and **CV² (Coefficient of Variation squared)** into SMOOTH, ERRATIC, or INTERMITTENT categories.
    *   Selects appropriate model: Holt-Winters (for SMOOTH/ERRATIC) or Croston-SBA (for INTERMITTENT).
    *   Trains models using a rolling-origin backtest strategy.
    *   Outputs model metrics (WAPE, MAPE, MAE, Bias%) and trained model parameters.
5.  **LightGBM Training Pipeline (`train_ml.py`)**: This Python script:
    *   Fetches data from `brand_x_data` table directly.
    *   Generates comprehensive features: lag features (1, 7, 14, 28 days), rolling statistics (7, 28 day means/stds), price features, and time-based features.
    *   Excludes `censored_oos` data from training to prevent bias.
    *   Trains three LightGBM quantile regression models (P10, P50, P90) for fallback forecasting.
    *   Saves models as `models/lgb_q*.joblib` and feature list as `models/feats.joblib`.
6.  **FastAPI Serving API (`app.py`)**: The core backend service:
    *   Receives requests from the UI (dashboard, forecast, demand analysis, validation).
    *   Loads both router models and LightGBM models at startup.
    *   Implements fallback logic: uses LightGBM for SKUs in `router_worst50_by_wape.csv`, otherwise uses router models.
    *   Applies seasonal adjustments, holiday impacts, and demand volatility factors.
    *   Generates probabilistic forecasts (P10, P50, P90) using either router or LightGBM models.
    *   Provides SHAP explanations for ML model predictions via `/explain` endpoint.
    *   Integrates Groq AI API for intelligent insights via `/ai/response` endpoint.
    *   Calculates various KPIs, performs inventory optimization, and generates risk alerts.
6.  **React Frontend UI**: The user-facing application:
    *   Provides interactive dashboards and visualizations.
    *   Allows global filtering for SKU, warehouse, category, and date ranges.
    *   Displays KPIs, top series, risk distribution, and demand analysis results.
    *   Triggers API calls for data retrieval and model validation.

### 2. Runbook: Operational Commands

#### 2.1. Environment Variables

Ensure the following environment variables are set before running any backend or training scripts:

```bash
# Database Configuration
export PG_URI='postgresql+psycopg2://<YOUR_USER>:<YOUR_PASSWORD>@<YOUR_HOST>:5432/<YOUR_DATABASE>'
# Note: It's recommended to use a read-only database user for the application.

# Groq API Configuration (Optional - for AI responses)
export GROQ_API_KEY='your_groq_api_key_here'
```

**Environment Variables Description:**
- `PG_URI`: PostgreSQL connection string for the database containing `brand_x_data` table
- `GROQ_API_KEY`: API key for Groq AI service (optional, enables `/ai/response` endpoint)

#### 2.2. Refresh Materialized Views

Materialized views (`brand_x_gold` and `demand_daily`) should be refreshed periodically to incorporate new data. It is crucial to refresh them in the correct order.

```bash
# Navigate to the project root if not already there
cd /path/to/stacklogix

# Activate your Python virtual environment (if using)
source .venv/bin/activate

# Refresh brand_x_gold (must be refreshed first)
psql $PG_URI -c "REFRESH MATERIALIZED VIEW CONCURRENTLY brand_x_gold;"

# Refresh demand_daily (depends on brand_x_gold)
psql $PG_URI -c "REFRESH MATERIALIZED VIEW CONCURRENTLY demand_daily;"

echo "✅ Materialized views refreshed successfully."
```

#### 2.3. Train Forecasting Models

##### 2.3.1. Train Router Models

The `train_router.py` script trains the traditional ML models. It can be run after refreshing the materialized views.

```bash
# Navigate to the project root if not already there
cd /path/to/stacklogix

# Activate your Python virtual environment
source .venv/bin/activate

# Run the router training script (adjust parameters as needed)
python train_router.py \
  --db "$PG_URI" \
  --start_date 2022-01-01 \
  --end_date 2024-12-31 \
  --min_points 180 \
  --min_train 56 \
  --series_limit 5000 \
  --horizon 7 \
  --outdir ./outputs

echo "✅ Router models trained. Outputs saved to ./outputs/."
```

##### 2.3.2. Train LightGBM Fallback Models

The `train_ml.py` script trains the LightGBM quantile regression models for fallback forecasting.

```bash
# Navigate to the project root if not already there
cd /path/to/stacklogix

# Activate your Python virtual environment
source .venv/bin/activate

# Run the LightGBM training script (adjust parameters as needed)
python train_ml.py \
  --start_date 2022-01-01 \
  --end_date 2024-12-31

echo "✅ LightGBM models trained. Models saved to ./models/."
```

**Note**: The LightGBM training uses the `PG_URI` environment variable and generates comprehensive features including lag features, rolling statistics, price features, and time-based features. It excludes `censored_oos` data from training to prevent bias.
```

#### 2.4. Serve FastAPI Backend

Start the FastAPI application. This will serve the API endpoints for the UI and other consumers.

```bash
# Navigate to the project root if not already there
cd /path/to/stacklogix

# Activate your Python virtual environment
source .venv/bin/activate

# Start the Uvicorn server
uvicorn app:app --host 0.0.0.0 --port 8001 --reload

echo "✅ FastAPI backend running on http://0.0.0.0:8001."
```

**New API Endpoints:**
- `/explain`: Get SHAP feature importance for ML model predictions
- `/ai/response`: Get AI-powered responses using Groq API
- Enhanced `/forecast` and `/forecast/batch`: Now use LightGBM fallback for poorly performing SKUs

#### 2.5. Run React Frontend

Start the React development server for the UI.

```bash
# Navigate to the UI directory
cd /path/to/stacklogix/ui

# Install dependencies (if not already done)
npm install

# Start the development server
npm start

echo "✅ React frontend running on http://localhost:3000."
```

### 3. Acceptance Metrics

Monitoring these metrics is crucial to ensure the system is performing as expected.

| Metric | Target | Rationale |
|---|---|---|
| **WAPE (Overall)** | ≤ 25% | Industry benchmark for accurate inventory forecasting; ensures aggregate demand predictability. |
| **Bias (Overall)** | ±5% | Critical to avoid systematic overstocking or stockouts; indicates unbiased forecasts. |
| **API Latency (P95 /dashboard)** | < 1000ms | Ensures a responsive user experience for dashboard loading. |
| **API Latency (P95 /demand/analysis)** | < 2000ms | Allows for timely detailed inventory insights, even with complex calculations. |
| **Model FVA** | > 10% | Demonstrates the value added by the ML model over a simple baseline; justifies model complexity. |
| **Prediction Interval Coverage (80%)** | 75-85% | Validates the reliability of safety stock recommendations and probabilistic forecasts. |
| **Database MV Freshness** | < 24 hours | Ensures forecasts are based on the most recent available inventory and sales data. |
| **Service Level (Critical SKUs)** | > 95% | Guarantees high availability for top-tier products, minimizing lost sales. |

### Troubleshooting

#### Common Issues

**1. High WAPE (> 30%)**
```bash
# Check data quality and seasonality detection
python -c "from train_router import diagnose_series; diagnose_series('SKU_ID', 'WAREHOUSE_ID')"
```

**2. API Timeout Errors**
```bash
# Check database connection and query performance
psql $PG_URI -c "SELECT COUNT(*) FROM brand_x_data WHERE date >= CURRENT_DATE - INTERVAL '365 days';"
```

**3. Memory Issues During Training**
```bash
# Reduce batch size and add pagination
python train_router.py --series_limit 500 --batch_size 50
```

### Monitoring & Alerts

#### Key Metrics to Monitor
- **Model Accuracy**: WAPE, MASE trends over time
- **API Performance**: Response time, error rate, throughput
- **Data Freshness**: Last materialized view refresh timestamp
- **Resource Usage**: Memory, CPU, database connections

#### Alert Thresholds
```yaml
forecast_accuracy:
  wape_threshold: 30%         # Alert if WAPE exceeds 30%
  bias_threshold: 10%         # Alert if bias exceeds ±10%

api_performance:
  response_time_p95: 200ms    # Alert if P95 > 200ms
  error_rate: 5%              # Alert if error rate > 5%

data_freshness:
  max_staleness: 24h          # Alert if data is > 24h old
```

### Deployment Checklist

- [ ] PostgreSQL materialized views refreshed
- [ ] Model training completed successfully
- [ ] API health check passes
- [ ] Environment variables configured
- [ ] Monitoring dashboards operational
- [ ] Alert thresholds configured
- [ ] Backup and recovery procedures tested

---

## 📞 Support

For questions or issues related to the forecasting system:
- **Technical**: Model implementation and API usage
- **Business**: Forecasting methodology and interpretation
- **Data**: Source data quality and transformations
