"""
database.py
AuraQuant Engine // Step 1: Backend Scaffolding & Async Database Session
- Async database session management via SQLAlchemy
- PostgreSQL support with resilient SQLite async fallback (aiosqlite)
"""

import os
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# ---------------------------------------------------------
# DATABASE CONFIGURATION
# ---------------------------------------------------------
POSTGRES_URL = os.getenv("DATABASE_URL")
SQLITE_URL = "sqlite+aiosqlite:///./auraquant.db"

# Select default URL: use postgres if explicitly set, else sqlite
DATABASE_URL = POSTGRES_URL if POSTGRES_URL else SQLITE_URL

try:
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)
except Exception:
    DATABASE_URL = SQLITE_URL
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)

try:
    from sqlalchemy.ext.asyncio import async_sessionmaker
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
except ImportError:
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injector yielding an async database session."""
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    """Initializes tables on startup with resilient fallback."""
    global engine, AsyncSessionLocal, DATABASE_URL
    from models import Base
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        # Fallback to SQLite if Postgres connection fails
        if DATABASE_URL != SQLITE_URL:
            DATABASE_URL = SQLITE_URL
            engine = create_async_engine(DATABASE_URL, echo=False, future=True)
            AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
