# AuraQuant // Q-CORE — Multi-Stage Production Dockerfile
# Stage 1: Builder  — compile wheels (C extensions for asyncpg, numpy, pandas)
# Stage 2: Runtime  — lean image, no compiler toolchain, non-root user

# ── Stage 1: Builder ────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Runtime-only C lib (asyncpg needs libpq at runtime, not at build time)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pre-built wheels — no compiler, no internet needed
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/*

# Copy application source
COPY server.py database.py models.py middleware.py market_service.py simulation_engine.py ./
COPY index.html app.js ./

# Non-root user for security hardening
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8765

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8765/api/records/summary')"

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8765", "--workers", "2"]
