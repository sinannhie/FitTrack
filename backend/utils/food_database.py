"""
utils/food_database.py
──────────────────────
Static in-memory food database.
"""

from typing import Dict, List, Optional

# ❌ REMOVE schema import (causes circular issues sometimes)
# from schemas.schemas import FoodDBItem

# ✅ DEFINE SIMPLE CLASS LOCALLY (SAFE)
class FoodDBItem:
    def __init__(self, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g):
        self.name = name
        self.calories_per_100g = calories_per_100g
        self.protein_per_100g = protein_per_100g
        self.carbs_per_100g = carbs_per_100g
        self.fat_per_100g = fat_per_100g


# ── DATABASE ─────────────────────────────────────────────────────

FOOD_DB: Dict[str, FoodDBItem] = {
    "egg": FoodDBItem("egg", 77.0, 6.5, 0.6, 5.5),
    "milk": FoodDBItem("milk", 61.0, 3.2, 4.8, 3.3),
    "rice": FoodDBItem("rice", 130.0, 2.7, 28.2, 0.3),
    "parotta": FoodDBItem("parotta", 326.0, 7.0, 48.0, 11.5),
    "chicken": FoodDBItem("chicken", 165.0, 31.0, 0.0, 3.6),
    "banana": FoodDBItem("banana", 89.0, 1.1, 22.8, 0.3),
    "apple": FoodDBItem("apple", 52.0, 0.3, 13.8, 0.2),
    "oats": FoodDBItem("oats", 389.0, 16.9, 66.3, 6.9),
    "whey protein": FoodDBItem("whey protein", 120.0, 24.0, 3.0, 1.5),
}


# ── WEIGHTS ─────────────────────────────────────────────────────

PIECE_WEIGHTS = {
    "egg": 60.0,
    "parotta": 80.0,
}

ML_FOODS = {"milk"}
SCOOP_FOODS = {"whey protein"}


# ── HELPERS ─────────────────────────────────────────────────────

def get_food_item(name: str) -> Optional[FoodDBItem]:
    return FOOD_DB.get(name.lower().strip())


def compute_macros(food_name: str, quantity: float) -> Optional[Dict[str, float]]:
    item = get_food_item(food_name)
    if not item:
        return None

    name = food_name.lower().strip()

    if name in PIECE_WEIGHTS:
        factor = (quantity * PIECE_WEIGHTS[name]) / 100
    elif name in SCOOP_FOODS:
        factor = quantity
    elif name in ML_FOODS:
        factor = quantity / 100
    else:
        factor = quantity / 100

    return {
        "calories": round(item.calories_per_100g * factor, 2),
        "protein_g": round(item.protein_per_100g * factor, 2),
        "carbs_g": round(item.carbs_per_100g * factor, 2),
        "fat_g": round(item.fat_per_100g * factor, 2),
    }


def list_all_foods() -> List[FoodDBItem]:
    return list(FOOD_DB.values())


def available_food_names() -> List[str]:
    return list(FOOD_DB.keys())