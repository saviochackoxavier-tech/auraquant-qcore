"""
/app/services/simulation_engine.py
AuraQuant Engine // Step 3: Math & Physics Processing Unit
- Vectorized 2D Damped Wave Solver (Finite Difference Method)
- Pure NumPy Multi-Layer Neural Network with Loss Topology Generator
- Optimized for seamless JSON telemetry payload transmission to Step 4 Frontend
"""

import numpy as np
from typing import Dict, List, Tuple, Any

class DampedWaveEngine:
    def __init__(self, grid_size: int = 48, c: float = 1.0, gamma: float = 0.05, dt: float = 0.1, dx: float = 1.0):
        self.nx = grid_size
        self.ny = grid_size
        self.c = c
        self.gamma = gamma
        self.dt = dt
        self.dx = dx
        
        # Grid buffers: u_past, u_curr, u_next
        self.u_past = np.zeros((self.nx, self.ny), dtype=np.float32)
        self.u_curr = np.zeros((self.nx, self.ny), dtype=np.float32)
        self.u_next = np.zeros((self.nx, self.ny), dtype=np.float32)

    def inject_impulse(self, x: int, y: int, amplitude: float = 2.5, radius: int = 3) -> None:
        """Injects a Gaussian shock impulse into the grid for liquidity shock simulation."""
        X, Y = np.ogrid[:self.nx, :self.ny]
        dist_sq = (X - x)**2 + (Y - y)**2
        impulse = amplitude * np.exp(-dist_sq / (2 * radius**2))
        self.u_curr += impulse.astype(np.float32)

    def step(self) -> List[List[float]]:
        """Solves one time-step of ∇²u - (1/c²)u_tt = γ u_t using discrete Laplace operator."""
        r_sq = (self.c * self.dt / self.dx) ** 2
        
        # 5-point stencil Laplacian vectorization
        laplacian = (
            np.roll(self.u_curr, 1, axis=0) + np.roll(self.u_curr, -1, axis=0) +
            np.roll(self.u_curr, 1, axis=1) + np.roll(self.u_curr, -1, axis=1) -
            4 * self.u_curr
        )
        
        # Zero Dirichlet boundary conditions
        laplacian[0, :] = laplacian[-1, :] = laplacian[:, 0] = laplacian[:, -1] = 0
        
        # Finite difference time stepping with damping factor
        denom = 1.0 + 0.5 * self.gamma * self.dt
        term1 = 2.0 * self.u_curr
        term2 = (0.5 * self.gamma * self.dt - 1.0) * self.u_past
        term3 = r_sq * laplacian
        
        self.u_next = (term1 + term2 + term3) / denom
        
        # Cycle buffers efficiently
        self.u_past[...] = self.u_curr
        self.u_curr[...] = self.u_next
        
        return self.u_curr.tolist()


class NumPyNeuralEngine:
    def __init__(self, input_dim: int = 4, hidden_dim: int = 8, output_dim: int = 1, lr: float = 0.01):
        self.lr = lr
        # Initialize weights with Xavier scaling
        self.W1 = np.random.randn(input_dim, hidden_dim).astype(np.float32) * np.sqrt(2.0 / input_dim)
        self.b1 = np.zeros((1, hidden_dim), dtype=np.float32)
        self.W2 = np.random.randn(hidden_dim, output_dim).astype(np.float32) * np.sqrt(2.0 / hidden_dim)
        self.b2 = np.zeros((1, output_dim), dtype=np.float32)
        
        # Momentum buffers
        self.v_W1 = np.zeros_like(self.W1)
        self.v_W2 = np.zeros_like(self.W2)
        
        # Optimization trajectory tracker
        self.current_w1 = 0.0
        self.current_w2 = 0.0

    def forward(self, X: np.ndarray) -> np.ndarray:
        self.z1 = np.dot(X, self.W1) + self.b1
        self.a1 = np.tanh(self.z1)
        self.z2 = np.dot(self.a1, self.W2) + self.b2
        return self.z2

    def train_step_momentum(self, X: np.ndarray, y: np.ndarray, beta: float = 0.9) -> Dict[str, Any]:
        """Executes vectorized backpropagation with momentum optimization and returns metrics."""
        m = X.shape[0]
        y_pred = self.forward(X)
        loss = float(np.mean((y_pred - y) ** 2))
        
        # Backward Pass
        dz2 = 2.0 * (y_pred - y) / m
        dW2 = np.dot(self.a1.T, dz2)
        db2 = np.sum(dz2, axis=0, keepdims=True)
        
        da1 = np.dot(dz2, self.W2.T)
        dz1 = da1 * (1.0 - np.tanh(self.z1) ** 2)
        dW1 = np.dot(X.T, dz1)
        db1 = np.sum(dz1, axis=0, keepdims=True)
        
        # Momentum update
        self.v_W1 = beta * self.v_W1 + self.lr * dW1
        self.v_W2 = beta * self.v_W2 + self.lr * dW2

        self.W1 -= self.v_W1
        self.b1 -= self.lr * db1   # fixed: db1 → b1, not W2
        self.W2 -= self.v_W2
        self.b2 -= self.lr * db2
        
        # Track scalar weights for 3D loss surface mapping projection
        self.current_w1 = float(np.mean(self.W1))
        self.current_w2 = float(np.mean(self.W2))
        
        return {
            "loss": loss,
            "optimizer_coords": [self.current_w1, self.current_w2, loss]
        }

    def generate_loss_landscape(self, resolution: int = 30) -> Dict[str, List[List[float]]]:
        """Generates 3D grid surface payload for the non-convex parameter loss topology."""
        w1_range = np.linspace(-3.0, 3.0, resolution)
        w2_range = np.linspace(-3.0, 3.0, resolution)
        W1_grid, W2_grid = np.meshgrid(w1_range, w2_range)
        
        # Non-convex Rastrigin/Ackley-inspired cyber-quantum loss surface
        Z = (
            0.5 * (W1_grid**2 + W2_grid**2) 
            - 0.3 * np.cos(3.0 * np.pi * W1_grid) 
            - 0.3 * np.cos(3.0 * np.pi * W2_grid) 
            + 0.6
        )
        return {
            "w1": W1_grid.tolist(),
            "w2": W2_grid.tolist(),
            "loss_z": Z.tolist()
        }
