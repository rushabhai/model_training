# ML Forecasting Model Implementation Plan

## 1. Data Exploration and Setup
- [ ] Explore brand_x_gold and demand_daily schemas from sql.txt
- [ ] Check data distribution, missing values, and feature correlations
- [ ] Set up ML environment: install scikit-learn, xgboost, tensorflow, dask, etc.
- [ ] Update requirements.txt with new dependencies

## 2. Data Preprocessing
- [ ] Handle large dataset (6.9M rows): implement sampling or Dask for processing
- [ ] Feature engineering: create lags (1-7 days), rolling means/std, seasonality features
- [ ] Encode categorical features (brand, channel, product_category, etc.)
- [ ] Split data into train/validation/test sets (time-based)

## 3. Model Development
- [ ] Choose ML model: XGBoost for regression (scalable, handles features well)
- [ ] Implement quantile regression for P10, P50, P90 forecasts
- [ ] Alternative: LSTM/GRU for time series if sequential patterns are key
- [ ] Train on sampled data first (e.g., top 1000 sku-warehouse combinations)

## 4. Model Training and Validation
- [ ] Train model with cross-validation (time series split)
- [ ] Evaluate using existing metrics: WAPE, MAE, SMAPE, bias, interval coverage
- [ ] Compare performance against current statistical models
- [ ] Tune hyperparameters using grid/random search

## 5. Integration into API
- [ ] Modify router_forecast function in app.py to use ML model
- [ ] Implement conformal prediction or quantile methods for intervals
- [ ] Add model loading/caching for inference speed
- [ ] Update ForecastResponse to include model type as "ML-XGBoost" or similar

## 6. Testing and Deployment
- [ ] Test API endpoints with ML model
- [ ] Validate on holdout data and compare metrics
- [ ] Monitor inference performance and memory usage
- [ ] Document model assumptions and limitations

## 7. Scaling and Optimization
- [ ] Implement full dataset training with Dask if needed
- [ ] Add model versioning and retraining pipeline
- [ ] Optimize feature computation for real-time inference
