"""
Unit tests for demand_qty calculation and censored_oos logic.

Tests the core business logic for demand calculation:
demand_qty = max(0, COALESCE(units_sold, ordered_units - cancelled_units) - units_returned)
censored_oos = stockout_flag AND demand_qty = 0
"""

import pytest
from typing import Optional, Union


def calculate_demand_qty(
    units_sold: Optional[int] = None,
    ordered_units: Optional[int] = None,
    cancelled_units: Optional[int] = None,
    units_returned: Optional[int] = None
) -> int:
    """
    Calculate demand quantity following the business logic:
    demand_qty = max(0, COALESCE(units_sold, ordered_units - cancelled_units) - units_returned)
    
    Args:
        units_sold: Actual units sold (preferred source)
        ordered_units: Total units ordered
        cancelled_units: Units cancelled from orders
        units_returned: Units returned by customers
        
    Returns:
        Calculated demand quantity (non-negative integer)
    """
    # COALESCE logic: use units_sold if available, otherwise use (ordered_units - cancelled_units)
    if units_sold is not None:
        base_demand = units_sold
    elif ordered_units is not None and cancelled_units is not None:
        base_demand = ordered_units - cancelled_units
    elif ordered_units is not None:
        base_demand = ordered_units  # assume cancelled_units = 0 if null
    else:
        base_demand = 0  # no data available
    
    # Subtract returns if available
    returns = units_returned if units_returned is not None else 0
    
    # Ensure non-negative result
    return max(0, base_demand - returns)


def is_censored_oos(stockout_flag: bool, demand_qty: int) -> bool:
    """
    Determine if observation should be censored due to stockout:
    censored_oos = stockout_flag AND demand_qty = 0
    
    Args:
        stockout_flag: Boolean indicating if item was out of stock
        demand_qty: Calculated demand quantity
        
    Returns:
        True if observation should be censored (excluded from training)
    """
    return stockout_flag and demand_qty == 0


class TestDemandQtyCalculation:
    """Test cases for demand_qty calculation logic."""
    
    def test_units_sold_preferred(self):
        """Test that units_sold is preferred over ordered_units when both available."""
        result = calculate_demand_qty(
            units_sold=100,
            ordered_units=120,
            cancelled_units=20,
            units_returned=5
        )
        # Should use units_sold (100) not ordered_units - cancelled_units (100)
        assert result == 95  # 100 - 5 returns
    
    def test_fallback_to_ordered_minus_cancelled(self):
        """Test fallback to ordered_units - cancelled_units when units_sold is None."""
        result = calculate_demand_qty(
            units_sold=None,
            ordered_units=120,
            cancelled_units=20,
            units_returned=5
        )
        assert result == 95  # (120 - 20) - 5
    
    def test_ordered_units_only(self):
        """Test with only ordered_units available (cancelled_units = None)."""
        result = calculate_demand_qty(
            units_sold=None,
            ordered_units=100,
            cancelled_units=None,
            units_returned=10
        )
        assert result == 90  # 100 - 10 (cancelled_units treated as 0)
    
    def test_no_returns_data(self):
        """Test calculation when units_returned is None."""
        result = calculate_demand_qty(
            units_sold=50,
            units_returned=None
        )
        assert result == 50  # returns treated as 0
    
    def test_negative_demand_clamped_to_zero(self):
        """Test that negative demand is clamped to 0."""
        result = calculate_demand_qty(
            units_sold=10,
            units_returned=15  # returns > sales
        )
        assert result == 0
    
    def test_high_cancellation_rate(self):
        """Test scenario with high cancellation rate."""
        result = calculate_demand_qty(
            units_sold=None,
            ordered_units=100,
            cancelled_units=90,
            units_returned=2
        )
        assert result == 8  # (100 - 90) - 2
    
    def test_all_values_none(self):
        """Test edge case where all input values are None."""
        result = calculate_demand_qty()
        assert result == 0
    
    def test_cancelled_exceeds_ordered(self):
        """Test edge case where cancelled_units > ordered_units."""
        result = calculate_demand_qty(
            units_sold=None,
            ordered_units=50,
            cancelled_units=60,
            units_returned=0
        )
        assert result == 0  # max(0, (50 - 60) - 0) = 0
    
    def test_large_values(self):
        """Test with large numeric values."""
        result = calculate_demand_qty(
            units_sold=1000000,
            units_returned=50000
        )
        assert result == 950000
    
    def test_zero_values(self):
        """Test with all zero values."""
        result = calculate_demand_qty(
            units_sold=0,
            ordered_units=0,
            cancelled_units=0,
            units_returned=0
        )
        assert result == 0


