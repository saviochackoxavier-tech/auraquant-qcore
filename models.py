"""
models.py
AuraQuant Engine // Step 1: ORM Models
- Schemas: User, PortfolioRecord, NeuralRunRecord, WaveSimRecord
- Fully compatible with SQLAlchemy 1.4 and 2.0
"""

from typing import Any, Dict
from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, func
from sqlalchemy.ext.declarative import declarative_base

# Base class supporting both SQLAlchemy 1.4 and 2.0
try:
    from sqlalchemy.orm import DeclarativeBase
    class Base(DeclarativeBase):
        pass
except ImportError:
    Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    token_quota_used = Column(Integer, default=0)
    token_limit = Column(Integer, default=10000)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PortfolioRecord(Base):
    __tablename__ = "portfolios"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    tickers_json = Column(JSON, nullable=False)
    weights_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NeuralRunRecord(Base):
    __tablename__ = "neural_runs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    hyperparameters = Column(JSON, nullable=False)
    final_loss = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WaveSimRecord(Base):
    __tablename__ = "wave_simulations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    damping_factor = Column(Float, nullable=False)
    grid_resolution = Column(Integer, default=48)
    state_snapshot = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
