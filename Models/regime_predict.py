#!/usr/bin/env python3
"""Load regime_rf_model and predict market regime for stocks."""
import json
import os
import sys
import warnings
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
MODEL_PATH = os.path.join(BASE, "..", "src", "models", "regime_rf_model.pkl")
SCALER_PATH = os.path.join(BASE, "..", "src", "models", "regime_scaler.pkl")

REGIME_NAMES = {0: "BEAR", 1: "NEUTRAL", 2: "BULL"}

def load_model():
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        return model, scaler
    return None, None

def compute_features(df):
    c = df['Close'].values.flatten()
    h = df['High'].values.flatten()
    l = df['Low'].values.flatten()
    v = df['Volume'].values.flatten().astype(float)

    n = min(60, len(c))
    c, h, l, v = c[-n:], h[-n:], l[-n:], v[-n:]

    feats = np.zeros((n, 4))
    for i in range(n):
        feats[i, 0] = np.log(c[i] / c[i-1]) if i > 0 and c[i-1] > 0 else 0
        feats[i, 1] = (h[i] - l[i]) / c[i] if c[i] > 0 else 0
        feats[i, 2] = np.log(c[i] / c[i-4]) if i >= 4 and c[i-4] > 0 else 0
        feats[i, 3] = np.log(v[i]) if v[i] > 0 else 0

    return feats

def predict_regime(model, scaler, features):
    scaled = scaler.transform(features)
    probs = model.predict_proba(scaled)
    avg_probs = probs.mean(axis=0)
    regime = int(np.argmax(avg_probs))
    confidence = float(avg_probs[regime] * 100)
    return regime, confidence, avg_probs.tolist()

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

        model, scaler = load_model()
        if model is None:
            print(json.dumps({"error": "Model not found"}))
            return

        import pandas as pd
        results = []
        for sym in symbols:
            try:
                df = yf.download(sym, period="6mo", progress=False, auto_adjust=True)
                if df.empty or len(df) < 30:
                    results.append({"symbol": sym, "regime": "NEUTRAL", "confidence": 0})
                    continue

                if isinstance(df.columns, pd.MultiIndex):
                    df.columns = df.columns.get_level_values(0)

                features = compute_features(df)
                regime, confidence, probs = predict_regime(model, scaler, features)
                results.append({
                    "symbol": sym,
                    "regime": REGIME_NAMES[regime],
                    "confidence": round(confidence, 1),
                    "probabilities": [round(p * 100, 1) for p in probs],
                })
            except Exception as e:
                results.append({"symbol": sym, "regime": "NEUTRAL", "confidence": 0})

        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
