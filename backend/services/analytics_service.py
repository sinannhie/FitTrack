"""
services/analytics_service.py
"""

from collections import defaultdict
from datetime import date, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, asc

# ✅ FIXED IMPORTS
from models.models import WeightEntry, FoodLog, Workout
from schemas.schemas import (
    WeightChartPoint,
    WeightTrendResponse,
    CorrelationPoint,
    CalorieWeightCorrelationResponse,
    WeeklySummary,
    WeeklySummaryResponse,
)
from services.user_service import get_user_or_404
from utils.logger import logger


def get_weight_trend(db: Session, user_id: int, period_days: int = 30) -> WeightTrendResponse:
    get_user_or_404(db, user_id)
    cutoff = date.today() - timedelta(days=period_days)

    entries = (
        db.query(WeightEntry)
        .filter(WeightEntry.user_id == user_id, WeightEntry.date >= cutoff)
        .order_by(asc(WeightEntry.date))
        .all()
    )

    data_points = [WeightChartPoint(date=e.date, weight_kg=e.weight_kg) for e in entries]

    if len(entries) < 2:
        return WeightTrendResponse(
            user_id=user_id,
            period_days=period_days,
            start_weight_kg=entries[0].weight_kg if entries else None,
            end_weight_kg=entries[-1].weight_kg if entries else None,
            change_kg=None,
            trend="insufficient_data",
            data_points=data_points,
        )

    start_w = entries[0].weight_kg
    end_w = entries[-1].weight_kg
    change = round(end_w - start_w, 2)

    if abs(change) <= 0.5:
        trend = "stable"
    elif change < 0:
        trend = "losing"
    else:
        trend = "gaining"

    logger.info(f"Weight trend user={user_id} trend={trend} change={change}kg")

    return WeightTrendResponse(
        user_id=user_id,
        period_days=period_days,
        start_weight_kg=round(start_w, 2),
        end_weight_kg=round(end_w, 2),
        change_kg=change,
        trend=trend,
        data_points=data_points,
    )


def get_calorie_weight_correlation(
    db: Session, user_id: int, period_days: int = 30
) -> CalorieWeightCorrelationResponse:

    get_user_or_404(db, user_id)
    cutoff = date.today() - timedelta(days=period_days)

    cal_rows = (
        db.query(FoodLog.date, func.sum(FoodLog.calories).label("cal"))
        .filter(FoodLog.user_id == user_id, FoodLog.date >= cutoff)
        .group_by(FoodLog.date)
        .all()
    )
    cal_map: Dict[date, float] = {r.date: r.cal for r in cal_rows}

    w_rows = (
        db.query(WeightEntry.date, WeightEntry.weight_kg)
        .filter(WeightEntry.user_id == user_id, WeightEntry.date >= cutoff)
        .all()
    )
    w_map: Dict[date, float] = {r.date: r.weight_kg for r in w_rows}

    all_dates = sorted(set(cal_map) | set(w_map))

    data = [
        CorrelationPoint(
            date=d,
            total_calories=round(cal_map.get(d, 0.0), 2),
            weight_kg=w_map.get(d),
        )
        for d in all_dates
    ]

    return CalorieWeightCorrelationResponse(user_id=user_id, data=data)


def get_weekly_summary(db: Session, user_id: int, num_weeks: int = 4) -> WeeklySummaryResponse:

    get_user_or_404(db, user_id)

    today = date.today()
    current_week_monday = today - timedelta(days=today.weekday())

    weeks: List[WeeklySummary] = []

    for i in range(1, num_weeks + 1):
        w_start = current_week_monday - timedelta(weeks=i)
        w_end = w_start + timedelta(days=6)

        food_agg = (
            db.query(
                FoodLog.date,
                func.sum(FoodLog.calories).label("cal"),
                func.sum(FoodLog.protein_g).label("prot"),
            )
            .filter(FoodLog.user_id == user_id, FoodLog.date.between(w_start, w_end))
            .group_by(FoodLog.date)
            .all()
        )

        days_food = len(food_agg)
        avg_cal = round(sum(r.cal for r in food_agg) / days_food, 2) if days_food else 0
        avg_prot = round(sum(r.prot for r in food_agg) / days_food, 2) if days_food else 0

        w_entries = (
            db.query(WeightEntry.date, WeightEntry.weight_kg)
            .filter(WeightEntry.user_id == user_id, WeightEntry.date.between(w_start, w_end))
            .order_by(asc(WeightEntry.date))
            .all()
        )

        days_weight = len(w_entries)
        avg_weight = (
            round(sum(r.weight_kg for r in w_entries) / days_weight, 2)
            if days_weight else None
        )

        weight_delta = (
            round(w_entries[-1].weight_kg - w_entries[0].weight_kg, 2)
            if days_weight >= 2 else None
        )

        workout_days = (
            db.query(func.count(func.distinct(Workout.date)))
            .filter(Workout.user_id == user_id, Workout.date.between(w_start, w_end))
            .scalar() or 0
        )

        weeks.append(
            WeeklySummary(
                week_start=w_start,
                week_end=w_end,
                avg_daily_calories=avg_cal,
                avg_daily_protein_g=avg_prot,
                total_workout_days=workout_days,
                avg_weight_kg=avg_weight,
                weight_change_kg=weight_delta,
                days_logged_food=days_food,
                days_logged_weight=days_weight,
            )
        )

    weeks.sort(key=lambda w: w.week_start)

    return WeeklySummaryResponse(user_id=user_id, weeks=weeks)
