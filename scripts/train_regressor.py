#!/usr/bin/env python3
"""
Train stock_return_regressor.pkl with real historical data.

Fetches Nifty 50 stock data from Yahoo Finance, computes 8 features
and uses ACTUAL forward 30-day returns as the target variable.
"""
import json, os, sys, warnings, pickle
warnings.filterwarnings("ignore")

try:
    import numpy as np
    import pandas as pd
    import yfinance as yf
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    import joblib
except ImportError as e:
    print(f"Missing package: {e}")
    sys.exit(1)

SYMBOLS = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
    'BHARTIARTL.NS', 'ITC.NS', 'SBIN.NS', 'LT.NS', 'HINDUNILVR.NS',
    'BAJFINANCE.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'ASIANPAINT.NS',
    'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'ULTRACEMCO.NS',
    'NTPC.NS', 'POWERGRID.NS', 'WIPRO.NS', 'HCLTECH.NS',
    'TECHM.NS', 'NESTLEIND.NS', 'BAJAJFINSV.NS',
]

OUTPUT_DIR = r'C:\Users\KHUSHI\.gemini\antigravity\scratch\ai-stock-dashboard-3d\src\models'

def compute_features(df):
    """Compute 8 features from a single stock's OHLCV + fundamentals."""
    if df.empty or len(df) < 60:
        return None

    close = df['Close'].iloc[-1]
    
    high_max = df['High'].rolling(252).max().iloc[-1]
    low_min = df['Low'].rolling(252).min().iloc[-1]
    range_ = max(high_max - low_min, 1)
    valuation_score = min(100, max(0, ((high_max - close) / range_) * 100))

    # 2. Financial Stability Score: inverse of daily volatility
    daily_returns = df['Close'].pct_change().dropna()
    volatility = daily_returns.std()
    financial_stability_score = min(100, max(0, 100 - volatility * 1000))

    # 3. Debt Risk Score: based on drawdown from high
    peak = df['Close'].rolling(252).max().iloc[-1]
    drawdown = (peak - close) / peak
    debt_risk_score = min(100, max(0, drawdown * 100))

    # 4. Growth Score: momentum over 3 months
    mom_3m = df['Close'].pct_change(63).iloc[-1] if len(df) > 63 else 0
    growth_score = min(100, max(0, 50 + mom_3m * 100))

    # 5. ROE proxy: return on equity approximated by efficiency ratio
    annual_return = daily_returns.mean() * 252
    roe = max(0, min(100, annual_return * 100))

    # 6. PE Ratio proxy: price / earnings (using inverse of earnings yield)
    earnings_yield = daily_returns.mean() * 252
    pe_ratio = 1 / max(earnings_yield, 0.01) if earnings_yield > 0 else 30

    # 7. PB Ratio proxy: price / book (using volatility as risk proxy)
    pb_ratio = max(1, min(20, volatility * 100))

    # 8. Market Cap (in billions)
    market_cap = close * 10000000  # rough estimate

    return {
        'valuation_score': int(round(valuation_score)),
        'financial_stability_score': int(round(financial_stability_score)),
        'debt_risk_score': int(round(debt_risk_score)),
        'growth_score': int(round(growth_score)),
        'pe_ratio': round(pe_ratio, 2),
        'pb_ratio': round(pb_ratio, 2),
        'roe': round(roe, 2),
        'market_cap': int(market_cap),
    }

def compute_forward_return(df, days=30):
    """Compute actual forward return over next `days` trading days."""
    if df.empty or len(df) < days + 1:
        return None
    future_close = df['Close'].shift(-days)
    current_close = df['Close']
    forward_returns = ((future_close - current_close) / current_close) * 100
    return forward_returns.iloc[-(days + 1)]  # latest complete forward return

