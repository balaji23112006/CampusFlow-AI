from fastapi import APIRouter, Depends, status
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.workflow import (
    RequestCreateSchema,
    RequestResponseSchema,
    RequestDetailSchema,
)
from app.services.workflow_service import WorkflowService
from app.models.user import User
from app.models.request import Request
from app.core.auth import get_current_user, verify_workflow_ownership

router = APIRouter(prefix="/workflows", tags=["Workflows"])

@router.get("", response_model=List[RequestResponseSchema])
def list_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get workflow requests (Student can only view their own requests)
    """
    return WorkflowService.get_all_requests_for_user(db, current_user)

@router.get("/{workflow_id}", response_model=RequestDetailSchema)
def get_workflow_by_id(
    workflow_id: str,
    req: Request = Depends(verify_workflow_ownership),
    db: Session = Depends(get_db)
):
    """
    Get detailed workflow request by ID (Enforces ownership check for students)
    """
    return WorkflowService.get_request_by_id(db, req.id)

@router.post("", response_model=RequestResponseSchema, status_code=status.HTTP_201_CREATED)
def create_workflow(
    payload: RequestCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate a new administrative workflow request
    """
    return WorkflowService.create_request_for_user(db, current_user, payload)
