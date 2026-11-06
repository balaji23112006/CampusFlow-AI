import uuid
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import String, Text, DateTime, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base

class PolicyKnowledge(Base):
    __tablename__ = "policy_knowledge"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    
    # Dual RAG scope & security ownership fields
    knowledge_scope: Mapped[str] = mapped_column(String(32), default="UNIVERSITY", index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    document_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)

    # Source document tracking
    source_file: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    chunk_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
