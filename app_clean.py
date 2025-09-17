# app.py
import os
import math
from datetime import date, timedelta
from typing import Optional, List, Dict, Any, Tuple

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, constr, conint
from sqlalchemy import create_engine, text

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not installed. Install with: pip install python-dotenv")
    print("Environment variables will be loaded from system environment only.")

# --------------------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------------------
def get_database_url():
    """Construct PostgreSQL URL from environment variables."""
    # Try PG_URI first (full connection string)
    pg_uri = os.environ.get("PG_URI")
    if pg_uri:
        return pg_uri
    
    # Otherwise, construct from individual components
    host = os.environ.get('PGHOST', 'localhost')
    port = os.environ.get('PGPORT', '5432')
    user = os.environ.get('PGUSER', 'rushabh')
    password = os.environ.get('PGPASSWORD', 'Root@123')
    database = os.environ.get('PGDATABASE', 'StackLogix')
    
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"

# Initialize database connection
DATABASE_URL = get_database_url()
print(f"Connecting to database: {DATABASE_URL.split('@')[0].split('//')[0]}//***:***@{DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
ENGINE = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)

DEFAULT_SEASON = 7              # weekly seasonality on daily data
DEFAULT_MIN_TRAIN = 56          # days
DEFAULT_MAX_HORIZON = 28        # guardrail
CALIBRATION_TAIL = 90           # days for conformal residuals (one-step-ahead)

# --------------------------------------------------------------------------------------
# Request/Response Schemas
# --------------------------------------------------------------------------------------
class ForecastRequest(BaseModel):
    sku_id: constr(strip_whitespace=True, min_length=1)
    warehouse_id: constr(strip_whitespace=True, min_length=1)
    horizon: conint(ge=1, le=DEFAULT_MAX_HORIZON) = 7
    # Optional filters (match your MVs)
    brand: Optional[str] = None
    channel_id: Optional[str] = None
    product_category: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    # Modeling knobs
    season: conint(ge=2, le=30) = DEFAULT_SEASON
    min_train: conint(ge=14, le=365) = DEFAULT_MIN_TRAIN
    exclude_censored_for_train: bool = True

class ItemKey(BaseModel):
    sku_id: constr(strip_whitespace=True, min_length=1)
    warehouse_id: constr(strip_whitespace=True, min_length=1)

class BatchForecastRequest(BaseModel):
    items: List[ItemKey]
    horizon: conint(ge=1, le=DEFAULT_MAX_HORIZON) = 7
    brand: Optional[str] = None
    channel_id: Optional[str] = None
    product_category: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    season: conint(ge=2, le=30) = DEFAULT_SEASON
    min_train: conint(ge=14, le=365) = DEFAULT_MIN_TRAIN
    exclude_censored_for_train: bool = True

class ForecastPoint(BaseModel):
    day: date
    p10: float
    p50: float
    p90: float

class ForecastResponse(BaseModel):
    sku_id: str
    warehouse_id: str
    model: str
    bucket: str
    history_days: int
    train_days: int
    horizon: int
    start_history: date
    end_history: date
    forecasts: List[ForecastPoint]

# --------------------------------------------------------------------------------------
# Utility: Data Access
# --------------------------------------------------------------------------------------
def _build_filters(req: ForecastRequest | BatchForecastRequest) -> str:
    parts = []
    if req.brand:
        parts.append("brand = :brand")
    if req.channel_id:
        parts.append("channel_id = :channel_id")
    if req.product_category:
        parts.append("product_category = :product_category")
    if req.start_date:
        parts.append("day >= :start_date")
    if req.end_date:
        parts.append("day <= :end_date")
    return (" WHERE " + " AND ".join(parts)) if parts else ""

def _fetch_series(
    sku_id: str,
    warehouse_id: str,
    req: ForecastRequest | BatchForecastRequest,
) -> pd.DataFrame:
    sql = f"""
      SELECT day, demand_qty, censored_oos
      FROM demand_daily
      {_build_filters(req)} {(" AND " if _build_filters(req) else " WHERE ")} sku_id = :sku_id AND warehouse_id = :warehouse_id
      ORDER BY day
    """
    with ENGINE.connect() as con:
        df = pd.read_sql(
            text(sql),
            con,
            params={
                "brand": getattr(req, "brand", None),
                "channel_id": getattr(req, "channel_id", None),
                "product_category": getattr(req, "product_category", None),
                "start_date": getattr(req, "start_date", None),
                "end_date": getattr(req, "end_date", None),
                "sku_id": sku_id,
                "warehouse_id": warehouse_id,
            },
        )
    # Coerce
    if df.empty:
        return df
    df["day"] = pd.to_datetime(df["day"]).dt.date
    df["demand_qty"] = pd.to_numeric(df["demand_qty"], errors="coerce").fillna(0.0)
    df["censored_oos"] = df["censored_oos"].astype(bool)
    return df

