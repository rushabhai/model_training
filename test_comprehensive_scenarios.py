#!/usr/bin/env python3
"""
Comprehensive Test Suite for StackLogix Inventory Forecasting System
=====================================================================

This script tests all functionality we've built:
1. Basic API health checks
2. Database optimization
3. Filtering performance 
4. Forecasting accuracy
5. Dashboard functionality
6. Quarterly validation (optimized)
7. Model performance metrics

Usage:
    python test_comprehensive_scenarios.py
"""

import requests
import json
import time
from datetime import datetime, date
from typing import Dict, Any, List
import sys

BASE_URL = "http://localhost:8000"

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []
        
    def test(self, name: str, func):
        """Run a single test"""
        try:
            print(f"\n🧪 Testing: {name}")
            start_time = time.time()
            result = func()
            duration = time.time() - start_time
            
            if result.get('success', False):
                print(f"✅ PASSED in {duration:.2f}s")
                self.passed += 1
                status = "PASSED"
            else:
                print(f"❌ FAILED: {result.get('error', 'Unknown error')}")
                self.failed += 1
                status = "FAILED"
                
            self.results.append({
                "test": name,
                "status": status,
                "duration": duration,
                "details": result
            })
            
        except Exception as e:
            print(f"❌ FAILED: {str(e)}")
            self.failed += 1
            self.results.append({
                "test": name,
                "status": "FAILED",
                "duration": 0,
                "error": str(e)
            })
    
    def summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print(f"TEST SUMMARY: {self.passed} passed, {self.failed} failed")
        print("="*60)
        
        if self.failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if result["status"] == "FAILED":
                    print(f"  - {result['test']}: {result.get('error', result.get('details', {}).get('error', 'Unknown'))}")
        
        print(f"\n📊 Overall Success Rate: {(self.passed/(self.passed+self.failed)*100):.1f}%")

# Test Functions
def test_health_check():
    """Test basic API health"""
    response = requests.get(f"{BASE_URL}/health", timeout=10)
    return {
        "success": response.status_code == 200,
        "status_code": response.status_code,
        "response": response.json() if response.status_code == 200 else None
    }

def test_database_optimization():
    """Test database optimization endpoint"""
    response = requests.post(f"{BASE_URL}/database/optimize", timeout=60)
    data = response.json() if response.status_code == 200 else {}
    return {
        "success": response.status_code == 200,
        "indexes_processed": data.get("indexes_processed", 0),
        "execution_time": sum(r.get("execution_time_ms", 0) for r in data.get("results", [])),
        "error": data.get("message") if response.status_code != 200 else None
    }

def test_dashboard_filtering():
    """Test dashboard with different filters"""
    filters = [
        {"brand": "X"},
        {"brand": "X", "channel_id": "Myntra"},
        {"product_category": "Electronics"},
        {}  # No filters
    ]
    
    results = []
    for filter_set in filters:
        try:
            response = requests.post(
                f"{BASE_URL}/dashboard", 
                json=filter_set,
                timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                results.append({
                    "filter": filter_set,
                    "response_time_ms": data.get("response_time_ms", 0),
                    "kpis_count": len(data.get("kpis", {})),
                    "top_series_count": len(data.get("top_series", [])),
                    "success": True
                })
            else:
                results.append({
                    "filter": filter_set,
                    "success": False,
                    "error": f"HTTP {response.status_code}"
                })
        except Exception as e:
            results.append({
                "filter": filter_set,
                "success": False,
                "error": str(e)
            })
    
    successful = [r for r in results if r.get("success")]
    avg_response_time = sum(r.get("response_time_ms", 0) for r in successful) / len(successful) if successful else 0
    
    return {
        "success": len(successful) > 0,
        "filters_tested": len(filters),
        "successful_filters": len(successful),
        "avg_response_time_ms": avg_response_time,
        "results": results
    }

def test_forecast_accuracy():
    """Test forecasting for specific SKU"""
    forecast_request = {
        "sku_id": "SKU_001",
        "warehouse_id": "WH_001",
        "forecast_horizon": 30,
        "brand": "X"
    }
    
    response = requests.post(f"{BASE_URL}/forecast", json=forecast_request, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "success": True,
            "model": data.get("model"),
            "bucket": data.get("bucket"),
            "forecast_points": len(data.get("forecast", [])),
            "has_intervals": all("p10" in fp and "p90" in fp for fp in data.get("forecast", [])),
            "training_days": data.get("training_days", 0)
        }
    else:
        return {
            "success": False,
            "error": f"HTTP {response.status_code}",
            "response": response.text[:200]
        }

def test_model_validation():
    """Test model validation on recent data"""
    validation_request = {
        "sku_id": "SKU_001",
        "warehouse_id": "WH_001",
        "train_end_date": "2024-09-30",
        "test_start_date": "2024-10-01",
        "test_end_date": "2024-10-31"
    }
    
    response = requests.post(f"{BASE_URL}/validate", json=validation_request, timeout=45)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "success": True,
            "wape": data.get("wape", 0),
            "mae": data.get("mae", 0),
            "model": data.get("model"),
            "test_days": data.get("test_days", 0),
            "interval_coverage": data.get("interval_coverage", 0)
        }
    else:
        return {
            "success": False,
            "error": f"HTTP {response.status_code}",
            "response": response.text[:200]
        }

