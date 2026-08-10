# 📈 GlobalVestHub

**GlobalVestHub** is an AI-powered, 3D-visualized stock market dashboard built with modern web technologies. It combines live market data, machine-learning-driven predictions, portfolio management, and an AI chat assistant into a unified investing workspace.

> **Track. Analyze. Predict. Invest.**

---

## 📋 Table of Contents

* [✨ Features](#-features)
* [🛠️ Tech Stack](#️-tech-stack)
* [📦 Prerequisites](#-prerequisites)
* [🚀 Installation](#-installation)
* [⚙️ Configuration](#️-configuration)
* [🎯 Getting Started](#-getting-started)
* [📁 Project Structure](#-project-structure)
* [📝 Available Scripts](#-available-scripts)
* [🧠 Machine Learning Models](#-machine-learning-models)
* [🔌 API Routes](#-api-routes)
* [🚀 Deployment](#-deployment)
* [🤝 Contributing](#-contributing)
* [📄 License](#-license)
* [👥 Author](#-author)

---

## ✨ Features

### 📊 Core Functionality

| Feature                        | Description                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| 🌐 **3D Market Visualization** | Explore market data through interactive 3D charts and scenes                           |
| 🤖 **AI Chat Assistant**       | Ask questions about stocks, markets, and portfolios using a knowledge-backed assistant |
| 📊 **Portfolio Tracking**      | Manage and monitor your holdings in real time                                          |
| ⭐ **Watchlist**                | Save and track favorite stocks and tickers                                             |
| 📰 **News Feed**               | Access aggregated financial and market news                                            |
| 📅 **Market Calendar**         | Track earnings, events, and important market dates                                     |
| 🔀 **What-If Scenarios**       | Simulate hypothetical trades and portfolio allocations                                 |

### 🧠 AI & Prediction

| Feature                           | Description                                            |
| --------------------------------- | ------------------------------------------------------ |
| 🔮 **Future Returns Forecasting** | Regression-based prediction of expected stock returns  |
| 🚦 **Buy / Sell / Hold Signals**  | ML-powered classification of potential trading signals |
| 🌦️ **Market Regime Detection**   | Identify bull, bear, and volatile market conditions    |
| 🧠 **AI Stock Picker**            | Generate data-driven stock recommendations             |

### 📈 Market Data & Analytics

* 📡 **Live Market Data** using Yahoo Finance
* 📉 **Technical Indicators** and market analytics
* 📊 **Sector Performance Charts**
* 🔐 **Secure Authentication** using Supabase
* 💼 **Portfolio & Watchlist Management**

---

## 🛠️ Tech Stack

### Frontend

| Technology            | Usage                                           |
| --------------------- | ----------------------------------------------- |
| **Next.js**           | Full-stack React framework using the App Router |
| **React 19**          | UI development                                  |
| **TypeScript**        | Type-safe development                           |
| **Tailwind CSS 4**    | Styling                                         |
| **React Three Fiber** | 3D graphics                                     |
| **Three.js**          | 3D rendering                                    |
| **Chart.js**          | Financial and analytical charts                 |
| **Framer Motion**     | UI animations                                   |
| **Zustand**           | State management                                |

### Backend & Database

| Technology             | Usage                                  |
| ---------------------- | -------------------------------------- |
| **Next.js API Routes** | Backend API layer                      |
| **Supabase**           | PostgreSQL database and authentication |
| **Yahoo Finance**      | Live market data via `yahoo-finance2`  |

### Machine Learning

| Technology          | Usage                         |
| ------------------- | ----------------------------- |
| **Python**          | ML model development          |
| **scikit-learn**    | Regression and classification |
| **Pandas**          | Data processing               |
| **Pickle (`.pkl`)** | Trained model artifacts       |

---

## 📦 Prerequisites

Before running GlobalVestHub locally, make sure you have:

* **Node.js 18+**
* **npm**, **yarn**, **pnpm**, or **bun**
* A **Supabase account**
* **Python 3.9+** *(optional — required only for retraining ML models)*
* Python packages such as `scikit-learn` and `pandas` *(optional)*

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/khushishah12/GlobalVestHub.git
cd GlobalVestHub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root.

See the [Configuration](#️-configuration) section below.

---

## ⚙️ Configuration

Create `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup

For the complete Supabase setup process, refer to:

```text
supabase/SETUP.md
```

The setup guide covers:

* Creating a Supabase project
* Obtaining API credentials
* Running database migrations
* Configuring authentication
* Setting auth redirect URLs

> ⚠️ **Never commit `.env.local` or expose your Supabase credentials publicly.**

---

## 🎯 Getting Started

### Start the Development Server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

### Database Migrations

Before using authentication, watchlists, or other database-dependent features, run the SQL migrations in:

```text
supabase/migrations/
```

Run them in the Supabase SQL Editor **in the following order**:

```text
20260522000000_initial_schema.sql
20260522100000_dashboard_schema.sql
```

The migrations create and configure:

* User profiles
* Authentication triggers
* Watchlists
* Dashboard-related database structures

---

## 📁 Project Structure

```text
GlobalVestHub/
│
├── Models/
│   ├── future_returns_predict.py
│   ├── regime_predict.py
│   ├── stock_picker.py
│   └── *.pkl
│
├── scripts/
│   └── train_regressor.py
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   ├── stocks/
│   │   │   ├── portfolio/
│   │   │   ├── watchlist/
│   │   │   ├── news/
│   │   │   ├── indicators/
│   │   │   ├── market-regime/
│   │   │   ├── predict-signal/
│   │   │   └── ...
│   │   │
│   │   ├── dashboard/
│   │   │   ├── portfolio/
│   │   │   ├── watchlist/
│   │   │   ├── news/
│   │   │   ├── calendar/
│   │   │   ├── charts/
│   │   │   ├── stock-picker/
│   │   │   ├── what-if/
│   │   │   └── ...
│   │   │
│   │   ├── login/
│   │   ├── signup/
│   │   └── page.tsx
│   │
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── models/
│   └── store/
│
├── supabase/
│   ├── migrations/
│   └── SETUP.md
│
├── lib/
│   └── supabaseClient.ts
│
├── middleware.ts
├── package.json
└── README.md
```

---

## 📝 Available Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the development server         |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server          |
| `npm run lint`  | Run ESLint and check code quality    |

Example:

```bash
npm run dev
```

---

## 🧠 Machine Learning Models

GlobalVestHub uses trained machine-learning models to provide market predictions and analysis.

### Available Models

| Model                         | Purpose                                    |
| ----------------------------- | ------------------------------------------ |
| `stock_return_rf_model.pkl`   | Predict expected stock returns             |
| `stock_return_regressor.pkl`  | Regression-based stock return prediction   |
| `stock_signal_classifier.pkl` | Classify Buy / Sell / Hold signals         |
| `regime_rf_model.pkl`         | Detect market regimes                      |
| `stock_picker.py`             | Generate data-driven stock recommendations |

### Prediction Pipeline

```text
Market Data
     ↓
Data Preprocessing
     ↓
Feature Engineering
     ↓
ML Model
     ↓
Prediction
     ↓
API Endpoint
     ↓
Dashboard Visualization
```

### Retraining Models

Model training scripts are available in:

```text
scripts/train_regressor.py
Models/
```

You can retrain the models when updated market data or improved features are available.

---

## 🔌 API Routes

GlobalVestHub provides API endpoints through the Next.js App Router.

### 🤖 AI

```text
/api/chat
```

Provides the AI-powered market assistant.

### 📈 Market Data

```text
/api/stocks
/api/indicators
/api/sector-chart
```

Provides stock prices, technical indicators, and sector-level market information.

### 💼 Portfolio & Watchlist

```text
/api/portfolio
/api/watchlist
```

Used to manage user portfolios and saved stocks.

### 📰 News

```text
/api/news
```

Fetches aggregated market and financial news.

### 🧠 Machine Learning

```text
/api/predict-signal
/api/future-returns
/api/market-regime
/api/stock-picker
```

These endpoints expose the application's ML-powered prediction capabilities.

> For implementation details, see the corresponding files inside `src/app/api/`.

---

## 🚀 Deployment

### Deploy with Vercel

The recommended deployment platform is **Vercel**.

#### 1. Push the Repository to GitHub

```bash
git add .
git commit -m "Prepare application for deployment"
git push origin main
```

#### 2. Connect to Vercel

1. Open [Vercel](https://vercel.com/)
2. Import the GitHub repository
3. Configure the required environment variables
4. Deploy the application

Add the following environment variables in the Vercel dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Vercel will automatically deploy new changes whenever you push to the connected repository.

---

## 🤝 Contributing

Contributions are welcome!

### Contribution Workflow

```bash
# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes

# Commit your changes
git commit -m "Add amazing feature"

# Push the branch
git push origin feature/amazing-feature
```

Then open a **Pull Request** on GitHub.

### Before Submitting

Please make sure:

* [ ] Code follows the existing project style
* [ ] `npm run lint` passes
* [ ] New functionality is tested
* [ ] Documentation is updated where necessary
* [ ] No secrets or API keys are committed

---

## 📄 License

No license has been specified yet.

If you intend to allow others to freely use, modify, and distribute this project, consider adding an open-source license such as **MIT**.

---

## 👥 Author

**Khushi Shah**

GitHub: [@khushishah12](https://github.com/khushishah12)

---

> ⚠️ **Disclaimer:** GlobalVestHub is an educational and analytical project. ML predictions, market signals, and stock recommendations should not be considered financial advice. Always perform your own research before making investment decisions.

---

⭐ **If you find GlobalVestHub useful, consider giving the repository a star!**
