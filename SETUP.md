# 🚀 Brand X Forecasting System - Setup Guide

## Prerequisites

- Python 3.8+
- PostgreSQL 12+
- 6.9M+ rows in `brand_x_data` table

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Database
```bash
# Set your database connection (URL-encode special characters in password)
export PG_URI='postgresql+psycopg2://username:password@host:5432/StackLogix'

# For password with @ symbol: Root@123 becomes Root%40123
export PG_URI='postgresql+psycopg2://rushabh:Root%40123@localhost:5432/StackLogix'
```

### 3. Verify Data Structure
Your `brand_x_data` table should have these key columns:
- `date`: Transaction date
- `sku_id`: Product identifier  
- `warehouse_id`: Warehouse location
- `units_sold`: Demand quantity (target variable)
- `stockout_flag`: Censoring indicator
- `channel_id`, `brand`, `product_category`: Optional filters

### 4. Start the API
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

### 5. Test the System
```bash
# Health check
curl http://localhost:8000/health

# Simple forecast
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{"sku_id":"X_003","warehouse_id":"bangalore","horizon":7}'

# Run comprehensive tests
python test_scenarios.py
```

## Production Setup

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_brand_x_data_forecast 
ON brand_x_data (sku_id, warehouse_id, date);

-- Optional: Create materialized view for even better performance
CREATE MATERIALIZED VIEW demand_daily AS
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

### Environment Configuration
```bash
# .env file
PG_URI=postgresql+psycopg2://username:password@host:5432/StackLogix

# Production settings
export WORKERS=4
export MAX_REQUESTS=1000
uvicorn app:app --workers $WORKERS --max-requests $MAX_REQUESTS
```

## Troubleshooting

### Common Issues

1. **Database Connection Fails**
   - Check if password contains special characters (URL-encode them)
   - Verify PostgreSQL is running and accessible
   - Confirm database name and credentials

2. **No Data Found (404 Error)**
   - Verify SKU/warehouse combination exists in data
   - Check date filters aren't too restrictive
   - Confirm data has recent entries

3. **Insufficient History (422 Error)**
   - Reduce `min_train` parameter (default: 56 days)
   - Check if series has enough non-zero demand
   - Verify date range includes sufficient data

4. **Slow Performance**
   - Add database indexes (see optimization guide)
   - Consider materialized views for frequent queries
   - Check if database has proper resources

### Validation Queries
```sql
-- Check data availability
SELECT sku_id, warehouse_id, COUNT(*) as days, SUM(units_sold) as total_demand
FROM brand_x_data 
WHERE date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY sku_id, warehouse_id 
ORDER BY total_demand DESC 
LIMIT 10;

-- Check for sufficient history
SELECT COUNT(DISTINCT sku_id || '_' || warehouse_id) as series_count
FROM brand_x_data 
WHERE date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY sku_id, warehouse_id
HAVING COUNT(*) >= 56;
```

## Next Steps

1. **Monitor Performance**: Use `optimization_guide.md` for scaling
2. **Run Tests**: Execute `test_scenarios.py` for validation
3. **Business Integration**: Integrate with inventory management systems
4. **Model Validation**: Regular backtesting and accuracy monitoring

---

For detailed model information, see `README.md`  
For performance optimization, see `optimization_guide.md`  
For comprehensive testing, see `test_scenarios.py`
