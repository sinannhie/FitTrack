"""
routers/weight.py
─────────────────
Endpoints for daily weight logging and chart data.
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.schemas import WeightEntryCreate, WeightEntryResponse, WeightHistoryResponse
from backend.services import weight_service

router = APIRouter(prefix="/users/{user_id}/weight", tags=["Weight Tracking"])


@router.post(
    "/",
    response_model=WeightEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log daily weight (upsert)",
)
def log_weight(user_id: int, payload: WeightEntryCreate, db: Session = Depends(get_db)):
    """
    Log a weight measurement. Re-posting with the same date overwrites the entry.

    ```json
    { "date": "2024-06-15", "weight_kg": 78.5, "notes": "Morning, fasted" }
    ```
    """
    return weight_service.add_weight_entry(db, user_id, payload)


@router.get(
    "/",
    response_model=WeightHistoryResponse,
    summary="Weight history — chart-ready",
)
def weight_history(
    user_id:    int,
    start_date: Optional[date] = None,
    end_date:   Optional[date] = None,
    db: Session = Depends(get_db),
):
    """
    Returns date-sorted weight entries.  Narrow with `start_date` / `end_date`.

    Response shape is ready for any charting library (x = date, y = weight_kg).
    """
    return weight_service.get_weight_history(db, user_id, start_date, end_date)


@router.delete("/{entry_id}", summary="Delete a weight entry")
def delete_weight(user_id: int, entry_id: int, db: Session = Depends(get_db)):
    return weight_service.delete_weight_entry(db, user_id, entry_id)
