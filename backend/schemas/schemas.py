"""
schemas/schemas.py — Pydantic v2 request/response contracts.
SAFE: WorkoutCreate/Response extended with optional fields — old clients unaffected.
"""

from __future__ import annotations
import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


# ══════════════════════════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════════════════════════

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
    name:          Optional[str]   = Field(None, min_length=1, max_length=100)
    age:           Optional[int]   = Field(None, ge=10, le=120)
    height:        Optional[float] = Field(None, gt=0)
    weight:        Optional[float] = Field(None, gt=0)
    goal:          Optional[str]   = None
    target_weight: Optional[float] = Field(None, gt=0)
    calorie_goal:  Optional[int]   = Field(None, gt=0)
    protein_goal:  Optional[int]   = Field(None, gt=0)

class UserResponse(UserCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime.datetime


# ══════════════════════════════════════════════════════════════════
# WEIGHT TRACKING
# ══════════════════════════════════════════════════════════════════

class WeightEntryCreate(BaseModel):
    date:      datetime.date = Field(..., description="YYYY-MM-DD")
    weight_kg: float         = Field(..., gt=0, lt=500)

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


# ══════════════════════════════════════════════════════════════════
# FOOD TRACKING
# ══════════════════════════════════════════════════════════════════

class FoodDBItem(BaseModel):
    name: str
    calories_per_100g: float
    protein_per_100g:  float
    carbs_per_100g:    float
    fat_per_100g:      float

class FoodLogCreate(BaseModel):
    date:       datetime.date = Field(..., description="YYYY-MM-DD")
    food_name:  str
    quantity_g: float         = Field(..., gt=0)
    is_custom:  bool          = False
    calories:   Optional[float] = Field(None, ge=0)
    protein:    Optional[float] = Field(None, ge=0)
    carbs:      Optional[float] = Field(None, ge=0)
    fat:        Optional[float] = Field(None, ge=0)
    meal_type:  Optional[str]   = None

class FoodLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:         int
    user_id:    int
    date:       datetime.date
    food_name:  str
    quantity_g: float
    calories:   float
    protein_g:  float
    carbs_g:    float
    fat_g:      float
    is_custom:  bool
    meal_type:  Optional[str] = None
    created_at: datetime.datetime


# ══════════════════════════════════════════════════════════════════
# DAILY NUTRITION SUMMARY
# ══════════════════════════════════════════════════════════════════

class DailyNutritionSummary(BaseModel):
    user_id:           int
    date:              datetime.date
    total_calories:    float
    total_protein_g:   float
    total_carbs_g:     float
    total_fat_g:       float
    calorie_goal:      Optional[int]
    protein_goal:      Optional[int]
    calorie_remaining: Optional[float]
    protein_remaining: Optional[float]
    food_entries:      int


# ══════════════════════════════════════════════════════════════════
# WEEKLY NUTRITION SUMMARY
# ══════════════════════════════════════════════════════════════════

class WeeklyNutritionSummary(BaseModel):
    user_id:         int
    week_start:      datetime.date
    week_end:        datetime.date
    total_calories:  float
    total_protein_g: float
    prev_calories:   float
    prev_protein_g:  float
    calorie_trend:   Optional[float]
    protein_trend:   Optional[float]
    calorie_goal:    Optional[int]
    protein_goal:    Optional[int]
    days:            List[Dict[str, Any]]


# ══════════════════════════════════════════════════════════════════
# WORKOUT TRACKING
# New optional fields: steps, workout_type, muscle_group
# sets/reps default to 0 so cardio entries are valid
# ══════════════════════════════════════════════════════════════════

class WorkoutCreate(BaseModel):
    date:          datetime.date   = Field(..., description="YYYY-MM-DD")
    exercise_name: str             = Field(..., min_length=1, max_length=150)
    sets:          int             = Field(default=0, ge=0)   # 0 OK for cardio
    reps:          int             = Field(default=0, ge=0)   # 0 OK for cardio
    weight_kg:     Optional[float] = Field(None, ge=0)
    notes:         Optional[str]   = None
    # NEW — all optional, backward compatible
    steps:         Optional[int]   = Field(None, ge=0)
    workout_type:  Optional[str]   = None   # push/pull/legs/cardio/custom
    muscle_group:  Optional[str]   = None

class WorkoutResponse(WorkoutCreate):
    model_config = ConfigDict(from_attributes=True)
    id:         int
    user_id:    int
    created_at: datetime.datetime

class WorkoutSessionSummary(BaseModel):
    """
    One card per (date, workout_type) group.
    All fields have defaults so old API responses still deserialize.
    """
    date:            datetime.date
    workout_type:    str                  = "custom"   # default for old rows
    exercises:       List[WorkoutResponse]
    total_sets:      int
    total_volume_kg: float
    total_steps:     int                  = 0          # default for old rows


# ══════════════════════════════════════════════════════════════════
# ANALYTICS
# ══════════════════════════════════════════════════════════════════

class WeightTrendResponse(BaseModel):
    user_id:         int
    period_days:     int
    start_weight_kg: Optional[float]
    end_weight_kg:   Optional[float]
    change_kg:       Optional[float]
    trend:           str
    data_points:     List[WeightChartPoint]

class CorrelationPoint(BaseModel):
    date:           datetime.date
    total_calories: float
    weight_kg:      Optional[float]

class CalorieWeightCorrelationResponse(BaseModel):
    user_id: int
    data:    List[CorrelationPoint]
    note:    str = "Scatter these points to identify trends."

class WeeklySummary(BaseModel):
    week_start:          datetime.date
    week_end:            datetime.date
    avg_daily_calories:  float
    avg_daily_protein_g: float
    total_workout_days:  int
    avg_weight_kg:       Optional[float]
    weight_change_kg:    Optional[float]
    days_logged_food:    int
    days_logged_weight:  int

class WeeklySummaryResponse(BaseModel):
    user_id: int
    weeks:   List[WeeklySummary]