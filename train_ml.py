import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
import lightgbm as lgb
import joblib
import os
from datetime import date, timedelta
import argparse
from typing import List, Dict, Any, Tuple

# --- Configuration ---
DB_URI = os.getenv("PG_URI", "postgresql+psycopg2://rushabh:Root%40123@localhost:5432/StackLogix")
MODELS_DIR = "models"
OUTPUTS_DIR = "outputs"

# Ensure directories exist
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# --- Feature Engineering Functions ---
def create_lag_features(df: pd.DataFrame, lags: List[int], col: str = 'demand_qty') -> pd.DataFrame:
    """Create lag features for a given column."""
    for lag in lags:
        df[f'{col}_lag_{lag}'] = df.groupby(['sku_id', 'warehouse_id'])[col].shift(lag)
    return df

def create_rolling_features(df: pd.DataFrame, windows: List[int], col: str = 'demand_qty') -> pd.DataFrame:
    """Create rolling mean and std features for a given column."""
    for window in windows:
        df[f'{col}_mean_{window}'] = df.groupby(['sku_id', 'warehouse_id'])[col].transform(
            lambda x: x.shift(1).rolling(window=window, min_periods=1).mean()
        )
        df[f'{col}_std_{window}'] = df.groupby(['sku_id', 'warehouse_id'])[col].transform(
            lambda x: x.shift(1).rolling(window=window, min_periods=1).std()
        ).fillna(0) # Fill NaN from std of single observation with 0
    return df

