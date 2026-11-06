import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # student, advisor, hod, placement_officer, admin
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    student_profile: Mapped[Optional["StudentProfile"]] = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    approvals: Mapped[List["Approval"]] = relationship("Approval", back_populates="approver")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="actor")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="uploaded_by_user")
    student_documents: Mapped[List["StudentDocument"]] = relationship("StudentDocument", back_populates="owner")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    roll_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    admission_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    current_semester: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cgpa: Mapped[Optional[float]] = mapped_column(Numeric(4, 2), nullable=True)
    active_backlogs: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    credits_completed: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # Provenance / Source tracking (SELF_REPORTED, DOCUMENT_VERIFIED, NOT_PROVIDED)
    cgpa_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="NOT_PROVIDED")
    semester_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="NOT_PROVIDED")
    backlogs_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="NOT_PROVIDED")
    credits_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="NOT_PROVIDED")

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="student_profile")
    requests: Mapped[List["Request"]] = relationship("Request", back_populates="student")

