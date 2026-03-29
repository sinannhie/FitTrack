"""
routers/weight.py
─────────────────
Endpoints for daily weight logging and chart data.
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

# ✅ FIXED IMPORTS (relative)
from database import get_db
from schemas.schemas import WeightEntryCreate, WeightEntryResponse, WeightHistoryResponse
from services import weight_service

router = APIRouter(prefix="/users/{user_id}/weight", tags=["Weight Tracking"])


@router.post(
    "/",
    response_model=WeightEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def log_weight(user_id: int, payload: WeightEntryCreate, db: Session = Depends(get_db)):
    return weight_service.add_weight_entry(db, user_id, payload)


@router.get(
    "/",
    response_model=WeightHistoryResponse,
)
def weight_history(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    return weight_service.get_weight_history(db, user_id, start_date, end_date)


@router.delete("/{entry_id}")
def delete_weight(user_id: int, entry_id: int, db: Session = Depends(get_db)):
    return weight_service.delete_weight_entry(db, user_id, entry_id)
