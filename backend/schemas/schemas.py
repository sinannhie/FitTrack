"""
schemas/schemas.py
──────────────────
Pydantic v2 request/response contracts.
"""

from __future__ import annotations
import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


# ══════════════════════════════════════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════════════════════════════════════

class UserCreate(BaseModel):
    name: str
    age: int
    height: float
    weight: float
    goal: str
    target_weight: Optional[float] = None
    calorie_goal: Optional[int] = None
    protein_goal: Optional[int] = None

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    age: Optional[int] = Field(None, ge=10, le=120)
    height: Optional[float] = Field(None, gt=0)
    weight: Optional[float] = Field(None, gt=0)
    goal: Optional[str] = None
    target_weight: Optional[float] = Field(None, gt=0)
    calorie_goal: Optional[int] = Field(None, gt=0)
    protein_goal: Optional[int] = Field(None, gt=0)

class UserResponse(UserCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime.datetime


# ══════════════════════════════════════════════════════════════════════════════
# WEIGHT TRACKING
# ══════════════════════════════════════════════════════════════════════════════

class WeightEntryCreate(BaseModel):
    date: datetime.date = Field(..., description="Measurement date (YYYY-MM-DD)")
    weight_kg: float = Field(..., gt=0, lt=500)


class WeightEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    date: datetime.date
    weight_kg: float
    created_at: datetime.datetime


class WeightChartPoint(BaseModel):
    date: datetime.date
    weight_kg: float


class WeightHistoryResponse(BaseModel):
    user_id: int
    total_entries: int
    entries: List[WeightChartPoint]


# ══════════════════════════════════════════════════════════════════════════════
# FOOD TRACKING
# ══════════════════════════════════════════════════════════════════════════════

class FoodDBItem(BaseModel):
    name: str
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float


class FoodLogCreate(BaseModel):
    date: datetime.date = Field(..., description="Date consumed (YYYY-MM-DD)")
    food_name: str
    quantity_g: float = Field(..., gt=0)


class FoodLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    date: datetime.date
    food_name: str
    quantity_g: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    created_at: datetime.datetime


# ══════════════════════════════════════════════════════════════════════════════
# DAILY NUTRITION SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

class DailyNutritionSummary(BaseModel):
    user_id: int
    date: datetime.date
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    calorie_goal: Optional[int]
    protein_goal: Optional[int]
    calorie_remaining: Optional[float]
    protein_remaining: Optional[float]
    food_entries: int


# ══════════════════════════════════════════════════════════════════════════════
# WEEKLY NUTRITION SUMMARY  ← NEW
# ══════════════════════════════════════════════════════════════════════════════

class WeeklyDayEntry(BaseModel):
    date:     str
    label:    str        # "Mon", "Tue", …
    calories: float
    protein:  float


class WeeklyNutritionSummary(BaseModel):
    user_id:         int
    week_start:      datetime.date
    week_end:        datetime.date
    # This week totals
    total_calories:  float
    total_protein_g: float
    # Previous week totals (for ↑↓ trend)
    prev_calories:   float
    prev_protein_g:  float
    # Deltas — None means no previous data
    calorie_trend:   Optional[float]
    protein_trend:   Optional[float]
    # Goals
    calorie_goal:    Optional[int]
    protein_goal:    Optional[int]
    # Per-day breakdown (7 entries, Mon–Sun)
    days:            List[Dict[str, Any]]


# ══════════════════════════════════════════════════════════════════════════════
# WORKOUT TRACKING
# ══════════════════════════════════════════════════════════════════════════════

class WorkoutCreate(BaseModel):
    date: datetime.date = Field(..., description="Workout date (YYYY-MM-DD)")
    exercise_name: str = Field(..., min_length=1, max_length=150)
    sets: int = Field(..., gt=0)
    reps: int = Field(..., gt=0)
    weight_kg: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class WorkoutResponse(WorkoutCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: datetime.datetime


class WorkoutSessionSummary(BaseModel):
    date: datetime.date
    exercises: List[WorkoutResponse]
    total_sets: int
    total_volume_kg: float


# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

class WeightTrendResponse(BaseModel):
    user_id: int
    period_days: int
    start_weight_kg: Optional[float]
    end_weight_kg: Optional[float]
    change_kg: Optional[float]
    trend: str
    data_points: List[WeightChartPoint]


class CorrelationPoint(BaseModel):
    date: datetime.date
    total_calories: float
    weight_kg: Optional[float]


class CalorieWeightCorrelationResponse(BaseModel):
    user_id: int
    data: List[CorrelationPoint]
    note: str = (
        "Scatter these points to identify trends. "
        "Correlation does not imply causation."
    )


class WeeklySummary(BaseModel):
    week_start: datetime.date
    week_end: datetime.date
    avg_daily_calories: float
    avg_daily_protein_g: float
    total_workout_days: int
    avg_weight_kg: Optional[float]
    weight_change_kg: Optional[float]
    days_logged_food: int
    days_logged_weight: int


class WeeklySummaryResponse(BaseModel):
    user_id: int
    weeks: List[WeeklySummary]