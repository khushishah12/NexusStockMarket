#!/usr/bin/env python3
"""Load stock_return_rf_model and predict returns for stocks."""
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
MODEL_PATH = os.path.join(BASE, "stock_return_rf_model.pkl")
FEAT_PATH = os.path.join(BASE, "stock_features.pkl")

LABEL_RANGES = [
    (15, "Strong Buy"),
    (8, "Buy"),
    (2, "Watchlist"),
    (-999, "Avoid"),
]

def load_models():
    if os.path.exists(MODEL_PATH) and os.path.exists(FEAT_PATH):
        model = joblib.load(MODEL_PATH)
        features = joblib.load(FEAT_PATH)
        return model, features
    return None, None

def get_label(predicted_return):
    for threshold, label in LABEL_RANGES:
        if predicted_return >= threshold:
            return label
    return "Avoid"

def rule_based_predict(features_dict):
    pe = features_dict.get("pe_ratio", 20)
    pb = features_dict.get("pb_ratio", 3)
    roe = features_dict.get("roe", 15)
    de = features_dict.get("debt_to_equity", 50)
    pm = features_dict.get("profit_margin", 0.1)
    rg = features_dict.get("revenue_growth", 0.08)
    eg = features_dict.get("earnings_growth", 0.08)
    mom = features_dict.get("price_momentum_3m", 0)
    ss = features_dict.get("sector_score", 5)

    pred = (
        0.20 * roe - 0.10 * pe - 0.08 * pb - 0.12 * de +
        0.15 * (pm * 100) + 0.18 * (rg * 100) + 0.18 * (eg * 100) +
        0.20 * mom + 0.10 * ss
    )
    pred = max(-30, min(60, pred))
    confidence = min(95, 60 + abs(pred) * 0.8)
    return round(pred, 2), round(confidence, 0)

def predict(model, feature_names, features_dict):
    ordered = [features_dict.get(n, 0) for n in feature_names]
    X = np.array([ordered])
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

        model, feature_names = load_models()
        results = []

        for stock in stocks:
            features_dict = stock.get("features", {})
            symbol = stock.get("symbol", "UNKNOWN")
            company = stock.get("company", symbol)

            if model is not None and feature_names is not None:
                pred_return, confidence = predict(model, feature_names, features_dict)
            else:
                pred_return, confidence = rule_based_predict(features_dict)

            results.append({
                "symbol": symbol,
                "company": company,
                "predicted_return": pred_return,
                "confidence": int(confidence),
            })

        # Relative labels based on rank within the batch (only real signal from model)
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
