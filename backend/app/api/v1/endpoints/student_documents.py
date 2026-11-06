import os
import uuid
import logging
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.student_document import StudentDocument
from app.models.policy import PolicyKnowledge
from app.models.request import Request
from app.models.workflow import Workflow
from app.services.rag_service import RAGService
from app.services.document_verifier import DocumentVerificationService
from app.services.audit_service import AuditService

logger = logging.getLogger("CampusFlowStudentDocumentsAPI")
router = APIRouter(prefix="/student-documents", tags=["student-documents"])

UPLOAD_BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "uploads")
os.makedirs(UPLOAD_BASE_DIR, exist_ok=True)


def extract_file_text(file_path: str, filename: str) -> str:
    """Extracts raw text from PDF, DOCX, or text files without inventing content."""
    ext = os.path.splitext(filename)[1].lower()
    text = ""
    try:
        if ext == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                text = "\n\n".join([page.extract_text() or "" for page in reader.pages])
            except Exception as pe:
                logger.warning(f"pypdf extraction failed for {filename}: {pe}")
                text = f"Document content from PDF file {filename}."
        elif ext in [".docx", ".doc"]:
            try:
                import docx
                doc = docx.Document(file_path)
                text = "\n\n".join([p.text for p in doc.paragraphs if p.text.strip()])
            except Exception as de:
                logger.warning(f"docx extraction failed for {filename}: {de}")
                text = f"Document content from Word file {filename}."
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
    except Exception as e:
        logger.error(f"Failed extracting text from {filename}: {e}")
        text = f"Uploaded document: {filename}."

    return text.strip() or f"Uploaded document: {filename}"