def create_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create time-based features from the 'date' column."""
    df['dow'] = df['date'].dt.dayofweek # Day of week
    df['week_num'] = df['date'].dt.isocalendar().week.astype(int) # Week number
    df['month_num'] = df['date'].dt.month # Month number
    return df

def generate_features(df: pd.DataFrame) -> pd.DataFrame:
    """Generate all specified features for LightGBM."""
    df = create_lag_features(df, [1, 7, 14, 28], 'demand_qty')
    df = create_rolling_features(df, [7, 28], 'demand_qty')
    df = create_time_features(df)
    
    # Ensure price columns are numeric and fill NaNs
    for col in ['selling_price', 'discount_percent', 'promotion_flag', 'mrp', 'competitor_avg_price']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(df[col].mean()) # Fill with mean or 0
        else:
            df[col] = 0.0 # Add as 0 if not present in raw data
            print(f"Warning: Column '{col}' not found in raw data. Added as zeros.")
    
    # Create price index features
    df['price_index_mrp'] = df['selling_price'] / (df['mrp'] + 1e-8)  # Avoid division by zero
    df['price_index_comp'] = df['selling_price'] / (df['competitor_avg_price'] + 1e-8)  # Avoid division by zero

    # Convert boolean promotion_flag to int
    if 'promotion_flag' in df.columns:
        df['promotion_flag'] = df['promotion_flag'].astype(int)
    else:
        df['promotion_flag'] = 0 # Add as 0 if not present
        print("Warning: Column 'promotion_flag' not found in raw data. Added as zeros.")

    return df

# --- Data Loading ---
def load_data(db_uri: str, start_date: date, end_date: date) -> pd.DataFrame:
    """Loads data from the PostgreSQL database."""
    engine = create_engine(db_uri)
    query = f"""
    SELECT 
        date, sku_id, warehouse_id, units_sold AS demand_qty, stockout_flag AS censored_oos,
        selling_price, discount_percent, promotion_flag, mrp, competitor_avg_price,
        on_hand_inventory
    FROM brand_x_data
    WHERE date >= :start_date AND date <= :end_date
    ORDER BY sku_id, warehouse_id, date;
    """
    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn, params={'start_date': start_date, 'end_date': end_date}, parse_dates=['date'])
    
    # Fill any missing values in demand_qty with 0
    df['demand_qty'] = df['demand_qty'].fillna(0)
    
    # Ensure censored_oos is boolean
    df['censored_oos'] = df['censored_oos'].fillna(False).astype(bool)

    return df

# --- Model Training ---
def train_lgbm_quantile_model(X_train: pd.DataFrame, y_train: pd.Series, quantile: float, params: Dict[str, Any]) -> lgb.LGBMRegressor:
    """Trains a LightGBM Quantile Regression model."""
    lgbm = lgb.LGBMRegressor(objective='quantile', alpha=quantile, **params)
    lgbm.fit(X_train, y_train)
    return lgbm

def main(start_date_str: str, end_date_str: str):
    start_date = date.fromisoformat(start_date_str)
    end_date = date.fromisoformat(end_date_str)

    print(f"Loading data from {start_date} to {end_date}...")
    raw_df = load_data(DB_URI, start_date, end_date)
    print(f"Raw data loaded: {raw_df.shape[0]} rows.")

    print("Generating features...")
    # Generate features on the full dataset first to allow lags/rolling to be computed
    # without data leakage for any single (sku, warehouse) group
    featured_df = generate_features(raw_df.copy())
    
    # Filter out rows where censored_oos is True for training
    train_df = featured_df[~featured_df['censored_oos']].copy()

    # Drop rows with NaN in features generated by shifting/rolling that cannot be filled
    initial_rows = train_df.shape[0]
    train_df.dropna(subset=[
        'demand_qty_lag_1', 'demand_qty_lag_7', 'demand_qty_lag_14', 'demand_qty_lag_28',
        'demand_qty_mean_7', 'demand_qty_std_7', 'demand_qty_mean_28', 'demand_qty_std_28'
    ], inplace=True)
    print(f"Dropped {initial_rows - train_df.shape[0]} rows with NaNs after feature engineering (e.g., first few lags).")

    # Define features and target
    features = [
        'demand_qty_lag_1', 'demand_qty_lag_7', 'demand_qty_lag_14', 'demand_qty_lag_28',
        'demand_qty_mean_7', 'demand_qty_std_7', 'demand_qty_mean_28', 'demand_qty_std_28',
        'selling_price', 'discount_percent', 'promotion_flag', 
        'price_index_mrp', 'price_index_comp',
        'dow', 'week_num', 'month_num'
    ]
    target = 'demand_qty'

    # Filter features to only include those present in the training DataFrame
    actual_features = [f for f in features if f in train_df.columns]
    if len(actual_features) < len(features):
        missing = set(features) - set(actual_features)
        print(f"Warning: Some intended features are missing from the training data: {missing}")
    features = actual_features # Update features list to only contain actual ones

    X_train = train_df[features]
    y_train = train_df[target]

    if X_train.empty:
        print("No data left for training after feature engineering and OOS exclusion. Exiting.")
        return

    print(f"Training data shape: {X_train.shape}")
    print(f"Training features: {features}")

    # LightGBM parameters (can be tuned)
    lgbm_params = {
        'n_estimators': 500,
        'learning_rate': 0.05,
        'num_leaves': 31,
        'max_depth': -1,
        'min_child_samples': 20,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': 42,
        'n_jobs': -1,
        'verbose': -1, # Suppress verbose output
        'boosting_type': 'gbdt',
    }

    print("Training P10 LightGBM model...")
    model_p10 = train_lgbm_quantile_model(X_train, y_train, 0.1, lgbm_params)
    joblib.dump(model_p10, os.path.join(MODELS_DIR, 'lgb_q10.joblib'))
    print("P10 model trained and saved.")

    print("Training P50 LightGBM model...")
    model_p50 = train_lgbm_quantile_model(X_train, y_train, 0.5, lgbm_params)
    joblib.dump(model_p50, os.path.join(MODELS_DIR, 'lgb_q50.joblib'))
    print("P50 model trained and saved.")

    print("Training P90 LightGBM model...")
    model_p90 = train_lgbm_quantile_model(X_train, y_train, 0.9, lgbm_params)
    joblib.dump(model_p90, os.path.join(MODELS_DIR, 'lgb_q90.joblib'))
    print("P90 model trained and saved.")

    # Save the list of features
    joblib.dump(features, os.path.join(MODELS_DIR, 'feats.joblib'))
    print("Feature list saved.")
    
    print("ML training complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train LightGBM Quantile Forecaster.")
    parser.add_argument("--start_date", type=str, default="2022-01-01", help="Start date for training data (YYYY-MM-DD).")
    parser.add_argument("--end_date", type=str, default="2024-12-31", help="End date for training data (YYYY-MM-DD).")
    args = parser.parse_args()
    
    main(args.start_date, args.end_date)