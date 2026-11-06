from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, StudentProfile
from app.models.request import Request
from app.core.exceptions import NotFoundException
from app.core.security import decode_jwt_token

security = HTTPBearer(auto_error=False)

class AuthenticatedUserPayload:
    def __init__(self, user_id: str, email: str, role: str):
        self.user_id = user_id
        self.email = email
        self.role = role

def decode_token(token: str) -> AuthenticatedUserPayload:
    """
    Decodes JWT token enforcing cryptographic signature verification.
    No unverified dev tokens, mock logins, or fallback user defaults permitted.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token"
        )

    payload = decode_jwt_token(token)
    user_id = payload.get("sub")
    email = payload.get("email", "")
    role = payload.get("role") or payload.get("user_metadata", {}).get("role", "student")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims: missing subject identifier"
        )

    return AuthenticatedUserPayload(user_id=user_id, email=email, role=role)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Retrieves authenticated user from DB via verified JWT token.
    Raises 401 Unauthorized if token is invalid or user account does not exist in DB.
    Does NOT auto-create user accounts implicitly.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token header",
            headers={"WWW-Authenticate": "Bearer"}
        )

    auth_payload = decode_token(credentials.credentials)

    user = db.query(User).filter(User.id == auth_payload.user_id).first()
    if not user and auth_payload.email:
        user = db.query(User).filter(User.email == auth_payload.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Please register first."
        )

    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieves user if valid bearer token provided, else None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        auth_payload = decode_token(credentials.credentials)
        user = db.query(User).filter(User.id == auth_payload.user_id).first()
        if not user and auth_payload.email:
            user = db.query(User).filter(User.email == auth_payload.email).first()
        return user
    except Exception:
        return None


def verify_workflow_ownership(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Request:
    """
    Verifies that the requested workflow exists and belongs to the authenticated user.
    Prevents User A from viewing or modifying User B's workflows.
    """
    req = db.query(Request).filter(Request.id == workflow_id).first()
    if not req:
        raise NotFoundException(detail=f"Workflow Request #{workflow_id} not found")

    if current_user.role == "student":
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not student_profile or req.student_id != student_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You do not have authorization to access another student's workflow request."
            )

    return req


def verify_staff_role(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency helper verifying user has administrative/staff permissions for approval actions.
    """
    allowed_roles = ["staff", "advisor", "hod", "placement_officer", "admin"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Administrative or staff role required to perform approval decisions."
        )
    return current_user
