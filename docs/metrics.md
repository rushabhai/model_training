# D2C Inventory Metrics

This document provides a comprehensive overview of Direct-to-Consumer (D2C) inventory metrics used in the forecasting system.

## Inventory Performance Metrics

| Metric | Definition | Formula (LaTeX) | Purpose | D2C Use | Example |
|--------|------------|-----------------|---------|---------|---------|
| **Inventory Turnover** | Measures how many times inventory is sold and replaced over a period | $\text{Inventory Turnover} = \frac{\text{COGS}}{\text{Average Inventory}}$ | Assess inventory efficiency and working capital utilization | Track fast-moving vs slow-moving SKUs across channels | COGS=₹500,000; AvgInv=₹100,000 → 5× turnover |
| **Inventory Days on Hand** | Number of days current inventory will last at current sales rate | $\text{Days on Hand} = \frac{\text{Average Inventory}}{\text{COGS}} \times 365$ | Optimize stock levels and identify overstock situations | Plan seasonal inventory and campaign stock | AvgInv=₹100,000; COGS=₹500,000 → 73 days |
| **ABC Analysis** | Classification of SKUs by value contribution and turnover rate | $A: \text{Top 80\% value}$<br>$B: \text{Next 15\% value}$<br>$C: \text{Bottom 5\% value}$ | Prioritize inventory management focus and resources | Focus marketing spend on A-class items, optimize storage for C-class | Class A: 20% SKUs generating 80% revenue |
| **Economic Order Quantity (EOQ)** | Optimal order quantity that minimizes total inventory costs | $\text{EOQ} = \sqrt{\frac{2DS}{H}}$ | Minimize ordering and holding costs | Optimize bulk purchase discounts vs storage costs | D=12,000 units/year; S=₹100; H=₹2 → EOQ≈1,095 units |
| **Safety Stock** | Buffer inventory to protect against demand variability and lead time uncertainty | $\text{Safety Stock} = Z \times \sigma_d \times \sqrt{L}$ | Maintain service levels while minimizing stockouts | Handle demand spikes during promotions/campaigns | Z=1.65 (95% service); σ_d=50; L=4 weeks → 165 units |

## Advanced D2C Metrics

| Metric | Definition | Formula (LaTeX) | Purpose | D2C Use | Example |
|--------|------------|-----------------|---------|---------|---------|
| **WAPE (Weighted Absolute Percentage Error)** | Forecast accuracy weighted by actual demand volumes | $\text{WAPE} = \frac{\sum_{t=1}^n |A_t - F_t|}{\sum_{t=1}^n A_t} \times 100$ | Measure overall forecast accuracy across all SKUs | Evaluate ML model performance for demand planning | WAPE < 25% indicates good forecast accuracy |
| **Service Level** | Percentage of demand met from stock without stockouts | $\text{Service Level} = \frac{\text{Orders Fulfilled}}{\text{Total Orders}} \times 100$ | Balance inventory costs with customer satisfaction | Set different targets for A/B/C class products | 95% service level for premium products |
| **Fill Rate** | Percentage of order lines completely fulfilled from available stock | $\text{Fill Rate} = \frac{\text{Lines Shipped Complete}}{\text{Total Order Lines}} \times 100$ | Measure customer order fulfillment efficiency | Track impact of inventory decisions on customer experience | 98% fill rate target for same-day delivery |
| **Stockout Risk** | Probability of running out of inventory within forecast horizon | $P(\text{Stockout}) = P(D > I + Q)$ | Proactively prevent stockouts for critical SKUs | Alert system for high-velocity products | 15% stockout risk triggers reorder alert |
| **Demand Volatility Index** | Measure of demand pattern unpredictability | $\text{DVI} = \frac{\sigma_d}{\mu_d} \times 100$ | Identify products requiring different forecasting approaches | Apply Croston method for intermittent demand SKUs | DVI > 100% indicates high volatility |

## Financial Impact Metrics

| Metric | Definition | Formula (LaTeX) | Purpose | D2C Use | Example |
|--------|------------|-----------------|---------|---------|---------|
| **Revenue at Risk** | Potential revenue loss due to stockouts or insufficient inventory | $\text{Revenue at Risk} = \sum_{i=1}^n D_i \times P_i \times P(\text{Stockout}_i)$ | Quantify financial impact of inventory decisions | Prioritize inventory investments by revenue impact | ₹50,000 revenue at risk for Q4 holiday season |
| **Lost Sales Value** | Actual revenue lost due to stockouts | $\text{Lost Sales} = \sum_{t=1}^n \max(0, D_t - I_t) \times P_t \times (1 - S_t)$ | Track cost of inventory management failures | Measure ROI of inventory optimization initiatives | ₹25,000 lost sales due to festival stockouts |
| **Holding Cost Savings** | Cost reduction achieved through optimal inventory levels | $\text{Holding Savings} = (I_{\text{old}} - I_{\text{new}}) \times H \times P$ | Justify inventory optimization investments | Calculate savings from ML-driven demand planning | ₹15,000 quarterly savings from 20% inventory reduction |
| **Inventory Turns** | Annual rate at which inventory is sold and replaced | $\text{Inventory Turns} = \frac{\text{COGS}}{\text{Average Inventory}}$ | Benchmark against industry standards and track improvement | Compare performance across product categories | Electronics: 12× turns; Apparel: 4× turns |

## Key Performance Indicators (KPIs)

### Forecast Accuracy KPIs
- **Target WAPE**: ≤ 25% for overall portfolio
- **Target Bias**: ≤ ±5% to avoid systematic over/under-forecasting
- **MASE (Mean Absolute Scaled Error)**: < 1.0 indicates better than naive seasonal forecast

### Service Level KPIs
- **A-Class SKUs**: 98% service level
- **B-Class SKUs**: 95% service level  
- **C-Class SKUs**: 90% service level

### Financial KPIs
- **Inventory Turnover**: > 6× annually for fast-moving consumer goods
- **Days of Cover**: 30-60 days optimal range for most D2C categories
- **Stockout Rate**: < 2% for premium products, < 5% for standard products

## Implementation Notes

1. **Data Requirements**: All metrics require clean, consistent data from the `brand_x_data` table
2. **Seasonality**: Apply seasonal adjustment factors for holiday/festival periods
3. **Category Segmentation**: Different targets for Electronics, Apparel, Home goods, etc.
4. **Refresh Frequency**: Daily calculation for operational metrics, weekly for strategic KPIs
5. **Alerting Thresholds**: Configure alerts when metrics exceed acceptable ranges

## References

- **Demand Planning**: Holt-Winters (additive) for smooth demand, Croston-SBA for intermittent
- **Prediction Intervals**: P10/P50/P90 using split-conformal method
- **Safety Stock**: Based on demand volatility and lead time variability
- **Service Levels**: Optimized using news-vendor model for profit maximization
