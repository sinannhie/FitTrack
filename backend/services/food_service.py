"""
services/food_service.py
"""

from datetime import date
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

# ✅ FIXED IMPORTS
from ..models.models import FoodLog
from ..schemas.schemas import FoodLogCreate, DailyNutritionSummary
from ..services.user_service import get_user_or_404
from ..utils.food_database import compute_macros, available_food_names
from ..utils.logger import logger


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