# --------------------------------------------------------------------------------------
# Router Models: Croston-SBA & Holt-Winters (Additive)
# --------------------------------------------------------------------------------------
def croston_sba_forecast(y: np.ndarray, h: int = 7, alpha: float = 0.1) -> np.ndarray:
    y = np.asarray(y, dtype=float)
    p = 0; init = False; zhat = 0.0; phat = 1.0
    for val in y:
        p += 1
        if val > 0:
            if not init:
                zhat, phat, init = val, p, True
            else:
                zhat = zhat + alpha * (val - zhat)
                phat = phat + alpha * (p - phat)
            p = 0
    if not init:
        zhat, phat = 0.0, 1.0
    zhat = zhat * (1 - alpha/2.0)  # SBA bias correction
    rate = 0.0 if phat == 0 else zhat / phat
    return np.full(h, rate, dtype=float)

def hw_additive_fit_predict(y: np.ndarray, h: int, season: int,
                            alpha: float, beta: float, gamma: float) -> np.ndarray:
    y = np.asarray(y, dtype=float)
    n = len(y)
    if n < 2*season:
        # Fallbacks
        if n >= season:
            last_season = np.array([y[-season + (i % season)] for i in range(h)], dtype=float)
            return last_season
        return np.full(h, y[-1] if n>0 else 0.0)
    s = np.zeros(season, dtype=float)
    season_mean1 = y[:season].mean()
    for i in range(season): s[i] = y[i] - season_mean1
    season_mean2 = y[season:2*season].mean() if n >= 2*season else season_mean1
    l = season_mean2
    b = (season_mean2 - season_mean1) / season
    for t in range(n):
        idx = t % season
        yt = y[t]
        lt = alpha * (yt - s[idx]) + (1 - alpha) * (l + b)
        bt = beta  * (lt - l)     + (1 - beta)  * b
        st = gamma * (yt - lt)    + (1 - gamma) * s[idx]
        l, b, s[idx] = lt, bt, st
    f = np.zeros(h, dtype=float)
    for k in range(1, h+1):
        idx = (k-1) % season
        f[k-1] = l + k * b + s[idx]
    return f

HW_GRID = [
    (0.2, 0.05, 0.2),
    (0.3, 0.05, 0.2),
    (0.2, 0.05, 0.1),
    (0.1, 0.05, 0.2),
    (0.2, 0.01, 0.2),
]

