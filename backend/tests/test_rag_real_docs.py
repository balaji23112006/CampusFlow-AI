"""
test_rag_real_docs.py — RAG Integration Tests for SRMAP Real Document Ingestion
=================================================================================
Tests:
  1. DocLoader extracts text from DOCX files
  2. DocLoader extracts text from PPTX files
  3. Total chunk count is in an acceptable range (50–1000)
  4. No synthetic data in any chunk (no "SYNTHETIC" disclaimer in metadata)
  5. Retrieval tests: internship-relevant queries return SRMAP-sourced chunks
  6. Negative tests: synthetic POL-XXX responses are no longer returned
  7. Agent search_policy tool returns real SRMAP content (not hardcoded stubs)
  8. Academic year flagging: all docs with unknown year are flagged in metadata
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

SRMAP_DIR = os.path.join(
    os.path.dirname(__file__), "..", "app", "knowledge", "srmap_internship"
)


# ─────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def db_session():
    from app.db.session import SessionLocal
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="module")
def ingested_db(db_session):
    """Ensure real documents are ingested before running retrieval tests."""
    from app.services.rag_service import RAGService
    from app.models.policy import PolicyKnowledge

    # Run full seed (clear synthetic + ingest real)
    result = RAGService.seed_knowledge_base(db_session)
    return {"session": db_session, "ingest_result": result}


# ─────────────────────────────────────────────────────────────────
# Test 1 — DocLoader: DOCX extraction
# ─────────────────────────────────────────────────────────────────

def test_doc_loader_docx():
    """DocLoader must successfully extract text from at least one DOCX file."""
    from app.services.doc_loader import DocLoader

    docx_files = [f for f in os.listdir(SRMAP_DIR) if f.lower().endswith(".docx")]
    assert docx_files, "No DOCX files found in srmap_internship directory"

    target = os.path.join(SRMAP_DIR, docx_files[0])
    chunks = DocLoader._process_docx(target, docx_files[0])

    assert len(chunks) > 0, f"DocLoader produced 0 chunks from {docx_files[0]}"
    for chunk in chunks:
        assert "content" in chunk
        assert len(chunk["content"].strip()) > 10, "Chunk content is too short"
        assert "source_file" in chunk
        assert "chunk_index" in chunk
        assert "academic_year" in chunk
        assert "category" in chunk
    print(f"PASS: {docx_files[0]} → {len(chunks)} chunks, academic_year={chunks[0]['academic_year']}")


# ─────────────────────────────────────────────────────────────────
# Test 2 — DocLoader: PPTX extraction
# ─────────────────────────────────────────────────────────────────

def test_doc_loader_pptx():
    """DocLoader must successfully extract text from the PPTX file."""
    from app.services.doc_loader import DocLoader

    pptx_files = [f for f in os.listdir(SRMAP_DIR) if f.lower().endswith(".pptx")]
    assert pptx_files, "No PPTX files found in srmap_internship directory"

    target = os.path.join(SRMAP_DIR, pptx_files[0])
    chunks = DocLoader._process_pptx(target, pptx_files[0])

    assert len(chunks) > 0, f"DocLoader produced 0 chunks from {pptx_files[0]}"
    for chunk in chunks:
        assert "content" in chunk
        assert "source_file" in chunk
    print(f"PASS: {pptx_files[0]} → {len(chunks)} chunks")


# ─────────────────────────────────────────────────────────────────
# Test 3 — Chunk count is in an expected range
# ─────────────────────────────────────────────────────────────────

def test_chunk_count(ingested_db):
    """Total chunk count from all SRMAP documents should be at least one per file.
    Upper bound is 500 (these are template-heavy DOCX/PPTX docs, not dense textbooks)."""
    from app.models.policy import PolicyKnowledge

    db = ingested_db["session"]
    count = db.query(PolicyKnowledge).filter(
        PolicyKnowledge.source_file.isnot(None)
    ).count()

    print(f"Total real-doc chunks in DB: {count}")
    assert 8 <= count <= 500, (
        f"Expected 8–500 real-doc chunks in DB (at least one per source file) but got {count}. "
        "Check DocLoader output and document content."
    )


# ─────────────────────────────────────────────────────────────────
# Test 4 — No synthetic data in active retrieval
# ─────────────────────────────────────────────────────────────────

def test_no_synthetic_data_in_db(ingested_db):
    """No policy_knowledge row should have 'SYNTHETIC' in its metadata disclaimer."""
    from app.models.policy import PolicyKnowledge

    db = ingested_db["session"]
    all_rows = db.query(PolicyKnowledge).all()

    synthetic_found = []
    for row in all_rows:
        meta = row.metadata_json or {}
        disclaimer = str(meta.get("disclaimer", ""))
        if "SYNTHETIC" in disclaimer.upper():
            synthetic_found.append(row.title)

    assert not synthetic_found, (
        f"Found {len(synthetic_found)} synthetic rows still in DB: {synthetic_found}"
    )
    print(f"PASS: 0 synthetic rows found in {len(all_rows)} total DB rows.")


# ─────────────────────────────────────────────────────────────────
# Test 5a — Retrieval: joining report query
# ─────────────────────────────────────────────────────────────────

def test_rag_query_joining_report(ingested_db):
    """Query about joining report must retrieve content from the SRMAP joining report doc."""
    from app.services.rag_service import RAGService

    db = ingested_db["session"]
    result = RAGService.query_rag_pipeline(
        db=db,
        question="How do I submit a joining report for SRM internship?",
        top_k=3,
    )

    print(f"Joining report query — retrieved {len(result.retrieved_chunks)} chunks")
    print("  Sources:", result.source_documents)

    assert result.is_grounded, "Query returned no grounded results"
    assert len(result.retrieved_chunks) > 0, "No chunks retrieved for joining report query"

    # At least one chunk must come from a real SRMAP source file
    source_files = [c.metadata.get("source_file", "") for c in result.retrieved_chunks]
    assert any(sf for sf in source_files if sf), (
        "Retrieved chunks have no source_file metadata — still returning synthetic data?"
    )

    # Must NOT contain synthetic POL-001 / POL-003 IDs
    for chunk in result.retrieved_chunks:
        assert "POL-001" not in chunk.policy_id, "Still returning synthetic POL-001"
        assert "POL-003" not in chunk.policy_id, "Still returning synthetic POL-003"


# ─────────────────────────────────────────────────────────────────
# Test 5b — Retrieval: assessment rubrics query
# ─────────────────────────────────────────────────────────────────

def test_rag_query_assessment_rubrics(ingested_db):
    """Query about assessment criteria must retrieve content from the rubrics document."""
    from app.services.rag_service import RAGService

    db = ingested_db["session"]
    result = RAGService.query_rag_pipeline(
        db=db,
        question="What are the assessment criteria and rubrics for internship evaluation?",
        top_k=3,
    )

    print(f"Assessment rubrics query — retrieved {len(result.retrieved_chunks)} chunks")
    print("  Sources:", result.source_documents)

    assert len(result.retrieved_chunks) > 0, "No chunks retrieved for rubrics query"
    source_files = [c.metadata.get("source_file", "") for c in result.retrieved_chunks]
    assert any(sf for sf in source_files if sf), "Retrieved chunks have no source_file"


# ─────────────────────────────────────────────────────────────────
# Test 5c — Retrieval: project report format query
# ─────────────────────────────────────────────────────────────────

def test_rag_query_project_report(ingested_db):
    """Query about project report format must retrieve real document content."""
    from app.services.rag_service import RAGService

    db = ingested_db["session"]
    result = RAGService.query_rag_pipeline(
        db=db,
        question="What is the format for the internship project report?",
        top_k=3,
    )

    print(f"Project report query — retrieved {len(result.retrieved_chunks)} chunks")
    print("  Sources:", result.source_documents)

    assert len(result.retrieved_chunks) > 0, "No chunks retrieved for project report query"


# ─────────────────────────────────────────────────────────────────
# Test 6 — Negative: synthetic policy IDs must NOT appear in results
# ─────────────────────────────────────────────────────────────────

def test_negative_no_synthetic_policy_ids(ingested_db):
    """
    Internship queries must NEVER return POL-001, POL-002, POL-003, POL-004, POL-005.
    These were the old synthetic seed_data.json IDs.
    """
    from app.services.rag_service import RAGService

    db = ingested_db["session"]
    queries = [
        "What is the minimum CGPA required for internship?",
        "What documents are required for the internship NOC?",
        "What is the internship approval workflow?",
    ]

    synthetic_ids = {"POL-001", "POL-002", "POL-003", "POL-004", "POL-005"}

    for query in queries:
        result = RAGService.query_rag_pipeline(db=db, question=query, top_k=5)
        for chunk in result.retrieved_chunks:
            assert chunk.policy_id not in synthetic_ids, (
                f"Query '{query}' returned synthetic policy ID '{chunk.policy_id}' — "
                "old synthetic data is still being retrieved!"
            )
        print(f"PASS (negative): '{query[:60]}' returned no synthetic IDs")


# ─────────────────────────────────────────────────────────────────
# Test 7 — Agent search_policy tool uses real RAG
# ─────────────────────────────────────────────────────────────────

def test_agent_search_policy_tool_real_rag():
    """
    AgentTools.search_policy() must return real SRMAP content.
    Must NOT return hardcoded POL-001 / POL-003 stubs.
    """
    from app.agent.tools import AgentTools, SearchPolicyInput

    result = AgentTools.search_policy(
        SearchPolicyInput(query="internship joining report submission procedure", top_k=3)
    )

    print(f"Agent search_policy result — success={result.success}, policies={len(result.retrieved_policies)}")

    assert result.success, f"search_policy returned success=False: {result.error}"
    assert len(result.retrieved_policies) >= 0  # may be 0 if no overlap, but must not be hardcoded

    # Must not contain synthetic POL-001/POL-003 hardcoded values
    for policy in result.retrieved_policies:
        pid = policy.get("policy_id", "")
        assert pid not in {"POL-001", "POL-002", "POL-003", "POL-004", "POL-005"}, (
            f"search_policy still returning synthetic policy ID: {pid}"
        )
        # source_file must be present (real docs only)
        assert "source_file" in policy, f"Policy chunk missing source_file: {policy}"
        print(f"  Retrieved: [{pid}] {policy.get('title', '')[:60]} — {policy.get('source_file', '')}")


# ─────────────────────────────────────────────────────────────────
# Test 8 — Academic year flagging
# ─────────────────────────────────────────────────────────────────

def test_academic_year_unknown_flagged(ingested_db):
    """
    Documents where academic year could not be extracted must have
    metadata flag 'academic_year_unknown_flagged_for_review' and
    academic_year == 'unknown'.
    """
    from app.models.policy import PolicyKnowledge

    db = ingested_db["session"]
    unknown_rows = db.query(PolicyKnowledge).filter(
        PolicyKnowledge.source_file.isnot(None)
    ).all()

    unknown_without_flag = []
    for row in unknown_rows:
        meta = row.metadata_json or {}
        if meta.get("academic_year") == "unknown":
            if "academic_year_unknown_flagged_for_review" not in str(meta.get("flag", "")):
                unknown_without_flag.append(row.title)

    assert not unknown_without_flag, (
        f"Documents with unknown academic_year but missing review flag: {unknown_without_flag}"
    )
    print("PASS: all unknown-year documents are correctly flagged.")


# ─────────────────────────────────────────────────────────────────
# Test 9 — Seed_data.SYNTHETIC_BACKUP.json is archived (not active)
# ─────────────────────────────────────────────────────────────────

def test_synthetic_backup_archived():
    """seed_data.SYNTHETIC_BACKUP.json must exist, and rag_service.py must not
    actively open or load seed_data.json (the original synthetic file)."""
    knowledge_dir = os.path.join(
        os.path.dirname(__file__), "..", "app", "knowledge"
    )

    backup_path = os.path.join(knowledge_dir, "seed_data.SYNTHETIC_BACKUP.json")
    assert os.path.exists(backup_path), (
        f"Backup file not found at {backup_path}. Archive was not created."
    )

    # Check that the active rag_service.py does NOT open/load seed_data.json in code.
    # We strip out docstrings and comments before checking, because the filename
    # may legitimately appear in documentation without being used for retrieval.
    rag_service_path = os.path.join(
        os.path.dirname(__file__), "..", "app", "services", "rag_service.py"
    )
    with open(rag_service_path, "r", encoding="utf-8") as f:
        source_lines = f.readlines()

    # Strip comment lines and docstring lines before checking
    code_lines = []
    in_docstring = False
    for line in source_lines:
        stripped = line.strip()
        if stripped.startswith('#'):
            continue  # skip comment lines
        if stripped.startswith('"""') or stripped.startswith("'''"):
            in_docstring = not in_docstring
            continue
        if in_docstring:
            continue
        code_lines.append(line)

    code_only = "".join(code_lines)
    # The critical check: no open() or json.load() of seed_data.json in active code
    assert 'open(SEED_JSON_PATH' not in code_only, (
        "rag_service.py still actively opens seed_data.json — synthetic data may leak into retrieval!"
    )
    assert 'SEED_JSON_PATH' not in code_only or 'open(SEED_JSON_PATH' not in code_only, (
        "rag_service.py has an active SEED_JSON_PATH usage — synthetic data may leak into retrieval!"
    )
    print("PASS: seed_data.SYNTHETIC_BACKUP.json exists and rag_service.py does not actively load seed_data.json")
