"""
utils/food_database.py
──────────────────────
Static in-memory food database.
"""

from typing import Dict, List, Optional

# ✅ FIXED IMPORT (relative)
from schemas.schemas import FoodDBItem


# ── Database ─────────────────────────────────────────────────────
FOOD_DB: Dict[str, FoodDBItem] = {

    "egg": FoodDBItem(
        name="egg",
        calories_per_100g=155.0, protein_per_100g=13.0,
        carbs_per_100g=1.1,      fat_per_100g=11.0,
    ),
    "chicken": FoodDBItem(
        name="chicken",
        calories_per_100g=165.0, protein_per_100g=31.0,
        carbs_per_100g=0.0,      fat_per_100g=3.6,
    ),
    "rice": FoodDBItem(
        name="rice",
        calories_per_100g=130.0, protein_per_100g=2.7,
        carbs_per_100g=28.2,     fat_per_100g=0.3,
    ),
    "banana": FoodDBItem(
        name="banana",
        calories_per_100g=89.0,  protein_per_100g=1.1,
        carbs_per_100g=22.8,     fat_per_100g=0.3,
    ),
    "milk": FoodDBItem(
        name="milk",
        calories_per_100g=61.0,  protein_per_100g=3.2,
        carbs_per_100g=4.8,      fat_per_100g=3.3,
    ),
    "oats": FoodDBItem(
        name="oats",
        calories_per_100g=389.0, protein_per_100g=16.9,
        carbs_per_100g=66.3,     fat_per_100g=6.9,
    ),

    "paneer": FoodDBItem(
        name="paneer",
        calories_per_100g=265.0, protein_per_100g=18.3,
        carbs_per_100g=1.2,      fat_per_100g=20.8,
    ),
    "dal": FoodDBItem(
        name="dal",
        calories_per_100g=116.0, protein_per_100g=9.0,
        carbs_per_100g=20.0,     fat_per_100g=0.4,
    ),
    "bread": FoodDBItem(
        name="bread",
        calories_per_100g=247.0, protein_per_100g=9.7,
        carbs_per_100g=41.3,     fat_per_100g=3.9,
    ),
    "apple": FoodDBItem(
        name="apple",
        calories_per_100g=52.0,  protein_per_100g=0.3,
        carbs_per_100g=13.8,     fat_per_100g=0.2,
    ),
    "salmon": FoodDBItem(
        name="salmon",
        calories_per_100g=208.0, protein_per_100g=20.0,
        carbs_per_100g=0.0,      fat_per_100g=13.0,
    ),
    "sweet_potato": FoodDBItem(
        name="sweet_potato",
        calories_per_100g=90.0,  protein_per_100g=2.0,
        carbs_per_100g=20.7,     fat_per_100g=0.1,
    ),
    "greek_yogurt": FoodDBItem(
        name="greek_yogurt",
        calories_per_100g=59.0,  protein_per_100g=10.0,
        carbs_per_100g=3.6,      fat_per_100g=0.4,
    ),
    "almonds": FoodDBItem(
        name="almonds",
        calories_per_100g=579.0, protein_per_100g=21.2,
        carbs_per_100g=21.6,     fat_per_100g=49.9,
    ),
    "tuna": FoodDBItem(
        name="tuna",
        calories_per_100g=116.0, protein_per_100g=25.5,
        carbs_per_100g=0.0,      fat_per_100g=0.8,
    ),
}


# ── Helpers ─────────────────────────────────────────────────────

def get_food_item(name: str) -> Optional[FoodDBItem]:
    return FOOD_DB.get(name.lower().strip())


def compute_macros(food_name: str, quantity_g: float) -> Optional[Dict[str, float]]:
    item = get_food_item(food_name)
    if item is None:
        return None

    factor = quantity_g / 100.0

    return {
        "calories": round(item.calories_per_100g * factor, 2),
        "protein_g": round(item.protein_per_100g * factor, 2),
        "carbs_g": round(item.carbs_per_100g * factor, 2),
        "fat_g": round(item.fat_per_100g * factor, 2),
    }


def list_all_foods() -> List[FoodDBItem]:
    return sorted(FOOD_DB.values(), key=lambda f: f.name)


def available_food_names() -> List[str]:
    return sorted(FOOD_DB.keys())
