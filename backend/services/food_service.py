"""
services/food_service.py
"""

from datetime import date, timedelta
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from models.models import FoodLog
from schemas.schemas import FoodLogCreate, DailyNutritionSummary, WeeklyNutritionSummary
from services.user_service import get_user_or_404
from utils.food_database import compute_macros, available_food_names
from utils.logger import logger


def log_food(db: Session, user_id: int, payload: FoodLogCreate) -> FoodLog:
    get_user_or_404(db, user_id)
    macros = compute_macros(payload.food_name, payload.quantity_g)
    if macros is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": f"{payload.food_name} not found",
                "available_foods": available_food_names(),
            },
        )
    entry = FoodLog(
        user_id=user_id,
        date=payload.date,
        food_name=payload.food_name.lower().strip(),
        quantity_g=payload.quantity_g,
        **macros,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    logger.info(f"Food logged user={user_id} food={entry.food_name}")
    return entry


def get_food_logs(db: Session, user_id: int, log_date: date) -> List[FoodLog]:
    get_user_or_404(db, user_id)
    return (
        db.query(FoodLog)
        .filter(FoodLog.user_id == user_id, FoodLog.date == log_date)
        .all()
    )


def get_daily_nutrition_summary(
    db: Session, user_id: int, summary_date: date
) -> DailyNutritionSummary:
    user = get_user_or_404(db, user_id)
    row = (
        db.query(
            func.coalesce(func.sum(FoodLog.calories), 0.0).label("cal"),
            func.coalesce(func.sum(FoodLog.protein_g), 0.0).label("prot"),
            func.coalesce(func.sum(FoodLog.carbs_g), 0.0).label("carbs"),
            func.coalesce(func.sum(FoodLog.fat_g), 0.0).label("fat"),
            func.count(FoodLog.id).label("entries"),
        )
        .filter(FoodLog.user_id == user_id, FoodLog.date == summary_date)
        .one()
    )
    return DailyNutritionSummary(
        user_id=user_id,
        date=summary_date,
        total_calories=row.cal,
        total_protein_g=row.prot,
        total_carbs_g=row.carbs,
        total_fat_g=row.fat,
        calorie_goal=user.calorie_goal,
        protein_goal=user.protein_goal,
        calorie_remaining=(user.calorie_goal - row.cal) if user.calorie_goal else None,
        protein_remaining=(user.protein_goal - row.prot) if user.protein_goal else None,
        food_entries=row.entries,
    )


def get_weekly_nutrition_summary(
    db: Session, user_id: int, week_start: date
) -> WeeklyNutritionSummary:
    """
    Returns calorie + protein totals for the 7-day window starting on week_start (Monday),
    plus the previous week's totals for trend comparison (↑↓).
    """
    user = get_user_or_404(db, user_id)

    week_end      = week_start + timedelta(days=6)
    prev_start    = week_start - timedelta(days=7)
    prev_end      = week_start - timedelta(days=1)

    def _query_range(start: date, end: date):
        return (
            db.query(
                func.coalesce(func.sum(FoodLog.calories),  0.0).label("cal"),
                func.coalesce(func.sum(FoodLog.protein_g), 0.0).label("prot"),
                func.count(FoodLog.id).label("entries"),
            )
            .filter(
                FoodLog.user_id == user_id,
                FoodLog.date >= start,
                FoodLog.date <= end,
            )
            .one()
        )

    # ── Per-day breakdown (Mon–Sun) ──────────────────────────────
    days = []
    for i in range(7):
        d = week_start + timedelta(days=i)
        row = (
            db.query(
                func.coalesce(func.sum(FoodLog.calories),  0.0).label("cal"),
                func.coalesce(func.sum(FoodLog.protein_g), 0.0).label("prot"),
            )
            .filter(FoodLog.user_id == user_id, FoodLog.date == d)
            .one()
        )
        days.append({
            "date":     d.isoformat(),
            "label":    d.strftime("%a"),          # Mon, Tue …
            "calories": round(row.cal,  1),
            "protein":  round(row.prot, 1),
        })

    this_week = _query_range(week_start, week_end)
    prev_week = _query_range(prev_start, prev_end)

    # Trend: positive = up, negative = down, None = no previous data
    def _trend(this, prev):
        if prev == 0:
            return None
        return round(this - prev, 1)

    return WeeklyNutritionSummary(
        user_id=user_id,
        week_start=week_start,
        week_end=week_end,
        # This week totals
        total_calories=round(this_week.cal,  1),
        total_protein_g=round(this_week.prot, 1),
        # Previous week totals (for ↑↓ badge)
        prev_calories=round(prev_week.cal,  1),
        prev_protein_g=round(prev_week.prot, 1),
        # Deltas
        calorie_trend=_trend(this_week.cal,  prev_week.cal),
        protein_trend=_trend(this_week.prot, prev_week.prot),
        # Goals
        calorie_goal=user.calorie_goal,
        protein_goal=user.protein_goal,
        # Per-day breakdown
        days=days,
    )


def delete_food_log(db: Session, user_id: int, log_id: int):
    entry = (
        db.query(FoodLog)
        .filter(FoodLog.id == log_id, FoodLog.user_id == user_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Food log not found")
    db.delete(entry)
    db.commit()
    logger.info(f"Deleted food log {log_id}")
    return {"message": "Deleted successfully"}