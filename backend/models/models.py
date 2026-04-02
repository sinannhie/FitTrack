"""
models/models.py
────────────────
SQLAlchemy ORM table definitions.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, Date, DateTime,
    ForeignKey, Text, Boolean, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    age           = Column(Integer)
    height        = Column(Float)
    weight        = Column(Float)
    goal          = Column(String, nullable=False)
    target_weight = Column(Float,   nullable=True)
    calorie_goal  = Column(Integer, nullable=True)
    protein_goal  = Column(Integer, nullable=True)   # ← ADDED
    created_at    = Column(DateTime, default=datetime.utcnow)

    weight_entries   = relationship("WeightEntry",    back_populates="user", cascade="all, delete-orphan")
    food_logs        = relationship("FoodLog",        back_populates="user", cascade="all, delete-orphan")
    workouts         = relationship("Workout",        back_populates="user", cascade="all, delete-orphan")
    workout_sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")


class FoodLog(Base):
    __tablename__ = "food_logs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date       = Column(Date,    nullable=False, index=True)
    food_name  = Column(String(150), nullable=False)
    quantity_g = Column(Float,   nullable=False)
    calories   = Column(Float, nullable=False)
    protein_g  = Column(Float, nullable=False)
    carbs_g    = Column(Float, nullable=False)
    fat_g      = Column(Float, nullable=False)
    meal_type  = Column(String(20), nullable=True)    # ← ADDED
    is_custom  = Column(Boolean, nullable=True, default=False)  # ← ADDED
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="food_logs")


# ── Legacy flat workout model (kept for backward compat) ───────────────────────
class Workout(Base):
    __tablename__ = "workouts"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date          = Column(Date,    nullable=False, index=True)
    exercise_name = Column(String(150), nullable=False)
    sets          = Column(Integer, nullable=False)
    reps          = Column(Integer, nullable=False)
    weight_kg     = Column(Float,   nullable=True)
    notes         = Column(Text,    nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workouts")


class WeightEntry(Base):
    __tablename__ = "weight_entries"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    weight_kg  = Column(Float, nullable=False)
    date       = Column(Date, nullable=False)
    notes      = Column(Text, nullable=True)    # ← ADDED
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="weight_entries")


# ── New session-based workout models ──────────────────────────────────────────

class WorkoutSession(Base):
    """
    A training session on a given date with a named type (Push, Pull, Legs, etc.)
    Contains zero or more exercises (Rest Day → no exercises).
    """
    __tablename__ = "workout_sessions"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date         = Column(Date, nullable=False, index=True)
    workout_type = Column(String(100), nullable=False, default="Custom")
    created_at   = Column(DateTime, default=datetime.utcnow)

    user      = relationship("User", back_populates="workout_sessions")
    exercises = relationship(
        "SessionExercise",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SessionExercise.order",
    )


class SessionExercise(Base):
    """
    An exercise within a WorkoutSession (e.g. 'Bench Press').
    Contains one or more sets.
    """
    __tablename__ = "session_exercises"

    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    name       = Column(String(150), nullable=False)
    order      = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("WorkoutSession", back_populates="exercises")
    sets    = relationship(
        "ExerciseSet",
        back_populates="exercise",
        cascade="all, delete-orphan",
        order_by="ExerciseSet.id",
    )


class ExerciseSet(Base):
    """
    A single set within a SessionExercise (reps + optional weight).
    """
    __tablename__ = "exercise_sets"

    id          = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("session_exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    reps        = Column(Integer, nullable=False)
    weight_kg   = Column(Float, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    exercise = relationship("SessionExercise", back_populates="sets")