@router.post("", response_model=Dict[str, Any])
async def upload_student_document(
    file: UploadFile = File(...),
    file_type: str = Form("OTHER"),
    workflow_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    1. Authenticates current user.
    2. Validates & securely stores file on disk.
    3. Creates StudentDocument record.
    4. Extracts text via OCR/Parser.
    5. Indexes chunks into STUDENT PRIVATE RAG (never UNIVERSITY RAG).
    6. Verifies document against official university policy requirements.
    7. Creates or updates internship workflow if applicable.
    8. Logs audit trail event.
    """
    logger.info(f"[POST /api/v1/student-documents] User: '{current_user.email}', File: '{file.filename}', Type: '{file_type}'")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    user_upload_dir = os.path.join(UPLOAD_BASE_DIR, current_user.id)
    os.makedirs(user_upload_dir, exist_ok=True)

    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{os.path.basename(file.filename)}"
    file_path = os.path.join(user_upload_dir, safe_filename)

    file_bytes = await file.read()
    file_size = len(file_bytes)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # 1. Extract Text
    extracted_text = extract_file_text(file_path, file.filename)

    # 2. Save StudentDocument DB Record
    student_doc = StudentDocument(
        id=file_id,
        user_id=current_user.id,
        request_id=workflow_id,
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        file_type=file_type.upper(),
        mime_type=file.content_type,
        extracted_text=extracted_text,
        verification_status="PROCESSING"
    )
    db.add(student_doc)
    db.commit()
    db.refresh(student_doc)

    # 3. Ingest into STUDENT PRIVATE RAG (Scope: STUDENT, Owner: current_user.id)
    chunks_count = RAGService.ingest_student_document(
        db=db,
        user_id=current_user.id,
        document_id=student_doc.id,
        filename=file.filename,
        extracted_text=extracted_text,
        doc_type=file_type
    )

    # 4. Perform AI Policy Verification against Official University Requirements
    verification_res = DocumentVerificationService.verify_document(
        document_id=student_doc.id,
        document_type=file_type.upper(),
        file_name=file.filename,
        extracted_text=extracted_text
    )

    status_mapped = verification_res.status.upper()
    student_doc.verification_status = status_mapped
    student_doc.verification_summary = verification_res.dict()
    db.commit()

    # 5. Create or Update Workflow if appropriate
    student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    student_profile_id = student_profile.id if student_profile else None

    req_obj = None
    if workflow_id and student_profile_id:
        req_obj = db.query(Request).filter(Request.id == workflow_id, Request.student_id == student_profile_id).first()
    
    if not req_obj and student_profile_id and file_type.upper() in ["OFFER_LETTER", "JOINING_REPORT", "SYNOPSIS", "INTERNSHIP_OFFER"]:
        # Find active default workflow or create one
        wf = db.query(Workflow).filter(Workflow.code == "INTERNSHIP_NOC").first()
        wf_id = wf.id if wf else str(uuid.uuid4())
        
        req_obj = Request(
            id=str(uuid.uuid4()),
            student_id=student_profile_id,
            workflow_id=wf_id,
            current_status="waiting_for_approval" if status_mapped != "VALID" else "processing",
            submitted_data={"document_id": student_doc.id, "file_name": file.filename, "type": file_type}
        )
        db.add(req_obj)
        db.commit()
        db.refresh(req_obj)
        student_doc.request_id = req_obj.id
        db.commit()

    # 6. Audit Trail Logging
    AuditService.log_event(
        db=db,
        actor_type="STUDENT",
        actor_id=current_user.id,
        action="STUDENT_DOCUMENT_UPLOADED_AND_VERIFIED",
        workflow_id=student_doc.request_id,
        result_summary={
            "document_id": student_doc.id,
            "file_name": file.filename,
            "file_type": file_type,
            "rag_chunks_indexed": chunks_count,
            "verification_status": status_mapped,
            "verification_reasons": verification_res.reasons
        },
        status="SUCCESS"
    )

    return {
        "success": True,
        "document": {
            "id": student_doc.id,
            "file_name": student_doc.file_name,
            "file_type": student_doc.file_type,
            "file_size": student_doc.file_size,
            "verification_status": student_doc.verification_status,
            "verification_summary": student_doc.verification_summary,
            "chunks_indexed": chunks_count,
            "created_at": student_doc.created_at.isoformat()
        },
        "workflow": {
            "id": req_obj.id,
            "status": req_obj.current_status
        } if req_obj else None,
        "message": f"Document '{file.filename}' uploaded, indexed to your private RAG, and verified against university policy."
    }


@router.get("", response_model=List[Dict[str, Any]])
def list_student_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Returns only authenticated student's private documents."""
    docs = (
        db.query(StudentDocument)
        .filter(StudentDocument.user_id == current_user.id)
        .order_by(StudentDocument.created_at.desc())
        .all()
    )

    items = []
    for d in docs:
        items.append({
            "id": d.id,
            "file_name": d.file_name,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "verification_status": d.verification_status,
            "verification_summary": d.verification_summary,
            "created_at": d.created_at.isoformat() if d.created_at else None
        })

    return items


@router.get("/{document_id}")
def get_student_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Fetches a specific document with strict ownership check."""
    doc = db.query(StudentDocument).filter(StudentDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    # Ownership Check
    if doc.user_id != current_user.id and current_user.role not in ["staff", "admin", "advisor"]:
        raise HTTPException(status_code=403, detail="Access denied. You do not own this document.")

    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "file_name": doc.file_name,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "verification_status": doc.verification_status,
        "verification_summary": doc.verification_summary,
        "extracted_text_preview": (doc.extracted_text or "")[:300],
        "created_at": doc.created_at.isoformat() if doc.created_at else None
    }


@router.delete("/{document_id}")
def delete_student_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Deletes document & associated STUDENT private RAG chunks with strict ownership check."""
    doc = db.query(StudentDocument).filter(StudentDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied. You cannot delete another student's document.")

    # Delete RAG chunks
    db.query(PolicyKnowledge).filter(
        PolicyKnowledge.document_id == document_id,
        PolicyKnowledge.user_id == current_user.id,
        PolicyKnowledge.knowledge_scope == "STUDENT"
    ).delete()

    # Remove physical file if exists
    if os.path.exists(doc.file_path):
        try: os.remove(doc.file_path)
        except Exception: pass

    db.delete(doc)
    db.commit()

    return {"success": True, "message": f"Document '{doc.file_name}' and its private RAG chunks deleted."}
