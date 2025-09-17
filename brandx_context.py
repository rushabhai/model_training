"""Brand X — Inventory Forecasting (Context Summary)

This file documents — in one place — what we’ve built so far for Brand X’s
inventory forecasting pipeline, including the data shaping in Postgres,
the modeling approach, metrics, and how to run the training script.

================================================================================
1) Problem, Grain, Horizon
--------------------------------------------------------------------------------
• Problem: time-series forecasting (daily demand).
• Default grain: day × sku_id × warehouse_id
  (you can filter by brand / channel_id / product_category / warehouse_id).
• Default forecast horizon: 7 days (1 week). Changeable at runtime.
• Decision latency: batch daily (training/eval) with lightweight per-series fits.

================================================================================
2) Data source (Postgres) & “gold” shaping
--------------------------------------------------------------------------------
• Source table: brand_x_data  (typed columns as you shared earlier).
• Two materialized views are used:

  A) brand_x_gold
     - Adds a leakage-safe demand proxy:
         demand_qty = max(0, COALESCE(units_sold, ordered_units - cancelled_units) - units_returned)
     - Computes a censor flag for OOS days hiding demand:
         censored_oos = (stockout_flag = TRUE) AND (demand_qty = 0)
     - Recomputes calendar features (dow/week/month/quarter)
     - Keeps key pricing/marketing fields

  B) demand_daily
     - A slim, modeling-ready slice used by the trainer.

• First build/refresh: **do not** use CONCURRENTLY (not allowed on initial population).
  After they’re populated and (optionally) uniquely indexed, you may switch to
  REFRESH MATERIALIZED VIEW CONCURRENTLY for non-blocking updates.

================================================================================
3) Modeling approach (lean + accurate “router”)
--------------------------------------------------------------------------------
• Each series is bucketed by ADI & CV² computed on recent history:
    - SMOOTH:   ADI ≤ 1.32 and CV² ≤ 0.49
    - ERRATIC:  ADI ≤ 1.32 and CV² >  0.49
    - INTERMITTENT: ADI > 1.32

• Router selection:
    - SMOOTH/ERRATIC → Holt–Winters (additive), weekly seasonality=7.
      Tiny grid for (alpha, beta, gamma), picked on the earliest train window
      (no future leakage).
    - INTERMITTENT → Croston-SBA (α≈0.1) with bias correction.

• Training exclusion: drop censored_oos days (likely lost sales) from fitting.
• Evaluation: rolling-origin backtest, step=7 days, horizon=7 days (configurable).

================================================================================
4) Metrics (point forecasts)
--------------------------------------------------------------------------------
• WAPE (primary), sMAPE, MAE, RMSE, MASE(7), Bias %.
• Demand-weighted rollups overall and by bucket.
• v1 acceptance bar: Overall WAPE ≤ 25%, |Bias| ≤ 5%, MASE < 1 on most series.

================================================================================
5) SQL — exact statements to create the MVs (Postgres)
--------------------------------------------------------------------------------
-- IMPORTANT:
--   • Run these in order.
--   • For the first build DO NOT use CONCURRENTLY. Use plain REFRESH.
--   • Adjust schema qualifiers if needed.

-- Drop old drafts if any
DROP MATERIALIZED VIEW IF EXISTS demand_daily;
DROP MATERIALIZED VIEW IF EXISTS brand_x_gold;

-- Create GOLD MV (populated)
CREATE MATERIALIZED VIEW brand_x_gold AS
WITH base AS (
  SELECT
    date::date                               AS day,
    launch_date::date                        AS launch_date,
    sku_id, brand, channel_id, warehouse_id,
    product_category, product_sub_category, lifecycle_stage,
    promotion_type,
    days_since_launch, week_of_year, quarter,

    mrp, cost_price, selling_price, competitor_avg_price,
    marketing_spend, cac, revenue, gross_profit, net_profit,
    brand_channel_budget, quarter_revenue,

    discount_percent, price_position_vs_mrp, price_vs_competition,
    expected_return_rate, gross_margin, net_margin, quarter_qoq_growth,
    demand_lambda, price_elasticity_effect, festival_intensity,
    weather_impact, economic_sentiment, roas, monthly_seasonality,
    brand_strength_score, quality_score, trend_factor, cannibalization_factor,
    dow_factor, quarter_yoy_growth,

    units_sold, on_hand_inventory, inbound_inventory, lead_time_days,
    units_returned, orders, cancelled_orders, cancelled_units, ordered_units,
    holiday_flag, promotion_flag, stockout_flag
  FROM brand_x_data
),
calc AS (
  SELECT
    *,
    /* demand proxy: units_sold preferred; else ordered - cancelled; minus returns; clamp ≥ 0 */
    GREATEST(
      0,
      COALESCE(units_sold,
               COALESCE(ordered_units, 0) - COALESCE(cancelled_units, 0))
      - COALESCE(units_returned, 0)
    )::INT AS demand_qty,

    CASE WHEN mrp > 0 THEN selling_price / mrp ELSE NULL END AS price_index_mrp,
    CASE WHEN competitor_avg_price > 0
         THEN selling_price / competitor_avg_price ELSE NULL END AS price_index_comp,

    EXTRACT(ISODOW FROM day)::SMALLINT  AS dow,         -- 1..7
    EXTRACT(WEEK  FROM day)::SMALLINT   AS week_num,
    EXTRACT(MONTH FROM day)::SMALLINT   AS month_num,
    EXTRACT(QUARTER FROM day)::SMALLINT AS quarter_num
  FROM base
),
feat AS (
  SELECT
    c.*,
    (COALESCE(c.stockout_flag, FALSE) AND c.demand_qty = 0) AS censored_oos
  FROM calc c
)
SELECT * FROM feat;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS ix_gold_day        ON brand_x_gold(day);
CREATE INDEX IF NOT EXISTS ix_gold_sku_wh_day ON brand_x_gold(sku_id, warehouse_id, day);

-- First refresh (no CONCURRENTLY)
REFRESH MATERIALIZED VIEW brand_x_gold;

-- Create demand_daily MV (populated)
CREATE MATERIALIZED VIEW demand_daily AS
SELECT
  day, sku_id, warehouse_id, channel_id, brand,
  product_category, product_sub_category,
  demand_qty, censored_oos,
  selling_price, discount_percent, roas,
  holiday_flag, promotion_flag,
  price_index_mrp, price_index_comp,
  inbound_inventory, on_hand_inventory, stockout_flag
FROM brand_x_gold;

CREATE INDEX IF NOT EXISTS ix_dd_sku_wh_day ON demand_daily(sku_id, warehouse_id, day);

REFRESH MATERIALIZED VIEW demand_daily;

-- After first population, you MAY later switch to:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY brand_x_gold;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY demand_daily;
-- if you add appropriate unique indexes and want non-blocking refreshes.

================================================================================
6) Python training/evaluation script (train_router.py)
--------------------------------------------------------------------------------
CLI flags:
  --db <postgresql+psycopg2://USER:PASS@HOST:5432/DB>
  --start_date YYYY-MM-DD         (optional filter)
  --end_date   YYYY-MM-DD         (optional filter)
  --brand / --channel_id / --product_category / --warehouse_id (optional filters)
  --horizon 7                     (forecast horizon in days; default 7)
  --step 7                        (rolling step; default 7)
  --season 7                      (weekly seasonality; default 7)
  --min_train 56                  (required past days to start forecasting)
  --min_points 42                 (skip very short series)
  --series_limit 5000             (evaluate top-N by demand)
  --outdir ./outputs              (CSV outputs)

Outputs:
  ./outputs/router_metrics_per_series.csv
  ./outputs/router_overall_metrics.csv
  ./outputs/router_metrics_by_bucket.csv
  ./outputs/router_worst50_by_wape.csv

Example:
  export PG_URI='postgresql+psycopg2://USER:PASS@HOST:5432/DB'
  python train_router.py --db "$PG_URI" --start_date 2022-01-01 --end_date 2025-08-31 \
                         --min_points 180 --min_train 56 --series_limit 5000 --horizon 7

================================================================================
7) What’s next
--------------------------------------------------------------------------------
• Add probabilistic forecasts (P10/P50/P90) via lightweight conformal wrapping
  for better Safety Stock sizing.
• ROP / Safety Stock simulator that uses your lead_time_days, MOQ/case_pack.
• Optional: enable CONCURRENTLY refresh with unique indexes on MVs.
• If the router underperforms for specific buckets, introduce a small LightGBM
  (lags + calendar + price/promo) **only** for those series to keep compute light.

"""

