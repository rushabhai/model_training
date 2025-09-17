#!/usr/bin/env python3
"""
Comprehensive Test Scenarios for Brand X Inventory Forecasting System
=====================================================================

This script contains various test scenarios to validate the forecasting API
across different data patterns, edge cases, and business scenarios.
"""

import requests
import json
import time
from datetime import date, timedelta
from typing import List, Dict, Any
import pandas as pd
from sqlalchemy import create_engine, text
import os

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuration
API_BASE_URL = "http://localhost:8000"
PG_URI = os.environ.get("PG_URI")

class ForecastingTestSuite:
    """Test suite for the forecasting API"""
    
    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.engine = create_engine(PG_URI) if PG_URI else None
        self.test_results = []
    
    def log_test(self, test_name: str, status: str, details: Dict = None):
        """Log test results"""
        result = {
            "test_name": test_name,
            "status": status,
            "timestamp": time.time(),
            "details": details or {}
        }
        self.test_results.append(result)
        print(f"{'✅' if status == 'PASS' else '❌'} {test_name}: {status}")
        if details:
            for key, value in details.items():
                print(f"   {key}: {value}")
    
    def test_health_check(self):
        """Test 1: Basic health check"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200 and response.json().get("status") == "ok":
                self.log_test("Health Check", "PASS", {"response_time": f"{response.elapsed.total_seconds():.3f}s"})
            else:
                self.log_test("Health Check", "FAIL", {"status_code": response.status_code})
        except Exception as e:
            self.log_test("Health Check", "ERROR", {"error": str(e)})
    
    def test_single_forecast_intermittent(self):
        """Test 2: Single forecast for intermittent series (low demand)"""
        payload = {
            "sku_id": "X_003",
            "warehouse_id": "bangalore",
            "horizon": 7,
            "brand": "X",
            "channel_id": "Myntra"
        }
        
        try:
            response = requests.post(f"{self.base_url}/forecast", json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Single Forecast - Intermittent", "PASS", {
                    "model": data.get("model", "unknown"),
                    "bucket": data.get("bucket", "unknown"),
                    "history_days": data.get("history_days", 0),
                    "forecasts_count": len(data.get("forecasts", []))
                })
                
                # Validate forecast structure
                forecasts = data.get("forecasts", [])
                if forecasts and all(f.get("p10", -1) <= f.get("p50", -1) <= f.get("p90", -1) for f in forecasts):
                    self.log_test("Forecast Structure Validation", "PASS")
                else:
                    self.log_test("Forecast Structure Validation", "FAIL", {"issue": "P10 <= P50 <= P90 constraint violated"})
            else:
                self.log_test("Single Forecast - Intermittent", "FAIL", {"status_code": response.status_code, "error": response.text})
        except Exception as e:
            self.log_test("Single Forecast - Intermittent", "ERROR", {"error": str(e)})
    
    def test_forecast_with_filters(self):
        """Test 3: Forecast with date range filters"""
        payload = {
            "sku_id": "X_003",
            "warehouse_id": "bangalore",
            "horizon": 14,
            "start_date": "2023-01-01",
            "end_date": "2024-12-31",
            "brand": "X"
        }
        
        try:
            response = requests.post(f"{self.base_url}/forecast", json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Forecast with Date Filters", "PASS", {
                    "horizon": len(data.get("forecasts", [])),
                    "train_days": data.get("train_days", 0)
                })
            else:
                self.log_test("Forecast with Date Filters", "FAIL", {"status_code": response.status_code})
        except Exception as e:
            self.log_test("Forecast with Date Filters", "ERROR", {"error": str(e)})
    
    def test_batch_forecast(self):
        """Test 4: Batch forecasting for multiple items"""
        payload = {
            "items": [
                {"sku_id": "X_003", "warehouse_id": "bangalore"},
                {"sku_id": "X_003", "warehouse_id": "delhi"},
                {"sku_id": "X_003", "warehouse_id": "mumbai"}
            ],
            "horizon": 7,
            "brand": "X"
        }
        
        try:
            response = requests.post(f"{self.base_url}/forecast/batch", json=payload, timeout=60)
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                errors = data.get("errors", [])
                self.log_test("Batch Forecast", "PASS", {
                    "successful_forecasts": len(results),
                    "failed_forecasts": len(errors),
                    "total_requested": len(payload["items"])
                })
            else:
                self.log_test("Batch Forecast", "FAIL", {"status_code": response.status_code})
        except Exception as e:
            self.log_test("Batch Forecast", "ERROR", {"error": str(e)})
    
    def test_nonexistent_series(self):
        """Test 5: Handle non-existent SKU/warehouse combination"""
        payload = {
            "sku_id": "NONEXISTENT_SKU",
            "warehouse_id": "nonexistent_warehouse",
            "horizon": 7
        }
        
        try:
            response = requests.post(f"{self.base_url}/forecast", json=payload, timeout=30)
            if response.status_code == 404:
                self.log_test("Non-existent Series Handling", "PASS", {"expected_404": True})
            else:
                self.log_test("Non-existent Series Handling", "FAIL", {"unexpected_status": response.status_code})
        except Exception as e:
            self.log_test("Non-existent Series Handling", "ERROR", {"error": str(e)})
    
    def test_edge_cases(self):
        """Test 6: Edge cases and boundary conditions"""
        test_cases = [
            {
                "name": "Maximum Horizon",
                "payload": {"sku_id": "X_003", "warehouse_id": "bangalore", "horizon": 28}
            },
            {
                "name": "Minimum Horizon", 
                "payload": {"sku_id": "X_003", "warehouse_id": "bangalore", "horizon": 1}
            },
            {
                "name": "Custom Seasonality",
                "payload": {"sku_id": "X_003", "warehouse_id": "bangalore", "horizon": 7, "season": 14}
            }
        ]
        
        for case in test_cases:
            try:
                response = requests.post(f"{self.base_url}/forecast", json=case["payload"], timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(f"Edge Case - {case['name']}", "PASS", {"horizon": len(data.get("forecasts", []))})
                else:
                    self.log_test(f"Edge Case - {case['name']}", "FAIL", {"status_code": response.status_code})
            except Exception as e:
                self.log_test(f"Edge Case - {case['name']}", "ERROR", {"error": str(e)})
    
    def test_data_quality_scenarios(self):
        """Test 7: Data quality scenarios if database is available"""
        if not self.engine:
            self.log_test("Data Quality Tests", "SKIP", {"reason": "No database connection"})
            return
        
        try:
            with self.engine.connect() as conn:
                # Test 1: Find SKUs with sufficient history
                result = conn.execute(text("""
                    SELECT sku_id, warehouse_id, COUNT(*) as days, 
                           SUM(units_sold) as total_demand,
                           AVG(units_sold) as avg_demand
                    FROM brand_x_data 
                    WHERE date >= '2023-01-01' 
                    GROUP BY sku_id, warehouse_id 
                    HAVING COUNT(*) >= 100 AND SUM(units_sold) > 0
                    ORDER BY total_demand DESC 
                    LIMIT 5
                """))
                
                high_demand_series = result.fetchall()
                self.log_test("High Demand Series Identification", "PASS", {
                    "series_found": len(high_demand_series),
                    "example": f"{high_demand_series[0][0]}@{high_demand_series[0][1]}" if high_demand_series else "None"
                })
                
                # Test forecasting on high-demand series (likely SMOOTH/ERRATIC)
                if high_demand_series:
                    sku_id, warehouse_id = high_demand_series[0][:2]
                    payload = {
                        "sku_id": sku_id,
                        "warehouse_id": warehouse_id,
                        "horizon": 7
                    }
                    
                    response = requests.post(f"{self.base_url}/forecast", json=payload, timeout=30)
                    if response.status_code == 200:
                        data = response.json()
                        self.log_test("High Demand Series Forecast", "PASS", {
                            "model": data.get("model", "unknown"),
                            "bucket": data.get("bucket", "unknown")
                        })
                    else:
                        self.log_test("High Demand Series Forecast", "FAIL")
        except Exception as e:
            self.log_test("Data Quality Tests", "ERROR", {"error": str(e)})
    
    def test_performance_scenarios(self):
        """Test 8: Performance and load testing"""
        # Single request timing
        start_time = time.time()
        payload = {"sku_id": "X_003", "warehouse_id": "bangalore", "horizon": 7}
        
        try:
            response = requests.post(f"{self.base_url}/forecast", json=payload, timeout=30)
            end_time = time.time()
            
            if response.status_code == 200:
                response_time = end_time - start_time
                self.log_test("Single Request Performance", "PASS", {
                    "response_time_seconds": f"{response_time:.3f}",
                    "acceptable": response_time < 5.0
                })
            else:
                self.log_test("Single Request Performance", "FAIL")
        except Exception as e:
            self.log_test("Single Request Performance", "ERROR", {"error": str(e)})
    
    def test_model_selection_validation(self):
        """Test 9: Validate model selection logic"""
        if not self.engine:
            self.log_test("Model Selection Validation", "SKIP", {"reason": "No database connection"})
            return
        
        try:
            # Test different series types
            test_cases = [
                ("X_003", "bangalore"),  # Should be intermittent (low demand)
            ]
            
            for sku_id, warehouse_id in test_cases:
                payload = {
                    "sku_id": sku_id,
                    "warehouse_id": warehouse_id,
                    "horizon": 7
                }
                
                response = requests.post(f"{self.base_url}/forecast", json=payload, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    model = data.get("model", "")
                    bucket = data.get("bucket", "")
                    
                    # Validate model-bucket consistency
                    is_consistent = (
                        (bucket == "INTERMITTENT" and "Croston" in model) or
                        (bucket in ["SMOOTH", "ERRATIC"] and "HoltWinters" in model)
                    )
                    
                    self.log_test(f"Model Selection - {sku_id}@{warehouse_id}", 
                                "PASS" if is_consistent else "FAIL", {
                                    "bucket": bucket,
                                    "model": model,
                                    "consistent": is_consistent
                                })
        except Exception as e:
            self.log_test("Model Selection Validation", "ERROR", {"error": str(e)})
    
    def test_business_scenarios(self):
        """Test 10: Real business scenarios"""
        scenarios = [
            {
                "name": "Holiday Season Forecast",
                "payload": {
                    "sku_id": "X_003",
                    "warehouse_id": "bangalore",
                    "horizon": 14,
                    "start_date": "2024-01-01",
                    "end_date": "2024-12-31"
                },
                "description": "Full year data for better seasonality capture"
            },
            {
                "name": "New Product Launch",
                "payload": {
                    "sku_id": "X_003",
                    "warehouse_id": "bangalore", 
                    "horizon": 7,
                    "min_train": 30  # Reduced for new products
                },
                "description": "Forecast with limited history"
            },
            {
                "name": "Multi-Channel Analysis",
                "payload": {
                    "sku_id": "X_003",
                    "warehouse_id": "bangalore",
                    "horizon": 7,
                    "channel_id": "Myntra"
                },
                "description": "Channel-specific forecasting"
            }
        ]
        
        for scenario in scenarios:
            try:
                response = requests.post(f"{self.base_url}/forecast", json=scenario["payload"], timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(f"Business Scenario - {scenario['name']}", "PASS", {
                        "description": scenario["description"],
                        "history_days": data.get("history_days", 0),
                        "model": data.get("model", "unknown")
                    })
                else:
                    self.log_test(f"Business Scenario - {scenario['name']}", "FAIL", {
                        "status_code": response.status_code
                    })
            except Exception as e:
                self.log_test(f"Business Scenario - {scenario['name']}", "ERROR", {"error": str(e)})
    
    def run_all_tests(self):
        """Run all test scenarios"""
        print("🧪 Starting Brand X Forecasting API Test Suite")
        print("=" * 60)
        
        # Run all tests
        self.test_health_check()
        self.test_single_forecast_intermittent()
        self.test_forecast_with_filters()
        self.test_batch_forecast()
        self.test_nonexistent_series()
        self.test_edge_cases()
        self.test_data_quality_scenarios()
        self.test_performance_scenarios()
        self.test_model_selection_validation()
        self.test_business_scenarios()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed = len([r for r in self.test_results if r["status"] == "PASS"])
        failed = len([r for r in self.test_results if r["status"] == "FAIL"])
        errors = len([r for r in self.test_results if r["status"] == "ERROR"])
        skipped = len([r for r in self.test_results if r["status"] == "SKIP"])
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"🔥 Errors: {errors}")
        print(f"⏭️  Skipped: {skipped}")
        print(f"Success Rate: {(passed/total_tests)*100:.1f}%")
        
        return self.test_results

def main():
    """Main function to run tests"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run Brand X Forecasting API Tests")
    parser.add_argument("--base-url", default=API_BASE_URL, help="API base URL")
    parser.add_argument("--output", help="Save results to JSON file")
    
    args = parser.parse_args()
    
    # Run tests
    test_suite = ForecastingTestSuite(args.base_url)
    results = test_suite.run_all_tests()
    
    # Save results if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n💾 Results saved to {args.output}")

if __name__ == "__main__":
    main()