def pick_hw_params(y: np.ndarray, season: int) -> Tuple[float,float,float]:
    y = np.asarray(y, float); n = len(y)
    if n < 2*season + 7:
        return HW_GRID[0]
    tune_n = min(max(2*season + 14, n//2), n-1)
    best = None; best_mae = float("inf")
    for (a,b,g) in HW_GRID:
        preds, acts = [], []
        for t in range(2*season, tune_n):
            yh = hw_additive_fit_predict(y[:t], h=1, season=season, alpha=a, beta=b, gamma=g)[0]
            preds.append(yh); acts.append(y[t])
        if not preds:
            continue
        mae = float(np.mean(np.abs(np.array(acts) - np.array(preds))))
        if mae < best_mae:
            best_mae, best = mae, (a,b,g)
    return best if best else HW_GRID[0]

# --------------------------------------------------------------------------------------
# Bucketing + Backtesting + Conformal Intervals
# --------------------------------------------------------------------------------------
def bucket_adi_cv2(y: np.ndarray) -> Tuple[float, float, str]:
    y = np.asarray(y, float)
    nz = np.where(y > 0)[0]
    if len(nz) >= 2:
        gaps = np.diff(nz)
        adi = float(np.mean(gaps))
    else:
        adi = float("inf")
    mu = float(np.mean(y)) if len(y) else 0.0
    sigma = float(np.std(y, ddof=0)) if len(y) else 0.0
    cv2 = float((sigma/mu)**2) if mu > 0 else float("inf")
    if adi <= 1.32 and cv2 <= 0.49:
        return adi, cv2, "SMOOTH"
    elif adi <= 1.32 and cv2 > 0.49:
        return adi, cv2, "ERRATIC"
    else:
        return adi, cv2, "INTERMITTENT"

def one_step_predictions(y: np.ndarray, bucket: str, season: int, min_train: int) -> Tuple[np.ndarray, np.ndarray]:
    """Leakage-safe rolling 1-step-ahead predictions over the series."""
    y = np.asarray(y, float); n = len(y)
    t0 = max(min_train, 2*season) if bucket != "INTERMITTENT" else min_train
    if n <= t0:
        return np.array([]), np.array([])
    preds, acts = [], []
    if bucket == "INTERMITTENT":
        for t in range(t0, n):
            yh = croston_sba_forecast(y[:t], h=1)[0]
            preds.append(yh); acts.append(y[t])
    else:
        a,b,g = pick_hw_params(y[:max(t0, min(70, n))], season=season)
        for t in range(t0, n):
            yh = hw_additive_fit_predict(y[:t], h=1, season=season, alpha=a, beta=b, gamma=g)[0]
            preds.append(yh); acts.append(y[t])
    return np.array(acts), np.array(preds)

def conformal_interval(p50: np.ndarray, calib_abs_err: np.ndarray, alpha: float = 0.2) -> Tuple[np.ndarray, np.ndarray]:
    """
    Split-conformal symmetric interval using empirical |residuals|.
    alpha=0.2 -> nominal 80% PI  (P10..P90).
    """
    if len(calib_abs_err) == 0:
        q = 0.0
    else:
        q = float(np.quantile(calib_abs_err, 1 - alpha, interpolation="higher"))
    lower = np.maximum(0.0, p50 - q)
    upper = p50 + q
    return lower, upper

def router_forecast(y_fit: np.ndarray, bucket: str, horizon: int, season: int, min_train: int) -> Tuple[str, np.ndarray, np.ndarray, np.ndarray]:
    """
    Returns (model_name, p50, p10, p90)
    """
    # Point forecast
    if bucket == "INTERMITTENT":
        model_name = "Croston-SBA"
        p50 = croston_sba_forecast(y_fit, h=horizon)
    else:
        a,b,g = pick_hw_params(y_fit, season=season)
        p50 = hw_additive_fit_predict(y_fit, h=horizon, season=season, alpha=a, beta=b, gamma=g)
        model_name = f"HoltWintersAdditive(a={a},b={b},g={g})"

    # Conformal intervals from tail one-step residuals
    acts, preds = one_step_predictions(y_fit, bucket=bucket, season=season, min_train=min_train)
    if len(acts) > 0:
        tail = max(0, len(acts) - CALIBRATION_TAIL)
        calib_abs_err = np.abs(acts[tail:] - preds[tail:])
    else:
        calib_abs_err = np.array([])

    p10, p90 = conformal_interval(p50, calib_abs_err, alpha=0.2)
    return model_name, p50, p10, p90

# --------------------------------------------------------------------------------------
# FastAPI App
# --------------------------------------------------------------------------------------
app = FastAPI(title="Brand X Inventory Forecasting API", version="1.0.0")

@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok"}

@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest) -> ForecastResponse:
    df = _fetch_series(req.sku_id, req.warehouse_id, req)
    if df.empty:
        raise HTTPException(status_code=404, detail="Series not found or no history for given filters.")

    # Build training history (exclude censored OOS if configured)
    if req.exclude_censored_for_train:
        y_fit = df.loc[~df["censored_oos"], "demand_qty"].astype(float).values
    else:
        y_fit = df["demand_qty"].astype(float).values

    if len(y_fit) < max(req.min_train, 2*req.season) and len(y_fit) < 28:
        raise HTTPException(status_code=422, detail="Insufficient history to produce a reliable forecast.")

    # Bucket on recent history (last 52 weeks of training)
    tail = y_fit[-364:] if len(y_fit) > 364 else y_fit
    _, _, bucket = bucket_adi_cv2(tail)

    model_name, p50, p10, p90 = router_forecast(
        y_fit=y_fit, bucket=bucket, horizon=req.horizon,
        season=req.season, min_train=req.min_train
    )

    # Build forecast dates
    last_day: date = df["day"].iloc[-1]
    days = [last_day + timedelta(days=i) for i in range(1, req.horizon + 1)]

    points = [
        ForecastPoint(day=d, p10=float(p10[i]), p50=float(p50[i]), p90=float(p90[i]))
        for i, d in enumerate(days)
    ]

    return ForecastResponse(
        sku_id=req.sku_id,
        warehouse_id=req.warehouse_id,
        model=model_name,
        bucket=bucket,
        history_days=int(len(df)),
        train_days=int(len(y_fit)),
        horizon=req.horizon,
        start_history=df["day"].iloc[0],
        end_history=df["day"].iloc[-1],
        forecasts=points
    )

@app.post("/forecast/batch")
def forecast_batch(req: BatchForecastRequest) -> Dict[str, Any]:
    out = {"results": [], "errors": []}
    for item in req.items:
        single_req = ForecastRequest(
            sku_id=item.sku_id,
            warehouse_id=item.warehouse_id,
            horizon=req.horizon,
            brand=req.brand,
            channel_id=req.channel_id,
            product_category=req.product_category,
            start_date=req.start_date,
            end_date=req.end_date,
            season=req.season,
            min_train=req.min_train,
            exclude_censored_for_train=req.exclude_censored_for_train
        )
        try:
            resp = forecast(single_req)  # reuse logic
            out["results"].append(resp.dict())
        except HTTPException as e:
            out["errors"].append({
                "sku_id": item.sku_id,
                "warehouse_id": item.warehouse_id,
                "status": e.status_code,
                "detail": e.detail
            })
    return out
