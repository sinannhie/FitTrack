"""
routers/users.py
────────────────
CRUD endpoints for user management.
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.schemas import UserCreate, UserUpdate, UserResponse
from backend.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Create a user account with optional fitness goals.

    ```json
    {
      "name": "Sinan",
      "target_weight": 72.0,
      "calorie_goal": 2200,
      "protein_goal": 150
    }
    ```
    """
    return user_service.create_user(db, payload)


@router.get("/", response_model=List[UserResponse], summary="List all users")
def list_users(
    skip: int = 0, limit: int = 50, db: Session = Depends(get_db)
):
    return user_service.list_users(db, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserResponse, summary="Get user by ID")
def get_user(user_id: int, db: Session = Depends(get_db)):
    return user_service.get_user_or_404(db, user_id)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Partially update a user",
)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    """Send only the fields you want to change."""
    return user_service.update_user(db, user_id, payload)


@router.delete("/{user_id}", summary="Delete user and all associated data")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    return user_service.delete_user(db, user_id)
