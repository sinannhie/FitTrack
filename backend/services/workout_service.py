"""
services/workout_service.py
Groups sessions by (date, workout_type) so one card per type per day.
Fully backward compatible — old rows with NULL workout_type are grouped as 'custom'.
"""

from collections import defaultdict
from datetime import date
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import asc
from fastapi import HTTPException, status

from models.models import Workout
from schemas.schemas import WorkoutCreate, WorkoutResponse, WorkoutSessionSummary
from services.user_service import get_user_or_404
from utils.logger import logger


def log_workout(db: Session, user_id: int, payload: WorkoutCreate) -> Workout:
    get_user_or_404(db, user_id)

    workout = Workout(
        user_id=user_id,
        date=payload.date,
        exercise_name=payload.exercise_name,
        sets=payload.sets or 0,
        reps=payload.reps or 0,
        weight_kg=payload.weight_kg,
        notes=payload.notes,
        steps=payload.steps or 0,
        workout_type=payload.workout_type or "custom",
        muscle_group=payload.muscle_group,
    )

    db.add(workout)
    db.commit()
    db.refresh(workout)

    logger.info(
        f"Workout logged user={user_id} ex={payload.exercise_name} "
        f"type={payload.workout_type} steps={payload.steps}"
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

    # Group by (date, workout_type) — old NULL rows → 'custom'
    by_key: dict[Tuple[date, str], List[Workout]] = defaultdict(list)
    for w in rows:
        wtype = (w.workout_type or "custom").lower().strip()
        by_key[(w.date, wtype)].append(w)

    sessions = []
    for (session_date, wtype) in sorted(by_key.keys()):
        exercises = by_key[(session_date, wtype)]

        total_sets   = sum(e.sets or 0 for e in exercises)
        total_volume = sum(
            (e.sets or 0) * (e.reps or 0) * (e.weight_kg or 0.0)
            for e in exercises
        )
        total_steps = sum(e.steps or 0 for e in exercises)

        sessions.append(
            WorkoutSessionSummary(
                date=session_date,
                workout_type=wtype,
                exercises=[WorkoutResponse.model_validate(e) for e in exercises],
                total_sets=total_sets,
                total_volume_kg=round(total_volume, 2),
                total_steps=total_steps,
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