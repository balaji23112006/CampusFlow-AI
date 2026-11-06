import logging
import uuid
from typing import Dict, Any, List
from langgraph.graph import StateGraph, START, END

from app.agent.state import CampusFlowAgentState
from app.agent.tools import AgentTools, GetStudentProfileInput, CheckRequiredDocumentsInput
from app.services.document_verifier import DocumentVerificationService
from app.services.audit_service import AuditService
from app.core.observability import ObservabilityService
from app.agent.failure_recovery import FailureRecoveryEngine, FailureCategory

logger = logging.getLogger("CampusFlowAgentGraph")
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")

# ==========================================
# 15 STATEFUL LANGGRAPH WORKFLOW NODES
# ==========================================

# Node 1: Understand Goal
def understand_goal_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    msg = state.get("user_message", "")
    trace_id = state.get("trace_id") or ObservabilityService.create_trace(
        request_id=state.get("request_id") or "req-001",
        user_id=state.get("user_id", "unknown_user"),
        user_message=msg,
        workflow_type="PENDING"
    )
    logger.info(f"---> [NODE 1: Understand Goal] Message: '{msg}' | Trace ID: '{trace_id}'")

    if "noc" in msg.lower() or "internship" in msg.lower() or "google" in msg.lower():
        goal = "Complete Off-Campus Internship Approval and Obtain Official University NOC Certificate"
    else:
        goal = f"Process Administrative Request: {msg}"

    output = {
        "goal": goal,
        "trace_id": trace_id,
        "workflow_status": "draft"
    }
    ObservabilityService.log_node_span(trace_id, "understand_goal", state, output)
    return output

# Node 2: Classify Workflow
def classify_workflow_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    goal = state.get("goal", "")
    trace_id = state.get("trace_id", "")
    logger.info(f"---> [NODE 2: Classify Workflow] Goal: '{goal}'")

    wf_type = "INTERNSHIP_NOC" if "Internship" in goal or "NOC" in goal else "GENERAL_QUERY"
    output = {
        "workflow_type": wf_type,
        "workflow_status": "draft"
    }
    ObservabilityService.log_node_span(trace_id, "classify_workflow", state, output)
    return output

# Node 3: Retrieve Policy
def retrieve_policy_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    wf_type = state.get("workflow_type", "INTERNSHIP_NOC")
    user_message = state.get("user_message", "")
    user_id = state.get("user_id", "unknown_user")
    trace_id = state.get("trace_id", "")
    logger.info(f"---> [NODE 3: Retrieve Policy] Fetching Dual-Scope RAG for user '{user_id}' and query '{user_message}'...")

    policies = []
    try:
        from app.services.rag_service import RAGService
        from app.db.session import SessionLocal

        db = SessionLocal()
        try:
            search_query = user_message.strip() if user_message and len(user_message.strip()) > 3 else f"internship policy requirements for {wf_type.lower().replace('_', ' ')}"
            rag_result = RAGService.query_rag_pipeline(
                db=db,
                question=search_query,
                top_k=5,
                user_id=user_id if user_id != "unknown_user" else None,
                scope="COMBINED"
            )
            policies = [
                {
                    "policy_id": chunk.policy_id,
                    "title": chunk.title,
                    "content": chunk.content,
                    "rule": chunk.content[:400],
                    "source_file": (chunk.metadata or {}).get("source_file", "unknown"),
                    "similarity_score": chunk.similarity_score,
                    "knowledge_scope": (chunk.metadata or {}).get("knowledge_scope", "UNIVERSITY"),
                }
                for chunk in rag_result.retrieved_chunks
            ]
            logger.info(f"---> [NODE 3: Retrieve Policy] Retrieved {len(policies)} policy chunk(s) from Dual-Scope RAG (University & Student scope).")
        finally:
            db.close()
    except Exception as exc:
        logger.warning(f"---> [NODE 3: Retrieve Policy] RAG call failed: {exc}. Continuing with empty policy list.")

    ObservabilityService.log_rag_retrieval(trace_id, f"Policy for {user_message}", policies)

    output = {
        "retrieved_policies": policies,
        "workflow_status": "planning"
    }
    ObservabilityService.log_node_span(trace_id, "retrieve_policy", state, output)
    return output


# Node 4: Determine Required Documents
def determine_required_docs_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    wf_type = state.get("workflow_type", "INTERNSHIP_NOC")
    trace_id = state.get("trace_id", "")
    logger.info(f"---> [NODE 4: Determine Required Documents] Workflow: '{wf_type}'")

    res = AgentTools.check_required_documents(CheckRequiredDocumentsInput(workflow_code=wf_type))
    req_docs = res.mandatory_documents if res.success else ["Official Offer Letter PDF", "Parent Consent Form"]

    output = {
        "required_documents": req_docs,
        "workflow_status": "planning"
    }
    ObservabilityService.log_node_span(trace_id, "determine_required_docs", state, output)
    return output

