import logging
from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel
from app.services.audit_service import AuditService

logger = logging.getLogger("CampusFlowFailureRecovery")

class FailureCategory(str, Enum):
    MISSING_DOCUMENT = "MISSING_DOCUMENT"
    INVALID_DOCUMENT = "INVALID_DOCUMENT"
    LLM_FAILURE = "LLM_FAILURE"
    RAG_FAILURE = "RAG_FAILURE"
    DB_FAILURE = "DB_FAILURE"
    TOOL_TIMEOUT = "TOOL_TIMEOUT"
    SUBMISSION_FAILURE = "SUBMISSION_FAILURE"
    DUPLICATE_REQUEST = "DUPLICATE_REQUEST"
    MISSING_USER_INFO = "MISSING_USER_INFO"

class FailureRecoveryResult(BaseModel):
    failure_category: FailureCategory
    is_retryable: bool
    retry_count: int
    new_workflow_status: str
    user_status_message: str
    audit_action: str
    escalated_to_human: bool

class FailureRecoveryEngine:
    """
    Failure Recovery & Resiliency Engine for CampusFlow AI.
    Handles 9 failure modes with explicit classification, retry safety checks,
    fallbacks, human escalation, workflow state updates, and audit logging.
    """

    MAX_RETRIES = {
        FailureCategory.LLM_FAILURE: 3,
        FailureCategory.RAG_FAILURE: 1,
        FailureCategory.DB_FAILURE: 2,
        FailureCategory.TOOL_TIMEOUT: 1,
        FailureCategory.SUBMISSION_FAILURE: 1,
    }

    @classmethod
    def handle_failure(
        cls,
        failure_category: FailureCategory,
        current_status: str,
        retry_count: int = 0,
        error_message: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        db_session: Any = None
    ) -> FailureRecoveryResult:
        ctx = context or {}
        req_id = ctx.get("request_id")
        user_id = ctx.get("user_id")

        logger.warning(f"[FAILURE DETECTED] Category: '{failure_category}' | Current Status: '{current_status}' | Retry: {retry_count}")

        # Default fallback parameters
        is_retryable = False
        new_status = "failed"
        user_msg = "An unexpected error occurred. Please contact university support."
        escalated = False
        audit_action = f"FAILURE_{failure_category.value}"

        max_allowed = cls.MAX_RETRIES.get(failure_category, 0)

        # 1. MISSING_DOCUMENT
        if failure_category == FailureCategory.MISSING_DOCUMENT:
            is_retryable = False
            new_status = "waiting_for_document"
            missing_list = ctx.get("missing_documents", ["Offer Letter PDF", "Parent Consent Form"])
            user_msg = f"Action Required: Missing mandatory documents ({', '.join(missing_list)}). Please upload them to continue."

        # 2. INVALID_DOCUMENT
        elif failure_category == FailureCategory.INVALID_DOCUMENT:
            is_retryable = False
            new_status = "waiting_for_document"
            reasons = ctx.get("reasons", ["Document validation failed policy criteria."])
            user_msg = f"Document Verification Warning: {'; '.join(reasons)}. Please upload a corrected document."

        # 3. LLM_FAILURE
        elif failure_category == FailureCategory.LLM_FAILURE:
            if retry_count < max_allowed:
                is_retryable = True
                new_status = current_status
                user_msg = f"AI service temporarily busy (Attempt {retry_count + 1}/{max_allowed}). Retrying operation..."
            else:
                is_retryable = False
                new_status = "planning"
                user_msg = "LLM service limit reached. Fallback: Applying standard rule-based policy verification."

        # 4. RAG_FAILURE
        elif failure_category == FailureCategory.RAG_FAILURE:
            if retry_count < max_allowed:
                is_retryable = True
                new_status = current_status
                user_msg = "Re-querying policy knowledge base..."
            else:
                is_retryable = False
                new_status = "planning"
                user_msg = "Notice: Specific policy clause not retrieved. Applying standard synthetic university guidelines."

        # 5. DB_FAILURE
        elif failure_category == FailureCategory.DB_FAILURE:
            if retry_count < max_allowed:
                is_retryable = True
                new_status = current_status
                user_msg = "Database connection transient. Re-trying transaction..."
            else:
                is_retryable = False
                new_status = "failed"
                escalated = True
                user_msg = "System Database Error: Unable to persist transaction. Routed to IT support."

        # 6. TOOL_TIMEOUT
        elif failure_category == FailureCategory.TOOL_TIMEOUT:
            is_read_tool = ctx.get("tool_name") in ["search_policy", "get_student_profile"]
            if is_read_tool and retry_count < max_allowed:
                is_retryable = True
                new_status = current_status
                user_msg = "Tool execution timed out. Retrying read query..."
            else:
                is_retryable = False
                new_status = "needs_review"
                escalated = True
                user_msg = "Automated tool execution timed out. Escalated to human staff for manual verification."

        # 7. SUBMISSION_FAILURE
        elif failure_category == FailureCategory.SUBMISSION_FAILURE:
            if retry_count < max_allowed:
                is_retryable = True
                new_status = current_status
                user_msg = "Workflow submission transaction failed. Retrying submission..."
            else:
                is_retryable = False
                new_status = "failed"
                escalated = True
                user_msg = "Submission Error: Workflow creation could not complete. Escalated to support."

        # 8. DUPLICATE_REQUEST
        elif failure_category == FailureCategory.DUPLICATE_REQUEST:
            is_retryable = False
            new_status = "planning"
            existing_id = ctx.get("existing_request_id", "req-active-001")
            user_msg = f"Notice: An active workflow ({existing_id}) already exists. Linked your inquiry to the existing workflow."

        # 9. MISSING_USER_INFO
        elif failure_category == FailureCategory.MISSING_USER_INFO:
            is_retryable = False
            new_status = "waiting_for_document"
            missing_fields = ctx.get("missing_fields", ["Roll Number", "Department"])
            user_msg = f"Profile Incomplete: Missing required fields ({', '.join(missing_fields)}). Please complete your profile."

        # Write Audit Log Entry
        AuditService.log_event(
            db=db_session,
            actor_type="AGENT",
            actor_id="failure-recovery-engine",
            action=audit_action,
            workflow_id=req_id,
            tool_used=ctx.get("tool_name"),
            input_summary={"category": failure_category.value, "retry_count": retry_count},
            result_summary={"new_status": new_status, "user_msg": user_msg, "escalated": escalated},
            status="FAILURE" if new_status == "failed" else ("NEEDS_REVIEW" if escalated else "SUCCESS"),
            error_info=error_message or user_msg
        )

        return FailureRecoveryResult(
            failure_category=failure_category,
            is_retryable=is_retryable,
            retry_count=retry_count + 1 if is_retryable else retry_count,
            new_workflow_status=new_status,
            user_status_message=user_msg,
            audit_action=audit_action,
            escalated_to_human=escalated
        )
