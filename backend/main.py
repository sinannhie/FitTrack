"""
main.py
───────
FitTrack AI — FastAPI application entry point.
"""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ✅ FIXED IMPORTS (relative)
from database import engine, Base
from utils.logger import logger

# Import models so SQLAlchemy registers them
from models import models  # noqa: F401

# Routers
from routers import users, weight, food, workouts, analytics


# ── Lifespan ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FitTrack AI …")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified / created.")
    yield
    logger.info("FitTrack AI shutting down.")


# ── App ──────────────────────────────────────────────────────────
app = FastAPI(
    title="FitTrack AI",
    description=(
        "Production-ready fitness tracking API.\n\n"
        "Track weight, nutrition, workouts, and analytics."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Middleware ───────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)

    logger.info(
        f"{request.method:7s} {request.url.path} "
        f"→ {response.status_code} ({duration_ms} ms)"
    )

    return response


# ── Exception Handler ─────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled error on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ── Routers ──────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(users.router, prefix=API_PREFIX)
app.include_router(weight.router, prefix=API_PREFIX)
app.include_router(food.router, prefix=API_PREFIX)
app.include_router(workouts.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)


# ── Health ───────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok"}


# ── Root ─────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "Welcome to FitTrack AI 💪",
        "docs": "/docs",
        "health": "/health",
    }
