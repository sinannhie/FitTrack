"""
models/models.py
────────────────
SQLAlchemy ORM table definitions.
All four tables map 1-to-1 with DB tables; relationships handle cascades.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, Date, DateTime,
    ForeignKey, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from backend.database import Base


class User(Base):
    """
    Core identity record. One user → many weight, food, and workout rows.
    All child rows are hard-deleted when the user is deleted (cascade).
    """
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    target_weight = Column(Float,   nullable=True)   # kg
    calorie_goal  = Column(Integer, nullable=True)   # kcal / day
    protein_goal  = Column(Integer, nullable=True)   # g / day
    created_at    = Column(DateTime, default=datetime.utcnow)

    weight_entries = relationship("WeightEntry", back_populates="user", cascade="all, delete-orphan")
    food_logs      = relationship("FoodLog",     back_populates="user", cascade="all, delete-orphan")
    workouts       = relationship("Workout",     back_populates="user", cascade="all, delete-orphan")


class WeightEntry(Base):
    """
    One body-weight measurement per user per calendar date (upsert at service layer).
    """
    __tablename__ = "weight_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_weight_user_date"),
    )

    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date      = Column(Date,    nullable=False)
    weight_kg = Column(Float,   nullable=False)
    notes     = Column(Text,    nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="weight_entries")


class FoodLog(Base):
    """
    One food-consumption event.
    Macros are computed at insert time from the food DB and stored here
    so reads are fast (no runtime math needed for summaries / charts).
    """
    __tablename__ = "food_logs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date       = Column(Date,    nullable=False, index=True)
    food_name  = Column(String(150), nullable=False)
    quantity_g = Column(Float,   nullable=False)

    # Pre-computed macros for the actual quantity consumed
    calories   = Column(Float, nullable=False)
    protein_g  = Column(Float, nullable=False)
    carbs_g    = Column(Float, nullable=False)
    fat_g      = Column(Float, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="food_logs")


class Workout(Base):
    """
    One exercise block (name + sets × reps × weight).
    Multiple rows per date represent different exercises in the same session.
    """
    __tablename__ = "workouts"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date          = Column(Date,    nullable=False, index=True)
    exercise_name = Column(String(150), nullable=False)
    sets          = Column(Integer, nullable=False)
    reps          = Column(Integer, nullable=False)
    weight_kg     = Column(Float,   nullable=True)   # None for bodyweight exercises
    notes         = Column(Text,    nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workouts")