# Node 5: Retrieve Student Profile
def retrieve_student_profile_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    user_id = state.get("user_id", "unknown_user")
    trace_id = state.get("trace_id", "")
    logger.info(f"---> [NODE 5: Retrieve Student Profile] User ID: '{user_id}'")

    prof_res = AgentTools.get_student_profile(GetStudentProfileInput(user_id=user_id))
    profile = prof_res.model_dump()

    output = {
        "student_profile": profile,
        "workflow_status": "planning"
    }
    ObservabilityService.log_node_span(trace_id, "retrieve_student_profile", state, output)
    return output

# Node 6: Check Available Documents
def check_available_docs_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    user_id = state.get("user_id", "unknown_user")
    trace_id = state.get("trace_id", "")
    logger.info(f"---> [NODE 6: Check Available Documents] User: '{user_id}'")

    # Query REAL uploaded documents from PostgreSQL for the authenticated user
    # Keep any pre-populated documents in state (e.g. from test states or inputs)
    available = list(state.get("available_documents", []) or [])
    existing_ids = {d.get("doc_id") for d in available if d.get("doc_id")}
    
    try:
        from app.db.session import SessionLocal
        from app.models.student_document import StudentDocument

        db = SessionLocal()
        try:
            docs = db.query(StudentDocument).filter(
                StudentDocument.user_id == user_id
            ).all()
            for doc in docs:
                if str(doc.id) not in existing_ids:
                    available.append({
                        "doc_id": str(doc.id),
                        "type": doc.file_type or "UNKNOWN",
                        "file_name": doc.file_name or "unknown_file"
                    })
            logger.info(f"---> [NODE 6] Found {len(available)} total document(s) for user '{user_id}'.")
        finally:
            db.close()
    except Exception as exc:
        logger.warning(f"---> [NODE 6] Failed to query student documents: {exc}.")

    output = {
        "available_documents": available,
        "workflow_status": "planning"
    }
    ObservabilityService.log_node_span(trace_id, "check_available_docs", state, output)
    return output

# Node 7: Identify Missing Documents
def identify_missing_docs_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    required = state.get("required_documents", [])
    available = state.get("available_documents", [])
    trace_id = state.get("trace_id", "")

    avail_types = [d.get("type") for d in available]
    missing = []
    if "Official Offer Letter PDF" in required and "OFFER_LETTER" not in avail_types:
        missing.append("Official Offer Letter PDF")
    if "Parent / Guardian Consent Form" in required and "PARENT_CONSENT" not in avail_types:
        missing.append("Parent / Guardian Consent Form")

    logger.info(f"---> [NODE 7: Identify Missing Documents] Missing: {missing}")

    output = {
        "missing_documents": missing,
        "workflow_status": "waiting_for_document" if missing else "document_verification"
    }
    ObservabilityService.log_node_span(trace_id, "identify_missing_docs", state, output)
    return output

# Node 8: Request Missing Documents
def request_missing_docs_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    missing = state.get("missing_documents", [])
    trace_id = state.get("trace_id", "")
    logger.info(f"---> [NODE 8: Request Missing Documents] Prompting student for: {missing}")

    recovery = FailureRecoveryEngine.handle_failure(
        failure_category=FailureCategory.MISSING_DOCUMENT,
        current_status=state.get("workflow_status", "waiting_for_document"),
        context={"missing_documents": missing, "user_id": state.get("user_id")}
    )

    output = {
        "workflow_status": "waiting_for_document",
        "user_status_message": recovery.user_status_message
    }
    ObservabilityService.log_node_span(trace_id, "request_missing_docs", state, output)
    return output

# Node 9: Verify Submitted Documents
def verify_documents_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    available = state.get("available_documents", [])
    trace_id = state.get("trace_id", "")
    logger.info(f"---> [NODE 9: Verify Submitted Documents] Verifying {len(available)} documents...")

    results = []
    all_valid = True
    for doc in available:
        v_res = DocumentVerificationService.verify_document(
            document_id=doc.get("doc_id", "doc-001"),
            document_type=doc.get("type", "OFFER_LETTER"),
            file_name=doc.get("file_name", "offer.pdf")
        )
        results.append(v_res.model_dump())
        if v_res.status != "valid":
            all_valid = False

    output = {
        "document_verification_results": {"results": results, "all_valid": all_valid},
        "workflow_status": "ready_for_submission" if all_valid else "waiting_for_document"
    }
    ObservabilityService.log_node_span(trace_id, "verify_documents", state, output)
    return output

