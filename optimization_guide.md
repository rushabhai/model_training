# 🚀 Performance Optimization Guide for 6.9M+ Row Dataset

## Current Dataset Analysis
- **Table**: `brand_x_data`
- **Volume**: 6,942,501 rows
- **Grain**: `date × sku_id × warehouse_id × channel_id`
- **Time Range**: 2022-01-01 onwards (3+ years)
- **Columns**: 48 attributes per row

## 🎯 Query Optimization Strategies

### 1. Database Indexing
```sql
-- Primary indexes for forecasting queries
CREATE INDEX CONCURRENTLY idx_brand_x_data_forecast 
ON brand_x_data (sku_id, warehouse_id, date);

-- Additional indexes for filtered queries
CREATE INDEX CONCURRENTLY idx_brand_x_data_brand_channel 
ON brand_x_data (brand, channel_id, date);

CREATE INDEX CONCURRENTLY idx_brand_x_data_category 
ON brand_x_data (product_category, date);

-- Partial index for non-null demand
CREATE INDEX CONCURRENTLY idx_brand_x_data_demand 
ON brand_x_data (sku_id, warehouse_id, date) 
WHERE units_sold > 0;
```

### 2. Query Optimization
```sql
-- Current query pattern (optimized)
EXPLAIN ANALYZE
SELECT date as day, units_sold as demand_qty, stockout_flag as censored_oos
FROM brand_x_data
WHERE sku_id = 'X_003' 
  AND warehouse_id = 'bangalore'
  AND date >= '2023-01-01'  -- Use date filters when possible
ORDER BY date;
```

### 3. Materialized View Strategy
```sql
-- Create aggregated materialized view for better performance
CREATE MATERIALIZED VIEW demand_summary AS
SELECT 
    sku_id,
    warehouse_id,
    channel_id,
    brand,
    product_category,
    DATE_TRUNC('day', date) as day,
    SUM(units_sold) as demand_qty,
    BOOL_OR(stockout_flag) as censored_oos,
    COUNT(*) as record_count,
    MIN(date) as first_date,
    MAX(date) as last_date
FROM brand_x_data
WHERE date IS NOT NULL 
  AND sku_id IS NOT NULL 
  AND warehouse_id IS NOT NULL
GROUP BY sku_id, warehouse_id, channel_id, brand, product_category, 
         DATE_TRUNC('day', date);

-- Index the materialized view
CREATE INDEX idx_demand_summary_forecast 
ON demand_summary (sku_id, warehouse_id, day);

-- Refresh strategy (run daily)
REFRESH MATERIALIZED VIEW CONCURRENTLY demand_summary;
```

## ⚡ Application-Level Optimizations

### 1. Connection Pooling
```python
# Current configuration (already optimized)
ENGINE = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True,
    pool_size=10,           # Increase for higher concurrency
    max_overflow=20,        # Allow burst connections
    pool_recycle=3600,      # Recycle connections hourly
    echo=False              # Disable SQL logging in production
)
```

### 2. Query Result Caching
```python
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=1000)
def fetch_series_cached(sku_id: str, warehouse_id: str, 
                       cache_key: str) -> pd.DataFrame:
    """Cache frequently requested series for 1 hour"""
    # Implementation with cache key based on current hour
    pass

def get_cache_key() -> str:
    """Generate cache key that expires hourly"""
    return datetime.now().strftime("%Y%m%d%H")
```

