"""
routers/workouts.py
───────────────────
Endpoints for exercise logging and session history.
"""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.schemas import WorkoutCreate, WorkoutResponse, WorkoutSessionSummary
from backend.services import workout_service

router = APIRouter(prefix="/users/{user_id}/workouts", tags=["Workout Tracking"])


@router.post(
    "/",
    response_model=WorkoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log an exercise",
)
def log_workout(user_id: int, payload: WorkoutCreate, db: Session = Depends(get_db)):
    """
    Log one exercise block for a session.
    Call multiple times on the same date to build a full session.

    ```json
    {
      "date": "2024-06-15",
      "exercise_name": "Bench Press",
      "sets": 4,
      "reps": 8,
      "weight_kg": 80.0,
      "notes": "Felt strong"
    }
    ```
    """
    return workout_service.log_workout(db, user_id, payload)


@router.get(
    "/",
    response_model=List[WorkoutSessionSummary],
    summary="Workout history grouped by date",
)
def workout_history(
    user_id:    int,
    start_date: Optional[date] = None,
    end_date:   Optional[date] = None,
    db: Session = Depends(get_db),
):
    """
    Returns sessions in ascending date order.
    Each session includes all exercises logged that day plus aggregate volume.
    """
    return workout_service.get_workout_history(db, user_id, start_date, end_date)


@router.delete("/{workout_id}", summary="Delete a workout entry")
def delete_workout(user_id: int, workout_id: int, db: Session = Depends(get_db)):
    return workout_service.delete_workout(db, user_id, workout_id)
