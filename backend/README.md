# FitTrack AI — Backend

Production-ready fitness tracking REST API built with **FastAPI + SQLAlchemy + SQLite**.

---

## Quick Start

```bash
# 1. Clone / unzip the project
cd fittrack_ai

# 2. Create a virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) configure environment
cp .env.example .env              # edit DATABASE_URL, LOG_LEVEL, etc.

# 5. Run the server
uvicorn backend.main:app --reload --port 8000
```

The API is now live at **http://localhost:8000**

| URL | Purpose |
|-----|---------|
| http://localhost:8000/docs | Swagger UI (interactive) |
| http://localhost:8000/redoc | ReDoc |
| http://localhost:8000/health | Liveness probe |

---

## Project Structure

```
fittrack_ai/
├── requirements.txt
├── .env.example
├── README.md
├── EXAMPLES.http              ← example curl / HTTP requests
└── backend/
    ├── main.py                ← app factory, middleware, router registration
    ├── database.py            ← engine, session, Base
    ├── models/
    │   └── models.py          ← SQLAlchemy ORM tables
    ├── schemas/
    │   └── schemas.py         ← Pydantic v2 request/response models
    ├── routers/
    │   ├── users.py
    │   ├── weight.py
    │   ├── food.py
    │   ├── workouts.py
    │   └── analytics.py
    ├── services/              ← all business logic lives here
    │   ├── user_service.py
    │   ├── weight_service.py
    │   ├── food_service.py
    │   ├── workout_service.py
    │   └── analytics_service.py
    └── utils/
        ├── food_database.py   ← static macro DB + compute helpers
        └── logger.py          ← centralised logging
```

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Users
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/users/` | Create user |
| GET    | `/users/` | List all users |
| GET    | `/users/{id}` | Get user |
| PATCH  | `/users/{id}` | Partial update |
| DELETE | `/users/{id}` | Delete + cascade |

### Weight Tracking
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/users/{id}/weight/` | Log weight (upsert) |
| GET    | `/users/{id}/weight/` | History (chart-ready) |
| DELETE | `/users/{id}/weight/{entry_id}` | Delete entry |

### Food & Nutrition
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/foods` | Browse food database |
| POST   | `/users/{id}/food` | Log food (macros auto-calculated) |
| GET    | `/users/{id}/food?log_date=` | Food entries for a date |
| GET    | `/users/{id}/nutrition/summary?summary_date=` | Daily totals + goals |
| DELETE | `/users/{id}/food/{log_id}` | Delete food log |

### Workout Tracking
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/users/{id}/workouts/` | Log exercise |
| GET    | `/users/{id}/workouts/` | History grouped by date |
| DELETE | `/users/{id}/workouts/{workout_id}` | Delete entry |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/users/{id}/analytics/weight-trend` | Trend classification + data |
| GET    | `/users/{id}/analytics/calorie-weight-correlation` | Scatter data |
| GET    | `/users/{id}/analytics/weekly-summary` | ISO-week rollups |

---

## Switching to PostgreSQL

1. `pip install psycopg2-binary`
2. Set `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/fittrack
   ```
3. That's it. No other code changes required.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./fittrack.db` | DB connection string |
| `DB_ECHO` | `0` | Set `1` to log all SQL |
| `LOG_LEVEL` | `INFO` | `DEBUG / INFO / WARNING / ERROR` |

---

## Food Database

The built-in food database currently includes:

`almonds` · `apple` · `banana` · `bread` · `chicken` · `dal` · `egg` ·
`greek_yogurt` · `milk` · `oats` · `paneer` · `rice` · `salmon` ·
`sweet_potato` · `tuna`

All macros are per **100 g**. Browse them at `GET /api/v1/foods`.

To add a food, open `backend/utils/food_database.py` and add an entry to `FOOD_DB`.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Macros stored at insert time** | Aggregate queries (`SUM`) are fast — no runtime math on reads |
| **Weight upsert** | Re-logging the same date updates rather than duplicates |
| **Services layer** | Routers are thin; all logic is testable without HTTP |
| **Pydantic ≠ ORM** | API contracts are stable even if DB schema evolves |
| **WAL mode (SQLite)** | Better concurrent reads during development |
| **ISO-week analytics** | Complete weeks only — partial weeks skew averages |
