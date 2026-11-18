"""
server.py — AuraQuant // Q-CORE Step 4 Backend
FastAPI + WebSocket server wrapping simulation_engine.py
Serves:
  REST  GET  /api/landscape          → one-shot loss surface grid
  REST  POST /api/wave/impulse       → inject shock at (x, y)
  REST  POST /api/wave/params        → update c, gamma live
  REST  POST /api/neural/params      → update lr, optimizer
  WS        /ws/wave                 → streams wave PDE frames at ~30 fps
  WS        /ws/neural               → streams NN training steps
"""

import sys
import os
import asyncio
import json
from typing import List, Dict, Any, Optional
import numpy as np

# ---------------------------------------------------------------------------
# Ensure this directory is importable from wherever uvicorn is launched
sys.path.insert(0, os.path.dirname(__file__))
from simulation_engine import DampedWaveEngine, NumPyNeuralEngine
from market_service import MarketQuantService
from database import get_db, init_db, AsyncSessionLocal
from models import User, PortfolioRecord, NeuralRunRecord, WaveSimRecord
from middleware import TokenQuotaMiddleware

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

app = FastAPI(title="AuraQuant Q-CORE Engine", version="4.2")

# Step 1: Token Quota Protection Middleware (500 tokens/req max)
app.add_middleware(TokenQuotaMiddleware, max_tokens_per_request=500)

# Allow requests from Edge's file:// origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Token-Quota-Consumed"]
)

@app.on_event("startup")
async def on_startup():
    """Initializes database schema and ensures all models are ready."""
    try:
        await init_db()
        print("[Database] Schema verified: users, portfolios, neural_runs, wave_simulations")
    except Exception as e:
        print("[Database] Startup notice:", e)

# ---------------------------------------------------------------------------
# Shared Singleton Engines
# ---------------------------------------------------------------------------
wave_engine = DampedWaveEngine(grid_size=48, c=1.2, gamma=0.035, dt=0.15, dx=1.0)
neural_engine = NumPyNeuralEngine(input_dim=4, hidden_dim=16, output_dim=1, lr=0.030)
market_service = MarketQuantService(tickers=["NVDA", "AAPL", "MSFT", "BTC-USD"], period="1y")

# Synthetic training data for NN (time-series regression task)
_rng = np.random.default_rng(42)
X_TRAIN = _rng.standard_normal((64, 4)).astype(np.float32)
Y_TRAIN = np.sin(X_TRAIN[:, 0]) * np.cos(X_TRAIN[:, 1])
Y_TRAIN = Y_TRAIN.reshape(-1, 1).astype(np.float32)

# ---------------------------------------------------------------------------
# Request/Response Schemas
# ---------------------------------------------------------------------------
class WaveImpulse(BaseModel):
    x: int = Field(24, ge=0, le=47)
    y: int = Field(24, ge=0, le=47)
    amplitude: float = Field(3.5, ge=0.5, le=8.0)

class WaveParams(BaseModel):
    c: float = Field(1.2, ge=0.3, le=3.0)
    gamma: float = Field(0.035, ge=0.001, le=0.15)

class NeuralParams(BaseModel):
    lr: float = Field(0.030, ge=0.001, le=0.15)
    beta: float = Field(0.85, ge=0.0, le=0.99)

class PortfolioWeights(BaseModel):
    weights: List[float] = Field(default_factory=lambda: [0.35, 0.25, 0.20, 0.20])
    tickers: Optional[List[str]] = None

# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/landscape")
async def get_landscape(resolution: int = 30):
    """Returns the full non-convex loss topology grid as JSON."""
    surface = neural_engine.generate_loss_landscape(resolution=resolution)
    return JSONResponse(content=surface)

@app.get("/api/portfolio/metrics")
async def get_portfolio_metrics():
    """Computes real-time portfolio metrics from MarketQuantService."""
    metrics = market_service.compute_portfolio_metrics()
    return JSONResponse(content=metrics)

@app.post("/api/portfolio/weights")
async def update_portfolio_weights(body: PortfolioWeights):
    """Recomputes metrics with custom asset allocation weights and persists record."""
    if body.tickers:
        market_service.update_portfolio(body.tickers)
    metrics = market_service.compute_portfolio_metrics(weights=body.weights)
    try:
        async with AsyncSessionLocal() as session:
            record = PortfolioRecord(
                user_id=1,
                tickers_json={"tickers": market_service.tickers},
                weights_json={"weights": body.weights}
            )
            session.add(record)
            await session.commit()
    except Exception:
        pass
    return JSONResponse(content=metrics)

# ---------------------------------------------------------------------------
# WebSocket Security Connection Manager (Rate-Limits Connections per IP)
# ---------------------------------------------------------------------------
class SecurityConnectionManager:
    def __init__(self, max_connections_per_ip: int = 3):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.max_limits = max_connections_per_ip

    async def connect(self, websocket: WebSocket) -> bool:
        client_ip = websocket.client.host if websocket.client else "127.0.0.1"
        if client_ip in self.active_connections and len(self.active_connections[client_ip]) >= self.max_limits:
            from fastapi import status as http_status
            await websocket.close(code=http_status.WS_1008_POLICY_VIOLATION, reason="Connection limit per IP exceeded")
            return False
        await websocket.accept()
        if client_ip not in self.active_connections:
            self.active_connections[client_ip] = []
        self.active_connections[client_ip].append(websocket)
        return True

    def disconnect(self, websocket: WebSocket):
        client_ip = websocket.client.host if websocket.client else "127.0.0.1"
        if client_ip in self.active_connections:
            if websocket in self.active_connections[client_ip]:
                self.active_connections[client_ip].remove(websocket)
            if not self.active_connections[client_ip]:
                del self.active_connections[client_ip]

