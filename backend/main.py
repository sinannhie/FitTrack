"""
main.py
───────
FitTrack AI — FastAPI application entry point.

Responsibilities:
  • Create / migrate DB tables on startup (via SQLAlchemy metadata)
  • Mount all routers under /api/v1
  • Configure CORS (tighten origins before going to production)
  • Attach a global exception handler for unhandled errors
  • Expose /health for load-balancer probes
"""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.database import engine, Base
from backend.utils.logger import logger

# ── Import all models so SQLAlchemy knows about them before create_all ─────────
from backend.models import models  # noqa: F401

from backend.routers import users, weight, food, workouts, analytics


# ── Lifespan (replaces deprecated @app.on_event) ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs once at startup and once at shutdown."""
    logger.info("Starting FitTrack AI …")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified / created.")
    yield
    logger.info("FitTrack AI shutting down.")


# ── App factory ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FitTrack AI",
    description=(
        "Production-ready fitness tracking API.\n\n"
        "Track weight, nutrition, workouts, and get analytics — "
        "all in one place."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── CORS ───────────────────────────────────────────────────────────────────────
# For production: replace ["*"] with your actual front-end origin(s), e.g.
#   allow_origins=["https://fittrack.app", "https://app.fittrack.app"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request timing middleware ──────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every request with method, path, status code, and duration."""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    logger.info(
        f"{request.method:7s}  {request.url.path}  "
        f"→ {response.status_code}  ({duration_ms} ms)"
    )
    return response


# ── Global exception handler ───────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


# ── Routers ────────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(users.router,     prefix=API_PREFIX)
app.include_router(weight.router,    prefix=API_PREFIX)
app.include_router(food.router,      prefix=API_PREFIX)
app.include_router(workouts.router,  prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Liveness probe")
def health_check():
    """Returns 200 OK when the service is running. Used by load balancers."""
    return {"status": "ok", "service": "FitTrack AI"}


# ── Root ───────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"], summary="API root")
def root():
    return {
        "message": "Welcome to FitTrack AI 💪",
        "docs":    "/docs",
        "redoc":   "/redoc",
        "health":  "/health",
        "api":     API_PREFIX,
    }
