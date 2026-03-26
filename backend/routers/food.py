"""
routers/food.py
───────────────
Endpoints for food logging, nutrition summaries, and food-DB exploration.
"""

from datetime import date
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.schemas import (
    FoodDBItem, FoodLogCreate, FoodLogResponse, DailyNutritionSummary,
)
from backend.services import food_service
from backend.utils.food_database import list_all_foods

router = APIRouter(tags=["Food & Nutrition"])


# ── Food database (no auth required) ──────────────────────────────────────────

@router.get(
    "/foods",
    response_model=List[FoodDBItem],
    summary="Browse available foods (macros per 100 g)",
)
def list_foods():
    """
    Returns every food in the built-in database.
    Use `food_name` values from this response when calling the log endpoint.
    """
    return list_all_foods()


# ── Per-user food logging ──────────────────────────────────────────────────────

@router.post(
    "/users/{user_id}/food",
    response_model=FoodLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a food entry (macros auto-calculated)",
)
def log_food(user_id: int, payload: FoodLogCreate, db: Session = Depends(get_db)):
    """
    Macros are computed automatically from the food database.

    ```json
    { "date": "2024-06-15", "food_name": "chicken", "quantity_g": 200 }
    ```
    → stores calories=330, protein_g=62, carbs_g=0, fat_g=7.2
    """
    return food_service.log_food(db, user_id, payload)


@router.get(
    "/users/{user_id}/food",
    response_model=List[FoodLogResponse],
    summary="Get food entries for a specific date",
)
def get_food_logs(
    user_id: int, log_date: date, db: Session = Depends(get_db)
):
    """Example: `GET /users/1/food?log_date=2024-06-15`"""
    return food_service.get_food_logs(db, user_id, log_date)


@router.get(
    "/users/{user_id}/nutrition/summary",
    response_model=DailyNutritionSummary,
    summary="Daily nutrition totals + goal tracking",
)
def daily_nutrition_summary(
    user_id: int, summary_date: date, db: Session = Depends(get_db)
):
    """
    Aggregates all food logs for the given date.
    Also returns how many calories / grams of protein remain vs the user's goals.

    Example: `GET /users/1/nutrition/summary?summary_date=2024-06-15`
    """
    return food_service.get_daily_nutrition_summary(db, user_id, summary_date)


@router.delete(
    "/users/{user_id}/food/{log_id}",
    summary="Delete a food log entry",
)
def delete_food_log(user_id: int, log_id: int, db: Session = Depends(get_db)):
    return food_service.delete_food_log(db, user_id, log_id)
