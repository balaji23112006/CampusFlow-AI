from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class WorkflowStepSchema(BaseModel):
    id: str
    step_number: int
    name: str
    step_type: str
    required_role: Optional[str] = None

    class Config:
        from_attributes = True

class DocumentRequirementSchema(BaseModel):
    id: str
    document_type: str
    name: str
    is_mandatory: bool

    class Config:
        from_attributes = True

class ApprovalSchema(BaseModel):
    id: str
    step_id: str
    approver_user_id: str
    status: str
    comments: Optional[str] = None
    decided_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ActivityLogSchema(BaseModel):
    id: str
    actor_type: str
    action: str
    created_at: datetime

    class Config:
        from_attributes = True

class WorkflowSchema(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    version: int
    is_active: bool

    class Config:
        from_attributes = True

class RequestCreateSchema(BaseModel):
    workflow_code: str = Field(..., example="INTERNSHIP_NOC")
    student_roll_number: str = Field(..., example="AP24XXXXXXXXX")
    metadata: Optional[dict] = Field(
        default={},
        example={
            "company_name": "",
            "role": "",
            "start_date": "",
            "end_date": ""
        }
    )

class RequestResponseSchema(BaseModel):
    id: str
    student_id: str
    workflow_id: str
    workflow_code: Optional[str] = None
    workflow_name: Optional[str] = None
    current_step_number: int
    status: str
    metadata_json: Optional[Any] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RequestDetailSchema(RequestResponseSchema):
    steps: List[WorkflowStepSchema] = []
    approvals: List[ApprovalSchema] = []
    activity_logs: List[ActivityLogSchema] = []

    class Config:
        from_attributes = True
