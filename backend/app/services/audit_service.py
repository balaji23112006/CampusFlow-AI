import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.execution import AuditLog

logger = logging.getLogger("CampusFlowAudit")

SENSITIVE_KEYS = {"password", "token", "api_key", "secret", "authorization", "bearer", "private_key"}

class AuditService:
    """
    Complete Audit Trail Service for CampusFlow AI.
    Records immutable execution history for actors: STUDENT, AGENT, SYSTEM, STAFF.
    Ensures sensitive credentials and secrets are stripped prior to storage.
    """

    @staticmethod
    def sanitize_payload(payload: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not payload or not isinstance(payload, dict):
            return payload

        sanitized = {}
        for k, v in payload.items():
            if any(s_key in k.lower() for s_key in SENSITIVE_KEYS):
                sanitized[k] = "[REDACTED_SECRET]"
            elif isinstance(v, dict):
                sanitized[k] = AuditService.sanitize_payload(v)
            else:
                sanitized[k] = v
        return sanitized

    @staticmethod
    def log_event(
        db: Optional[Session],
        actor_type: str,  # STUDENT, AGENT, SYSTEM, STAFF
        actor_id: Optional[str],
        action: str,
        workflow_id: Optional[str] = None,
        tool_used: Optional[str] = None,
        input_summary: Optional[Dict[str, Any]] = None,
        result_summary: Optional[Dict[str, Any]] = None,
        status: str = "SUCCESS",  # SUCCESS, FAILURE, PENDING, NEEDS_REVIEW
        error_info: Optional[str] = None
    ) -> Dict[str, Any]:
        
        sanitized_input = AuditService.sanitize_payload(input_summary)
        sanitized_result = AuditService.sanitize_payload(result_summary)

        log_data = {
            "id": f"aud-{uuid.uuid4().hex[:12]}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor_type": actor_type.upper(),
            "actor_id": actor_id or None,
            "action": action,
            "workflow_id": workflow_id,
            "tool_used": tool_used,
            "input_summary": sanitized_input,
            "result_summary": sanitized_result,
            "status": status,
            "error_info": error_info
        }

        logger.info(f"[AUDIT LOG RECORDED] Actor: '{actor_type}' ({actor_id}) | Action: '{action}' | Workflow: '{workflow_id}' | Status: '{status}'")

        target_db = db
        own_session = False
        if not target_db:
            try:
                from app.db.session import SessionLocal
                target_db = SessionLocal()
                own_session = True
            except Exception as se:
                logger.error(f"Failed creating db session for audit log: {se}")

        if target_db:
            try:
                from app.models.request import Request
                valid_request_id = None
                if workflow_id:
                    existing_req = target_db.query(Request).filter(Request.id == workflow_id).first()
                    if existing_req:
                        valid_request_id = workflow_id

                prev_state = {"tool_used": tool_used, "input": sanitized_input}
                if workflow_id and not valid_request_id:
                    prev_state["workflow_id"] = workflow_id

                db_entry = AuditLog(
                    id=log_data["id"],
                    request_id=valid_request_id,
                    actor_user_id=actor_id if actor_type.upper() in ["STUDENT", "STAFF"] else None,
                    actor_type=actor_type.upper(),
                    action=action,
                    previous_state=prev_state,
                    new_state={"status": status, "result": sanitized_result, "error": error_info},
                    created_at=datetime.now(timezone.utc)
                )
                target_db.add(db_entry)
                target_db.commit()
            except Exception as e:
                logger.error(f"Failed to persist audit log to DB: {e}")
                if target_db:
                    target_db.rollback()
            finally:
                if own_session and target_db:
                    target_db.close()

        return log_data

    @staticmethod
    def get_workflow_audit_history(db: Session, workflow_id: str) -> List[Dict[str, Any]]:
        entries = db.query(AuditLog).filter(AuditLog.request_id == workflow_id).order_by(AuditLog.created_at.asc()).all()
        history = []
        for entry in entries:
            prev = entry.previous_state or {}
            nxt = entry.new_state or {}
            history.append({
                "id": entry.id,
                "timestamp": entry.created_at.isoformat(),
                "actor_type": entry.actor_type,
                "actor_id": entry.actor_user_id or "AGENT",
                "action": entry.action,
                "workflow_id": entry.request_id,
                "tool_used": prev.get("tool_used"),
                "input_summary": prev.get("input"),
                "result_summary": nxt.get("result"),
                "status": nxt.get("status", "SUCCESS"),
                "error_info": nxt.get("error")
            })
        return history
