"""
utils/food_database.py
──────────────────────
Static in-memory food database.

RULES:
- Egg                   → quantity = number of eggs
- Whey                  → quantity = number of scoops
- Milk / Chai / etc.    → quantity = ml (100ml base)
- Puttu                 → quantity = number of pieces  (~100g each)
- Parotta               → quantity = number of pieces  (~80g each)
- Kerala Shawarma Roll  → quantity = number of rolls   (~250g each)
- Kerala Shawarma Plate → quantity = number of plates  (~400g each)
- Alfaham Quarter       → quantity = number of quarters (~350g each)
- Shawaya Quarter       → quantity = number of quarters (~350g each)
- Fried Chicken Quarter → quantity = number of quarters (~300g each)
- Others                → quantity = grams (100g base)
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

    # 🥚 EGG (per piece ~60g)
    "egg": FoodDBItem(
        name="egg",
        calories_per_100g=77.0,
        protein_per_100g=6.5,
        carbs_per_100g=0.6,
        fat_per_100g=5.5,
    ),

    # 🥤 WHEY (per scoop ~30g)
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


    # ══════════════════════════════════════════════════════════════
    # KERALA FOODS
    # ══════════════════════════════════════════════════════════════

    # ── Kerala Staples ────────────────────────────────────────────

    # 🍚 PUTTU — piece-based (~100g per cylinder)
    "puttu": FoodDBItem(
        name="puttu",
        calories_per_100g=174.0, protein_per_100g=3.6,
        carbs_per_100g=36.0,     fat_per_100g=1.5,
    ),

    # 🫓 PAROTTA — piece-based (~80g per piece)
    "parotta": FoodDBItem(
        name="parotta",
        calories_per_100g=326.0, protein_per_100g=7.0,
        carbs_per_100g=48.0,     fat_per_100g=11.5,
    ),

    "appam": FoodDBItem(
        name="appam",
        calories_per_100g=156.0, protein_per_100g=3.2,
        carbs_per_100g=31.0,     fat_per_100g=1.8,
    ),
    "idiyappam": FoodDBItem(
        name="idiyappam",
        calories_per_100g=142.0, protein_per_100g=2.8,
        carbs_per_100g=30.5,     fat_per_100g=0.5,
    ),
    "kerala red rice": FoodDBItem(
        name="kerala red rice",
        calories_per_100g=124.0, protein_per_100g=2.9,
        carbs_per_100g=26.5,     fat_per_100g=0.4,
    ),
    "tapioca": FoodDBItem(
        name="tapioca",
        calories_per_100g=160.0, protein_per_100g=1.2,
        carbs_per_100g=38.1,     fat_per_100g=0.3,
    ),

    # ── Kerala Curries & Sides ────────────────────────────────────

    "coconut curry": FoodDBItem(
        name="coconut curry",
        calories_per_100g=145.0, protein_per_100g=3.5,
        carbs_per_100g=8.0,      fat_per_100g=11.5,
    ),
    "sambar": FoodDBItem(
        name="sambar",
        calories_per_100g=58.0,  protein_per_100g=3.2,
        carbs_per_100g=8.5,      fat_per_100g=1.2,
    ),
    "avial": FoodDBItem(
        name="avial",
        calories_per_100g=102.0, protein_per_100g=2.1,
        carbs_per_100g=9.5,      fat_per_100g=6.2,
    ),
    "thoran": FoodDBItem(
        name="thoran",
        calories_per_100g=98.0,  protein_per_100g=2.8,
        carbs_per_100g=8.0,      fat_per_100g=6.0,
    ),
    "mango pickle": FoodDBItem(
        name="mango pickle",
        calories_per_100g=142.0, protein_per_100g=1.0,
        carbs_per_100g=14.0,     fat_per_100g=9.0,
    ),

    # ── Kerala Meat & Fish ────────────────────────────────────────

    "fish fry": FoodDBItem(
        name="fish fry",
        calories_per_100g=198.0, protein_per_100g=22.0,
        carbs_per_100g=4.5,      fat_per_100g=10.5,
    ),
    "chicken fry": FoodDBItem(
        name="chicken fry",
        calories_per_100g=265.0, protein_per_100g=24.0,
        carbs_per_100g=6.0,      fat_per_100g=16.0,
    ),
    "beef fry": FoodDBItem(
        name="beef fry",
        calories_per_100g=280.0, protein_per_100g=26.0,
        carbs_per_100g=3.5,      fat_per_100g=18.0,
    ),
    "fish curry": FoodDBItem(
        name="fish curry",
        calories_per_100g=112.0, protein_per_100g=14.0,
        carbs_per_100g=4.0,      fat_per_100g=4.8,
    ),
    "prawn curry": FoodDBItem(
        name="prawn curry",
        calories_per_100g=128.0, protein_per_100g=15.0,
        carbs_per_100g=5.0,      fat_per_100g=5.5,
    ),

    # ── Kerala Street Food (piece/portion-based) ──────────────────

    # 🌯 KERALA SHAWARMA ROLL — per roll (~250g)
    # Maida roll + grilled meat + veggies + mayo + chilli sauce
    "kerala shawarma roll": FoodDBItem(
        name="kerala shawarma roll",
        calories_per_100g=248.0, protein_per_100g=12.0,
        carbs_per_100g=26.0,     fat_per_100g=10.5,
    ),

    # 🍽️ KERALA SHAWARMA PLATE — per plate (~400g)
    # Loose shawarma meat + fries + garlic sauce + salad
    "kerala shawarma plate": FoodDBItem(
        name="kerala shawarma plate",
        calories_per_100g=210.0, protein_per_100g=14.0,
        carbs_per_100g=18.0,     fat_per_100g=9.0,
    ),

    # 🔥 ALFAHAM QUARTER — per quarter (~350g)
    # Charcoal grilled Arabic-spiced chicken quarter
    "alfaham quarter": FoodDBItem(
        name="alfaham quarter",
        calories_per_100g=239.0, protein_per_100g=27.0,
        carbs_per_100g=2.0,      fat_per_100g=13.5,
    ),

    # 🍖 SHAWAYA QUARTER — per quarter (~350g)
    # Oven-roasted Arabic-style chicken quarter
    "shawaya quarter": FoodDBItem(
        name="shawaya quarter",
        calories_per_100g=220.0, protein_per_100g=26.0,
        carbs_per_100g=1.5,      fat_per_100g=12.0,
    ),

    # 🍗 FRIED CHICKEN QUARTER — per quarter (~300g)
    # Kerala-style crispy fried chicken quarter
    "fried chicken quarter": FoodDBItem(
        name="fried chicken quarter",
        calories_per_100g=298.0, protein_per_100g=23.0,
        carbs_per_100g=8.0,      fat_per_100g=19.0,
    ),

    # ── Fruits ───────────────────────────────────────────────────

    "mango": FoodDBItem(
        name="mango",
        calories_per_100g=60.0,  protein_per_100g=0.8,
        carbs_per_100g=15.0,     fat_per_100g=0.4,
    ),
    "dragon fruit": FoodDBItem(
        name="dragon fruit",
        calories_per_100g=60.0,  protein_per_100g=1.2,
        carbs_per_100g=13.0,     fat_per_100g=0.4,
    ),
    "jackfruit": FoodDBItem(
        name="jackfruit",
        calories_per_100g=95.0,  protein_per_100g=1.7,
        carbs_per_100g=23.2,     fat_per_100g=0.6,
    ),
    "coconut": FoodDBItem(
        name="coconut",
        calories_per_100g=354.0, protein_per_100g=3.3,
        carbs_per_100g=15.2,     fat_per_100g=33.5,
    ),

    # ── Beverages (per 100ml) ─────────────────────────────────────

    "chai": FoodDBItem(
        name="chai",
        calories_per_100g=40.0,  protein_per_100g=1.2,
        carbs_per_100g=6.5,      fat_per_100g=1.0,
    ),
    "black tea": FoodDBItem(
        name="black tea",
        calories_per_100g=2.0,   protein_per_100g=0.0,
        carbs_per_100g=0.5,      fat_per_100g=0.0,
    ),
    "coconut water": FoodDBItem(
        name="coconut water",
        calories_per_100g=19.0,  protein_per_100g=0.7,
        carbs_per_100g=3.7,      fat_per_100g=0.2,
    ),

    # ── Snacks ────────────────────────────────────────────────────

    "banana chips": FoodDBItem(
        name="banana chips",
        calories_per_100g=519.0, protein_per_100g=2.3,
        carbs_per_100g=58.0,     fat_per_100g=31.0,
    ),
}


# ── PIECE WEIGHTS (grams per 1 unit) ────────────────────────────
# For foods where quantity = number of pieces/rolls/quarters
# Macros are stored per 100g, so: factor = (pieces × weight_per_piece) / 100

PIECE_WEIGHTS: Dict[str, float] = {
    "egg":                    60.0,   # ~60g per egg
    "puttu":                 100.0,   # ~100g per cylinder
    "parotta":                80.0,   # ~80g per piece
    "kerala shawarma roll":  250.0,   # ~250g per roll
    "kerala shawarma plate": 400.0,   # ~400g per plate
    "alfaham quarter":       350.0,   # ~350g per quarter
    "shawaya quarter":       350.0,   # ~350g per quarter
    "fried chicken quarter": 300.0,   # ~300g per quarter
}

# ml-based beverages — quantity entered in ml
ML_FOODS = {"milk", "chai", "coconut water", "black tea"}

# scoop-based — 1 scoop = stored macro values directly
SCOOP_FOODS = {"whey protein"}


# ── HELPERS ─────────────────────────────────────────────────────

def get_food_item(name: str) -> Optional[FoodDBItem]:
    return FOOD_DB.get(name.lower().strip())


def compute_macros(food_name: str, quantity: float) -> Optional[Dict[str, float]]:
    """
    Converts quantity to a multiplier factor based on food type:
    - Piece foods  → quantity × piece_weight_g / 100
    - Scoop foods  → quantity (direct)
    - ml foods     → quantity / 100
    - gram foods   → quantity / 100
    """
    item = get_food_item(food_name)
    if item is None:
        return None

    name = food_name.lower().strip()

    if name in PIECE_WEIGHTS:
        factor = (quantity * PIECE_WEIGHTS[name]) / 100.0

    elif name in SCOOP_FOODS:
        factor = quantity

    elif name in ML_FOODS:
        factor = quantity / 100.0

    else:
        factor = quantity / 100.0

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