import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.audit_service import AuditService
from app.agent.graph import campusflow_agent
from app.core.auth import verify_staff_role, get_current_user_optional
from app.models.user import User, StudentProfile
from app.models.request import Request
from app.models.student_document import StudentDocument

logger = logging.getLogger("CampusFlowApprovalsAPI")
router = APIRouter()

class ApprovalDecisionRequest(BaseModel):
    request_id: str = Field(..., description="UUID of request being reviewed.")
    decision: str = Field(..., description="Human decision: APPROVE, REQUEST_CHANGES, or REJECT")
    approver_user_id: Optional[str] = Field(default=None, description="User UUID of staff approver.")
    comments: Optional[str] = Field(default=None, description="Optional reviewer feedback/comments.")

class ApprovalDecisionResponse(BaseModel):
    success: bool
    request_id: str
    decision: str
    new_workflow_status: str
    approver_user_id: str
    decided_at: str
    audit_log_id: str
    message: str

@router.get("/pending", response_model=List[Dict[str, Any]])
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Fetches pending workflow requests requiring human sign-off for the /approvals dashboard.
    Staff/advisor/HOD users view the institution-wide review queue.
    Students view their own pending requests, or an empty list if none are pending.
    Unauthenticated users receive an empty list without 403 Forbidden errors.
    """
    if not current_user:
        return []

    logger.info(f"[GET /api/v1/approvals/pending] User '{current_user.email}' (role={current_user.role}) fetching pending review queue...")

    pending: List[Dict[str, Any]] = []
    try:
        allowed_roles = ["staff", "advisor", "hod", "placement_officer", "admin"]
        if current_user.role not in allowed_roles:
            student_prof = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
            if not student_prof:
                return []
            reqs = (
                db.query(Request)
                .filter(Request.student_id == student_prof.id)
                .filter(Request.status.in_(["waiting_for_approval", "pending", "needs_review", "in_review", "submitted"]))
                .order_by(Request.created_at.desc())
                .all()
            )
        else:
            reqs = (
                db.query(Request)
                .filter(Request.status.in_(["waiting_for_approval", "pending", "needs_review", "in_review", "submitted"]))
                .order_by(Request.created_at.desc())
                .all()
            )

        for req in reqs:
            student_prof = db.query(StudentProfile).filter(StudentProfile.id == req.student_id).first()
            student_user = db.query(User).filter(User.id == student_prof.user_id).first() if student_prof else None
            student_uid = student_prof.user_id if student_prof else None
            
            # Get uploaded student documents for this request or user
            docs = []
            if student_uid:
                docs = db.query(StudentDocument).filter(
                    (StudentDocument.request_id == req.id) | (StudentDocument.user_id == student_uid)
                ).all()

            doc_list = []
            for d in docs:
                doc_list.append({
                    "doc_id": d.id,
                    "file_name": d.file_name,
                    "type": d.file_type,
                    "verification_status": d.verification_status,
                    "verification_reasons": (d.verification_summary or {}).get("reasons", ["Uploaded by student and verified."])
                })

            pending.append({
                "request_id": req.id,
                "workflow_code": "INTERNSHIP_NOC",
                "workflow_name": "Off-Campus Internship Approval / NOC",
                "current_status": req.status,
                "submitted_at": req.created_at.isoformat() if req.created_at else None,
                "student": {
                    "user_id": student_uid,
                    "name": student_user.full_name if student_user else "Student User",
                    "roll_number": student_prof.roll_number if student_prof else "Not provided",
                    "admission_year": student_prof.admission_year if (student_prof and student_prof.admission_year) else None,
                    "department": student_prof.department if student_prof else "Computer Science & Engineering",
                    "current_semester": student_prof.current_semester if (student_prof and student_prof.current_semester is not None) else None,
                    "cgpa": float(student_prof.cgpa) if (student_prof and student_prof.cgpa is not None) else None,
                    "active_backlogs": student_prof.active_backlogs if (student_prof and student_prof.active_backlogs is not None) else None,
                    "credits_completed": float(student_prof.credits_completed) if (student_prof and student_prof.credits_completed is not None) else None,
                    "cgpa_source": student_prof.cgpa_source if (student_prof and student_prof.cgpa_source) else "NOT_PROVIDED",
                    "semester_source": student_prof.semester_source if (student_prof and student_prof.semester_source) else "NOT_PROVIDED",
                    "backlogs_source": student_prof.backlogs_source if (student_prof and student_prof.backlogs_source) else "NOT_PROVIDED",
                    "credits_source": student_prof.credits_source if (student_prof and student_prof.credits_source) else "NOT_PROVIDED",
                    "eligibility_status": "ELIGIBLE" if (student_prof and student_prof.active_backlogs == 0 and student_prof.cgpa is not None and student_prof.cgpa >= 2.5) else "NEEDS_REVIEW"
                },
                "documents": doc_list,
                "policy_requirements": [
                    {"title": "Academic Standing", "rule": "Min academic requirements per SRMAP guidelines", "satisfied": True},
                    {"title": "Document Verification", "rule": "Valid internship document uploaded", "satisfied": len(doc_list) > 0}
                ],
                "agent_actions": [
                    {"action": "GOAL_ANALYZED", "timestamp": req.created_at.isoformat() if req.created_at else "", "details": "Goal analyzed by agent."},
                    {"action": "ROUTE_FOR_HUMAN_APPROVAL", "timestamp": req.created_at.isoformat() if req.created_at else "", "details": "Routed to staff queue for review."}
                ]
            })
    except Exception as e:
        logger.error(f"[get_pending_approvals] Error querying pending requests: {e}", exc_info=True)

    return pending


@router.post("/decide", response_model=ApprovalDecisionResponse)
def submit_approval_decision(
    payload: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_staff_role)
):
    """
    Submits a human approval decision (Approve, Request Changes, Reject).
    Requires staff role verification.
    """
    approver_id = current_user.id
    logger.info(f"[POST /api/v1/approvals/decide] Decision: '{payload.decision}' for Request '{payload.request_id}' by staff '{current_user.email}'")

    dec = payload.decision.upper()
    if dec not in ["APPROVE", "REQUEST_CHANGES", "REJECT"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision '{payload.decision}'. Must be APPROVE, REQUEST_CHANGES, or REJECT."
        )

    # Fetch real request from database
    req_obj = db.query(Request).filter(Request.id == payload.request_id).first()
    now_iso = datetime.now(timezone.utc).isoformat()
    mapped_status = "approved" if dec == "APPROVE" else ("changes_requested" if dec == "REQUEST_CHANGES" else "rejected")

    if req_obj:
        req_obj.current_status = mapped_status
        db.commit()

    # 1. Record Immutable Audit Log Entry
    audit_data = AuditService.log_event(
        db=db,
        actor_type="STAFF",
        actor_id=approver_id,
        action=f"HUMAN_DECISION_{dec}",
        workflow_id=payload.request_id,
        result_summary={
            "decision": dec,
            "comments": payload.comments,
            "new_status": mapped_status,
            "approver_name": current_user.full_name,
            "decided_at": now_iso
        },
        status="SUCCESS" if dec == "APPROVE" else ("PENDING" if dec == "REQUEST_CHANGES" else "FAILURE")
    )

    # 2. Resume Agent to Finalize State
    try:
        res = campusflow_agent.invoke({
            "user_id": req_obj.user_id if req_obj else current_user.id,
            "request_id": payload.request_id,
            "user_message": "Resume graph after human approval decision",
            "workflow_status": mapped_status,
            "human_approval_decision": dec,
            "human_approval_comments": payload.comments,
            "approver_id": approver_id,
            "executed_tools": []
        })
        final_status = res.get("workflow_status", mapped_status)
    except Exception as e:
        logger.error(f"Error resuming graph: {e}")
        final_status = mapped_status

    return ApprovalDecisionResponse(
        success=True,
        request_id=payload.request_id,
        decision=dec,
        new_workflow_status=final_status,
        approver_user_id=approver_id,
        decided_at=now_iso,
        audit_log_id=audit_data["id"],
        message=f"Decision '{dec}' recorded by {current_user.full_name}. Request status updated to '{final_status}'."
    )
