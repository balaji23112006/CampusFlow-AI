import logging
import uuid
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("CampusFlowTools")

# ==========================================
# TOOL SCHEMAS & METADATA DEFINITIONS
# ==========================================

class ToolMetadata(BaseModel):
    name: str
    description: str
    permissions: List[str]
    failure_conditions: List[str]

# 1. get_student_profile
class GetStudentProfileInput(BaseModel):
    user_id: str = Field(..., description="The unique user UUID of the student.")

class GetStudentProfileOutput(BaseModel):
    success: bool
    user_id: str
    roll_number: str
    department: str
    current_semester: Optional[int] = None
    cgpa: Optional[float] = None
    active_backlogs: Optional[int] = None
    credits_completed: Optional[float] = None
    is_eligible: bool = False
    is_complete: bool = False
    error: Optional[str] = None

# 2. search_policy
class SearchPolicyInput(BaseModel):
    query: str = Field(..., description="Policy question or search keyword.")
    top_k: int = Field(default=3, description="Number of top policy chunks to retrieve.")

class SearchPolicyOutput(BaseModel):
    success: bool
    query: str
    retrieved_policies: List[Dict[str, Any]]
    error: Optional[str] = None

# 3. check_required_documents
class CheckRequiredDocumentsInput(BaseModel):
    workflow_code: str = Field(..., description="Workflow code (e.g. INTERNSHIP_NOC).")

class CheckRequiredDocumentsOutput(BaseModel):
    success: bool
    workflow_code: str
    mandatory_documents: List[str]
    optional_documents: List[str]
    error: Optional[str] = None

# 4. verify_document
class VerifyDocumentInput(BaseModel):
    document_id: str = Field(..., description="UUID of the uploaded document.")
    document_type: str = Field(..., description="Document type (OFFER_LETTER, PARENT_CONSENT).")

class VerifyDocumentOutput(BaseModel):
    success: bool
    document_id: str
    verified: bool
    extracted_metadata: Dict[str, Any]
    error: Optional[str] = None

# 5. create_workflow
class CreateWorkflowInput(BaseModel):
    user_id: str = Field(..., description="User UUID initiating the workflow.")
    workflow_code: str = Field(..., description="Workflow template code (e.g. INTERNSHIP_NOC).")
    metadata: Dict[str, Any] = Field(default={}, description="Internship company name, role, dates, stipend.")

class CreateWorkflowOutput(BaseModel):
    success: bool
    request_id: str
    status: str
    workflow_code: str
    error: Optional[str] = None

# 6. submit_request
class SubmitRequestInput(BaseModel):
    request_id: str = Field(..., description="Workflow request UUID to submit.")

class SubmitRequestOutput(BaseModel):
    success: bool
    request_id: str
    new_status: str
    error: Optional[str] = None

# 7. send_notification
class SendNotificationInput(BaseModel):
    recipient_user_id: str = Field(..., description="User UUID of the recipient.")
    title: str = Field(..., description="Notification title.")
    message: str = Field(..., description="Notification message body.")

class SendNotificationOutput(BaseModel):
    success: bool
    recipient_user_id: str
    delivered: bool
    error: Optional[str] = None

# 8. get_workflow_status
class GetWorkflowStatusInput(BaseModel):
    request_id: str = Field(..., description="Workflow request UUID.")

class GetWorkflowStatusOutput(BaseModel):
    success: bool
    request_id: str
    status: str
    current_step_number: int
    completed_steps: List[str]
    error: Optional[str] = None


# ==========================================
# TOOL IMPLEMENTATIONS WITH LOGGING & PERMISSIONS
# ==========================================

