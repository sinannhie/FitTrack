"""
utils/food_database.py
──────────────────────
Static in-memory food database.

RULES:
- Egg → quantity = number of eggs
- Whey → quantity = number of scoops
- Milk → quantity = ml (100ml base)
- Others → quantity = grams (100g base)
"""

from typing import Dict, List, Optional
from schemas.schemas import FoodDBItem


# ── DATABASE ─────────────────────────────────────────────────────

FOOD_DB: Dict[str, FoodDBItem] = {

    # ── NORMAL FOODS (per 100g) ────────────────────────────────

    "almonds": FoodDBItem(
        name="almonds",
        calories_per_100g=579.0, protein_per_100g=21.2,
        carbs_per_100g=21.6,     fat_per_100g=49.9,
    ),
    "apple": FoodDBItem(
        name="apple",
        calories_per_100g=52.0,  protein_per_100g=0.3,
        carbs_per_100g=13.8,     fat_per_100g=0.2,
    ),
    "banana": FoodDBItem(
        name="banana",
        calories_per_100g=89.0,  protein_per_100g=1.1,
        carbs_per_100g=22.8,     fat_per_100g=0.3,
    ),
    "bread": FoodDBItem(
        name="bread",
        calories_per_100g=247.0, protein_per_100g=9.7,
        carbs_per_100g=41.3,     fat_per_100g=3.9,
    ),
    "chicken": FoodDBItem(
        name="chicken",
        calories_per_100g=165.0, protein_per_100g=31.0,
        carbs_per_100g=0.0,      fat_per_100g=3.6,
    ),
    "dal": FoodDBItem(
        name="dal",
        calories_per_100g=116.0, protein_per_100g=9.0,
        carbs_per_100g=20.0,     fat_per_100g=0.4,
    ),
    "greek yogurt": FoodDBItem(
        name="greek yogurt",
        calories_per_100g=59.0,  protein_per_100g=10.0,
        carbs_per_100g=3.6,      fat_per_100g=0.4,
    ),
    "oats": FoodDBItem(
        name="oats",
        calories_per_100g=389.0, protein_per_100g=16.9,
        carbs_per_100g=66.3,     fat_per_100g=6.9,
    ),
    "rice": FoodDBItem(
        name="rice",
        calories_per_100g=130.0, protein_per_100g=2.7,
        carbs_per_100g=28.2,     fat_per_100g=0.3,
    ),

    # ── SPECIAL FOODS ───────────────────────────────────────────

    # 🥚 EGG (per piece)
    "egg": FoodDBItem(
        name="egg",
        calories_per_100g=77.0,
        protein_per_100g=6.5,
        carbs_per_100g=0.6,
        fat_per_100g=5.5,
    ),

    # 🥤 WHEY (per scoop)
    "whey protein": FoodDBItem(
        name="whey protein",
        calories_per_100g=120.0,
        protein_per_100g=24.0,
        carbs_per_100g=3.0,
        fat_per_100g=1.5,
    ),

    # 🥛 MILK (per 100ml)
    "milk": FoodDBItem(
        name="milk",
        calories_per_100g=61.0,
        protein_per_100g=3.2,
        carbs_per_100g=4.8,
        fat_per_100g=3.3,
    ),
}


# ── HELPERS ─────────────────────────────────────────────────────

def get_food_item(name: str) -> Optional[FoodDBItem]:
    return FOOD_DB.get(name.lower().strip())


def compute_macros(food_name: str, quantity: float) -> Optional[Dict[str, float]]:
    """
    quantity meaning:
    - egg → number of eggs
    - whey → number of scoops
    - milk → ml (100ml base)
    - others → grams
    """

    item = get_food_item(food_name)
    if item is None:
        return None

    name = food_name.lower().strip()

    # 🔥 SPECIAL CASES
    if name == "egg":
        factor = quantity  # per egg

    elif name == "whey protein":
        factor = quantity  # per scoop

    elif name == "milk":
        factor = quantity / 100.0  # per 100ml

    else:
        factor = quantity / 100.0  # per 100g

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