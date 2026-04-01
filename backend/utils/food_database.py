"""
utils/food_database.py
──────────────────────
Static in-memory food database.

Egg  → stored as per-piece (1 egg = 50g medium).
       quantity_g field is used as "number of eggs" on the frontend,
       but macros are pre-scaled to per-1-egg so the math stays consistent.

All other foods → per 100g as usual.
"""

from typing import Dict, List, Optional

from schemas.schemas import FoodDBItem


# ── Database ─────────────────────────────────────────────────────
FOOD_DB: Dict[str, FoodDBItem] = {

    # ── ORIGINAL FOODS (salmon removed, paneer removed) ──────────

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
    "sweet potato": FoodDBItem(
        name="sweet potato",
        calories_per_100g=90.0,  protein_per_100g=2.0,
        carbs_per_100g=20.7,     fat_per_100g=0.1,
    ),
    "tuna": FoodDBItem(
        name="tuna",
        calories_per_100g=116.0, protein_per_100g=25.5,
        carbs_per_100g=0.0,      fat_per_100g=0.8,
    ),

    # ── EGG — converted to per-piece (1 egg = 50g medium) ────────
    # Frontend label: "egg — 77 kcal / piece"
    # quantity_g = number of eggs; macros already scaled to 1 egg
    "egg": FoodDBItem(
        name="egg",
        calories_per_100g=77.0,  protein_per_100g=6.5,
        carbs_per_100g=0.55,     fat_per_100g=5.5,
        # Note: these are per-1-egg values stored in the /100g fields.
        # When user enters quantity=2, system multiplies by 2 — correct.
    ),

    # ── MILK — relabelled per 100ml (same values, clearer label) ─
    "milk (100ml)": FoodDBItem(
        name="milk (100ml)",
        calories_per_100g=61.0,  protein_per_100g=3.2,
        carbs_per_100g=4.8,      fat_per_100g=3.3,
    ),

    # ── WHEY PROTEIN — per 1 scoop (35g) ─────────────────────────
    "whey protein (1 scoop)": FoodDBItem(
        name="whey protein (1 scoop)",
        calories_per_100g=120.0, protein_per_100g=24.0,
        carbs_per_100g=3.0,      fat_per_100g=1.5,
    ),

    # ── INDIAN / KERALA FOODS ────────────────────────────────────

    "chapati": FoodDBItem(
        name="chapati",
        calories_per_100g=297.0, protein_per_100g=8.0,
        carbs_per_100g=52.0,     fat_per_100g=5.5,
        # 1 chapati ≈ 40g → ~119 kcal; user enters 40 for 1 piece
    ),
    "dosa": FoodDBItem(
        name="dosa",
        calories_per_100g=168.0, protein_per_100g=3.9,
        carbs_per_100g=30.0,     fat_per_100g=3.7,
        # 1 plain dosa ≈ 80g → ~134 kcal
    ),
    "puttu": FoodDBItem(
        name="puttu",
        calories_per_100g=180.0, protein_per_100g=3.5,
        carbs_per_100g=38.0,     fat_per_100g=1.2,
    ),
    "parotta": FoodDBItem(
        name="parotta",
        calories_per_100g=320.0, protein_per_100g=6.5,
        carbs_per_100g=45.0,     fat_per_100g=13.0,
        # 1 parotta ≈ 100g → 320 kcal
    ),
    "rumali roti": FoodDBItem(
        name="rumali roti",
        calories_per_100g=260.0, protein_per_100g=7.5,
        carbs_per_100g=48.0,     fat_per_100g=4.5,
        # 1 rumali roti ≈ 60g → ~156 kcal
    ),
    "fish curry (kerala)": FoodDBItem(
        name="fish curry (kerala)",
        calories_per_100g=120.0, protein_per_100g=14.0,
        carbs_per_100g=4.0,      fat_per_100g=5.5,
        # coconut-based Kerala style
    ),
    "beef fry": FoodDBItem(
        name="beef fry",
        calories_per_100g=250.0, protein_per_100g=26.0,
        carbs_per_100g=3.0,      fat_per_100g=15.0,
    ),
    "mutton fry": FoodDBItem(
        name="mutton fry",
        calories_per_100g=260.0, protein_per_100g=25.0,
        carbs_per_100g=2.0,      fat_per_100g=17.0,
    ),
    "coconut oil": FoodDBItem(
        name="coconut oil",
        calories_per_100g=862.0, protein_per_100g=0.0,
        carbs_per_100g=0.0,      fat_per_100g=100.0,
        # 1 tbsp = 14g → ~121 kcal; enter 14 for 1 tbsp
    ),
    "chicken gravy": FoodDBItem(
        name="chicken gravy",
        calories_per_100g=140.0, protein_per_100g=14.0,
        carbs_per_100g=5.0,      fat_per_100g=7.0,
    ),

    # ── ARABIC / RESTAURANT FOODS ────────────────────────────────

    "shawarma": FoodDBItem(
        name="shawarma",
        calories_per_100g=200.0, protein_per_100g=14.0,
        carbs_per_100g=18.0,     fat_per_100g=8.0,
        # 1 full shawarma ≈ 250g → ~500 kcal; enter 250
    ),
    "shawaya (grilled chicken)": FoodDBItem(
        name="shawaya (grilled chicken)",
        calories_per_100g=195.0, protein_per_100g=29.0,
        carbs_per_100g=0.0,      fat_per_100g=8.5,
    ),
    "al faham": FoodDBItem(
        name="al faham",
        calories_per_100g=220.0, protein_per_100g=27.0,
        carbs_per_100g=1.0,      fat_per_100g=12.0,
    ),
    "ghee rice": FoodDBItem(
        name="ghee rice",
        calories_per_100g=180.0, protein_per_100g=3.0,
        carbs_per_100g=30.0,     fat_per_100g=5.5,
    ),
    "biriyani rice": FoodDBItem(
        name="biriyani rice",
        calories_per_100g=165.0, protein_per_100g=4.5,
        carbs_per_100g=28.0,     fat_per_100g=4.0,
    ),
    "mandi rice": FoodDBItem(
        name="mandi rice",
        calories_per_100g=170.0, protein_per_100g=5.0,
        carbs_per_100g=29.0,     fat_per_100g=4.5,
    ),
}


# ── Helpers ──────────────────────────────────────────────────────

def get_food_item(name: str) -> Optional[FoodDBItem]:
    return FOOD_DB.get(name.lower().strip())


def compute_macros(food_name: str, quantity_g: float) -> Optional[Dict[str, float]]:
    """
    For all foods: quantity_g = grams consumed.
    For egg:       quantity_g = number of eggs (macros already per-piece).
    For coconut oil: quantity_g = grams (enter 14 for 1 tbsp).
    """
    item = get_food_item(food_name)
    if item is None:
        return None

    factor = quantity_g / 100.0

    return {
        "calories":  round(item.calories_per_100g * factor, 2),
        "protein_g": round(item.protein_per_100g  * factor, 2),
        "carbs_g":   round(item.carbs_per_100g    * factor, 2),
        "fat_g":     round(item.fat_per_100g      * factor, 2),
    }


def list_all_foods() -> List[FoodDBItem]:
    return sorted(FOOD_DB.values(), key=lambda f: f.name)


def available_food_names() -> List[str]:
    return sorted(FOOD_DB.keys())