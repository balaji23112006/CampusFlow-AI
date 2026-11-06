import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.document import DocumentResponseSchema
from app.services.document_service import DocumentService
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/documents", tags=["Documents"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB Limit

@router.get("", response_model=List[DocumentResponseSchema])
def list_documents(db: Session = Depends(get_db)):
    """
    Get all uploaded and system-generated administrative documents
    """
    return DocumentService.get_all_documents(db)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = "OFFER_LETTER",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Secure file upload endpoint with strict file size, PDF MIME-type, and filename sanitization.
    """
    # 1. Sanitize file name to prevent path traversal attack (e.g., ../../etc/passwd)
    safe_filename = os.path.basename(file.filename or "uploaded_document.pdf")
    ext = os.path.splitext(safe_filename)[1].lower()

    # 2. Validate file extension and MIME type
    if ext != ".pdf" or (file.content_type and file.content_type != "application/pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security Policy Violation: Only official PDF documents (.pdf) are permitted."
        )

    # 3. Read content and enforce 10MB file size limit
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed limit of 10MB ({len(content) / (1024*1024):.2f}MB uploaded)."
        )

    return {
        "success": True,
        "file_name": safe_filename,
        "document_type": document_type,
        "file_size_bytes": len(content),
        "uploaded_by_user_id": current_user.id,
        "message": "Document uploaded and validated successfully."
    }

