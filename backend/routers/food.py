"""
routers/food.py
───────────────
Endpoints for food logging, nutrition summaries, and food-DB exploration.
"""

from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.schemas import (
    FoodDBItem, FoodLogCreate, FoodLogResponse,
    DailyNutritionSummary, WeeklyNutritionSummary,
)
from services import food_service
from utils.food_database import list_all_foods

router = APIRouter(tags=["Food & Nutrition"])


# ── Food database ────────────────────────────────────────────────

@router.get(
    "/foods",
    response_model=List[FoodDBItem],
    summary="Browse available foods (macros per 100 g)",
)
def list_foods():
    return list_all_foods()


# ── Food logging ─────────────────────────────────────────────────

@router.post(
    "/users/{user_id}/food",
    response_model=FoodLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def log_food(user_id: int, payload: FoodLogCreate, db: Session = Depends(get_db)):
    # ✅ FIX 7: Wrapped in try/except — previously any DB error returned 500 with no detail
    try:
        return food_service.log_food(db, user_id, payload)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save food entry: {str(e)}",
        )


@router.get(
    "/users/{user_id}/food",
    response_model=List[FoodLogResponse],
)
def get_food_logs(user_id: int, log_date: date, db: Session = Depends(get_db)):
    return food_service.get_food_logs(db, user_id, log_date)


@router.get(
    "/users/{user_id}/nutrition/summary",
    response_model=DailyNutritionSummary,
)
def daily_nutrition_summary(
    user_id: int, summary_date: date, db: Session = Depends(get_db)
):
    return food_service.get_daily_nutrition_summary(db, user_id, summary_date)


# ── Weekly nutrition summary ─────────────────────────────────────

@router.get(
    "/users/{user_id}/nutrition/weekly",
    response_model=WeeklyNutritionSummary,
    summary="Weekly calorie + protein summary with per-day breakdown and trend vs last week",
)
def weekly_nutrition_summary(
    user_id: int,
    week_start: date,
    db: Session = Depends(get_db),
):
    return food_service.get_weekly_nutrition_summary(db, user_id, week_start)


# ── Delete food log ──────────────────────────────────────────────

@router.delete(
    "/users/{user_id}/food/{log_id}",
    # ✅ FIX 8: Added explicit 200 status + message — previously returned nothing,
    # making it impossible for frontend to confirm success
    status_code=status.HTTP_200_OK,
)
def delete_food_log(user_id: int, log_id: int, db: Session = Depends(get_db)):
    # ✅ FIX 9: Wrapped in try/except with 404 guard
    try:
        return food_service.delete_food_log(db, user_id, log_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete food entry: {str(e)}",
        )