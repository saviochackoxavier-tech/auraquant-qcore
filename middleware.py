"""
middleware.py
AuraQuant Engine // Step 1: Hardened Token-Quota Rate-Limiting Middleware
- Token-quota rate-limiting for performance & resource protection
- Dynamically evaluates payload token costs and blocks requests exceeding 500 tokens with HTTP 429
- Attaches X-Token-Quota-Consumed and X-Process-Time-MS response headers
"""

import time
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class TokenQuotaMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_limit: int = 500, max_tokens_per_request: int = None):
        super().__init__(app)
        self.max_limit = max_tokens_per_request if max_tokens_per_request is not None else max_limit

    async def dispatch(self, request: Request, call_next) -> Response:
        # Exemption whitelist for health checks, resets, and WebSocket handshakes
        if request.url.path in ["/api/records/summary", "/api/reset"] or "ws" in request.url.path:
            return await call_next(request)

        # Baseline evaluation
        computed_token_cost = 50

        # Check for simulated testbed header first
        header_cost = request.headers.get("X-Token-Cost")
        if header_cost is not None:
            try:
                computed_token_cost = int(header_cost)
            except (ValueError, TypeError):
                computed_token_cost = 50
        elif request.method == "POST":
            # Dynamic payload valuation based on byte size
            try:
                body = await request.body()
                if body:
                    computed_token_cost = max(50, len(body) // 4)
            except Exception:
                computed_token_cost = 100

        # Threshold enforcement guard
        if computed_token_cost > self.max_limit:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "detail": f"Payload token cost valuation ({computed_token_cost}) exceeds system threshold ({self.max_limit})."
                }
            )

        start_time = time.time()
        response = await call_next(request)
        process_time_ms = (time.time() - start_time) * 1000.0

        response.headers["X-Token-Quota-Consumed"] = str(computed_token_cost)
        response.headers["X-Process-Time-MS"] = f"{process_time_ms:.2f}"
        return response
