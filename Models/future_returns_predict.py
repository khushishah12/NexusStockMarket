#!/usr/bin/env python3
"""Load return_prediction_regressor (XGB) and predict future returns from technical features."""
import json
import os
import sys
import warnings
import math
warnings.filterwarnings("ignore")

try:
    import joblib
    import numpy as np
    import pandas as pd
    import yfinance as yf
except ImportError as e:
    print(json.dumps({"error": f"Missing package: {e}"}))
    sys.exit(0)

BASE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE, "..", "src", "models", "return_prediction_regressor.pkl")
FEAT_PATH = os.path.join(BASE, "..", "src", "models", "stock_regression_features.pkl")

FEATURE_NAMES = [
    'daily_return', '5_day_return', '20_day_return', 'volatility_20d', 'RSI',
    'MACD', 'price_momentum', 'volume', 'ma20_ratio', 'ma50_ratio',
    'volume_ratio', 'ma20_ma50_ratio', 'distance_from_52w_high'
]

def safe(val, fallback=0.0):
    return val if (val is not None and not (isinstance(val, float) and math.isnan(val)) and not math.isinf(val)) else fallback

def compute_rsi(closes, period=14):
    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.mean(gains[-period:]) if len(gains) >= period else 0.01
    avg_loss = np.mean(losses[-period:]) if len(losses) >= period else 0.01
    if avg_loss == 0:
        return 100
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))

def compute_macd(closes, fast=12, slow=26, signal=9):
    if len(closes) < slow + signal:
        return 0.0
    ema_fast = pd.Series(closes).ewm(span=fast).mean().values
    ema_slow = pd.Series(closes).ewm(span=slow).mean().values
    macd_line = ema_fast - ema_slow
    signal_line = pd.Series(macd_line).ewm(span=signal).mean().values
    return safe(macd_line[-1] - signal_line[-1])

def compute_features(df):
    c = df['Close'].values.flatten().astype(float)
    h = df['High'].values.flatten().astype(float)
    l = df['Low'].values.flatten().astype(float)
    v = df['Volume'].values.flatten().astype(float)

    n = min(252, len(c))
    c, h, l, v = c[-n:], h[-n:], l[-n:], v[-n:]

    # Compute daily returns
    daily_ret = np.diff(c) / c[:-1]
    daily_ret = np.insert(daily_ret, 0, 0)

    # Latest values
    close = c[-1]
    avg_close = np.mean(c)

    # 1. daily_return
    daily_return = safe(daily_ret[-1]) * 100

    # 2. 5_day_return
    five_day = safe((c[-1] - c[-6]) / c[-6]) * 100 if n >= 6 else 0

    # 3. 20_day_return
    twenty_day = safe((c[-1] - c[-21]) / c[-21]) * 100 if n >= 21 else 0

    # 4. volatility_20d
    vol_20d = safe(np.std(daily_ret[-20:])) * 100 if n >= 20 else 0

    # 5. RSI
    rsi_val = safe(compute_rsi(c))

    # 6. MACD
    macd_val = safe(compute_macd(c))

    # 7. price_momentum (10-day)
    mom_10 = safe((c[-1] - c[-11]) / c[-11]) * 100 if n >= 11 else 0

    # 8. volume (log of latest volume)
    vol_feat = safe(math.log(v[-1] + 1))

    # 9. ma20_ratio
    ma20 = np.mean(c[-20:]) if n >= 20 else avg_close
    ma20_ratio = close / ma20 if ma20 > 0 else 1.0

    # 10. ma50_ratio
    ma50 = np.mean(c[-50:]) if n >= 50 else avg_close
    ma50_ratio = close / ma50 if ma50 > 0 else 1.0

    # 11. volume_ratio
    avg_vol = np.mean(v[-20:]) if n >= 20 else np.mean(v)
    volume_ratio = v[-1] / avg_vol if avg_vol > 0 else 1.0

    # 12. ma20_ma50_ratio
    ma20_ma50_ratio = ma20 / ma50 if ma50 > 0 else 1.0

    # 13. distance_from_52w_high
    high_52w = np.max(c)
    dist_52w_high = (high_52w - close) / high_52w if high_52w > 0 else 0

    return {
        'daily_return': round(daily_return, 4),
        '5_day_return': round(five_day, 4),
        '20_day_return': round(twenty_day, 4),
        'volatility_20d': round(vol_20d, 4),
        'RSI': round(rsi_val, 2),
        'MACD': round(macd_val, 4),
        'price_momentum': round(mom_10, 4),
        'volume': round(vol_feat, 4),
        'ma20_ratio': round(ma20_ratio, 4),
        'ma50_ratio': round(ma50_ratio, 4),
        'volume_ratio': round(volume_ratio, 4),
        'ma20_ma50_ratio': round(ma20_ma50_ratio, 4),
        'distance_from_52w_high': round(dist_52w_high, 4),
    }

def predict(model, features_dict):
    ordered = [features_dict.get(n, 0) for n in FEATURE_NAMES]
    X = np.array([ordered])
    pred = float(model.predict(X)[0])
    pred = max(-30, min(60, pred))
    confidence = min(95, max(35, 50 + abs(pred) * 3))
    return round(pred, 2), round(confidence, 0)

def main():
    try:
        raw = sys.stdin.read()
        if not raw:
            print(json.dumps({"error": "No input received"}))
            return
        data = json.loads(raw)
        symbols = data.get("symbols", [])
        if not symbols:
            print(json.dumps({"error": "No symbols provided"}))
            return

        model_path = MODEL_PATH
        if not os.path.exists(model_path):
            print(json.dumps({"error": f"Model not found at {model_path}"}))
            return

        model = joblib.load(model_path)
        results = []

        for sym in symbols:
            try:
                df = yf.download(sym, period="1y", progress=False, auto_adjust=True)
                if df.empty or len(df) < 30:
                    results.append({
                        "symbol": sym.replace('.NS', '').replace('.BO', ''),
                        "company": sym.replace('.NS', '').replace('.BO', ''),
                        "predicted_return": 0.0, "confidence": 0,
                    })
                    continue

                if isinstance(df.columns, pd.MultiIndex):
                    df.columns = df.columns.get_level_values(0)

                feats = compute_features(df)
                pred_return, confidence = predict(model, feats)
                results.append({
                    "symbol": sym.replace('.NS', '').replace('.BO', ''),
                    "company": sym.replace('.NS', '').replace('.BO', ''),
                    "predicted_return": pred_return,
                    "confidence": int(confidence),
                })
            except Exception as e:
                results.append({
                    "symbol": sym.replace('.NS', '').replace('.BO', ''),
                    "company": sym.replace('.NS', '').replace('.BO', ''),
                    "predicted_return": 0.0, "confidence": 0,
                })

        results.sort(key=lambda r: r["predicted_return"], reverse=True)
        n = len(results)
        for i, r in enumerate(results):
            pct = i / n if n > 0 else 1
            if pct < 0.2:
                r["recommendation"] = "Strong Buy"
            elif pct < 0.5:
                r["recommendation"] = "Buy"
            elif pct < 0.8:
                r["recommendation"] = "Watchlist"
            else:
                r["recommendation"] = "Avoid"

        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
