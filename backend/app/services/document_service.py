from typing import List
from sqlalchemy.orm import Session
from app.models.request import Document
from app.schemas.document import DocumentResponseSchema

class DocumentService:
    @staticmethod
    def get_all_documents(db: Session) -> List[DocumentResponseSchema]:
        docs = db.query(Document).order_by(Document.created_at.desc()).all()
        return [DocumentResponseSchema.model_validate(d) for d in docs]
