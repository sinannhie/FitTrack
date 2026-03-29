"""
routers/analytics.py
────────────────────
Analytics endpoints — weight trend, calorie/weight correlation, weekly summaries.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

# ✅ FIXED IMPORTS (relative)
from ..database import get_db
from ..schemas.schemas import (
    WeightTrendResponse,
    CalorieWeightCorrelationResponse,
    WeeklySummaryResponse,
)
from ..services import analytics_service

router = APIRouter(prefix="/users/{user_id}/analytics", tags=["Analytics"])


@router.get(
    "/weight-trend",
    response_model=WeightTrendResponse,
    summary="Weight movement trend over a rolling window",
)
def weight_trend(
    user_id: int,
    period_days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    return analytics_service.get_weight_trend(db, user_id, period_days)


@router.get(
    "/calorie-weight-correlation",
    response_model=CalorieWeightCorrelationResponse,
    summary="Daily (calories, weight) pairs for scatter charts",
)
def calorie_weight_correlation(
    user_id: int,
    period_days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    return analytics_service.get_calorie_weight_correlation(db, user_id, period_days)


@router.get(
    "/weekly-summary",
    response_model=WeeklySummaryResponse,
    summary="ISO-week rollups",
)
def weekly_summary(
    user_id: int,
    num_weeks: int = Query(default=4, ge=1, le=52),
    db: Session = Depends(get_db),
):
    return analytics_service.get_weekly_summary(db, user_id, num_weeks)