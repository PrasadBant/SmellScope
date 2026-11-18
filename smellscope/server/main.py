"""FastAPI application for SmellScope 2.0 Scientific Dataset Trust Audit Workstation."""

from __future__ import annotations

import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from smellscope.core.errors import SmellScopeError
from smellscope.server.routers import audits, datasets, health, remediation, reports

app = FastAPI(
    title="SmellScope 2.0 API",
    version="1.0.0",
    description="HTTP Boundary and Engine Facade for the SmellScope Scientific Dataset Trust Auditor.",
)

# Local-first loopback CORS configuration
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SmellScopeError)
async def smellscope_error_handler(request: Request, exc: SmellScopeError):
    """Map SmellScope domain errors to contract-compliant JSON response."""
    status_code = 400
    if "BLOCK" in exc.code:
        status_code = 403
    elif "FILE" in exc.code:
        status_code = 404
    elif "INTERNAL" in exc.code:
        status_code = 500

    return JSONResponse(
        status_code=status_code,
        content=exc.to_dict(),
    )


# Mount versioned API routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(datasets.router, prefix="/api/v1")
app.include_router(audits.router, prefix="/api/v1")
app.include_router(remediation.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")

# Mount production static build if available
frontend_dist = Path("./frontend/dist")
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/")
    def index_fallback():
        return {
            "name": "SmellScope 2.0 API",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/api/v1/health",
            "status": "API active. For frontend UI, run 'npm run dev' inside 'frontend/' or build production assets with 'npm run build'.",
        }
