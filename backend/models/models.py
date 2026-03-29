"""
models/models.py
────────────────
SQLAlchemy ORM table definitions.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, Date, DateTime,
    ForeignKey, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

# ✅ FIXED IMPORT (relative)
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    target_weight = Column(Float,   nullable=True)
    calorie_goal  = Column(Integer, nullable=True)
    protein_goal  = Column(Integer, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    weight_entries = relationship("WeightEntry", back_populates="user", cascade="all, delete-orphan")
    food_logs      = relationship("FoodLog",     back_populates="user", cascade="all, delete-orphan")
    workouts       = relationship("Workout",     back_populates="user", cascade="all, delete-orphan")


class WeightEntry(Base):
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

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="food_logs")


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