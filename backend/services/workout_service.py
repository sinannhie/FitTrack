"""
services/workout_service.py
───────────────────────────
Business logic for exercise logging (legacy flat model) and
new session-based workout tracking.
"""

from collections import defaultdict
from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import asc
from fastapi import HTTPException, status

from models.models import Workout, WorkoutSession, SessionExercise, ExerciseSet
from schemas.schemas import (
    WorkoutCreate, WorkoutResponse, WorkoutSessionSummary,
    WorkoutSessionCreate, WorkoutSessionResponse,
)
from services.user_service import get_user_or_404
from utils.logger import logger


# ══════════════════════════════════════════════════════════════════════════════
# LEGACY FLAT WORKOUT (kept for backward compat)
# ══════════════════════════════════════════════════════════════════════════════

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


# ══════════════════════════════════════════════════════════════════════════════
# NEW SESSION-BASED WORKOUT TRACKING
# ══════════════════════════════════════════════════════════════════════════════

def _load_session(db: Session, session_id: int) -> WorkoutSession:
    """Eagerly load a session with all exercises and sets."""
    return (
        db.query(WorkoutSession)
        .filter(WorkoutSession.id == session_id)
        .options(
            joinedload(WorkoutSession.exercises).joinedload(SessionExercise.sets)
        )
        .first()
    )


def create_session(
    db: Session, user_id: int, payload: WorkoutSessionCreate
) -> WorkoutSession:
    """
    Create a new workout session with nested exercises and sets.
    Supports Rest Day (exercises=[]).
    """
    get_user_or_404(db, user_id)

    session = WorkoutSession(
        user_id=user_id,
        date=payload.date,
        workout_type=payload.workout_type.strip(),
    )
    db.add(session)
    db.flush()  # get session.id without committing

    for order_idx, ex_data in enumerate(payload.exercises):
        exercise = SessionExercise(
            session_id=session.id,
            name=ex_data.name.strip(),
            order=order_idx,
        )
        db.add(exercise)
        db.flush()  # get exercise.id

        for set_data in ex_data.sets:
            exercise_set = ExerciseSet(
                exercise_id=exercise.id,
                reps=set_data.reps,
                weight_kg=set_data.weight_kg,
            )
            db.add(exercise_set)

    db.commit()

    # Re-query with eager loading so response serialisation works correctly
    result = _load_session(db, session.id)

    logger.info(
        f"Session created user={user_id} type={payload.workout_type} "
        f"exercises={len(payload.exercises)}"
    )
    return result


def get_sessions(db: Session, user_id: int) -> List[WorkoutSession]:
    """Return all sessions for a user, newest first, with exercises + sets loaded."""
    get_user_or_404(db, user_id)

    return (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == user_id)
        .options(
            joinedload(WorkoutSession.exercises).joinedload(SessionExercise.sets)
        )
        .order_by(WorkoutSession.date.desc(), WorkoutSession.created_at.desc())
        .all()
    )


def delete_session(db: Session, user_id: int, session_id: int):
    """Delete a workout session (cascades to exercises and sets)."""
    session = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == user_id,
        )
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    db.delete(session)
    db.commit()
    logger.info(f"Deleted session id={session_id} user={user_id}")
    return {"detail": f"Session {session_id} deleted"}