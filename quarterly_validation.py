# quarterly_validation.py - Quarterly Validation Extensions for app.py

# --------------------------------------------------------------------------------------
# Quarterly Validation System
# --------------------------------------------------------------------------------------

from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class QuarterlyValidationRequest(BaseModel):
    """Request for quarterly validation testing"""
    year: int = 2024  # Year to test
    test_quarter: int = 4  # Quarter to test (1-4)
    filters: Optional['GlobalFilters'] = None
    top_n_series: int = 10  # Number of top series to test
    
class QuarterlyValidationResult(BaseModel):
    """Results from quarterly validation"""
    test_period: str
    train_period: str
    series_tested: int
    overall_metrics: Dict[str, float]
    series_results: List[Dict[str, Any]]
    summary: Dict[str, Any]

# Add these endpoints to app.py:

def validate_quarterly_forecast(req: QuarterlyValidationRequest):
    """Validate model performance using 3 quarters training vs 1 quarter testing"""
    import time
    start_time = time.time()
    
    # Define quarter date ranges
    quarters = {
        1: {"start": f"{req.year}-01-01", "end": f"{req.year}-03-31"},
        2: {"start": f"{req.year}-04-01", "end": f"{req.year}-06-30"},
        3: {"start": f"{req.year}-07-01", "end": f"{req.year}-09-30"},
        4: {"start": f"{req.year}-10-01", "end": f"{req.year}-12-31"}
    }
    
    # Training period: All quarters except test quarter
    train_quarters = [q for q in [1, 2, 3, 4] if q != req.test_quarter]
    
    # Test period
    test_start = quarters[req.test_quarter]["start"]
    test_end = quarters[req.test_quarter]["end"]
    
    # Training end date (end of last training quarter)
    last_train_quarter = max(train_quarters)
    train_end = quarters[last_train_quarter]["end"]
    
    # Build filter conditions
    filters = req.filters or GlobalFilters()
    where_clause, filter_params = _build_global_filters(filters)
    
    with ENGINE.connect() as conn:
        # Get top series based on total demand in training period
        top_series_sql = f"""
        SELECT 
            sku_id,
            warehouse_id,
            SUM(units_sold) as total_demand,
            COUNT(*) as data_points,
            AVG(units_sold) as avg_demand
        FROM brand_x_data
        WHERE {where_clause}
        AND date <= :train_end
        GROUP BY sku_id, warehouse_id
        HAVING COUNT(*) >= 90  -- At least 90 days of data
        ORDER BY total_demand DESC
        LIMIT :top_n
        """
        
        params = {**filter_params, "train_end": train_end, "top_n": req.top_n_series}
        result = conn.execute(text(top_series_sql), params)
        top_series = [dict(row._mapping) for row in result.fetchall()]
    
    if not top_series:
        raise HTTPException(status_code=404, detail="No series found matching criteria")
    
    # Validate each series
    series_results = []
    all_actuals = []
    all_forecasts = []
    
    for series in top_series:
        try:
            # Create validation request for this series
            val_req = ValidationRequest(
                sku_id=series["sku_id"],
                warehouse_id=series["warehouse_id"],
                train_end_date=train_end,
                test_start_date=test_start,
                test_end_date=test_end
            )
            
            # Run validation
            val_result = validate_model(val_req)
            
            # Store results
            series_result = {
                "sku_id": series["sku_id"],
                "warehouse_id": series["warehouse_id"],
                "training_demand": series["total_demand"],
                "training_days": val_result.train_days,
                "test_days": val_result.test_days,
                "wape": val_result.wape,
                "mape": val_result.smape,  # Using SMAPE as MAPE
                "mae": val_result.mae,
                "rmse": val_result.rmse,
                "bias_pct": val_result.bias_pct,
                "actual_total": val_result.actual_total,
                "forecast_total": val_result.forecast_total,
                "model": val_result.model,
                "bucket": val_result.bucket,
                "interval_coverage": val_result.interval_coverage
            }
            
            series_results.append(series_result)
            
            # Collect for overall metrics
            all_actuals.extend([val_result.actual_total])
            all_forecasts.extend([val_result.forecast_total])
            
        except Exception as e:
            # Log failed series but continue
            series_results.append({
                "sku_id": series["sku_id"],
                "warehouse_id": series["warehouse_id"],
                "error": str(e)[:100],
                "status": "failed"
            })
    
    # Calculate overall metrics
    successful_results = [r for r in series_results if "error" not in r]
    
    if successful_results:
        overall_wape = sum(r["wape"] * r["actual_total"] for r in successful_results) / sum(r["actual_total"] for r in successful_results)
        overall_mae = sum(r["mae"] for r in successful_results) / len(successful_results)
        overall_bias = sum(r["bias_pct"] for r in successful_results) / len(successful_results)
        overall_coverage = sum(r["interval_coverage"] for r in successful_results) / len(successful_results)
        
        # Calculate accuracy distribution
        accurate_series = len([r for r in successful_results if r["wape"] < 20])  # WAPE < 20%
        good_series = len([r for r in successful_results if 20 <= r["wape"] < 40])
        poor_series = len([r for r in successful_results if r["wape"] >= 40])
    else:
        overall_wape = overall_mae = overall_bias = overall_coverage = 0
        accurate_series = good_series = poor_series = 0
    
    # Summary statistics
    summary = {
        "total_series_requested": req.top_n_series,
        "series_tested": len(successful_results),
        "series_failed": len(series_results) - len(successful_results),
        "accuracy_distribution": {
            "accurate_series_wape_lt_20": accurate_series,
            "good_series_wape_20_40": good_series,
            "poor_series_wape_gt_40": poor_series
        },
        "model_distribution": {},
        "execution_time_seconds": time.time() - start_time
    }
    
    # Model distribution
    if successful_results:
        model_counts = {}
        for r in successful_results:
            model = r.get("model", "Unknown")
            model_counts[model] = model_counts.get(model, 0) + 1
        summary["model_distribution"] = model_counts
    
    return QuarterlyValidationResult(
        test_period=f"Q{req.test_quarter} {req.year} ({test_start} to {test_end})",
        train_period=f"Q{'-Q'.join(map(str, train_quarters))} {req.year} (up to {train_end})",
        series_tested=len(successful_results),
        overall_metrics={
            "overall_wape": overall_wape,
            "overall_mae": overall_mae,
            "overall_bias_pct": overall_bias,
            "overall_interval_coverage": overall_coverage
        },
        series_results=series_results,
        summary=summary
    )

