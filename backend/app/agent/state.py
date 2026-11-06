from typing import TypedDict, List, Dict, Any, Optional

class CampusFlowAgentState(TypedDict):
    # Core User & Workflow Identifiers
    user_id: str
    request_id: Optional[str]
    trace_id: Optional[str]
    user_message: str
    goal: str
    workflow_type: str

    # Explicit Workflow State:
    # draft, planning, waiting_for_document, document_verification,
    # ready_for_submission, waiting_for_approval, approved, changes_requested,
    # rejected, completed, failed
    workflow_status: str

    # Data & Evaluation Payloads
    retrieved_policies: List[Dict[str, Any]]
    student_profile: Optional[Dict[str, Any]]
    required_documents: List[str]
    available_documents: List[Dict[str, Any]]
    missing_documents: List[str]
    document_verification_results: Optional[Dict[str, Any]]

    # Human-in-the-Loop Approval Decision Metadata
    human_approval_decision: Optional[str]  # APPROVED, CHANGES_REQUESTED, REJECTED
    human_approval_comments: Optional[str]
    approver_id: Optional[str]

    # Tool Execution & Failure Recovery
    selected_tool: Optional[str]
    tool_input: Optional[Dict[str, Any]]
    tool_output: Optional[Dict[str, Any]]
    executed_tools: List[Dict[str, Any]]
    failure_recovery_history: List[Dict[str, Any]]
    user_status_message: Optional[str]

    # Execution Summary
    plan: List[str]
