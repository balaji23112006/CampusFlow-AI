from fastapi import APIRouter
from app.api.v1.endpoints import health, workflows, documents, rag, approvals, auth, agent, audit, student_documents, student

api_router = APIRouter()

# Include Sub-Routers
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(student.router)
api_router.include_router(agent.router)
api_router.include_router(audit.router)
api_router.include_router(workflows.router)
api_router.include_router(documents.router)
api_router.include_router(student_documents.router)
api_router.include_router(rag.router)
api_router.include_router(approvals.router, prefix="/approvals", tags=["approvals"])

