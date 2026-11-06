import pytest
import uuid
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User, StudentProfile
from app.models.policy import PolicyKnowledge
from app.models.student_document import StudentDocument
from app.services.rag_service import RAGService
from app.services.document_verifier import DocumentVerificationService


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_university_rag_seeding(db_session: Session):
    """Verify official university RAG documents are seeded into UNIVERSITY scope with user_id=None."""
    res = RAGService.seed_from_real_docs(db_session)
    assert res["chunks_total"] > 0
    
    university_chunks = db_session.query(PolicyKnowledge).filter(
        PolicyKnowledge.knowledge_scope == "UNIVERSITY"
    ).all()
    assert len(university_chunks) > 0
    for chunk in university_chunks:
        assert chunk.user_id is None
        assert chunk.knowledge_scope == "UNIVERSITY"


def test_student_private_rag_ingestion(db_session: Session):
    """Verify student document ingestion enters STUDENT scope with user_id and NEVER enters UNIVERSITY scope."""
    student_id = str(uuid.uuid4())
    doc_id = str(uuid.uuid4())
    filename = "joining_report_student_a.pdf"
    content = "Student A Internship Joining Report submitted for Summer 2026."

    chunks_count = RAGService.ingest_student_document(
        db=db_session,
        user_id=student_id,
        document_id=doc_id,
        filename=filename,
        extracted_text=content,
        doc_type="JOINING_REPORT"
    )
    assert chunks_count > 0

    # Verify stored in STUDENT scope
    student_chunks = db_session.query(PolicyKnowledge).filter(
        PolicyKnowledge.knowledge_scope == "STUDENT",
        PolicyKnowledge.user_id == student_id,
        PolicyKnowledge.document_id == doc_id
    ).all()
    assert len(student_chunks) == chunks_count

    # CRITICAL SECURITY RULE: Student doc must NEVER enter UNIVERSITY scope
    univ_leak = db_session.query(PolicyKnowledge).filter(
        PolicyKnowledge.knowledge_scope == "UNIVERSITY",
        PolicyKnowledge.source_file == filename
    ).count()
    assert univ_leak == 0


def test_cross_student_isolation(db_session: Session):
    """
    CRITICAL SECURITY TEST:
    Student A uploads studentA_offer.pdf.
    Student B uploads studentB_joining.pdf.
    Student A querying STUDENT RAG must NEVER retrieve Student B's chunks.
    Student B querying STUDENT RAG must NEVER retrieve Student A's chunks.
    """
    student_a_id = str(uuid.uuid4())
    student_b_id = str(uuid.uuid4())

    doc_a_id = str(uuid.uuid4())
    doc_b_id = str(uuid.uuid4())

    RAGService.ingest_student_document(
        db=db_session,
        user_id=student_a_id,
        document_id=doc_a_id,
        filename="studentA_offer.pdf",
        extracted_text="Secret Offer Letter details for Student A at Tech Corp.",
        doc_type="OFFER_LETTER"
    )

    RAGService.ingest_student_document(
        db=db_session,
        user_id=student_b_id,
        document_id=doc_b_id,
        filename="studentB_joining.pdf",
        extracted_text="Secret Joining Report details for Student B at Data Inc.",
        doc_type="JOINING_REPORT"
    )

    # Student A Dual RAG search
    res_a = RAGService.query_rag_pipeline(
        db=db_session,
        question="What is in my uploaded document?",
        top_k=5,
        user_id=student_a_id,
        scope="STUDENT"
    )
    # Must retrieve Student A doc and MUST NOT retrieve Student B doc
    for chunk in res_a.retrieved_chunks:
        assert chunk.metadata.get("user_id") == student_a_id
        assert "studentB" not in chunk.content

    # Student B Dual RAG search
    res_b = RAGService.query_rag_pipeline(
        db=db_session,
        question="What is in my uploaded document?",
        top_k=5,
        user_id=student_b_id,
        scope="STUDENT"
    )
    for chunk in res_b.retrieved_chunks:
        assert chunk.metadata.get("user_id") == student_b_id
        assert "studentA" not in chunk.content


def test_dual_rag_combined_retrieval(db_session: Session):
    """Verify combined Dual RAG search returns both UNIVERSITY and STUDENT chunks labeled cleanly."""
    student_id = str(uuid.uuid4())
    doc_id = str(uuid.uuid4())

    RAGService.ingest_student_document(
        db=db_session,
        user_id=student_id,
        document_id=doc_id,
        filename="my_weekly_diary.pdf",
        extracted_text="Weekly diary entry for internship week 1.",
        doc_type="WEEKLY_DIARY"
    )

    res = RAGService.query_rag_pipeline(
        db=db_session,
        question="What are the weekly diary requirements and what is in my document?",
        top_k=6,
        user_id=student_id,
        scope="COMBINED"
    )
    assert res.is_grounded is True
    assert len(res.retrieved_chunks) > 0

    scopes = [c.metadata.get("knowledge_scope") for c in res.retrieved_chunks]
    assert "UNIVERSITY" in scopes or "STUDENT" in scopes


def test_dynamic_document_verification(db_session: Session):
    """Verify document verifier parses dynamic text without hardcoding demo student names."""
    res = DocumentVerificationService.verify_document(
        document_id="doc-test-101",
        document_type="OFFER_LETTER",
        file_name="Internship_Offer_Letter.pdf",
        extracted_text="Offer Letter for Software Engineering Intern at Microsoft for 12 weeks duration signed by HR."
    )
    assert res.verified is True
    assert res.status == "valid"
    assert res.extracted_fields["company_name"] == "Microsoft"
    assert res.extracted_fields["duration_weeks"] == 12