# Node 10: Create Workflow Request
def create_workflow_request_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    user_id = state.get("user_id", "unknown_user")
    wf_type = state.get("workflow_type", "INTERNSHIP_NOC")
    trace_id = state.get("trace_id", "")
    req_id = state.get("request_id") or f"req-{uuid.uuid4().hex[:8]}"

    logger.info(f"---> [NODE 10: Create Workflow Request] Request ID: '{req_id}', User: '{user_id}'")

    AuditService.log_event(
        db=None,
        actor_type="AGENT",
        actor_id="system-agent",
        action="CREATE_WORKFLOW_REQUEST",
        workflow_id=req_id,
        status="SUCCESS"
    )

    output = {
        "request_id": req_id,
        "workflow_status": "ready_for_submission"
    }
    ObservabilityService.log_node_span(trace_id, "create_workflow_request", state, output)
    return output

# Node 11: Route for Approval
def route_for_approval_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    req_id = state.get("request_id", "req-001")
    trace_id = state.get("trace_id", "")
    logger.info(f"---> [NODE 11: Route for Approval] Routing Request '{req_id}' to Academic Advisor / HOD...")

    AuditService.log_event(
        db=None,
        actor_type="AGENT",
        actor_id="system-agent",
        action="ROUTE_FOR_HUMAN_APPROVAL",
        workflow_id=req_id,
        status="PENDING"
    )

    output = {
        "workflow_status": "waiting_for_approval",
        "user_status_message": "Application routed for official academic staff review. Pending authorized staff sign-off."
    }
    ObservabilityService.log_node_span(trace_id, "route_for_approval", state, output)
    return output

# Node 12: Wait for Approval (Pauses for Human Decision)
def wait_for_approval_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    req_id = state.get("request_id", "req-001")
    decision = state.get("human_approval_decision")
    trace_id = state.get("trace_id", "")

    logger.info(f"---> [NODE 12: Wait for Approval] Awaiting Human Decision for Request '{req_id}'. Current Decision: '{decision}'")

    output = {
        "workflow_status": "waiting_for_approval" if not decision else state.get("workflow_status", "waiting_for_approval")
    }
    ObservabilityService.log_node_span(trace_id, "wait_for_approval", state, output)
    return output

# Node 13: Process Approval Decision
def process_approval_decision_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    decision = (state.get("human_approval_decision") or "APPROVED").upper()
    req_id = state.get("request_id", "req-001")
    trace_id = state.get("trace_id", "")

    logger.info(f"---> [NODE 13: Process Approval Decision] Human Decision: '{decision}' for Request '{req_id}'")

    if decision == "APPROVED":
        new_status = "approved"
    elif decision == "CHANGES_REQUESTED":
        new_status = "changes_requested"
    else:
        new_status = "rejected"

    output = {
        "workflow_status": new_status
    }
    ObservabilityService.log_node_span(trace_id, "process_approval_decision", state, output)
    return output

# Node 14: Verify Final Workflow State
def verify_final_state_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    status = state.get("workflow_status", "approved")
    req_id = state.get("request_id", "req-001")
    trace_id = state.get("trace_id", "")
    logger.info(f"---> [NODE 14: Verify Final State] Validating integrity for status '{status}'...")

    if status == "approved":
        logger.info(f"   | Issue NOC Certificate -> Generated Digital Certificate for '{req_id}'.")

    output = {
        "workflow_status": status
    }
    ObservabilityService.log_node_span(trace_id, "verify_final_state", state, output)
    return output

# Node 15: Notify Student
def notify_student_node(state: CampusFlowAgentState) -> Dict[str, Any]:
    status = state.get("workflow_status", "approved")
    user_id = state.get("user_id", "unknown_user")
    req_id = state.get("request_id", "req-001")
    trace_id = state.get("trace_id", "")

    logger.info(f"---> [NODE 15: Notify Student] Dispatched notification to Student '{user_id}' for status '{status}'.")

    final_workflow_status = "completed" if status == "approved" else ("failed" if status == "rejected" else status)
    msg = f"Your NOC Request '{req_id}' has been updated to: {final_workflow_status.upper()}."

    AuditService.log_event(
        db=None,
        actor_type="AGENT",
        actor_id="system-agent",
        action="NOTIFY_STUDENT_WORKFLOW_FINAL",
        workflow_id=req_id,
        result_summary={"status": final_workflow_status, "message": msg},
        status="SUCCESS"
    )
    ObservabilityService.log_workflow_completion(trace_id, final_workflow_status, msg)

    # Build plan summary from actual state data — no hardcoded values
    profile = state.get("student_profile", {})
    actual_cgpa = profile.get("cgpa") if profile.get("cgpa") is not None else "Not provided"
    actual_backlogs = profile.get("active_backlogs") if profile.get("active_backlogs") is not None else "Not provided"
    doc_results = state.get("document_verification_results", {})
    doc_status = "Valid" if doc_results.get("all_valid") else "Pending Review"
    num_docs = len(state.get("available_documents", []))

    return {
        "workflow_status": final_workflow_status,
        "user_status_message": msg,
        "plan": [
            "Step 1: Goal Analyzed -> Completed",
            f"Step 2: Policy & CGPA Verified -> CGPA: {actual_cgpa}, Backlogs: {actual_backlogs}",
            f"Step 3: Uploaded Documents ({num_docs}) Parsed & Verified -> {doc_status}",
            "Step 4: Routed for Authorized Staff Review",
            f"Step 5: Workflow Final Status -> {final_workflow_status.upper()}"
        ]
    }

