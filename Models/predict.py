#!/usr/bin/env python3
"""Load stock signal classifier and predict BUY/HOLD/SELL."""
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
CLF_PATH = os.path.join(BASE, "stock_signal_classifier.pkl")
FEAT_PATH = os.path.join(BASE, "stock_signal_features.pkl")
LABELS = ["BUY", "HOLD", "SELL"]

def load_models():
    if os.path.exists(CLF_PATH) and os.path.exists(FEAT_PATH):
        clf = joblib.load(CLF_PATH)
        features = joblib.load(FEAT_PATH)
        return clf, features
    return None, None

def rule_based_predict(features_dict):
    val = features_dict.get("valuation_score", 50)
    stab = features_dict.get("financial_stability_score", 50)
    debt = features_dict.get("debt_risk_score", 50)
    growth = features_dict.get("growth_score", 50)
    roe = features_dict.get("roe", 15)
    pe = features_dict.get("pe_ratio", 20)
    pb = features_dict.get("pb_ratio", 3)

    score = (
        -0.15 * pe + -0.15 * pb + 0.20 * roe +
        0.15 * growth + 0.15 * stab + -0.10 * debt +
        0.10 * val
    )

    norm_score = max(-3, min(3, score / 10))
    if norm_score > 0.5:
        signal = "BUY"
        confidence = min(0.95, 0.55 + abs(norm_score) * 0.12)
    elif norm_score < -0.5:
        signal = "SELL"
        confidence = min(0.95, 0.55 + abs(norm_score) * 0.12)
    else:
        signal = "HOLD"
        confidence = 0.60

    buy_prob = max(0, min(1, 0.33 + norm_score * 0.2))
    sell_prob = max(0, min(1, 0.33 - norm_score * 0.2))
    hold_prob = 1 - buy_prob - sell_prob
    if hold_prob < 0:
        hold_prob = 0
        total = buy_prob + sell_prob
        buy_prob = buy_prob / total * 0.66 + 0.17
        sell_prob = sell_prob / total * 0.66 + 0.17

    return {
        "signal": signal,
        "confidence": round(confidence, 3),
        "probabilities": {
            "BUY": round(buy_prob, 3),
            "HOLD": round(hold_prob, 3),
            "SELL": round(sell_prob, 3),
        },
        "model": "rule-based"
    }

def ml_predict(clf, features, features_dict):
    import numpy as np
    expected_names = features
    ordered = [features_dict.get(n, 50) for n in expected_names]
    X = np.array([ordered])
    probs = clf.predict_proba(X)[0]
    pred_class = int(clf.predict(X)[0])
    confidence = float(max(probs))
    return {
        "signal": LABELS[pred_class],
        "confidence": round(confidence, 3),
        "probabilities": {
            "BUY": round(float(probs[0]), 3) if len(probs) > 0 else 0.0,
            "HOLD": round(float(probs[1]), 3) if len(probs) > 1 else 0.0,
            "SELL": round(float(probs[2]), 3) if len(probs) > 2 else 0.0,
        },
        "model": "ml"
    }

def main():
    try:
        raw = sys.stdin.read()
        if not raw:
            print(json.dumps({"error": "No input received"}))
            return
        data = json.loads(raw)
        features_dict = data.get("features", {})
        if not features_dict:
            print(json.dumps({"error": "Missing features"}))
            return

        clf, feature_names = load_models()
        if clf is not None and feature_names is not None:
            result = ml_predict(clf, feature_names, features_dict)
        else:
            result = rule_based_predict(features_dict)

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
