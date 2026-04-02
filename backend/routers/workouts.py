"""
routers/workouts.py
───────────────────
Endpoints for exercise logging.
  • Legacy flat-model routes  : /users/{id}/workouts/
  • New session-based routes  : /users/{id}/sessions/
"""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.schemas import (
    WorkoutCreate, WorkoutResponse, WorkoutSessionSummary,
    WorkoutSessionCreate, WorkoutSessionResponse,
)
from services import workout_service

# ── Legacy router ──────────────────────────────────────────────────────────────
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


# ── New session-based router ───────────────────────────────────────────────────
sessions_router = APIRouter(prefix="/users/{user_id}/sessions", tags=["Workout Sessions"])


@sessions_router.post(
    "/",
    response_model=WorkoutSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a workout session (supports multiple exercises + sets, Rest Day, custom types)",
)
def create_session(
    user_id: int,
    payload: WorkoutSessionCreate,
    db: Session = Depends(get_db),
):
    return workout_service.create_session(db, user_id, payload)


@sessions_router.get(
    "/",
    response_model=List[WorkoutSessionResponse],
    summary="Get all workout sessions for a user (newest first)",
)
def get_sessions(user_id: int, db: Session = Depends(get_db)):
    return workout_service.get_sessions(db, user_id)


@sessions_router.delete(
    "/{session_id}",
    summary="Delete a workout session (cascades to exercises and sets)",
)
def delete_session(user_id: int, session_id: int, db: Session = Depends(get_db)):
    return workout_service.delete_session(db, user_id, session_id)