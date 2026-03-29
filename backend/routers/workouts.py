"""
routers/workouts.py
───────────────────
Endpoints for exercise logging and session history.
"""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

# ✅ FIXED IMPORTS (relative)
from ..database import get_db
from ..schemas.schemas import WorkoutCreate, WorkoutResponse, WorkoutSessionSummary
from ..services import workout_service

router = APIRouter(prefix="/users/{user_id}/workouts", tags=["Workout Tracking"])


@router.post(
    "/",
    response_model=WorkoutResponse,
    status_code=status.HTTP_201_CREATED,
)
def log_workout(user_id: int, payload: WorkoutCreate, db: Session = Depends(get_db)):
    return workout_service.log_workout(db, user_id, payload)


@router.get(
    "/",
    response_model=List[WorkoutSessionSummary],
)
def workout_history(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    return workout_service.get_workout_history(db, user_id, start_date, end_date)


@router.delete("/{workout_id}")
def delete_workout(user_id: int, workout_id: int, db: Session = Depends(get_db)):
    return workout_service.delete_workout(db, user_id, workout_id)