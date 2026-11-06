import uuid
from typing import List
from sqlalchemy.orm import Session
from app.models.user import User, StudentProfile
from app.models.workflow import Workflow, WorkflowStep
from app.models.request import Request, Approval
from app.models.execution import AuditLog
from app.schemas.workflow import (
    RequestCreateSchema,
    RequestResponseSchema,
    RequestDetailSchema,
    WorkflowStepSchema,
    ApprovalSchema,
    ActivityLogSchema
)
from app.core.exceptions import NotFoundException, BadRequestException

class WorkflowService:
    @staticmethod
    def get_all_requests_for_user(db: Session, current_user: User) -> List[RequestResponseSchema]:
        query = db.query(Request)
        
        # If user is a student, filter requests belonging only to this student
        if current_user.role == "student":
            student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
            if student_profile:
                query = query.filter(Request.student_id == student_profile.id)
            else:
                return []

        requests = query.order_by(Request.created_at.desc()).all()
        result = []
        for r in requests:
            res = RequestResponseSchema.model_validate(r)
            if r.workflow:
                res.workflow_code = r.workflow.code
                res.workflow_name = r.workflow.name
            result.append(res)
        return result

    @staticmethod
    def get_request_by_id(db: Session, request_id: str) -> RequestDetailSchema:
        req = db.query(Request).filter(Request.id == request_id).first()
        if not req:
            raise NotFoundException(detail=f"Workflow Request #{request_id} not found")

        res = RequestDetailSchema.model_validate(req)
        if req.workflow:
            res.workflow_code = req.workflow.code
            res.workflow_name = req.workflow.name
            
            # Fetch workflow steps
            steps = db.query(WorkflowStep).filter(WorkflowStep.workflow_id == req.workflow_id).order_by(WorkflowStep.step_number).all()
            res.steps = [WorkflowStepSchema.model_validate(s) for s in steps]

        # Fetch approvals
        approvals = db.query(Approval).filter(Approval.request_id == req.id).all()
        res.approvals = [ApprovalSchema.model_validate(a) for a in approvals]

        # Fetch activity logs
        logs = db.query(AuditLog).filter(AuditLog.request_id == req.id).order_by(AuditLog.created_at.asc()).all()
        res.activity_logs = [ActivityLogSchema.model_validate(l) for l in logs]

        return res

    @staticmethod
    def create_request_for_user(db: Session, current_user: User, payload: RequestCreateSchema) -> RequestResponseSchema:
        # 1. Verify workflow code exists
        workflow = db.query(Workflow).filter(Workflow.code == payload.workflow_code).first()
        if not workflow:
            # Auto-seed INTERNSHIP_NOC workflow template if first run
            if payload.workflow_code == "INTERNSHIP_NOC":
                workflow = Workflow(
                    id=str(uuid.uuid4()),
                    code="INTERNSHIP_NOC",
                    name="Internship NOC Approval Workflow",
                    description="Standard approval workflow for off-campus summer internships",
                    version=1,
                    is_active=True
                )
                db.add(workflow)
                db.flush()
            else:
                raise BadRequestException(detail=f"Invalid workflow_code: '{payload.workflow_code}'")

        # Ensure steps exist for workflow
        existing_steps = db.query(WorkflowStep).filter(WorkflowStep.workflow_id == workflow.id).all()
        if not existing_steps:
            steps = [
                WorkflowStep(id=str(uuid.uuid4()), workflow_id=workflow.id, step_number=1, name="Automated CGPA Check", step_type="automated_check"),
                WorkflowStep(id=str(uuid.uuid4()), workflow_id=workflow.id, step_number=2, name="Advisor Review", step_type="manual_approval", required_role="advisor"),
                WorkflowStep(id=str(uuid.uuid4()), workflow_id=workflow.id, step_number=3, name="HOD Approval", step_type="manual_approval", required_role="hod"),
                WorkflowStep(id=str(uuid.uuid4()), workflow_id=workflow.id, step_number=4, name="TPO NOC Generation", step_type="document_generation", required_role="placement_officer"),
            ]
            db.add_all(steps)
            db.flush()

        # 2. Get student profile associated with current authenticated user
        student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not student:
            adm_year = 2024
            if payload.student_roll_number:
                unique_roll = payload.student_roll_number.strip().upper()
                is_valid, msg = validate_srmap_roll_number(unique_roll, adm_year)
                if not is_valid:
                    raise HTTPException(status_code=400, detail=msg)
            else:
                numeric_part = str(abs(hash(current_user.id)))[:9].zfill(9)
                unique_roll = f"AP24{numeric_part}"
                if unique_roll == "AP24000000000":
                    unique_roll = "AP24110012146"

            existing_roll = db.query(StudentProfile).filter(StudentProfile.roll_number == unique_roll).first()
            if existing_roll:
                numeric_part = str(abs(hash(uuid.uuid4().hex)))[:9].zfill(9)
                unique_roll = f"AP24{numeric_part}"

            student = StudentProfile(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                roll_number=unique_roll,
                admission_year=adm_year,
                department="Computer Science & Engineering",
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
            db.flush()

        # 3. Create Request Record
        new_request = Request(
            id=str(uuid.uuid4()),
            student_id=student.id,
            workflow_id=workflow.id,
            current_step_number=1,
            status="submitted",
            metadata_json=payload.metadata
        )
        db.add(new_request)

        # 4. Create Audit Log Entry
        audit = AuditLog(
            id=str(uuid.uuid4()),
            request_id=new_request.id,
            actor_user_id=current_user.id,
            actor_type="student",
            action="WORKFLOW_SUBMITTED",
            previous_state={"status": "draft"},
            new_state={"status": "submitted", "current_step_number": 1}
        )
        db.add(audit)

        db.commit()
        db.refresh(new_request)

        res = RequestResponseSchema.model_validate(new_request)
        res.workflow_code = workflow.code
        res.workflow_name = workflow.name
        return res