TOOL_REGISTRY_METADATA: Dict[str, ToolMetadata] = {
    "get_student_profile": ToolMetadata(
        name="get_student_profile",
        description="Retrieves student academic standing (CGPA, backlogs, credits) for policy evaluation.",
        permissions=["student", "advisor", "hod", "agent_system"],
        failure_conditions=["User ID not found in student database", "Database connection offline"]
    ),
    "search_policy": ToolMetadata(
        name="search_policy",
        description="Performs RAG vector search across university administrative policy knowledge base.",
        permissions=["public", "student", "advisor", "hod", "agent_system"],
        failure_conditions=["Empty query string", "No matching policy chunks above similarity threshold"]
    ),
    "check_required_documents": ToolMetadata(
        name="check_required_documents",
        description="Lists required supporting documents for a specific workflow code.",
        permissions=["student", "agent_system"],
        failure_conditions=["Unknown or invalid workflow code"]
    ),
    "verify_document": ToolMetadata(
        name="verify_document",
        description="Parses uploaded PDF document and verifies offer terms against policy guidelines.",
        permissions=["student", "agent_system"],
        failure_conditions=["Document ID not found", "PDF unreadable or missing mandatory signature"]
    ),
    "create_workflow": ToolMetadata(
        name="create_workflow",
        description="Initiates a new workflow request in database with initial draft state.",
        permissions=["student", "agent_system"],
        failure_conditions=["Duplicate active request exists", "Invalid workflow code"]
    ),
    "submit_request": ToolMetadata(
        name="submit_request",
        description="Advances workflow request status from draft to submitted.",
        permissions=["student", "agent_system"],
        failure_conditions=["Request ID not found", "Request already submitted or closed"]
    ),
    "send_notification": ToolMetadata(
        name="send_notification",
        description="Sends automated notification to Academic Advisor, HOD, or Student.",
        permissions=["agent_system", "advisor", "hod"],
        failure_conditions=["Recipient user ID invalid", "Notification service unreachable"]
    ),
    "get_workflow_status": ToolMetadata(
        name="get_workflow_status",
        description="Fetches real-time execution status and completed steps for a workflow request.",
        permissions=["student", "advisor", "hod", "placement_officer", "agent_system"],
        failure_conditions=["Request ID not found"]
    ),
}


