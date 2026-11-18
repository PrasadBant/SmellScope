"""FastAPI application for SmellScope 2.0 Scientific Dataset Trust Audit Workstation."""

from __future__ import annotations

import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from smellscope.core.errors import SmellScopeError
from smellscope.server.routers import audits, benchmarks, datasets, health, improvement, remediation, reports

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
app.include_router(benchmarks.router, prefix="/api/v1")
app.include_router(improvement.router, prefix="/api/v1")

# Mount static assets directory if available
frontend_dist = Path("./frontend/dist")
assets_dir = frontend_dist / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.get("/")
def index():
    """Serve SPA index or API greeting."""
    if frontend_dist.exists() and (frontend_dist / "index.html").exists():
        return FileResponse(frontend_dist / "index.html")
    return {
        "name": "SmellScope 2.0 API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
        "status": "API active. Build frontend with 'npm run build' for production UI.",
    }


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    """HTML5 History fallback: serve static files or index.html for client-side routing."""
    # Prevent catching unmatched API or doc routes
    if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        raise HTTPException(status_code=404, detail="Not Found")

    target_file = frontend_dist / full_path
    if full_path and target_file.is_file():
        return FileResponse(target_file)

    if frontend_dist.exists() and (frontend_dist / "index.html").exists():
        return FileResponse(frontend_dist / "index.html")

    raise HTTPException(status_code=404, detail="Resource Not Found")
