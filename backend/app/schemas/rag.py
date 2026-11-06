from pydantic import BaseModel, Field
from typing import List, Optional, Any

class RAGQueryRequestSchema(BaseModel):
    question: str = Field(..., example="What documents do I need for my internship?")
    top_k: Optional[int] = Field(default=4, ge=1, le=10)
    scope: Optional[str] = Field(default="COMBINED", description="Scope: UNIVERSITY, STUDENT, or COMBINED")

class RetrievedChunkSchema(BaseModel):
    id: str
    policy_id: str
    title: str
    category: str
    clause: Optional[str] = None
    content: str
    similarity_score: float
    metadata: Optional[Any] = None

class RAGQueryResponseSchema(BaseModel):
    question: str
    retrieved_chunks: List[RetrievedChunkSchema]
    source_documents: List[str]
    generated_answer: str
    is_grounded: bool
    execution_time_ms: float
