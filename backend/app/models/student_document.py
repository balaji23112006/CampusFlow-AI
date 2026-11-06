import uuid
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import String, Text, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class StudentDocument(Base):
    __tablename__ = "student_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("requests.id"), nullable=True, index=True)
    
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    file_type: Mapped[str] = mapped_column(String(64), nullable=False, default="OTHER")  # OFFER_LETTER, JOINING_REPORT, SYNOPSIS, etc.
    mime_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(32), default="PROCESSING", index=True)  # PROCESSING, VERIFIED, NEEDS_REVIEW, INVALID, ERROR
    verification_summary: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="student_documents")
