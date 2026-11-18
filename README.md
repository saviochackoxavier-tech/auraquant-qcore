# AuraQuant // Q-CORE — Full-Stack Multi-Dimensional Risk & Wave PDE Suite

A unified, high-performance **Cyber-Quantum & Financial PDE Engine** built across 4 integrated tiers:
- **Step 1: Backend Scaffolding, PostgreSQL Database & Hardened Token-Quota Middleware**
- **Step 2: Quantitative Risk & Market Service**
- **Step 3: Math & Physics Processing Unit**
- **Step 4: Cyber-Quantum Glassmorphic UI with Three.js, Chart.js & Dev Showcase Controls**

---

## 🌟 End-to-End System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             STEP 1: Backend Scaffolding & Security Guard (database.py / models.py)    │
│  • Async Database Session (SQLAlchemy 2.0 / 1.4 compatible + asyncpg / aiosqlite)      │
│  • ORM Schemas: User, PortfolioRecord, NeuralRunRecord, WaveSimRecord                  │
│  • TokenQuotaMiddleware: Rate-limits requests exceeding 500 tokens (HTTP 429)         │
│  • SecurityConnectionManager: Hardened WebSocket connection limiter (max 3 per IP)     │
│  • Emits X-Token-Quota-Consumed and X-Process-Time-MS telemetry response headers       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│             STEP 2: Quantitative Risk Engine (market_service.py)                       │
│  • Asset Universe: NVDA, AAPL, MSFT, BTC-USD (Auto-hedged covariance matrix)          │
│  • Vectorized daily returns, rolling volatility, Sharpe ratio, and 95% Parametric VaR │
│  • Maximum Historical Drawdown with 5-minute TTL caching & Cholesky GBM fallback      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│             STEP 3: Math & Physics Processing Unit (simulation_engine.py)              │
│  • DampedWaveEngine: Vectorized 2D Finite Difference Wave PDE ∇²u - (1/c²)ü = γu̇       │
│  • NumPyNeuralEngine: Pure NumPy Xavier MLP with momentum backprop optimization        │
│  • Non-convex Rastrigin / Ackley-inspired 3D Parameter Loss Topology Generator         │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│             BACKEND DISPATCH & WEBSOCKET ENGINE (server.py @ Port 8765)                │
│  • REST Endpoints:                                                                     │
│    - GET  /api/portfolio/metrics   → Vectorized returns, volatility, VaR, trajectory   │
│    - POST /api/portfolio/weights   → Re-hedges weights and persists PortfolioRecord     │
│    - GET  /api/records/summary     → Real-time counts across all database tables       │
│    - GET  /api/landscape           → 50×50 loss surface topology grid payload          │
│    - POST /api/wave/impulse        → Localized Gaussian shock excitation               │
│    - POST /api/shock               → Liquidity crisis event + persists WaveSimRecord   │
│    - POST /api/reset               → Hard-resets wave, neural, and market engines      │
│  • WebSockets:                                                                         │
│    - ws://127.0.0.1:8765/ws/wave   → Quantized 16-bit PDE wave stream with PING/PONG   │
│    - ws://127.0.0.1:8765/ws/neural → Real-time backpropagation weights & loss          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│             STEP 4: Cyber-Quantum Glassmorphic UI (app.js + index.html)                 │
│  • Dual Synchronized 3D Canvases (Wave PDE & Vibrating Drum + Neural Loss Landscape)   │
│  • Developer Showcase Controls (Interactive Token Cost Slider, 429 Flood Simulator)    │
│  • Live Database Registry Browser (User, PortfolioRecord, NeuralRun, WaveSim Counts)  │
│  • MIT Open-Source Legal Disclaimer Footer                                             │
│  • Hardware-accelerated 60 FPS WebGL rendering with zero memory leaks                  │
│  • 100% Graceful Fallback: Runs pure client-side math if backend server is offline     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start / How to Run

1. **Launch the Full-Stack FastAPI Backend Server**:
   ```powershell
   cd C:\Users\user\.gemini\antigravity\scratch\cyber-quantum-dashboard
   python server.py
   ```

2. **Open the Dashboard in Edge**:
   ```powershell
   Start-Process msedge.exe "C:\Users\user\.gemini\antigravity\scratch\cyber-quantum-dashboard\index.html"
   ```
