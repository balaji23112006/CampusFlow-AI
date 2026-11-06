from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def init_db_migrations():
    """Applies dynamic migrations to add new columns to existing tables if missing."""
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE policy_knowledge ADD COLUMN IF NOT EXISTS knowledge_scope VARCHAR(32) DEFAULT 'UNIVERSITY'"))
            conn.execute(text("ALTER TABLE policy_knowledge ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)"))
            conn.execute(text("ALTER TABLE policy_knowledge ADD COLUMN IF NOT EXISTS document_id VARCHAR(36)"))
            conn.execute(text("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS admission_year INTEGER"))
            conn.execute(text("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS cgpa_source VARCHAR(50) DEFAULT 'NOT_PROVIDED'"))
            conn.execute(text("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS semester_source VARCHAR(50) DEFAULT 'NOT_PROVIDED'"))
            conn.execute(text("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS backlogs_source VARCHAR(50) DEFAULT 'NOT_PROVIDED'"))
            conn.execute(text("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS credits_source VARCHAR(50) DEFAULT 'NOT_PROVIDED'"))
            conn.execute(text("ALTER TABLE student_profiles ALTER COLUMN current_semester DROP NOT NULL"))
            conn.execute(text("ALTER TABLE student_profiles ALTER COLUMN cgpa DROP NOT NULL"))
            conn.execute(text("ALTER TABLE student_profiles ALTER COLUMN active_backlogs DROP NOT NULL"))
            conn.execute(text("ALTER TABLE student_profiles ALTER COLUMN credits_completed DROP NOT NULL"))
            conn.commit()
    except Exception as e:
        pass

# Run migrations on import
init_db_migrations()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_connection() -> dict:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"connected": True, "database_url_type": settings.DATABASE_URL.split(":")[0]}
    except Exception as e:
        return {"connected": False, "error": str(e)}
