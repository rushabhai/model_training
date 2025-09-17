#!/usr/bin/env python3
"""Quick test of core functionality"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_endpoint(name, url, method="GET", data=None, timeout=10):
    """Test a single endpoint"""
    try:
        print(f"Testing {name}...")
        start = time.time()
        
        if method == "POST":
            response = requests.post(url, json=data, timeout=timeout)
        else:
            response = requests.get(url, timeout=timeout)
        
        duration = time.time() - start
        
        if response.status_code == 200:
            print(f"✅ {name} - {duration:.2f}s - Status: {response.status_code}")
            return True, response.json()
        else:
            print(f"❌ {name} - Status: {response.status_code}")
            return False, response.text
            
    except Exception as e:
        print(f"❌ {name} - Error: {str(e)}")
        return False, str(e)

def main():
    print("🚀 Quick Test Suite")
    print("=" * 40)
    
    tests = [
        ("Health Check", f"{BASE_URL}/health"),
        ("Data Stats", f"{BASE_URL}/data/stats"),
        ("Filter Options", f"{BASE_URL}/filters/options"),
        ("Dashboard (No Filters)", f"{BASE_URL}/dashboard", "POST", {}),
        ("Dashboard (Brand Filter)", f"{BASE_URL}/dashboard", "POST", {"brand": "X"}),
        ("Metrics", f"{BASE_URL}/metrics"),
        ("Quarterly Scenarios", f"{BASE_URL}/validate/quarterly/scenarios"),
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if len(test) == 2:
            name, url = test
            success, result = test_endpoint(name, url)
        elif len(test) == 4:
            name, url, method, data = test
            success, result = test_endpoint(name, url, method, data)
        
        if success:
            passed += 1
    
    print("\n" + "=" * 40)
    print(f"Results: {passed}/{total} tests passed")
    print(f"Success Rate: {(passed/total)*100:.1f}%")

if __name__ == "__main__":
    main()
