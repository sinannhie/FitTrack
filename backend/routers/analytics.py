"""
routers/analytics.py
────────────────────
Analytics endpoints — weight trend, calorie/weight correlation, weekly summaries.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.schemas import (
    WeightTrendResponse,
    CalorieWeightCorrelationResponse,
    WeeklySummaryResponse,
)
from backend.services import analytics_service

router = APIRouter(prefix="/users/{user_id}/analytics", tags=["Analytics"])


@router.get(
    "/weight-trend",
    response_model=WeightTrendResponse,
    summary="Weight movement trend over a rolling window",
)
def weight_trend(
    user_id:     int,
    period_days: int = Query(default=30, ge=7, le=365,
                             description="Rolling window in days (7–365)"),
    db: Session = Depends(get_db),
):
    """
    Classifies weight movement as **losing / gaining / stable / insufficient_data**
    over the last `period_days` days.

    Also returns raw data points for rendering a trend line on a chart.

    Example: `GET /users/1/analytics/weight-trend?period_days=30`
    """
    return analytics_service.get_weight_trend(db, user_id, period_days)


@router.get(
    "/calorie-weight-correlation",
    response_model=CalorieWeightCorrelationResponse,
    summary="Daily (calories, weight) pairs for scatter charts",
)
def calorie_weight_correlation(
    user_id:     int,
    period_days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    """
    Returns one data point per day that has at least a food log **or** weight entry.
    Designed to be plotted as a scatter chart to surface calorie/weight patterns.

    Example: `GET /users/1/analytics/calorie-weight-correlation?period_days=60`
    """
    return analytics_service.get_calorie_weight_correlation(db, user_id, period_days)


@router.get(
    "/weekly-summary",
    response_model=WeeklySummaryResponse,
    summary="ISO-week rollups for the last N complete weeks",
)
def weekly_summary(
    user_id:   int,
    num_weeks: int = Query(default=4, ge=1, le=52,
                           description="Number of past complete weeks to return"),
    db: Session = Depends(get_db),
):
    """
    Returns one summary object per completed ISO week (Monday–Sunday),
    ordered oldest → newest.

    Each week includes:
    - Average daily calories & protein
    - Number of workout days
    - Average body weight + week-over-week change
    - Days with food / weight logs

    Example: `GET /users/1/analytics/weekly-summary?num_weeks=8`
    """
    return analytics_service.get_weekly_summary(db, user_id, num_weeks)
