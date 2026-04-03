"""
main.py — FitTrack AI FastAPI application entry point.
"""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from database import Base, engine, SessionLocal

Base.metadata.create_all(bind=engine)
from utils.logger import logger

from models import models  # noqa: F401
from routers import users, weight, food, workouts, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FitTrack AI …")
    Base.metadata.create_all(bind=engine)

    # Safe migrations — idempotent, each wrapped in try/except
    migrations = [
        "ALTER TABLE food_logs ADD COLUMN meal_type VARCHAR(20)",
        "ALTER TABLE workouts ADD COLUMN steps INTEGER DEFAULT 0",
        "ALTER TABLE workouts ADD COLUMN workout_type VARCHAR(50)",
        "ALTER TABLE workouts ADD COLUMN muscle_group VARCHAR(100)",
    ]
    for sql in migrations:
        try:
            with engine.connect() as conn:
                conn.execute(text(sql))
                conn.commit()
            logger.info(f"Migration OK: {sql[:55]}")
        except Exception:
            pass  # column already exists

    logger.info("DB ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="FitTrack AI",
    description="Production-ready fitness tracking API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://fit-track-ten-opal.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = round((time.perf_counter() - start) * 1000, 1)
    logger.info(f"{request.method:7s} {request.url.path} → {response.status_code} ({ms} ms)")
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled: {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


API_PREFIX = "/api/v1"
app.include_router(users.router,     prefix=API_PREFIX)
app.include_router(weight.router,    prefix=API_PREFIX)
app.include_router(food.router,      prefix=API_PREFIX)
app.include_router(workouts.router,  prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "FitTrack AI 💪", "docs": "/docs"}