def main():
    print("=" * 60)
    print("Training stock_return_regressor with real historical data")
    print("=" * 60)

    all_features = []
    all_targets = []

    for sym in SYMBOLS:
        print(f"\nFetching {sym}...")
        try:
            # Fetch 2 years of daily data for enough history
            df = yf.download(sym, period='2y', progress=False, auto_adjust=True)
            if df.empty or len(df) < 100:
                print(f"  Skipping {sym} - insufficient data ({len(df)} rows)")
                continue

            # Flatten MultiIndex columns if present
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            # Compute features and targets for each monthly snapshot
            for i in range(0, len(df) - 90, 21):  # ~monthly snapshots
                chunk = df.iloc[i:i+90]
                if len(chunk) < 60:
                    continue

                features = compute_features(chunk)
                if features is None:
                    continue

                # Target: forward return over the NEXT 30 trading days
                future_df = df.iloc[i+90:i+120]
                if len(future_df) < 30:
                    continue

                current_price = chunk['Close'].iloc[-1]
                future_price = future_df['Close'].iloc[-1]
                forward_return = ((future_price - current_price) / current_price) * 100

                # Clamp extreme outliers
                forward_return = max(-50, min(100, forward_return))

                all_features.append(features)
                all_targets.append(forward_return)

            print(f"  Added {len([f for f in all_features if f['pe_ratio'] > 0])} training samples from {sym}")

        except Exception as e:
            print(f"  Error: {e}")
            continue

    if len(all_features) < 50:
        print(f"\nNot enough training data ({len(all_features)} samples). Cannot train.")
        sys.exit(1)

    print(f"\n{'=' * 60}")
    print(f"Total training samples: {len(all_features)}")
    print(f"Target range: {min(all_targets):.2f}% to {max(all_targets):.2f}%")
    print(f"Target mean: {np.mean(all_targets):.2f}%")
    print(f"Target std: {np.std(all_targets):.2f}%")
    print(f"Positive targets: {sum(1 for t in all_targets if t > 0)} / {len(all_targets)}")

    # Prepare feature matrix
    feature_names = [
        'valuation_score', 'financial_stability_score', 'debt_risk_score',
        'growth_score', 'pe_ratio', 'pb_ratio', 'roe', 'market_cap'
    ]
    X = np.array([[f[n] for n in feature_names] for f in all_features])
    y = np.array(all_targets)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train model
    print(f"\nTraining RandomForestRegressor with {X.shape[1]} features...")
    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=15,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_scaled, y)

    # Evaluate
    train_preds = model.predict(X_scaled)
    residuals = y - train_preds
    rmse = np.sqrt(np.mean(residuals ** 2))
    r2 = model.score(X_scaled, y)
    print(f"Training R² score: {r2:.4f}")
    print(f"Training RMSE: {rmse:.2f}%")

    # Feature importance
    print(f"\nFeature Importance:")
    for name, imp in sorted(zip(feature_names, model.feature_importances_),
                             key=lambda x: x[1], reverse=True):
        print(f"  {name:35s} {imp:.4f}")

    # Save model and feature names
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model_path = os.path.join(OUTPUT_DIR, 'stock_return_regressor.pkl')
    features_path = os.path.join(OUTPUT_DIR, 'stock_regression_features.pkl')

    joblib.dump(model, model_path)
    joblib.dump(feature_names, features_path)
    
    # Also save the scaler for consistent feature scaling
    scaler_path = os.path.join(OUTPUT_DIR, 'regression_scaler.pkl')
    joblib.dump(scaler, scaler_path)

    print(f"\n{'=' * 60}")
    print(f"Model saved to: {model_path}")
    print(f"Features saved to: {features_path}")
    print(f"Scaler saved to: {scaler_path}")
    print(f"{'=' * 60}")

    # Quick test on current Nifty stocks
    print(f"\nQuick test on current data:")
    for sym in SYMBOLS[:5]:
        try:
            df = yf.download(sym, period='6mo', progress=False, auto_adjust=True)
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            feats = compute_features(df)
            if feats:
                X_test = np.array([[feats[n] for n in feature_names]])
                X_test_scaled = scaler.transform(X_test)
                pred = model.predict(X_test_scaled)[0]
                print(f"  {sym:20s} predicted_return={pred:+.2f}%")
        except:
            pass

if __name__ == '__main__':
    main()