### 3. Async Processing for Batch Requests
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def forecast_batch_async(req: BatchForecastRequest):
    """Process batch requests in parallel"""
    loop = asyncio.get_event_loop()
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        tasks = [
            loop.run_in_executor(executor, forecast_single_item, item)
            for item in req.items
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return process_batch_results(results)
```

### 4. Data Pagination and Streaming
```python
def fetch_series_streaming(sku_id: str, warehouse_id: str, 
                          chunk_size: int = 10000) -> Iterator[pd.DataFrame]:
    """Stream large series in chunks to reduce memory usage"""
    
    sql = """
    SELECT date as day, units_sold as demand_qty, stockout_flag as censored_oos
    FROM brand_x_data
    WHERE sku_id = :sku_id AND warehouse_id = :warehouse_id
    ORDER BY date
    LIMIT :chunk_size OFFSET :offset
    """
    
    offset = 0
    while True:
        chunk = pd.read_sql(sql, ENGINE, params={
            'sku_id': sku_id,
            'warehouse_id': warehouse_id,
            'chunk_size': chunk_size,
            'offset': offset
        })
        
        if chunk.empty:
            break
            
        yield chunk
        offset += chunk_size
```

## 🔧 Advanced Optimization Techniques

### 1. Partitioning Strategy
```sql
-- Partition by date for better query performance
CREATE TABLE brand_x_data_partitioned (
    LIKE brand_x_data INCLUDING ALL
) PARTITION BY RANGE (date);

-- Create monthly partitions
CREATE TABLE brand_x_data_2024_01 PARTITION OF brand_x_data_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Create partitions for each month...
```

### 2. Columnar Storage with Compression
```sql
-- Enable compression for historical data
ALTER TABLE brand_x_data SET (
    toast_tuple_threshold = 2048,
    fillfactor = 90
);

-- Consider pg_partman for automated partition management
```

### 3. Pre-aggregated Forecasting Tables
```sql
-- Store pre-computed series statistics
CREATE TABLE series_metadata AS
SELECT 
    sku_id,
    warehouse_id,
    MIN(date) as start_date,
    MAX(date) as end_date,
    COUNT(*) as total_days,
    SUM(units_sold) as total_demand,
    AVG(units_sold) as avg_demand,
    STDDEV(units_sold) as demand_stddev,
    COUNT(CASE WHEN units_sold > 0 THEN 1 END) as non_zero_days,
    COUNT(CASE WHEN stockout_flag THEN 1 END) as stockout_days
FROM brand_x_data
GROUP BY sku_id, warehouse_id;

-- Index for quick metadata lookup
CREATE INDEX idx_series_metadata_lookup 
ON series_metadata (sku_id, warehouse_id);
```

## 📊 Monitoring and Performance Metrics

### 1. Query Performance Monitoring
```python
import time
from functools import wraps

def monitor_query_performance(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Log slow queries (> 2 seconds)
            if execution_time > 2.0:
                logger.warning(f"Slow query detected: {func.__name__} took {execution_time:.2f}s")
            
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Query failed: {func.__name__} after {execution_time:.2f}s: {e}")
            raise
    
    return wrapper

@monitor_query_performance
def _fetch_series(sku_id: str, warehouse_id: str, req) -> pd.DataFrame:
    # Existing implementation
    pass
```

### 2. Database Connection Monitoring
```python
def get_db_stats():
    """Monitor database connection and query statistics"""
    with ENGINE.connect() as conn:
        # Active connections
        result = conn.execute(text("""
            SELECT count(*) as active_connections,
                   count(*) FILTER (WHERE state = 'active') as active_queries
            FROM pg_stat_activity 
            WHERE datname = current_database()
        """))
        
        # Query performance stats
        result2 = conn.execute(text("""
            SELECT query, calls, mean_exec_time, total_exec_time
            FROM pg_stat_statements 
            WHERE query LIKE '%brand_x_data%'
            ORDER BY total_exec_time DESC 
            LIMIT 5
        """))
        
        return {
            "connections": result.fetchone(),
            "top_queries": result2.fetchall()
        }
```

## 🎯 Specific Optimizations for Forecasting

### 1. Series Filtering at Database Level
```python
def get_forecastable_series(min_history_days: int = 56) -> List[Tuple[str, str]]:
    """Get list of series with sufficient history for forecasting"""
    
    sql = """
    SELECT sku_id, warehouse_id, COUNT(*) as history_days
    FROM brand_x_data
    WHERE date >= CURRENT_DATE - INTERVAL '2 years'
      AND units_sold IS NOT NULL
    GROUP BY sku_id, warehouse_id
    HAVING COUNT(*) >= :min_history_days
    ORDER BY COUNT(*) DESC
    """
    
    with ENGINE.connect() as conn:
        result = conn.execute(text(sql), {"min_history_days": min_history_days})
        return [(row[0], row[1]) for row in result.fetchall()]
```

### 2. Smart Data Loading
```python
def fetch_series_optimized(sku_id: str, warehouse_id: str, 
                          max_history_days: int = 730) -> pd.DataFrame:
    """Fetch only recent history for forecasting"""
    
    sql = """
    SELECT date as day, units_sold as demand_qty, stockout_flag as censored_oos
    FROM brand_x_data
    WHERE sku_id = :sku_id 
      AND warehouse_id = :warehouse_id
      AND date >= CURRENT_DATE - INTERVAL ':max_days days'
    ORDER BY date
    """
    
    return pd.read_sql(sql, ENGINE, params={
        'sku_id': sku_id,
        'warehouse_id': warehouse_id,
        'max_days': max_history_days
    })
```

## 🚀 Production Deployment Optimizations

### 1. Load Balancing Strategy
```yaml
# nginx.conf for API load balancing
upstream forecasting_api {
    server 127.0.0.1:8000 weight=3;
    server 127.0.0.1:8001 weight=3;
    server 127.0.0.1:8002 weight=3;
    keepalive 32;
}

server {
    location /forecast {
        proxy_pass http://forecasting_api;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
}
```

### 2. Container Resource Limits
```yaml
# docker-compose.yml
services:
  forecasting-api:
    image: brand-x-forecasting:latest
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    environment:
      - WORKERS=4
      - MAX_REQUESTS=1000
      - MAX_REQUESTS_JITTER=100
```

### 3. Database Tuning
```sql
-- PostgreSQL configuration for analytics workload
-- postgresql.conf
shared_buffers = 4GB                    # 25% of RAM
effective_cache_size = 12GB             # 75% of RAM
work_mem = 64MB                         # For complex queries
maintenance_work_mem = 512MB            # For VACUUM, CREATE INDEX
random_page_cost = 1.1                  # For SSD storage
effective_io_concurrency = 200          # For SSD storage
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
```

## 📈 Expected Performance Improvements

| Optimization | Current | Optimized | Improvement |
|--------------|---------|-----------|-------------|
| Single Forecast | ~2-5s | ~0.5-1s | 4-5x faster |
| Batch Forecast (10 items) | ~20-30s | ~3-5s | 6-8x faster |
| Memory Usage | ~500MB | ~100MB | 5x reduction |
| Database CPU | ~80% | ~20% | 4x reduction |
| Concurrent Users | ~5 | ~50+ | 10x increase |

## 🔍 Monitoring Checklist

- [ ] Query execution times < 2 seconds
- [ ] Database connection pool utilization < 80%
- [ ] Memory usage < 1GB per worker
- [ ] API response times P95 < 3 seconds
- [ ] Error rate < 1%
- [ ] Cache hit rate > 70% (if implemented)

---

*Note: Implement these optimizations incrementally and measure performance impact at each step.*
