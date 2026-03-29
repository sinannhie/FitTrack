"""
services/user_service.py
────────────────────────
Pure business logic for user management.
"""

from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

# ✅ FIXED IMPORTS (relative)
from ..models.models import User
from ..schemas.schemas import UserCreate, UserUpdate
from ..utils.logger import logger


def create_user(db: Session, payload: UserCreate) -> User:
    user = User(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"Created user id={user.id} name={user.name}")

    return user


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found",
        )

    return user


def list_users(db: Session, skip: int = 0, limit: int = 50) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()


def update_user(db: Session, user_id: int, payload: UserUpdate) -> User:
    user = get_user_or_404(db, user_id)

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    logger.info(f"Updated user id={user_id} fields={list(updates.keys())}")

    return user


def delete_user(db: Session, user_id: int) -> dict:
    user = get_user_or_404(db, user_id)

    db.delete(user)
    db.commit()

    logger.info(f"Deleted user id={user_id}")

    return {"detail": f"User {user_id} deleted successfully"}