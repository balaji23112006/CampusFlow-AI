from fastapi import APIRouter
from app.core.config import settings
from app.db.session import check_database_connection

router = APIRouter()

@router.get("/health", tags=["Health"])
@router.get("/api/health", tags=["Health"])
def get_health():
    """
    System and Database Health Check
    """
    db_status = check_database_connection()
    return {
        "status": "ok" if db_status.get("connected") else "degraded",
        "service": settings.PROJECT_NAME,
        "database": db_status
    }