# ---- Full SQL strings you can import/use directly from Python if desired ----

SQL_CREATE_BRAND_X_GOLD = r"""
DROP MATERIALIZED VIEW IF EXISTS brand_x_gold;

CREATE MATERIALIZED VIEW brand_x_gold AS
WITH base AS (
  SELECT
    date::date                               AS day,
    launch_date::date                        AS launch_date,
    sku_id, brand, channel_id, warehouse_id,
    product_category, product_sub_category, lifecycle_stage,
    promotion_type,
    days_since_launch, week_of_year, quarter,

    mrp, cost_price, selling_price, competitor_avg_price,
    marketing_spend, cac, revenue, gross_profit, net_profit,
    brand_channel_budget, quarter_revenue,

    discount_percent, price_position_vs_mrp, price_vs_competition,
    expected_return_rate, gross_margin, net_margin, quarter_qoq_growth,
    demand_lambda, price_elasticity_effect, festival_intensity,
    weather_impact, economic_sentiment, roas, monthly_seasonality,
    brand_strength_score, quality_score, trend_factor, cannibalization_factor,
    dow_factor, quarter_yoy_growth,

    units_sold, on_hand_inventory, inbound_inventory, lead_time_days,
    units_returned, orders, cancelled_orders, cancelled_units, ordered_units,
    holiday_flag, promotion_flag, stockout_flag
  FROM brand_x_data
),
calc AS (
  SELECT
    *,
    GREATEST(
      0,
      COALESCE(units_sold,
               COALESCE(ordered_units, 0) - COALESCE(cancelled_units, 0))
      - COALESCE(units_returned, 0)
    )::INT AS demand_qty,

    CASE WHEN mrp > 0 THEN selling_price / mrp ELSE NULL END AS price_index_mrp,
    CASE WHEN competitor_avg_price > 0
         THEN selling_price / competitor_avg_price ELSE NULL END AS price_index_comp,

    EXTRACT(ISODOW FROM day)::SMALLINT  AS dow,
    EXTRACT(WEEK  FROM day)::SMALLINT   AS week_num,
    EXTRACT(MONTH FROM day)::SMALLINT   AS month_num,
    EXTRACT(QUARTER FROM day)::SMALLINT AS quarter_num
  FROM base
),
feat AS (
  SELECT
    c.*,
    (COALESCE(c.stockout_flag, FALSE) AND c.demand_qty = 0) AS censored_oos
  FROM calc c
)
SELECT * FROM feat;

CREATE INDEX IF NOT EXISTS ix_gold_day        ON brand_x_gold(day);
CREATE INDEX IF NOT EXISTS ix_gold_sku_wh_day ON brand_x_gold(sku_id, warehouse_id, day);

REFRESH MATERIALIZED VIEW brand_x_gold;
"""