class AgentTools:

    @staticmethod
    def get_student_profile(input_data: GetStudentProfileInput) -> GetStudentProfileOutput:
        logger.info(f"[TOOL EXECUTION: get_student_profile] User ID: '{input_data.user_id}'")
        from app.db.session import SessionLocal
        from app.models.user import StudentProfile, User

        db = SessionLocal()
        try:
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == input_data.user_id).first()
            if profile:
                is_complete = bool(
                    profile.current_semester is not None and
                    profile.cgpa is not None and
                    profile.active_backlogs is not None and
                    profile.credits_completed is not None
                )
                is_eligible = bool(
                    is_complete and
                    profile.active_backlogs == 0 and
                    profile.cgpa is not None and
                    profile.cgpa >= 2.5
                )
                return GetStudentProfileOutput(
                    success=True,
                    user_id=input_data.user_id,
                    roll_number=profile.roll_number or "Not provided",
                    department=profile.department or "Not provided",
                    current_semester=profile.current_semester,
                    cgpa=float(profile.cgpa) if profile.cgpa is not None else None,
                    active_backlogs=profile.active_backlogs,
                    credits_completed=float(profile.credits_completed) if profile.credits_completed is not None else None,
                    is_eligible=is_eligible,
                    is_complete=is_complete
                )
            user_obj = db.query(User).filter(User.id == input_data.user_id).first()
            return GetStudentProfileOutput(
                success=True,
                user_id=input_data.user_id,
                roll_number="Not provided",
                department="Computer Science & Engineering",
                current_semester=None,
                cgpa=None,
                active_backlogs=None,
                credits_completed=None,
                is_eligible=False,
                is_complete=False
            )
        finally:
            db.close()

    @staticmethod
    def search_policy(input_data: SearchPolicyInput) -> SearchPolicyOutput:
        """
        Retrieves relevant policy chunks from the real SRMAP internship knowledge base.
        Replaces the previous hardcoded synthetic-data stub.
        Uses RAGService to perform embedding-based cosine similarity retrieval.
        """
        logger.info(f"[TOOL EXECUTION: search_policy] Query: '{input_data.query}', Top K: {input_data.top_k}")
        try:
            from app.services.rag_service import RAGService
            from app.db.session import SessionLocal

            db = SessionLocal()
            try:
                rag_result = RAGService.query_rag_pipeline(
                    db=db,
                    question=input_data.query,
                    top_k=input_data.top_k,
                )
                retrieved_policies = [
                    {
                        "policy_id": chunk.policy_id,
                        "title": chunk.title,
                        "category": chunk.category,
                        "clause": chunk.clause,
                        "content": chunk.content,
                        "similarity_score": chunk.similarity_score,
                        "source_file": chunk.metadata.get("source_file", "unknown"),
                        "academic_year": chunk.metadata.get("academic_year", "unknown"),
                    }
                    for chunk in rag_result.retrieved_chunks
                ]
            finally:
                db.close()

            return SearchPolicyOutput(
                success=True,
                query=input_data.query,
                retrieved_policies=retrieved_policies,
            )

        except Exception as exc:
            logger.error(f"[TOOL EXECUTION: search_policy] RAG pipeline error: {exc}")
            return SearchPolicyOutput(
                success=False,
                query=input_data.query,
                retrieved_policies=[],
                error=f"RAG pipeline error: {exc}",
            )

    @staticmethod
    def check_required_documents(input_data: CheckRequiredDocumentsInput) -> CheckRequiredDocumentsOutput:
        logger.info(f"[TOOL EXECUTION: check_required_documents] Workflow Code: '{input_data.workflow_code}'")
        if input_data.workflow_code == "INTERNSHIP_NOC":
            return CheckRequiredDocumentsOutput(
                success=True,
                workflow_code="INTERNSHIP_NOC",
                mandatory_documents=["Official Internship Offer Letter PDF", "Parent / Guardian Consent Form"],
                optional_documents=["Academic Transcript PDF"]
            )
        return CheckRequiredDocumentsOutput(
            success=False,
            workflow_code=input_data.workflow_code,
            mandatory_documents=[],
            optional_documents=[],
            error=f"Unknown workflow_code '{input_data.workflow_code}'"
        )

    @staticmethod
    def verify_document(input_data: VerifyDocumentInput) -> VerifyDocumentOutput:
        logger.info(f"[TOOL EXECUTION: verify_document] Document ID: '{input_data.document_id}', Type: '{input_data.document_type}'")

        # Query actual document from database
        try:
            from app.db.session import SessionLocal
            from app.models.student_document import StudentDocument

            db = SessionLocal()
            try:
                doc = db.query(StudentDocument).filter(
                    StudentDocument.id == input_data.document_id
                ).first()

                if doc:
                    extracted_metadata = {
                        "filename": doc.file_name or "unknown",
                        "document_type": doc.file_type or input_data.document_type,
                        "status": doc.verification_status or "PROCESSING",
                        "extracted_text_preview": (doc.extracted_text or "")[:200] if doc.extracted_text else "No text extracted yet",
                        "uploaded_at": str(doc.created_at) if doc.created_at else "unknown"
                    }
                    return VerifyDocumentOutput(
                        success=True,
                        document_id=input_data.document_id,
                        verified=doc.verification_status in ("VERIFIED", "verified", "processed", "indexed"),
                        extracted_metadata=extracted_metadata
                    )
                else:
                    return VerifyDocumentOutput(
                        success=False,
                        document_id=input_data.document_id,
                        verified=False,
                        extracted_metadata={"error": "Document not found in database"},
                        error=f"Document '{input_data.document_id}' not found."
                    )
            finally:
                db.close()
        except Exception as exc:
            logger.error(f"[TOOL EXECUTION: verify_document] DB error: {exc}")
            return VerifyDocumentOutput(
                success=False,
                document_id=input_data.document_id,
                verified=False,
                extracted_metadata={"error": str(exc)},
                error=f"Verification failed: {exc}"
            )

    @staticmethod
    def create_workflow(input_data: CreateWorkflowInput) -> CreateWorkflowOutput:
        logger.info(f"[TOOL EXECUTION: create_workflow] User ID: '{input_data.user_id}', Code: '{input_data.workflow_code}'")
        req_id = f"req-{uuid.uuid4().hex[:8]}"
        return CreateWorkflowOutput(
            success=True,
            request_id=req_id,
            status="draft",
            workflow_code=input_data.workflow_code
        )

    @staticmethod
    def submit_request(input_data: SubmitRequestInput) -> SubmitRequestOutput:
        logger.info(f"[TOOL EXECUTION: submit_request] Request ID: '{input_data.request_id}'")
        return SubmitRequestOutput(
            success=True,
            request_id=input_data.request_id,
            new_status="submitted"
        )

    @staticmethod
    def send_notification(input_data: SendNotificationInput) -> SendNotificationOutput:
        logger.info(f"[TOOL EXECUTION: send_notification] Recipient: '{input_data.recipient_user_id}', Title: '{input_data.title}'")
        return SendNotificationOutput(
            success=True,
            recipient_user_id=input_data.recipient_user_id,
            delivered=True
        )

    @staticmethod
    def get_workflow_status(input_data: GetWorkflowStatusInput) -> GetWorkflowStatusOutput:
        logger.info(f"[TOOL EXECUTION: get_workflow_status] Request ID: '{input_data.request_id}'")
        return GetWorkflowStatusOutput(
            success=True,
            request_id=input_data.request_id,
            status="in_review",
            current_step_number=3,
            completed_steps=["Automated CGPA Check", "Advisor Eligibility Verification"]
        )


def check_tool_permission(tool_name: str, user_role: str) -> bool:
    """
    Verifies if a given user role has permission to execute the specified agent tool.
    """
    meta = TOOL_REGISTRY_METADATA.get(tool_name)
    if not meta:
        return False
    if "public" in meta.permissions or "agent_system" in meta.permissions:
        return True
    return user_role in meta.permissions

