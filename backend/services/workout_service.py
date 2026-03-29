"""
services/workout_service.py
───────────────────────────
Business logic for exercise logging and session history.
"""

from collections import defaultdict
from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import asc
from fastapi import HTTPException, status

# ✅ FIXED IMPORTS (relative)
from ..models.models import Workout
from ..schemas.schemas import WorkoutCreate, WorkoutResponse, WorkoutSessionSummary
from ..services.user_service import get_user_or_404
from ..utils.logger import logger


def log_workout(db: Session, user_id: int, payload: WorkoutCreate) -> Workout:

    get_user_or_404(db, user_id)

    workout = Workout(user_id=user_id, **payload.model_dump())

    db.add(workout)
    db.commit()
    db.refresh(workout)

    logger.info(
        f"Workout logged user={user_id} ex={payload.exercise_name} "
        f"sets={payload.sets} reps={payload.reps} weight={payload.weight_kg}kg"
    )

    return workout


def get_workout_history(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[WorkoutSessionSummary]:

    get_user_or_404(db, user_id)

    query = (
        db.query(Workout)
        .filter(Workout.user_id == user_id)
        .order_by(asc(Workout.date), asc(Workout.id))
    )

    if start_date:
        query = query.filter(Workout.date >= start_date)

    if end_date:
        query = query.filter(Workout.date <= end_date)

    rows = query.all()

    by_date: dict[date, List[Workout]] = defaultdict(list)

    for w in rows:
        by_date[w.date].append(w)

    sessions = []

    for session_date in sorted(by_date):
        exercises = by_date[session_date]

        total_sets = sum(e.sets for e in exercises)
        total_volume = sum(e.sets * e.reps * (e.weight_kg or 0.0) for e in exercises)

        sessions.append(
            WorkoutSessionSummary(
                date=session_date,
                exercises=[WorkoutResponse.model_validate(e) for e in exercises],
                total_sets=total_sets,
                total_volume_kg=round(total_volume, 2),
            )
        )

    return sessions


def delete_workout(db: Session, user_id: int, workout_id: int):

    workout = (
        db.query(Workout)
        .filter(Workout.id == workout_id, Workout.user_id == user_id)
        .first()
    )

    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout entry not found",
        )

    db.delete(workout)
    db.commit()

    logger.info(f"Deleted workout id={workout_id} user={user_id}")

    return {"detail": f"Workout {workout_id} deleted"}