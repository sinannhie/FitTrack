"""
services/weight_service.py
──────────────────────────
Business logic for weight tracking.
"""

from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import asc
from fastapi import HTTPException, status

# ✅ FIXED IMPORTS (relative)
from ..models.models import WeightEntry
from ..schemas.schemas import WeightEntryCreate, WeightChartPoint, WeightHistoryResponse
from ..services.user_service import get_user_or_404
from ..utils.logger import logger


def add_weight_entry(db: Session, user_id: int, payload: WeightEntryCreate) -> WeightEntry:

    get_user_or_404(db, user_id)

    existing = (
        db.query(WeightEntry)
        .filter(WeightEntry.user_id == user_id, WeightEntry.date == payload.date)
        .first()
    )

    if existing:
        existing.weight_kg = payload.weight_kg
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)

        logger.info(f"Updated weight user={user_id} date={payload.date} weight={payload.weight_kg}kg")

        return existing

    entry = WeightEntry(user_id=user_id, **payload.model_dump())

    db.add(entry)
    db.commit()
    db.refresh(entry)

    logger.info(f"Logged weight user={user_id} date={payload.date} weight={payload.weight_kg}kg")

    return entry


def get_weight_history(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> WeightHistoryResponse:

    get_user_or_404(db, user_id)

    query = (
        db.query(WeightEntry)
        .filter(WeightEntry.user_id == user_id)
        .order_by(asc(WeightEntry.date))
    )

    if start_date:
        query = query.filter(WeightEntry.date >= start_date)

    if end_date:
        query = query.filter(WeightEntry.date <= end_date)

    rows = query.all()

    return WeightHistoryResponse(
        user_id=user_id,
        total_entries=len(rows),
        entries=[WeightChartPoint(date=r.date, weight_kg=r.weight_kg) for r in rows],
    )


def delete_weight_entry(db: Session, user_id: int, entry_id: int):

    entry = (
        db.query(WeightEntry)
        .filter(WeightEntry.id == entry_id, WeightEntry.user_id == user_id)
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weight entry not found",
        )

    db.delete(entry)
    db.commit()

    logger.info(f"Deleted weight entry id={entry_id} user={user_id}")

    return {"detail": f"Weight entry {entry_id} deleted"}