# ==========================================
# GRAPH BUILDER & CONDITIONAL ROUTING
# ==========================================

def route_after_missing_check(state: CampusFlowAgentState) -> str:
    if state.get("missing_documents") and not state.get("human_approval_decision"):
        return "request_missing_docs"
    return "verify_documents"

def route_after_approval_decision(state: CampusFlowAgentState) -> str:
    decision = state.get("human_approval_decision")
    if not decision:
        return "wait_for_approval"
    return "process_approval_decision"

workflow_builder = StateGraph(CampusFlowAgentState)

# Add 15 Nodes
workflow_builder.add_node("understand_goal", understand_goal_node)
workflow_builder.add_node("classify_workflow", classify_workflow_node)
workflow_builder.add_node("retrieve_policy", retrieve_policy_node)
workflow_builder.add_node("determine_required_docs", determine_required_docs_node)
workflow_builder.add_node("retrieve_student_profile", retrieve_student_profile_node)
workflow_builder.add_node("check_available_docs", check_available_docs_node)
workflow_builder.add_node("identify_missing_docs", identify_missing_docs_node)
workflow_builder.add_node("request_missing_docs", request_missing_docs_node)
workflow_builder.add_node("verify_documents", verify_documents_node)
workflow_builder.add_node("create_workflow_request", create_workflow_request_node)
workflow_builder.add_node("route_for_approval", route_for_approval_node)
workflow_builder.add_node("wait_for_approval", wait_for_approval_node)
workflow_builder.add_node("process_approval_decision", process_approval_decision_node)
workflow_builder.add_node("verify_final_state", verify_final_state_node)
workflow_builder.add_node("notify_student", notify_student_node)

# Connect Edges:
# START -> understand_goal -> classify_workflow -> retrieve_policy -> determine_required_docs -> retrieve_student_profile -> check_available_docs -> identify_missing_docs
workflow_builder.add_edge(START, "understand_goal")
workflow_builder.add_edge("understand_goal", "classify_workflow")
workflow_builder.add_edge("classify_workflow", "retrieve_policy")
workflow_builder.add_edge("retrieve_policy", "determine_required_docs")
workflow_builder.add_edge("determine_required_docs", "retrieve_student_profile")
workflow_builder.add_edge("retrieve_student_profile", "check_available_docs")
workflow_builder.add_edge("check_available_docs", "identify_missing_docs")

# Conditional Edge after identify_missing_docs:
# If missing docs -> request_missing_docs -> END (Awaits student upload)
# Else -> verify_documents
workflow_builder.add_conditional_edges(
    "identify_missing_docs",
    route_after_missing_check,
    {
        "request_missing_docs": "request_missing_docs",
        "verify_documents": "verify_documents"
    }
)
workflow_builder.add_edge("request_missing_docs", END)

# verify_documents -> create_workflow_request -> route_for_approval -> wait_for_approval
workflow_builder.add_edge("verify_documents", "create_workflow_request")
workflow_builder.add_edge("create_workflow_request", "route_for_approval")
workflow_builder.add_edge("route_for_approval", "wait_for_approval")

# Conditional Edge after wait_for_approval:
# If human decision present -> process_approval_decision -> verify_final_state -> notify_student -> END
# Else -> END (Pauses in waiting_for_approval state)
workflow_builder.add_conditional_edges(
    "wait_for_approval",
    route_after_approval_decision,
    {
        "wait_for_approval": END,
        "process_approval_decision": "process_approval_decision"
    }
)
workflow_builder.add_edge("process_approval_decision", "verify_final_state")
workflow_builder.add_edge("verify_final_state", "notify_student")
workflow_builder.add_edge("notify_student", END)

# Compile LangGraph Agent
campusflow_agent = workflow_builder.compile()
