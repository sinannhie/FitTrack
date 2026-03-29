"""
database.py
───────────
Engine, session factory, and declarative Base.
To migrate to PostgreSQL, change DATABASE_URL only — nothing else needs touching.
"""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ── Connection URL ─────────────────────────────────────────────────────────────
# SQLite for development / MVP. Switch to PostgreSQL by setting env var:
#   export DATABASE_URL="postgresql+psycopg2://user:pass@localhost/fittrack"
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./fittrack.db")

_is_sqlite = DATABASE_URL.startswith("sqlite")

# ── Engine ─────────────────────────────────────────────────────────────────────
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    echo=bool(int(os.getenv("DB_ECHO", "0"))),
)

# Enable WAL mode for SQLite — better concurrent read performance
if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_wal(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA journal_mode=WAL;")
        dbapi_conn.execute("PRAGMA foreign_keys=ON;")

# ── Session factory ────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Base class every ORM model inherits from ──────────────────────────────────
Base = declarative_base()


# ── FastAPI dependency ─────────────────────────────────────────────────────────
def get_db():
    """
    Yields a DB session scoped to one HTTP request.
    Always closed in the finally block — even on exceptions.
    Usage:  db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