SQL_CREATE_DEMAND_DAILY = r"""
DROP MATERIALIZED VIEW IF EXISTS demand_daily;

CREATE MATERIALIZED VIEW demand_daily AS
SELECT
  day, sku_id, warehouse_id, channel_id, brand,
  product_category, product_sub_category,
  demand_qty, censored_oos,
  selling_price, discount_percent, roas,
  holiday_flag, promotion_flag,
  price_index_mrp, price_index_comp,
  inbound_inventory, on_hand_inventory, stockout_flag
FROM brand_x_gold;

CREATE INDEX IF NOT EXISTS ix_dd_sku_wh_day ON demand_daily(sku_id, warehouse_id, day);

REFRESH MATERIALIZED VIEW demand_daily;
"""

# ------------------------------------------------------------------------------
# Minimal helper so you can programmatically print or retrieve the context/SQL
# ------------------------------------------------------------------------------

def print_context() -> None:
    """Print this module's top-level documentation string."""
    print(__doc__)

def get_sql() -> dict:
    """Return SQL blocks for creating the MVs."""
    return {
        "create_brand_x_gold": SQL_CREATE_BRAND_X_GOLD,
        "create_demand_daily": SQL_CREATE_DEMAND_DAILY
    }

if __name__ == "__main__":
    print_context()