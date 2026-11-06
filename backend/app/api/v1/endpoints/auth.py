import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, StudentProfile
from app.core.security import (
    validate_email_format,
    validate_password_complexity,
    validate_srmap_roll_number,
    hash_password,
    verify_password,
    create_jwt_token
)
from app.core.auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    email: str = Field(..., description="User university email address")
    password: str = Field(..., description="Password complying with security policy")
    confirm_password: str = Field(..., description="Confirmation of password")
    full_name: str = Field(..., description="Full name of user")
    role: str = Field(default="student", description="Role: student, advisor, hod, placement_officer")
    admission_year: Optional[int] = Field(default=None, description="Admission Year (e.g. 2023, 2024, 2025)")
    roll_number: Optional[str] = Field(default=None, description="SRMAP Roll Number (e.g. AP24110012146)")
    department: Optional[str] = Field(default="Computer Science & Engineering")

class LoginRequest(BaseModel):
    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current password for verification")
    new_password: str = Field(..., description="New password complying with policy")
    confirm_new_password: str = Field(..., description="Confirmation of new password")

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    admission_year: Optional[int] = None
    roll_number: Optional[str] = None
    department: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., description="User email address")


@router.post("/register")
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new user account with strict email format, password complexity,
    and year-based SRMAP roll number format validation.
    """
    clean_email = payload.email.strip().lower()
    
    # 1. Email format validation
    if not validate_email_format(clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email address."
        )

    # 2. Confirm password matching
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    # 3. Password complexity validation
    is_valid_pass, pass_msg = validate_password_complexity(payload.password)
    if not is_valid_pass:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pass_msg
        )

    # 4. Check if user already exists
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 5. Roll Number Validation for Students
    clean_roll = payload.roll_number.strip().upper() if payload.roll_number else None
    if payload.role == "student" and clean_roll:
        is_valid_roll, roll_msg = validate_srmap_roll_number(clean_roll, payload.admission_year)
        if not is_valid_roll:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=roll_msg
            )
        # Check uniqueness of roll number
        existing_roll = db.query(StudentProfile).filter(StudentProfile.roll_number == clean_roll).first()
        if existing_roll:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Roll number '{clean_roll}' is already registered to another account."
            )

    # 6. Create user record
    new_user = User(
        id=str(uuid.uuid4()),
        email=clean_email,
        role=payload.role if payload.role in ["student", "advisor", "hod", "placement_officer", "admin"] else "student",
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password)
    )
    db.add(new_user)
    db.flush()

    # Create student profile if role is student
    if new_user.role == "student":
        adm_yr = payload.admission_year or 2024
        yy = str(adm_yr)[-2:]
        if clean_roll:
            final_roll = clean_roll
        else:
            num_part = str(abs(hash(new_user.id)))[:9].zfill(9)
            final_roll = f"AP{yy}{num_part}"

        student = StudentProfile(
            id=str(uuid.uuid4()),
            user_id=new_user.id,
            roll_number=final_roll,
            admission_year=adm_yr,
            department=payload.department or "Computer Science & Engineering",
            current_semester=None,
            cgpa=None,
            active_backlogs=None,
            credits_completed=None,
            cgpa_source="NOT_PROVIDED",
            semester_source="NOT_PROVIDED",
            backlogs_source="NOT_PROVIDED",
            credits_source="NOT_PROVIDED"
        )
        db.add(student)

    db.commit()
    db.refresh(new_user)

    # Fetch profile data for response
    profile_data = db.query(StudentProfile).filter(StudentProfile.user_id == new_user.id).first()
    token = create_jwt_token(new_user.id, new_user.email, new_user.role)
    return {
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.full_name,
            "role": new_user.role,
            "roll_number": profile_data.roll_number if profile_data else "",
            "department": profile_data.department if profile_data else ""
        },
        "access_token": token,
        "token_type": "bearer"
    }


@router.post("/login")
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    
    if not validate_email_format(clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email address."
        )

    if not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter your password."
        )

    generic_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password."
    )

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise generic_error

    if user.password_hash:
        if not verify_password(payload.password, user.password_hash):
            raise generic_error
    else:
        user.password_hash = hash_password(payload.password)
        db.commit()

    token = create_jwt_token(user.id, user.email, user.role)
    prof = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.full_name,
            "role": user.role,
            "roll_number": prof.roll_number if prof else "",
            "department": prof.department if prof else ""
        },
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/me")
def get_current_user_profile(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if not current_user:
        return {
            "authenticated": False,
            "id": None,
            "email": None,
            "name": None,
            "role": None,
            "roll_number": "",
            "department": "",
            "student_profile": None
        }

    prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    is_complete = bool(
        prof and 
        prof.current_semester is not None and 
        prof.cgpa is not None and 
        prof.active_backlogs is not None and 
        prof.credits_completed is not None
    )
    return {
        "authenticated": True,
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.full_name,
        "role": current_user.role,
        "roll_number": prof.roll_number if prof else "",
        "department": prof.department if prof else "",
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "student_profile": {
            "roll_number": prof.roll_number if prof else "Not provided",
            "admission_year": prof.admission_year if prof else None,
            "department": prof.department if prof else "Not provided",
            "current_semester": prof.current_semester if (prof and prof.current_semester is not None) else None,
            "cgpa": float(prof.cgpa) if (prof and prof.cgpa is not None) else None,
            "active_backlogs": prof.active_backlogs if (prof and prof.active_backlogs is not None) else None,
            "credits_completed": float(prof.credits_completed) if (prof and prof.credits_completed is not None) else None,
            "cgpa_source": prof.cgpa_source if (prof and prof.cgpa_source) else "NOT_PROVIDED",
            "semester_source": prof.semester_source if (prof and prof.semester_source) else "NOT_PROVIDED",
            "backlogs_source": prof.backlogs_source if (prof and prof.backlogs_source) else "NOT_PROVIDED",
            "credits_source": prof.credits_source if (prof and prof.credits_source) else "NOT_PROVIDED",
            "is_complete": is_complete
        } if current_user.role == "student" else None
    }


@router.put("/profile")
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates user profile & validates roll_number format against admission_year."""
    if payload.full_name and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()

    prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if prof and current_user.role == "student":
        adm_year = payload.admission_year or prof.admission_year or 2024
        if payload.roll_number:
            clean_roll = payload.roll_number.strip().upper()
            is_valid, msg = validate_srmap_roll_number(clean_roll, adm_year)
            if not is_valid:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
            prof.roll_number = clean_roll
        
        if payload.admission_year:
            prof.admission_year = payload.admission_year
        if payload.department:
            prof.department = payload.department.strip()

    db.commit()
    return {"success": True, "message": "Profile updated successfully."}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Changes user password with complexity & validation checks."""
    if current_user.password_hash and not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password."
        )

    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match."
        )

    is_valid, msg = validate_password_complexity(payload.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "success", "message": "Password changed successfully."}

