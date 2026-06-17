#!/usr/bin/env python3
"""Load stock_return_regressor and predict future returns for stocks."""
import json
import os
import sys
import warnings
warnings.filterwarnings("ignore")

try:
    import joblib
    import numpy as np
except ImportError:
    print(json.dumps({"error": "Missing Python packages: joblib, numpy"}))
    sys.exit(0)

BASE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE, "..", "src", "models", "stock_return_regressor.pkl")
FEAT_PATH = os.path.join(BASE, "..", "src", "models", "stock_regression_features.pkl")
SCALER_PATH = os.path.join(BASE, "..", "src", "models", "regression_scaler.pkl")

def load_model():
    if os.path.exists(MODEL_PATH) and os.path.exists(FEAT_PATH):
        model = joblib.load(MODEL_PATH)
        features = joblib.load(FEAT_PATH)
        scaler = joblib.load(SCALER_PATH) if os.path.exists(SCALER_PATH) else None
        return model, features, scaler
    return None, None, None

def predict(model, feature_names, scaler, features_dict):
    ordered = [features_dict.get(n, 0) for n in feature_names]
    X = np.array([ordered])
    if scaler is not None:
        X = scaler.transform(X)
    pred = float(model.predict(X)[0])
    pred = max(-30, min(60, pred))
    estimators = [tree.predict(X)[0] for tree in model.estimators_]
    std = float(np.std(estimators))
    confidence = min(95, max(30, 100 - std * 2))
    return round(pred, 2), round(confidence, 0)

def main():
    try:
        raw = sys.stdin.read()
        if not raw:
            print(json.dumps({"error": "No input received"}))
            return
        data = json.loads(raw)
        stocks = data.get("stocks", [])
        if not stocks:
            print(json.dumps({"error": "No stocks provided"}))
            return

        model, feature_names, scaler = load_model()
        results = []

        for stock in stocks:
            features_dict = stock.get("features", {})
            symbol = stock.get("symbol", "UNKNOWN")
            company = stock.get("company", symbol)

            if model is not None and feature_names is not None:
                pred_return, confidence = predict(model, feature_names, scaler, features_dict)
            else:
                pred_return, confidence = 0.0, 0

            results.append({
                "symbol": symbol,
                "company": company,
                "predicted_return": pred_return,
                "confidence": int(confidence),
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
