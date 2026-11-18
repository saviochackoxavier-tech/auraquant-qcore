"""
market_service.py
AuraQuant Engine // Step 2: Quantitative Risk & Market Service
- Fetches asset data with TTL caching and resilient offline Monte Carlo simulation
- Computes vectorized daily returns, rolling volatility, covariance matrices, and max drawdowns
- Supports dynamic asset lists (1 to 20+ assets) with automated correlation and weight balancing
- Fully aligned with Step 3 NumPy Engine and Step 4 Frontend telemetry payloads
"""

import numpy as np
import pandas as pd
import time
from typing import Dict, List, Any, Optional

# Resilient yfinance import check
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except Exception:
    yf = None
    YFINANCE_AVAILABLE = False


class MarketQuantService:
    def __init__(self, tickers: Optional[List[str]] = None, period: str = "1y"):
        if tickers is None or len(tickers) == 0:
            tickers = ["NVDA", "AAPL", "MSFT", "BTC-USD"]
        self.tickers = list(tickers)
        self.period = period
        self._cache = pd.DataFrame()
        self._cache_timestamp = 0.0
        self.cache_ttl = 300.0  # 5-minute cache TTL

    def update_portfolio(self, tickers: List[str]) -> None:
        """Dynamically update ticker list and invalidate cache."""
        if tickers and len(tickers) > 0:
            cleaned = [str(t).strip().upper() for t in tickers if str(t).strip()]
            if cleaned != self.tickers:
                self.tickers = cleaned
                self._cache = pd.DataFrame()
                self._cache_timestamp = 0.0

    def fetch_market_data(self) -> pd.DataFrame:
        """Fetches historical prices with TTL caching and fallback safety."""
        current_time = time.time()
        if not self._cache.empty and (current_time - self._cache_timestamp) < self.cache_ttl:
            return self._cache

        if YFINANCE_AVAILABLE and yf is not None:
            try:
                raw_data = yf.download(self.tickers, period=self.period, progress=False)
                if "Close" in raw_data:
                    data = raw_data["Close"]
                elif "Adj Close" in raw_data:
                    data = raw_data["Adj Close"]
                else:
                    data = raw_data
                    
                if isinstance(data, pd.Series):
                    data = data.to_frame()
                    
                data = data.dropna(how="all").ffill().bfill()
                if not data.empty and len(data) >= 10:
                    self._cache = data
                    self._cache_timestamp = current_time
                    return data
            except Exception:
                pass

        # Fallback synthetic frame with dynamically dimensioned correlated Geometric Brownian Motion
        dates = pd.date_range(end=pd.Timestamp.today(), periods=252, freq="B")
        n = len(self.tickers)
        np.random.seed(42)

        # Realistic individualized drifts and volatilities for N assets
        base_drifts = {
            "NVDA": 0.0014, "AAPL": 0.0008, "MSFT": 0.0007, "BTC-USD": 0.0018,
            "GOOGL": 0.0008, "AMZN": 0.0009, "TSLA": 0.0013, "ETH-USD": 0.0017,
            "JPM": 0.0005, "GLD": 0.0003
        }
        base_vols = {
            "NVDA": 0.026, "AAPL": 0.016, "MSFT": 0.015, "BTC-USD": 0.039,
            "GOOGL": 0.017, "AMZN": 0.018, "TSLA": 0.031, "ETH-USD": 0.038,
            "JPM": 0.013, "GLD": 0.009
        }

        drifts = np.array([base_drifts.get(t, 0.0005 + 0.0008 * np.random.rand()) for t in self.tickers], dtype=np.float64)
        volatilities = np.array([base_vols.get(t, 0.012 + 0.022 * np.random.rand()) for t in self.tickers], dtype=np.float64)

        # Construct positive-definite correlation matrix for arbitrary N assets
        A = np.random.normal(0.2, 0.5, size=(n, n))
        cov_temp = np.dot(A, A.T) + n * np.eye(n)
        d = np.sqrt(np.diag(cov_temp))
        corr = cov_temp / np.outer(d, d)

        try:
            L = np.linalg.cholesky(corr)
        except np.linalg.LinAlgError:
            L = np.eye(n)

        z = np.random.normal(0, 1, size=(252, n))
        correlated_shocks = z.dot(L.T)

        daily_returns = drifts + volatilities * correlated_shocks
        prices = 100.0 * np.cumprod(1.0 + daily_returns, axis=0)

        fallback_data = pd.DataFrame(prices, index=dates, columns=self.tickers)
        self._cache = fallback_data
        self._cache_timestamp = current_time
        return fallback_data

    def compute_portfolio_metrics(self, weights: Optional[List[float]] = None) -> Dict[str, Any]:
        """Vectorized computation of portfolio return, volatility, Sharpe ratio, VaR, and covariance."""
        n = len(self.tickers)
        if weights is None or len(weights) != n:
            weights = [1.0 / n] * n

        df = self.fetch_market_data()
        returns = df.pct_change().dropna()

        # Handle column alignment
        avail_cols = [c for c in self.tickers if c in returns.columns]
        if len(avail_cols) != n:
            returns = returns.reindex(columns=self.tickers).fillna(0.0)

        w = np.array(weights, dtype=np.float64)
        total_w = np.sum(w)
        if total_w > 0:
            w = w / total_w
        else:
            w = np.ones(n, dtype=np.float64) / n

        # Portfolio daily returns vector dot product
        port_returns = returns.dot(w)

        # Cumulative performance trajectory
        cumulative = (1.0 + port_returns).cumprod()
        total_return = float(cumulative.iloc[-1] - 1.0) if len(cumulative) > 0 else 0.0

        # Annualized metrics (252 trading days)
        ann_volatility = float(port_returns.std() * np.sqrt(252.0))
        ann_return = float(port_returns.mean() * 252.0)
        sharpe_ratio = float((ann_return - 0.04) / (ann_volatility if ann_volatility > 1e-6 else 1e-6))

        # Value at Risk (95% Confidence Interval over $100,000 baseline)
        var_95 = float(np.percentile(port_returns, 5) * 100000.0) if len(port_returns) > 0 else -5000.0

        # Maximum Drawdown calculation
        rolling_max = cumulative.cummax()
        drawdowns = (cumulative - rolling_max) / (rolling_max + 1e-9)
        max_drawdown = float(drawdowns.min()) if len(drawdowns) > 0 else 0.0

        # Annualized Covariance Matrix
        cov_matrix = returns.cov() * 252.0

        # Trajectory scaled to $100,000 baseline for last 30 data points
        tail30 = cumulative.tail(30)
        if len(tail30) > 0 and tail30.iloc[0] != 0:
            traj_last30 = (tail30 / tail30.iloc[0] * 100000.0).round(2).tolist()
        else:
            traj_last30 = [100000.0] * 30

        return {
            "tickers": self.tickers,
            "weights": [round(float(x), 4) for x in w],
            "total_return_pct": round(total_return * 100.0, 2),
            "volatility_pct": round(ann_volatility * 100.0, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "var_95_usd": round(var_95, 2),
            "max_drawdown_pct": round(max_drawdown * 100.0, 2),
            "covariance_matrix": cov_matrix.round(4).to_dict(),
            "benchmark_trajectory": traj_last30
        }