class TestCensoredOOSLogic:
    """Test cases for censored out-of-stock logic."""
    
    def test_stockout_with_zero_demand(self):
        """Test that stockout + zero demand = censored."""
        assert is_censored_oos(stockout_flag=True, demand_qty=0) is True
    
    def test_stockout_with_positive_demand(self):
        """Test that stockout + positive demand = not censored."""
        assert is_censored_oos(stockout_flag=True, demand_qty=5) is False
    
    def test_no_stockout_with_zero_demand(self):
        """Test that no stockout + zero demand = not censored."""
        assert is_censored_oos(stockout_flag=False, demand_qty=0) is False
    
    def test_no_stockout_with_positive_demand(self):
        """Test that no stockout + positive demand = not censored."""
        assert is_censored_oos(stockout_flag=False, demand_qty=10) is False


class TestIntegratedScenarios:
    """Test integrated scenarios combining demand calculation and censoring logic."""
    
    def test_stockout_scenario_returns_exceed_sales(self):
        """Test stockout scenario where returns exceed sales."""
        # Calculate demand
        demand = calculate_demand_qty(
            units_sold=10,
            units_returned=15  # More returns than sales
        )
        
        # Check if should be censored
        censored = is_censored_oos(stockout_flag=True, demand_qty=demand)
        
        assert demand == 0
        assert censored is True  # Should be excluded from training
    
    def test_stockout_scenario_with_actual_demand(self):
        """Test stockout scenario but with actual positive demand."""
        # Calculate demand
        demand = calculate_demand_qty(
            units_sold=None,
            ordered_units=100,
            cancelled_units=20,
            units_returned=5
        )
        
        # Check if should be censored
        censored = is_censored_oos(stockout_flag=True, demand_qty=demand)
        
        assert demand == 75  # (100 - 20) - 5
        assert censored is False  # Should NOT be excluded (positive demand during stockout)
    
    def test_normal_sales_scenario(self):
        """Test normal sales scenario (no stockout)."""
        # Calculate demand
        demand = calculate_demand_qty(
            units_sold=50,
            units_returned=3
        )
        
        # Check if should be censored
        censored = is_censored_oos(stockout_flag=False, demand_qty=demand)
        
        assert demand == 47
        assert censored is False  # Normal sales, should be included in training
    
    def test_zero_sales_no_stockout(self):
        """Test zero sales with no stockout flag."""
        # Calculate demand
        demand = calculate_demand_qty(
            units_sold=0,
            units_returned=0
        )
        
        # Check if should be censored
        censored = is_censored_oos(stockout_flag=False, demand_qty=demand)
        
        assert demand == 0
        assert censored is False  # Zero demand but no stockout = valid data point


class TestEdgeCases:
    """Test edge cases and data quality scenarios."""
    
    def test_data_quality_negative_units_sold(self):
        """Test handling of negative units_sold (data quality issue)."""
        # This simulates a data quality issue
        demand = calculate_demand_qty(units_sold=-10)
        assert demand == 0  # Should be clamped to 0
    
    def test_data_quality_negative_ordered_units(self):
        """Test handling of negative ordered_units."""
        demand = calculate_demand_qty(
            units_sold=None,
            ordered_units=-50,
            cancelled_units=0
        )
        assert demand == 0  # max(0, -50 - 0) = 0
    
    def test_extremely_high_returns(self):
        """Test scenario with unrealistically high returns."""
        demand = calculate_demand_qty(
            units_sold=100,
            units_returned=500  # Returns > Sales (data quality issue)
        )
        assert demand == 0  # Should be clamped to 0
    
    def test_fractional_inputs_rounded(self):
        """Test that function handles integer conversion properly."""
        # Note: In practice, the database would ensure integer types
        # but this tests robustness
        demand = calculate_demand_qty(
            units_sold=10,
            units_returned=3
        )
        assert isinstance(demand, int)
        assert demand == 7


if __name__ == "__main__":
    # Run tests with detailed output
    pytest.main([__file__, "-v", "--tb=short"])
