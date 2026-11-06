import uuid
from datetime import datetime, timezone
from typing import Optional, List, Any
from sqlalchemy import String, Integer, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Request(Base):
    __tablename__ = "requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.id"), nullable=False)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflows.id"), nullable=False)
    current_step_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)  # draft, submitted, in_review, approved, rejected, action_required
    metadata_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    student: Mapped["StudentProfile"] = relationship("StudentProfile", back_populates="requests")
    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="requests")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="request")
    approvals: Mapped[List["Approval"]] = relationship("Approval", back_populates="request")
    tool_executions: Mapped[List["ToolExecution"]] = relationship("ToolExecution", back_populates="request")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="request")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(String(36), ForeignKey("requests.id"), nullable=False)
    requirement_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("document_requirements.id"), nullable=True)
    uploaded_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    request: Mapped["Request"] = relationship("Request", back_populates="documents")
    requirement: Mapped[Optional["DocumentRequirement"]] = relationship("DocumentRequirement", back_populates="documents")
    uploaded_by_user: Mapped["User"] = relationship("User", back_populates="documents")


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(String(36), ForeignKey("requests.id"), nullable=False)
    step_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_steps.id"), nullable=False)
    approver_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, approved, rejected, requested_changes
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    request: Mapped["Request"] = relationship("Request", back_populates="approvals")
    step: Mapped["WorkflowStep"] = relationship("WorkflowStep", back_populates="approvals")
    approver: Mapped["User"] = relationship("User", back_populates="approvals")
