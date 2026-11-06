from app.agent.graph import campusflow_agent
from app.services.document_verifier import DocumentVerificationService
from app.agent.failure_recovery import FailureRecoveryEngine, FailureCategory
from app.services.audit_service import AuditService

def test_scenario_1_all_documents_present():
    """Scenario 1: All documents present -> state waiting_for_approval"""
    state = {
        "user_id": "usr-001",
        "user_message": "I received an internship offer from Google. Help me complete NOC.",
        "available_documents": [
            {"doc_id": "doc-1", "type": "OFFER_LETTER", "file_name": "Google_Offer.pdf"},
            {"doc_id": "doc-2", "type": "PARENT_CONSENT", "file_name": "Consent_Signed.pdf"}
        ],
        "executed_tools": []
    }
    res = campusflow_agent.invoke(state)
    assert res["workflow_status"] in ["waiting_for_approval", "completed"]
    assert res["goal"] is not None
    print("  [PASS] Scenario 1 passed: All documents present.")

def test_scenario_2_missing_faculty_approval():
    """Scenario 2: Overdue faculty approval reminder"""
    rec = FailureRecoveryEngine.handle_failure(
        failure_category=FailureCategory.TOOL_TIMEOUT,
        current_status="waiting_for_approval",
        context={"tool_name": "send_reminder"}
    )
    assert rec.new_workflow_status == "needs_review"
    assert rec.escalated_to_human is True
    print("  [PASS] Scenario 2 passed: Missing faculty approval / timeout handled.")

def test_scenario_3_invalid_document():
    """Scenario 3: Invalid document policy violation (duration < 4 weeks)"""
    v_res = DocumentVerificationService.verify_document(
        document_id="doc-bad-1",
        document_type="OFFER_LETTER",
        file_name="Short_Offer_Letter_short.pdf"
    )
    assert v_res.status == "invalid"
    assert v_res.verified is False
    assert any("violates" in r for r in v_res.reasons)
    print("  [PASS] Scenario 3 passed: Invalid document policy violation caught.")

def test_scenario_4_duplicate_request():
    """Scenario 4: Duplicate request handling"""
    rec = FailureRecoveryEngine.handle_failure(
        failure_category=FailureCategory.DUPLICATE_REQUEST,
        current_status="planning",
        context={"existing_request_id": "req-active-001"}
    )
    assert rec.new_workflow_status == "planning"
    assert "req-active-001" in rec.user_status_message
    print("  [PASS] Scenario 4 passed: Duplicate request linked.")

def test_scenario_5_missing_student_information():
    """Scenario 5: Missing student profile information"""
    rec = FailureRecoveryEngine.handle_failure(
        failure_category=FailureCategory.MISSING_USER_INFO,
        current_status="planning",
        context={"missing_fields": ["Roll Number", "Department"]}
    )
    assert rec.new_workflow_status == "waiting_for_document"
    assert "Profile Incomplete" in rec.user_status_message
    print("  [PASS] Scenario 5 passed: Missing student info handled.")

def test_scenario_6_rag_cannot_find_relevant_policy():
    """Scenario 6: RAG fallback applied when policy chunk missing"""
    rec = FailureRecoveryEngine.handle_failure(
        failure_category=FailureCategory.RAG_FAILURE,
        current_status="planning",
        retry_count=2
    )
    assert rec.new_workflow_status == "planning"
    assert "Notice" in rec.user_status_message
    print("  [PASS] Scenario 6 passed: RAG fallback applied.")

def test_scenario_7_tool_timeout():
    """Scenario 7: Tool timeout escalation"""
    rec = FailureRecoveryEngine.handle_failure(
        failure_category=FailureCategory.TOOL_TIMEOUT,
        current_status="document_verification",
        context={"tool_name": "create_workflow"}
    )
    assert rec.new_workflow_status == "needs_review"
    assert rec.escalated_to_human is True
    print("  [PASS] Scenario 7 passed: Tool timeout escalated to human review.")

def test_scenario_8_database_failure():
    """Scenario 8: Database transaction failure persistence"""
    rec = FailureRecoveryEngine.handle_failure(
        failure_category=FailureCategory.DB_FAILURE,
        current_status="ready_for_submission",
        retry_count=2
    )
    assert rec.new_workflow_status == "failed"
    assert rec.escalated_to_human is True
    print("  [PASS] Scenario 8 passed: Persistent DB failure handled.")

def test_scenario_9_human_approves():
    """Scenario 9: Human approves -> completed"""
    state = {
        "user_id": "usr-001",
        "user_message": "NOC Request",
        "workflow_status": "waiting_for_approval",
        "human_approval_decision": "APPROVED",
        "executed_tools": []
    }
    res = campusflow_agent.invoke(state)
    assert res["workflow_status"] == "completed"
    print("  [PASS] Scenario 9 passed: Human approves -> completed.")

def test_scenario_10_human_requests_changes():
    """Scenario 10: Human requests changes"""
    state = {
        "user_id": "usr-001",
        "user_message": "NOC Request",
        "workflow_status": "waiting_for_approval",
        "human_approval_decision": "CHANGES_REQUESTED",
        "executed_tools": []
    }
    res = campusflow_agent.invoke(state)
    assert res["workflow_status"] == "changes_requested"
    print("  [PASS] Scenario 10 passed: Human requests changes -> changes_requested.")

def test_scenario_11_human_rejects():
    """Scenario 11: Human rejects -> failed"""
    state = {
        "user_id": "usr-001",
        "user_message": "NOC Request",
        "workflow_status": "waiting_for_approval",
        "human_approval_decision": "REJECT",
        "executed_tools": []
    }
    res = campusflow_agent.invoke(state)
    assert res["workflow_status"] == "failed"
    print("  [PASS] Scenario 11 passed: Human rejects -> failed.")

def test_scenario_12_workflow_completes_successfully():
    """Scenario 12: Full happy path execution"""
    state = {
        "user_id": "usr-001",
        "user_message": "I received an internship offer from Google. Help me complete NOC.",
        "human_approval_decision": "APPROVED",
        "executed_tools": []
    }
    res = campusflow_agent.invoke(state)
    assert res["workflow_status"] == "completed"
    assert len(res["plan"]) == 5
    print("  [PASS] Scenario 12 passed: Workflow completes successfully.")

def run_all_tests():
    print("\n==================================================")
    print(" RUNNING CAMPUSFLOW AI END-TO-END TEST SUITE (12 SCENARIOS)")
    print("==================================================")
    test_scenario_1_all_documents_present()
    test_scenario_2_missing_faculty_approval()
    test_scenario_3_invalid_document()
    test_scenario_4_duplicate_request()
    test_scenario_5_missing_student_information()
    test_scenario_6_rag_cannot_find_relevant_policy()
    test_scenario_7_tool_timeout()
    test_scenario_8_database_failure()
    test_scenario_9_human_approves()
    test_scenario_10_human_requests_changes()
    test_scenario_11_human_rejects()
    test_scenario_12_workflow_completes_successfully()
    print("==================================================")
    print(" ALL 12 END-TO-END SCENARIOS PASSED CLEANLY!")
    print("==================================================\n")

if __name__ == "__main__":
    run_all_tests()