def get_quarterly_validation_scenarios():
    """Get available scenarios for quarterly validation testing"""
    
    with ENGINE.connect() as conn:
        # Get available years and quarters
        result = conn.execute(text("""
        SELECT 
            EXTRACT(YEAR FROM date) as year,
            EXTRACT(QUARTER FROM date) as quarter,
            COUNT(*) as records,
            COUNT(DISTINCT sku_id) as unique_skus,
            SUM(units_sold) as total_demand
        FROM brand_x_data
        WHERE date IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM date), EXTRACT(QUARTER FROM date)
        ORDER BY year DESC, quarter DESC
        """))
        
        quarters_data = [dict(row._mapping) for row in result.fetchall()]
        
        # Suggest scenarios
        scenarios = []
        
        # Find years with complete data (4 quarters)
        year_quarters = {}
        for q in quarters_data:
            year = int(q["year"])
            quarter = int(q["quarter"])
            if year not in year_quarters:
                year_quarters[year] = []
            year_quarters[year].append(quarter)
        
        for year, quarters in year_quarters.items():
            if len(quarters) >= 3:  # At least 3 quarters for training
                scenarios.append({
                    "year": year,
                    "available_quarters": sorted(quarters),
                    "recommended_test_quarter": max(quarters),  # Test on latest quarter
                    "total_records": sum(q["records"] for q in quarters_data if int(q["year"]) == year),
                    "unique_skus": sum(q["unique_skus"] for q in quarters_data if int(q["year"]) == year)
                })
    
    return {
        "available_scenarios": scenarios,
        "recommendations": [
            "Use the latest complete year for testing",
            "Test Q4 using Q1-Q3 for training (seasonal patterns)",
            "Focus on series with at least 90 days of historical data",
            "Use filters to test specific segments (brand, channel, category)"
        ],
        "quarters_data": quarters_data[:20]  # Recent quarters
    }
