// API Response Types
export interface KPIMetrics {
  // Forecast Accuracy
  wape: number;
  mae: number;  // Mean Absolute Error
  mape: number;
  bias_me_pct: number;
  
  // Service Metrics
  service_level: number;
  fill_rate: number;
  stockout_risk: number;
  cycle_service_level: number;
  
  // Inventory Metrics
  overstock_pct: number;
  inventory_turns: number;
  days_of_cover: number;
  
  // Financial Metrics
  revenue_at_risk: number;
  lost_sales_units: number;
  forecast_value_add: number;
  
  // Next Quarter Demand Forecasting (New)
  next_quarter_demand_forecast?: number;
  seasonal_adjustment_factor?: number;
  holiday_impact_pct?: number;
  festive_season_uplift?: number;
  demand_volatility_index?: number;
  
  // Risk Categories
  high_risk_skus: number;
  medium_risk_skus: number;
  low_risk_skus: number;
  overstock_skus: number;
}

export interface GlobalFilters {
  brand?: string;
  channel_id?: string;
  warehouse_id?: string;
  product_category?: string;
  start_date?: string;
  end_date?: string;
  // Temporal aggregation filters
  time_aggregation?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  include_holidays?: boolean;
  forecast_next_quarter?: boolean;
}

export interface DashboardData {
  kpis: KPIMetrics;
  top_series: TopSeries[];
  risk_distribution: Record<string, number>;
  forecast_accuracy_trend: AccuracyTrend[];
  inventory_levels: InventoryLevel[];
  response_time_ms: number;  // API response time in milliseconds
}

export interface TopSeries {
  sku_id: string;
  warehouse_id: string;
  brand: string;
  product_category: string;
  total_demand: number;
  avg_demand: number;
  avg_inventory: number;
  total_revenue: number;
  avg_revenue: number;
  data_points: number;
}

export interface AccuracyTrend {
  date: string;
  wape: number;
  mape: number;
  mae: number;  // Adding MAE to accuracy trend
}

export interface InventoryLevel {
  warehouse_id: string;
  total_inventory: number;
  total_inbound: number;
  total_demand: number;
  sku_count: number;
}

export interface FilterOptions {
  brands: string[];
  channels: string[];
  warehouses: string[];
  categories: string[];
}

export interface ForecastRequest {
  sku_id: string;
  warehouse_id: string;
  horizon: number;
  brand?: string;
  channel_id?: string;
  product_category?: string;
  start_date?: string;
  end_date?: string;
  season?: number;
  min_train?: number;
}

export interface ForecastPoint {
  day: string;
  p10: number;
  p50: number;
  p90: number;
}

export interface ForecastResponse {
  sku_id: string;
  warehouse_id: string;
  model: string;
  bucket: string;
  history_days: number;
  train_days: number;
  horizon: number;
  start_history: string;
  end_history: string;
  forecasts: ForecastPoint[];
}

export interface ValidationRequest {
  sku_id: string;
  warehouse_id: string;
  train_end_date: string;
  test_start_date: string;
  test_end_date: string;
  horizon?: number;
  brand?: string;
  channel_id?: string;
  product_category?: string;
  season?: number;
  min_train?: number;
}

export interface ValidationResult {
  sku_id: string;
  warehouse_id: string;
  model: string;
  bucket: string;
  train_days: number;
  test_days: number;
  train_end_date: string;
  test_start_date: string;
  test_end_date: string;
  
  // Accuracy Metrics
  wape: number;
  smape: number;
  mae: number;
  rmse: number;
  mase: number;
  bias_pct: number;
  
  // Demand Statistics
  actual_total: number;
  forecast_total: number;
  actual_mean: number;
  forecast_mean: number;
  
  // Prediction Interval Coverage
  p10_coverage: number;
  p90_coverage: number;
  interval_coverage: number;
}

// UI Component Props
export interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: number;
  riskType?: 'stockout' | 'service' | 'overstock';
  format?: 'number' | 'currency' | 'percentage';
  decimals?: number;
}

export interface RiskLevel {
  level: 'low' | 'medium' | 'high' | 'overstock';
  color: string;
  count: number;
}

// New Demand Analysis Interfaces
export interface DemandAnalysisRequest {
  filters?: GlobalFilters;
  analysis_horizon_days?: number;
  include_inventory_optimization?: boolean;
  include_transfer_recommendations?: boolean;
}

export interface WarehouseInventoryData {
  warehouse_id: string;
  current_inventory: number;
  deficit_surplus: number;
  estimated_stockout_date?: string;
}

export interface RiskAlert {
  type: string;
  warehouse_id?: string; // Still useful for single, unconsolidated alerts
  deficit?: number;
  surplus?: number;
  estimated_impact: number;
  action_deadline: string;
  urgency: string;
  message: string;
  warehouses?: Array<{ // For consolidated alerts
    warehouse_id: string;
    deficit?: number;
    surplus?: number;
    estimated_impact: number;
    action_deadline: string;
    urgency: string;
    message: string;
  }>;
}

export interface SkuDemandAnalysis {
  sku_id: string;
  product_category: string;
  warehouses: WarehouseInventoryData[];
  total_sku_current_inventory: number;
  total_sku_forecasted_demand: number;
  overall_deficit_surplus: number;
  overall_action_required: string;
  overall_priority_level: string;
  risk_alerts: RiskAlert[];
}

export interface TransferRecommendation {
  from_warehouse: string;
  to_warehouse: string;
  sku_id: string;
  recommended_quantity: number;
  urgency: string;
  cost_benefit_score: number;
  reason: string;
}

export interface DemandAnalysisResult {
  analysis_period: string;
  total_forecasted_demand: number;
  demand_by_warehouse: Record<string, number>;
  demand_by_category: Record<string, number>;
  seasonal_insights: Record<string, any>;
  sku_analysis: Record<string, SkuDemandAnalysis>;
  transfer_recommendations: TransferRecommendation[];
  risk_alerts: RiskAlert[];
  financial_impact: Record<string, number>;
  execution_summary: Record<string, any>;
  sku_summary: {
    total_skus: number;
    high_risk_skus: number;
    medium_risk_skus: number;
    low_risk_skus: number;
    surplus_skus: number;
  };
}