def test_quarterly_validation_optimized():
    """Test quarterly validation with minimal scope for speed"""
    validation_request = {
        "year": 2024,
        "test_quarter": 4,
        "top_n_series": 2,  # Test only 2 series for speed
        "filters": {"brand": "X", "channel_id": "Myntra"}  # Narrow scope
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/validate/quarterly", 
            json=validation_request, 
            timeout=120  # 2 minute timeout
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "series_tested": data.get("series_tested", 0),
                "overall_wape": data.get("overall_metrics", {}).get("overall_wape", 0),
                "overall_mae": data.get("overall_metrics", {}).get("overall_mae", 0),
                "execution_time": data.get("summary", {}).get("execution_time_seconds", 0),
                "test_period": data.get("test_period"),
                "accuracy_distribution": data.get("summary", {}).get("accuracy_distribution", {})
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}",
                "response": response.text[:200]
            }
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Request timed out after 120 seconds"
        }

def test_performance_monitoring():
    """Test performance monitoring endpoint"""
    response = requests.get(f"{BASE_URL}/metrics", timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "success": True,
            "total_requests": data.get("total_requests", 0),
            "successful_requests": data.get("successful_requests", 0),
            "avg_response_time": data.get("average_response_time_ms", 0),
            "uptime_seconds": data.get("uptime_seconds", 0)
        }
    else:
        return {
            "success": False,
            "error": f"HTTP {response.status_code}"
        }

def test_data_statistics():
    """Test data statistics endpoint"""
    response = requests.get(f"{BASE_URL}/data/stats", timeout=15)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "success": True,
            "total_records": data.get("total_records", 0),
            "unique_skus": data.get("unique_skus", 0),
            "date_range": f"{data.get('min_date')} to {data.get('max_date')}",
            "brands": data.get("unique_brands", 0),
            "warehouses": data.get("unique_warehouses", 0)
        }
    else:
        return {
            "success": False,
            "error": f"HTTP {response.status_code}"
        }

def test_filter_options():
    """Test filter options endpoint"""
    response = requests.get(f"{BASE_URL}/filters/options", timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "success": True,
            "brands": len(data.get("brands", [])),
            "channels": len(data.get("channels", [])),
            "warehouses": len(data.get("warehouses", [])),
            "categories": len(data.get("categories", []))
        }
    else:
        return {
            "success": False,
            "error": f"HTTP {response.status_code}"
        }

def main():
    """Run comprehensive test suite"""
    print("🚀 Starting Comprehensive Test Suite for StackLogix")
    print("="*60)
    
    runner = TestRunner()
    
    # Core functionality tests
    runner.test("API Health Check", test_health_check)
    runner.test("Data Statistics", test_data_statistics)
    runner.test("Filter Options", test_filter_options)
    runner.test("Performance Monitoring", test_performance_monitoring)
    
    # Database optimization
    runner.test("Database Optimization", test_database_optimization)
    
    # Dashboard and filtering
    runner.test("Dashboard with Filtering", test_dashboard_filtering)
    
    # Forecasting functionality
    runner.test("Forecast Accuracy", test_forecast_accuracy)
    runner.test("Model Validation", test_model_validation)
    
    # Advanced testing (optimized)
    runner.test("Quarterly Validation (Optimized)", test_quarterly_validation_optimized)
    
    # Print summary
    runner.summary()
    
    # Save results to file
    with open("test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "passed": runner.passed,
                "failed": runner.failed,
                "success_rate": runner.passed/(runner.passed+runner.failed)*100 if (runner.passed+runner.failed) > 0 else 0
            },
            "results": runner.results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to test_results.json")
    
    return runner.failed == 0  # Return True if all tests passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
