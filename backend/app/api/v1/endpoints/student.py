from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, StudentProfile
from app.core.auth import get_current_user
from app.services.audit_service import AuditService

router = APIRouter(prefix="/student", tags=["student"])


class AcademicProfileUpdateRequest(BaseModel):
    roll_number: Optional[str] = Field(default=None, description="University Roll Number e.g. AP24110012146")
    admission_year: Optional[int] = Field(default=None, description="Admission/Batch year e.g. 2024")
    current_semester: Optional[int] = Field(default=None, description="Current semester (1 to 8)")
    cgpa: Optional[float] = Field(default=None, description="Current CGPA (0.00 to 10.00)")
    active_backlogs: Optional[int] = Field(default=None, description="Number of active backlogs (>= 0)")
    credits_completed: Optional[float] = Field(default=None, description="Total credits completed (>= 0.0)")


@router.get("/academic-profile")
def get_academic_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Academic profile is only accessible to student accounts."
        )

    prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not prof:
        return {
            "roll_number": "Not provided",
            "admission_year": None,
            "department": "Not provided",
            "current_semester": None,
            "cgpa": None,
            "active_backlogs": None,
            "credits_completed": None,
            "cgpa_source": "NOT_PROVIDED",
            "semester_source": "NOT_PROVIDED",
            "backlogs_source": "NOT_PROVIDED",
            "credits_source": "NOT_PROVIDED",
            "is_complete": False
        }

    is_complete = bool(
        prof.current_semester is not None and
        prof.cgpa is not None and
        prof.active_backlogs is not None and
        prof.credits_completed is not None
    )

    return {
        "roll_number": prof.roll_number,
        "admission_year": prof.admission_year,
        "department": prof.department,
        "current_semester": prof.current_semester,
        "cgpa": float(prof.cgpa) if prof.cgpa is not None else None,
        "active_backlogs": prof.active_backlogs,
        "credits_completed": float(prof.credits_completed) if prof.credits_completed is not None else None,
        "cgpa_source": prof.cgpa_source or "NOT_PROVIDED",
        "semester_source": prof.semester_source or "NOT_PROVIDED",
        "backlogs_source": prof.backlogs_source or "NOT_PROVIDED",
        "credits_source": prof.credits_source or "NOT_PROVIDED",
        "is_complete": is_complete
    }


@router.put("/academic-profile")
def update_academic_profile(
    payload: AcademicProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Academic profile updates are only permitted for student accounts."
        )

    prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile record not found."
        )

    # Validations
    if payload.roll_number is not None and payload.roll_number.strip():
        clean_roll = payload.roll_number.strip().upper()
        existing_roll = db.query(StudentProfile).filter(
            StudentProfile.roll_number == clean_roll,
            StudentProfile.user_id != current_user.id
        ).first()
        if existing_roll:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Roll number '{clean_roll}' is already assigned to another account."
            )
        prof.roll_number = clean_roll

    if payload.admission_year is not None:
        if payload.admission_year < 2000 or payload.admission_year > 2099:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admission year must be a valid 4-digit year (e.g. 2024)."
            )
        prof.admission_year = payload.admission_year

    if payload.current_semester is not None:
        if payload.current_semester < 1 or payload.current_semester > 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current semester must be between 1 and 8."
            )
        prof.current_semester = payload.current_semester
        prof.semester_source = "SELF_REPORTED"

    if payload.cgpa is not None:
        if payload.cgpa < 0.0 or payload.cgpa > 10.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enter a valid CGPA between 0.0 and 10.0."
            )
        prof.cgpa = payload.cgpa
        prof.cgpa_source = "SELF_REPORTED"

    if payload.active_backlogs is not None:
        if payload.active_backlogs < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Active backlogs must be a non-negative integer."
            )
        prof.active_backlogs = payload.active_backlogs
        prof.backlogs_source = "SELF_REPORTED"

    if payload.credits_completed is not None:
        if payload.credits_completed < 0.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credits completed must be a non-negative number."
            )
        prof.credits_completed = payload.credits_completed
        prof.credits_source = "SELF_REPORTED"

    db.commit()
    db.refresh(prof)

    # Audit Trail Logging
    AuditService.log_event(
        db=db,
        actor_type="STUDENT",
        actor_id=current_user.id,
        action="ACADEMIC_PROFILE_UPDATED",
        status="SUCCESS",
        result_summary={
            "current_semester": prof.current_semester,
            "cgpa": float(prof.cgpa) if prof.cgpa is not None else None,
            "active_backlogs": prof.active_backlogs,
            "credits_completed": float(prof.credits_completed) if prof.credits_completed is not None else None
        }
    )

    is_complete = bool(
        prof.current_semester is not None and
        prof.cgpa is not None and
        prof.active_backlogs is not None and
        prof.credits_completed is not None
    )

    return {
        "success": True,
        "message": "Academic profile updated successfully.",
        "student_profile": {
            "roll_number": prof.roll_number,
            "admission_year": prof.admission_year,
            "department": prof.department,
            "current_semester": prof.current_semester,
            "cgpa": float(prof.cgpa) if prof.cgpa is not None else None,
            "active_backlogs": prof.active_backlogs,
            "credits_completed": float(prof.credits_completed) if prof.credits_completed is not None else None,
            "cgpa_source": prof.cgpa_source,
            "semester_source": prof.semester_source,
            "backlogs_source": prof.backlogs_source,
            "credits_source": prof.credits_source,
            "is_complete": is_complete
        }
    }
