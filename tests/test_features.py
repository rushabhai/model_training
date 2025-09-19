"""
Unit tests for feature engineering functions to verify lag correctness and no data leakage.
"""
import pytest
import pandas as pd
import numpy as np
from datetime import date, timedelta
import sys
import os

# Add the parent directory to the path to import from train_ml
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from train_ml import create_lag_features, create_rolling_features, create_time_features, generate_features

class TestFeatureEngineering:
    """Test feature engineering functions for correctness and no data leakage."""
    
    def setup_method(self):
        """Set up test data for each test method."""
        # Create test data with known patterns
        dates = pd.date_range(start='2024-01-01', end='2024-01-31', freq='D')
        self.test_data = pd.DataFrame({
            'date': dates,
            'sku_id': ['SKU_001'] * len(dates),
            'warehouse_id': ['WH_001'] * len(dates),
            'demand_qty': [10 + i % 7 for i in range(len(dates))],  # Weekly pattern
            'selling_price': [100.0] * len(dates),
            'discount_percent': [0.0] * len(dates),
            'promotion_flag': [False] * len(dates),
            'price_index_mrp': [1.0] * len(dates),
            'price_index_comp': [1.0] * len(dates)
        })
    
    def test_lag_features_correctness(self):
        """Test that lag features are calculated correctly."""
        df = create_lag_features(self.test_data.copy(), [1, 7, 14], 'demand_qty')
        
        # Check that lag_1 is correctly shifted
        assert df['demand_qty_lag_1'].iloc[1] == self.test_data['demand_qty'].iloc[0]
        assert df['demand_qty_lag_1'].iloc[7] == self.test_data['demand_qty'].iloc[6]
        
        # Check that lag_7 is correctly shifted
        assert df['demand_qty_lag_7'].iloc[7] == self.test_data['demand_qty'].iloc[0]
        assert df['demand_qty_lag_7'].iloc[14] == self.test_data['demand_qty'].iloc[7]
        
        # Check that lag_14 is correctly shifted
        assert df['demand_qty_lag_14'].iloc[14] == self.test_data['demand_qty'].iloc[0]
        assert df['demand_qty_lag_14'].iloc[21] == self.test_data['demand_qty'].iloc[7]
    
    def test_lag_features_no_leakage(self):
        """Test that lag features don't use future data (no data leakage)."""
        df = create_lag_features(self.test_data.copy(), [1, 7, 14], 'demand_qty')
        
        # For any row i, lag features should only use data from rows < i
        for i in range(1, len(df)):
            # lag_1 should use data from i-1
            if i >= 1:
                assert df['demand_qty_lag_1'].iloc[i] == self.test_data['demand_qty'].iloc[i-1]
            
            # lag_7 should use data from i-7
            if i >= 7:
                assert df['demand_qty_lag_7'].iloc[i] == self.test_data['demand_qty'].iloc[i-7]
            
            # lag_14 should use data from i-14
            if i >= 14:
                assert df['demand_qty_lag_14'].iloc[i] == self.test_data['demand_qty'].iloc[i-14]
    
    def test_rolling_features_correctness(self):
        """Test that rolling features are calculated correctly."""
        df = create_rolling_features(self.test_data.copy(), [7], 'demand_qty')
        
        # Check that rolling mean is calculated correctly
        # For row 7, mean_7 should be the mean of rows 0-6 (7 points, shifted by 1)
        expected_mean = self.test_data['demand_qty'].iloc[0:7].mean()
        actual_mean = df['demand_qty_mean_7'].iloc[7]
        assert abs(actual_mean - expected_mean) < 1e-10, f"Expected {expected_mean}, got {actual_mean}"
        
        # Check that rolling std is calculated correctly
        expected_std = self.test_data['demand_qty'].iloc[0:7].std()
        actual_std = df['demand_qty_std_7'].iloc[7]
        assert abs(actual_std - expected_std) < 1e-10, f"Expected {expected_std}, got {actual_std}"
    
    def test_rolling_features_no_leakage(self):
        """Test that rolling features don't use future data (no data leakage)."""
        df = create_rolling_features(self.test_data.copy(), [7, 28], 'demand_qty')
        
        # For any row i, rolling features should only use data from rows < i
        for i in range(1, len(df)):
            # mean_7 should use data from i-7 to i-1 (7 points, shifted by 1)
            if i >= 7:
                expected_mean = self.test_data['demand_qty'].iloc[i-7:i].mean()
                actual_mean = df['demand_qty_mean_7'].iloc[i]
                assert abs(actual_mean - expected_mean) < 1e-10, f"Row {i}: Expected {expected_mean}, got {actual_mean}"
            
            # mean_28 should use data from i-28 to i-1 (28 points, shifted by 1)
            if i >= 28:
                expected_mean = self.test_data['demand_qty'].iloc[i-28:i].mean()
                actual_mean = df['demand_qty_mean_28'].iloc[i]
                assert abs(actual_mean - expected_mean) < 1e-10, f"Row {i}: Expected {expected_mean}, got {actual_mean}"
    
    def test_time_features_correctness(self):
        """Test that time features are calculated correctly."""
        df = create_time_features(self.test_data.copy())
        
        # Check day of week (0=Monday, 6=Sunday)
        assert df['dow'].iloc[0] == 0  # 2024-01-01 is a Monday
        assert df['dow'].iloc[6] == 6  # 2024-01-07 is a Sunday
        
        # Check week number
        assert df['week_num'].iloc[0] == 1  # First week of 2024
        assert df['week_num'].iloc[6] == 1  # Still first week
        
        # Check month number
        assert df['month_num'].iloc[0] == 1  # January
        assert df['month_num'].iloc[15] == 1  # Still January
    
    def test_generate_features_completeness(self):
        """Test that generate_features creates all expected features."""
        df = generate_features(self.test_data.copy())
        
        # Check that all expected features are present
        expected_features = [
            'demand_qty_lag_1', 'demand_qty_lag_7', 'demand_qty_lag_14', 'demand_qty_lag_28',
            'demand_qty_mean_7', 'demand_qty_std_7', 'demand_qty_mean_28', 'demand_qty_std_28',
            'selling_price', 'discount_percent', 'promotion_flag', 
            'price_index_mrp', 'price_index_comp',
            'dow', 'week_num', 'month_num'
        ]
        
        for feature in expected_features:
            assert feature in df.columns, f"Feature {feature} not found in generated features"
    
    def test_generate_features_data_types(self):
        """Test that generated features have correct data types."""
        df = generate_features(self.test_data.copy())
        
        # Check numeric features
        numeric_features = ['demand_qty_lag_1', 'demand_qty_lag_7', 'demand_qty_lag_14', 'demand_qty_lag_28',
                           'demand_qty_mean_7', 'demand_qty_std_7', 'demand_qty_mean_28', 'demand_qty_std_28',
                           'selling_price', 'discount_percent', 'price_index_mrp', 'price_index_comp']
        
        for feature in numeric_features:
            assert pd.api.types.is_numeric_dtype(df[feature]), f"Feature {feature} should be numeric"
        
        # Check integer features
        integer_features = ['promotion_flag', 'dow', 'week_num', 'month_num']
        
        for feature in integer_features:
            assert pd.api.types.is_integer_dtype(df[feature]), f"Feature {feature} should be integer"
    
    def test_generate_features_handles_missing_columns(self):
        """Test that generate_features handles missing columns gracefully."""
        # Create data with missing columns
        incomplete_data = self.test_data[['date', 'sku_id', 'warehouse_id', 'demand_qty']].copy()
        
        df = generate_features(incomplete_data)
        
        # Check that missing columns are filled with zeros
        assert df['selling_price'].sum() == 0
        assert df['discount_percent'].sum() == 0
        assert df['promotion_flag'].sum() == 0
        assert df['price_index_mrp'].sum() == 0
        assert df['price_index_comp'].sum() == 0
    
    def test_feature_engineering_with_multiple_skus(self):
        """Test feature engineering with multiple SKUs to ensure proper grouping."""
        # Create data with multiple SKUs
        dates = pd.date_range(start='2024-01-01', end='2024-01-10', freq='D')
        multi_sku_data = pd.DataFrame({
            'date': list(dates) * 2,
            'sku_id': ['SKU_001'] * len(dates) + ['SKU_002'] * len(dates),
            'warehouse_id': ['WH_001'] * len(dates) + ['WH_002'] * len(dates),
            'demand_qty': [10 + i for i in range(len(dates))] + [20 + i for i in range(len(dates))],
            'selling_price': [100.0] * (len(dates) * 2),
            'discount_percent': [0.0] * (len(dates) * 2),
            'promotion_flag': [False] * (len(dates) * 2),
            'price_index_mrp': [1.0] * (len(dates) * 2),
            'price_index_comp': [1.0] * (len(dates) * 2)
        })
        
        df = generate_features(multi_sku_data)
        
        # Check that lag features are calculated per SKU-warehouse group
        sku1_data = df[df['sku_id'] == 'SKU_001']
        sku2_data = df[df['sku_id'] == 'SKU_002']
        
        # Each SKU should have its own lag calculations
        assert sku1_data['demand_qty_lag_1'].iloc[1] == 10  # First value for SKU_001
        assert sku2_data['demand_qty_lag_1'].iloc[1] == 20  # First value for SKU_002
        
        # Rolling features should also be calculated per group
        assert sku1_data['demand_qty_mean_7'].iloc[7] != sku2_data['demand_qty_mean_7'].iloc[7]

if __name__ == "__main__":
    pytest.main([__file__])
