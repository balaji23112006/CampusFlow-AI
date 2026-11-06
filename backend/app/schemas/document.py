from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentResponseSchema(BaseModel):
    id: str
    request_id: str
    requirement_id: Optional[str] = None
    uploaded_by_user_id: str
    file_name: str
    storage_path: str
    file_type: str
    extracted_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
