"""
routes/food.py
──────────────
Handles food logging with correct quantity logic.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.models import FoodLog
from schemas.schemas import FoodLogCreate
from utils.food_database import compute_macros

router = APIRouter()


# 🔥 ADD FOOD LOG
@router.post("/log-food")
def log_food(data: FoodLogCreate, db: Session = Depends(get_db)):

    # ─────────────────────────────────────────
    # ✅ CUSTOM FOOD (manual macros)
    # ─────────────────────────────────────────
    if data.is_custom:
        log = FoodLog(
            user_id=data.user_id,
            date=data.date,
            food_name=data.food_name,
            quantity_g=data.quantity_g,

            is_custom=True,
            calories=data.calories or 0,
            protein=data.protein or 0,
            carbs=data.carbs or 0,
            fat=data.fat or 0,
        )

    # ─────────────────────────────────────────
    # ✅ NORMAL FOOD (smart calculation)
    # ─────────────────────────────────────────
    else:
        macros = compute_macros(data.food_name, data.quantity_g)

        if macros is None:
            raise HTTPException(status_code=404, detail="Food not found")

        log = FoodLog(
            user_id=data.user_id,
            date=data.date,
            food_name=data.food_name,
            quantity_g=data.quantity_g,

            calories=macros["calories"],
            protein=macros["protein_g"],
            carbs=macros["carbs_g"],
            fat=macros["fat_g"],
        )

    db.add(log)
    db.commit()
    db.refresh(log)

    return log