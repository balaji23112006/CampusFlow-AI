from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.auth import get_current_user_optional
from app.models.user import User
from app.schemas.rag import RAGQueryRequestSchema, RAGQueryResponseSchema
from app.services.rag_service import RAGService

router = APIRouter(prefix="/rag", tags=["RAG Policy Search"])

@router.post("/query", response_model=RAGQueryResponseSchema)
def query_policy_rag(
    payload: RAGQueryRequestSchema,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Dual RAG Semantic Search Endpoint:
    Queries official university policy (UNIVERSITY scope) and/or user's uploaded private documents (STUDENT scope).
    Cross-student privacy is enforced — Student A can NEVER retrieve Student B's private RAG chunks.
    """
    user_id = current_user.id if current_user else None
    return RAGService.query_rag_pipeline(
        db,
        question=payload.question,
        top_k=payload.top_k or 4,
        user_id=user_id,
        scope=payload.scope or "COMBINED"
    )
