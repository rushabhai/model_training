# D2C Inventory Metrics

This document provides a comprehensive overview of Direct-to-Consumer (D2C) inventory metrics used in the forecasting system.

## Key Performance Indicators (KPIs)

| Metric | Definition | Formula (LaTeX) | Purpose | D2C Use | Example |
|---|---|---|---|---|---|
| **WAPE (Weighted Absolute Percentage Error)** | Measures the overall accuracy of forecasts, weighted by demand volume. | $\text{WAPE} = \frac{\sum |A_t - F_t|}{\sum A_t} \times 100\%$ | Evaluate overall forecast reliability for aggregate demand planning. | Assessing the accuracy of promotional forecasts for a product category. | WAPE < 25% for high-moving items. |
| **MAPE (Mean Absolute Percentage Error)** | Average percentage of error between actuals and forecasts. | $\text{MAPE} = \frac{1}{n} \sum \frac{|A_t - F_t|}{A_t} \times 100\%$ | Understand average forecast accuracy across individual SKUs. | Comparing accuracy between different forecasting models. | A model with 10% MAPE. |
| **MAE (Mean Absolute Error)** | Average absolute difference between actuals and forecasts, in units. | $\text{MAE} = \frac{1}{n} \sum |A_t - F_t|$ | Provides error in actual demand units, easy to interpret. | Quantifying the absolute forecasting error in a specific warehouse. | An MAE of 50 units for a popular SKU. |
| **Bias (ME%)** | Indicates whether the forecast consistently over- or under-predicts demand. | $\text{Bias} = \frac{\sum (F_t - A_t)}{\sum A_t} \times 100\%$ | Identify systematic overstocking or stockout risks due to biased forecasts. | Adjusting future forecasts if a consistent negative bias (under-forecast) is observed. | Bias of -5% indicates consistent under-forecasting. |
| **Service Level** | Percentage of customer demand fulfilled from available stock. | $\text{Service Level} = \frac{\text{Units Fulfilled}}{\text{Units Demanded}} \times 100\%$ | Optimize inventory to meet customer expectations and avoid lost sales. | Setting 98% service level for premium, high-margin products. | Achieved 95% service level during peak season. |
| **Fill Rate** | Percentage of total units demanded that are fulfilled. | $\text{Fill Rate} = \frac{\text{Units Shipped}}{\text{Units Ordered}} \times 100\%$ | Measure the efficiency of order fulfillment and inventory availability. | Ensuring a high fill rate for essential product bundles. | 97% fill rate for all online orders. |
| **Stockout Risk** | Probability of running out of stock for a given SKU within a defined period. | $P(\text{Stockout}) = P(D > I)$ | Proactively manage critical inventory shortages. | Generating alerts for SKUs with >20% stockout risk in the next 30 days. | 15% risk of stockout for SKU X_001. |
| **Cycle Service Level** | The probability of not having a stockout during a replenishment cycle. | $P(\text{No Stockout in Cycle})$ | Ensure sufficient inventory to cover demand during lead times. | Optimizing reorder points for a 30-day replenishment cycle. | 90% cycle service level. |
| **Overstock %** | Percentage of inventory units considered in excess of anticipated demand. | $\text{Overstock Percentage} = \frac{\text{Excess Inventory}}{\text{Total Inventory}} \times 100\%$ | Identify and reduce capital tied up in slow-moving or excess stock. | Prioritizing liquidation or transfer of products with >30% overstock. | 25% of inventory is overstocked. |
| **Inventory Turns** | Number of times inventory is sold and replaced over a period (e.g., annually). | $\text{Inventory Turns} = \frac{\text{Cost of Goods Sold}}{\text{Average Inventory Value}}$ | Assess inventory efficiency and liquidity. | Benchmarking against industry averages to improve inventory velocity. | An inventory turnover of 6x annually. |
| **Days of Cover** | Number of days of sales that can be covered with current inventory. | $\text{Days of Cover} = \frac{\text{Current Inventory}}{\text{Average Daily Sales}}$ | Determine how long current stock will last, aiding reorder decisions. | Ensuring 30-60 days of cover for most SKUs. | 45 days of cover for a seasonal product. |
| **Revenue at Risk** | Estimated potential revenue loss due to stockouts or insufficient inventory. | $\text{Revenue at Risk} = \sum (\text{Deficit Units} \times \text{Unit Price})$ | Quantify the financial impact of poor inventory management. | Prioritizing inventory investments to mitigate revenue loss during peak sales. | ₹100,000 revenue at risk in the next quarter. |
| **Lost Sales Units** | Number of units of demand lost directly due to stockouts. | $\text{Lost Sales Units} = \sum \max(0, \text{Demand} - \text{Available})$ | Measure the direct impact of inventory shortages on sales volume. | Tracking the effectiveness of safety stock and lead time reductions. | 500 units of SKU X_002 lost in sales last month. |
| **Forecast Value Add (FVA)** | Measures the improvement of the model's forecast over a naive baseline. | $\text{FVA} = \frac{\text{Baseline Error} - \text{Model Error}}{\text{Baseline Error}} \times 100\%$ | Quantify the value added by advanced forecasting techniques. | Justifying investment in ML models by demonstrating accuracy gains. | An FVA of 15% over a simple moving average. |
| **Next Quarter Demand Forecast** | Projected total demand for the upcoming quarter. | $\text{Next Q Forecast} = \sum \text{Daily Forecasts for Q}$ | Strategic planning for seasonal inventory buildup and marketing campaigns. | Preparing for holiday season demand for Q4. | Next quarter forecast of 15,000 units. |
| **Seasonal Adjustment Factor** | A multiplier applied to base demand to account for expected seasonal fluctuations. | $\text{SAF} = \frac{\text{Average Demand in Season}}{\text{Overall Average Demand}}$ | Fine-tuning forecasts for predictable demand shifts throughout the year. | Adjusting demand forecasts for summer clothing. | SAF of 1.2 for Diwali season. |
| **Holiday Impact %** | The percentage increase or decrease in demand specifically attributable to holidays. | $\text{Holiday Impact} = \frac{\text{Demand on Holiday} - \text{Normal Demand}}{\text{Normal Demand}} \times 100\%$ | Quantify the influence of individual holidays on sales patterns. | Adjusting inventory levels specifically for Christmas sales. | 20% uplift due to a national holiday. |
| **Festive Season Uplift** | The overall percentage increase in demand during a major festive period (e.g., Diwali season). | $\text{Festive Uplift} = \frac{\text{Demand in Festive Season} - \text{Normal Demand}}{\text{Normal Demand}} \times 100\%$ | Strategic planning for large-scale, multi-month demand spikes. | Planning inventory and marketing for the entire Q4 festive period. | 30% overall uplift during the festive season. |
| **Demand Volatility Index** | Measures the variability or fluctuation in demand over a specific period. | $\text{DVI} = \frac{\text{Standard Deviation of Demand}}{\text{Average Demand}} \times 100\%$ | Identify highly erratic products requiring flexible inventory strategies. | Prioritizing dynamic safety stock for high DVI products. | A DVI of 45% for a trendy fashion item. |
| **High Risk SKUs** | Count of SKUs with a high probability of stockout or significant overstock. | N/A | Focus immediate attention and resources on critical inventory problems. | Identifying top 10 SKUs requiring urgent replenishment. | 5 SKUs categorized as High Risk. |
| **Medium Risk SKUs** | Count of SKUs with moderate inventory imbalances or upcoming risks. | N/A | Monitor and plan for potential future issues. | Reviewing inventory for SKUs with upcoming seasonal demand changes. | 15 SKUs categorized as Medium Risk. |
| **Low Risk SKUs** | Count of SKUs with healthy inventory levels and minimal risk. | N/A | Maintain current inventory strategy. | Automated reordering for stable, low-risk products. | 50 SKUs categorized as Low Risk. |
| **Overstock SKUs** | Count of SKUs currently holding excess inventory above optimal levels. | N/A | Identify products for promotions, transfers, or liquidation. | Planning a flash sale for 10 overstocked apparel SKUs. | 8 SKUs currently in Overstock. |

## Implementation Notes

1.  **Data Requirements**: All metrics require clean, consistent data from the `brand_x_data` table.
2.  **Seasonality**: Apply seasonal adjustment factors for holiday/festival periods.
3.  **Category Segmentation**: Different targets for Electronics, Apparel, Home goods, etc.
4.  **Refresh Frequency**: Daily calculation for operational metrics, weekly for strategic KPIs.
5.  **Alerting Thresholds**: Configure alerts when metrics exceed acceptable ranges.

## References

1.  **Demand Planning**: Holt-Winters (additive) for smooth demand, Croston-SBA for intermittent.
2.  **Prediction Intervals**: P10/P50/P90 using split-conformal method.
3.  **Safety Stock**: Based on demand volatility and lead time variability.
4.  **Service Levels**: Optimized using news-vendor model for profit maximization.