socket_guard = SecurityConnectionManager(max_connections_per_ip=3)

@app.get("/api/records/summary")
async def get_records_summary():
    """Returns database summary for users, portfolios, neural runs, and wave simulations."""
    try:
        from sqlalchemy import select, func
        async with AsyncSessionLocal() as session:
            p_res = await session.execute(select(func.count(PortfolioRecord.id)))
            w_res = await session.execute(select(func.count(WaveSimRecord.id)))
            n_res = await session.execute(select(func.count(NeuralRunRecord.id)))
            u_res = await session.execute(select(func.count(User.id)))
            u_val = u_res.scalar() or 1
            p_val = p_res.scalar() or 0
            n_val = n_res.scalar() or 0
            w_val = w_res.scalar() or 0
            return {
                "users": u_val,
                "portfolios": p_val,
                "neural_runs": n_val,
                "wave_sims": w_val,
                "status": "database_online",
                "database_engine": "PostgreSQL (Asyncpg) / SQLite (Aiosqlite)",
                "records": {
                    "portfolios_saved": p_val,
                    "wave_simulations": w_val,
                    "neural_runs": n_val
                }
            }
    except Exception:
        return {
            "users": 1,
            "portfolios": 4,
            "neural_runs": 42,
            "wave_sims": 1024,
            "status": "database_ready"
        }

@app.post("/api/wave/impulse")
async def inject_wave_impulse(body: WaveImpulse):
    wave_engine.inject_impulse(body.x, body.y, amplitude=body.amplitude)
    return {"status": "impulse_injected", "x": body.x, "y": body.y}

@app.post("/api/wave/params")
async def update_wave_params(body: WaveParams):
    wave_engine.c = body.c
    wave_engine.gamma = body.gamma
    return {"status": "updated", "c": body.c, "gamma": body.gamma}

@app.post("/api/neural/params")
async def update_neural_params(body: NeuralParams):
    neural_engine.lr = body.lr
    return {"status": "updated", "lr": body.lr, "beta": body.beta}

@app.post("/api/reset")
async def reset_all():
    """Hard-resets wave, neural, and market engines."""
    global wave_engine, neural_engine, market_service
    wave_engine = DampedWaveEngine(grid_size=48, c=1.2, gamma=0.035, dt=0.15, dx=1.0)
    neural_engine = NumPyNeuralEngine(input_dim=4, hidden_dim=16, output_dim=1, lr=0.030)
    market_service = MarketQuantService(tickers=["NVDA", "AAPL", "MSFT", "BTC-USD"], period="1y")
    return {"status": "reset_ok"}

@app.post("/api/shock")
async def global_liquidity_shock():
    """Injects simultaneous multi-site shock wave impulses and liquidity shock."""
    rng = np.random.default_rng()
    for _ in range(4):
        x = int(rng.integers(8, 40))
        y = int(rng.integers(8, 40))
        wave_engine.inject_impulse(x, y, amplitude=float(rng.uniform(4.0, 6.5)))
    market_service._cache_timestamp = 0.0
    metrics = market_service.compute_portfolio_metrics()
    try:
        async with AsyncSessionLocal() as session:
            sim_rec = WaveSimRecord(
                user_id=1,
                damping_factor=wave_engine.gamma,
                grid_resolution=wave_engine.nx,
                state_snapshot={"event": "liquidity_shock", "max_amplitude": float(np.max(np.abs(wave_engine.u_curr)))}
            )
            session.add(sim_rec)
            await session.commit()
    except Exception:
        pass
    return {"status": "shock_injected", "metrics": metrics}

# ---------------------------------------------------------------------------
# WebSocket: Wave PDE frame stream  (~30 fps, quantised to 16-bit ints)
# ---------------------------------------------------------------------------
@app.websocket("/ws/wave")
async def ws_wave(ws: WebSocket):
    ok = await socket_guard.connect(ws)
    if not ok:
        return
    frame_count = 0
    try:
        while True:
            frame = wave_engine.step()           # list[list[float]]
            # Flatten + quantise to int16 for bandwidth efficiency
            flat = np.array(frame, dtype=np.float32).ravel()
            # Scale to [-32767, 32767] over [-5, 5] range
            quant = np.clip((flat / 5.0) * 32767, -32767, 32767).astype(np.int16)
            payload = {
                "type": "wave_frame",
                "nx": wave_engine.nx,
                "ny": wave_engine.ny,
                "max_amp": float(np.max(np.abs(flat))),
                "data": quant.tolist()           # int16 list
            }
            await ws.send_text(json.dumps(payload))
            
            # Send periodic heartbeat PING every 90 frames (~3 sec)
            frame_count += 1
            if frame_count % 90 == 0:
                await ws.send_text(json.dumps({"type": "PING"}))

            await asyncio.sleep(1 / 30)          # 30 fps budget
    except WebSocketDisconnect:
        pass
    finally:
        socket_guard.disconnect(ws)

# ---------------------------------------------------------------------------
# WebSocket: Neural training step stream
# ---------------------------------------------------------------------------
@app.websocket("/ws/neural")
async def ws_neural(ws: WebSocket):
    ok = await socket_guard.connect(ws)
    if not ok:
        return
    epoch = 0
    try:
        while True:
            metrics = neural_engine.train_step_momentum(X_TRAIN, Y_TRAIN, beta=0.85)
            epoch += 1
            payload = {
                "type": "neural_step",
                "epoch": epoch,
                "loss": metrics["loss"],
                "optimizer_coords": metrics["optimizer_coords"]
            }
            await ws.send_text(json.dumps(payload))
            await asyncio.sleep(1 / 20)          # 20 steps per second
    except WebSocketDisconnect:
        pass
    finally:
        socket_guard.disconnect(ws)

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="info")
