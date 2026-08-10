📈 GlobalVestHub

An AI-powered, 3D-visualized stock market dashboard built with modern web technologies. GlobalVestHub combines live market data, machine-learning driven predictions, and an AI chat assistant in a single investing workspace — helping you track, analyze, and forecast the market in one place.

📋 Table of Contents
Features
Tech Stack
Prerequisites
Installation
Configuration
Getting Started
Project Structure
Available Scripts
Machine Learning Models
API Routes
Contributing
License
✨ Features
Core Functionality
🌐 3D Market Visualization: Explore markets through interactive 3D charts and scenes
🤖 AI Chat Assistant: Ask questions about markets, stocks, and your portfolio through a knowledge-backed chat
📊 Portfolio Tracking: Manage and monitor your holdings in real time
⭐ Watchlist: Save and track your favorite tickers
📰 News Feed: Aggregated market news, all in one place
📅 Market Calendar: Stay on top of earnings and market events
🔀 What-If Scenarios: Simulate hypothetical trades and allocations
AI & Prediction Features
🔮 Future Returns Forecasting: Regression-based return prediction
🚦 Buy/Sell/Hold Signals: ML-powered signal classification
🌦️ Market Regime Detection: Identify bull/bear/volatile market conditions
🧠 AI Stock Picker: Get data-driven stock recommendations
Data & Indicators
📡 Live Market Data: Real-time quotes via Yahoo Finance
📉 Technical Indicators: Sector charts and indicator breakdowns
🔐 Secure Auth: Email/password sign up & login via Supabase
🛠️ Tech Stack

Frontend

Framework: Next.js (App Router) — React 19 + TypeScript
Styling: TailwindCSS 4
3D Graphics: React Three Fiber + Three.js
Charts: Chart.js
Animation: Framer Motion
State Management: Zustand

Backend

Database & Auth: Supabase (PostgreSQL)
Market Data: yahoo-finance2
API Layer: Next.js API routes

Machine Learning

Language: Python
Libraries: scikit-learn based models (regression, classification)
Artifacts: Trained .pkl models for returns, signals, and regime detection
📦 Prerequisites
Node.js 18+
npm, yarn, pnpm, or bun
A Supabase account (for database and authentication)
(Optional) Python 3.9+ with scikit-learn and pandas, for retraining ML models
🚀 Installation
Clone the repository
bash
   git clone https://github.com/khushishah12/GlobalVestHub.git
   cd GlobalVestHub
Install dependencies
bash
   npm install
Set up environment variables (see Configuration section below)
⚙️ Configuration

Create a .env.local file in the root directory with the following variables:

env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

For a full step-by-step walkthrough — creating a Supabase project, copying API keys, running migrations, and configuring auth redirect URLs — see supabase/SETUP.md.

🎯 Getting Started
Development Server

Run the development server:

bash
npm run dev

Open http://localhost:3000 with your browser to see the application.

Database Migrations

Before signing up/logging in, run the SQL migrations in supabase/migrations/ (in order) via the Supabase SQL Editor:

20260522000000_initial_schema.sql — profiles + auth trigger
20260522100000_dashboard_schema.sql — watchlist table
📁 Project Structure
GlobalVestHub/
├── Models/                    # Python training/inference scripts & model artifacts
│   ├── future_returns_predict.py
│   ├── regime_predict.py
│   ├── stock_picker.py
│   └── *.pkl                  # Trained model files
├── scripts/
│   └── train_regressor.py     # Model training script
├── src/
│   ├── app/
│   │   ├── api/                # API routes: chat, stocks, portfolio, watchlist,
│   │   │                       #   news, indicators, market-regime, predict-signal, etc.
│   │   ├── dashboard/           # Dashboard pages: portfolio, watchlist, news,
│   │   │                       #   calendar, charts, stock-picker, what-if, etc.
│   │   ├── login/ signup/       # Authentication pages
│   │   └── page.tsx             # Landing page
│   ├── components/              # React UI components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Shared utilities / API clients
│   ├── models/                  # ML model artifacts used by API routes
│   └── store/                   # Zustand state stores
├── supabase/
│   ├── migrations/              # SQL schema migrations
│   └── SETUP.md                 # Supabase setup guide
├── lib/supabaseClient.ts        # Supabase client
└── middleware.ts                # Next.js middleware
📝 Available Scripts
Command	Description
npm run dev	Start the development server
npm run build	Build the app for production
npm run start	Start the production server
npm run lint	Run ESLint to check code quality
🧠 Machine Learning Models

The Models/ and src/models/ directories contain the trained models and scripts that power predictions across the app:

Model	Purpose
stock_return_rf_model.pkl / stock_return_regressor.pkl	Predict expected stock returns
stock_signal_classifier.pkl	Classify buy/sell/hold signals
regime_rf_model.pkl	Detect current market regime
stock_picker.py	AI-driven stock recommendation logic

Retraining scripts live in scripts/train_regressor.py and Models/*.py.

🔌 API Routes

The application includes several API endpoints under src/app/api/:

Chat: AI chat assistant backed by a knowledge base
Stocks / Market Data: Live quotes and indicators
Portfolio / Watchlist: Manage holdings and saved tickers
News: Aggregated market news
Predict-Signal / Future-Returns / Market-Regime / Stock-Picker: ML-powered prediction endpoints
Sector-Chart: Sector-level performance charting

Refer to the src/app/api/ directory for detailed route implementations.

🚀 Deployment
Deploy on Vercel

The easiest way to deploy is using Vercel:

Push your code to GitHub
Connect your repository to Vercel
Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the Vercel dashboard
Vercel automatically deploys on every push

If you use Vercel's Supabase integration, see Option B in supabase/SETUP.md for wiring up environment variables automatically.

📞 Support & Resources
Next.js Documentation
Supabase Documentation
React Three Fiber Documentation
Chart.js Documentation
🤝 Contributing

Contributions are welcome! Please follow these steps:

Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add some amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

Please ensure:

Code follows the existing style
Linter is happy (npm run lint)
Documentation is updated
📄 License

No license specified yet — add one (e.g. MIT) if you intend for others to reuse this code.

👥 Authors

Created by Khushi Shah

Note: This is an active development project. For issues, questions, or suggestions, please open an issue on GitHub.
