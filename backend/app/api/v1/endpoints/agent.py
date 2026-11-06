from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.core.auth import get_current_user
from app.agent.graph import campusflow_agent

from app.services.rag_service import RAGService
from app.services.llm_service import LLMService
from app.models.user import StudentProfile
from app.models.student_document import StudentDocument
from app.models.policy import PolicyKnowledge

router = APIRouter(prefix="/agent", tags=["AI Agent"])

class AgentChatRequest(BaseModel):
    message: str

class AgentChatResponse(BaseModel):
    response: str
    workflow_status: str
    retrieved_policies: List[Dict[str, Any]]
    suggested_actions: List[str]
    missing_documents: List[str]
    attached_workflow_id: Optional[str] = None

@router.post("/chat", response_model=AgentChatResponse)
def chat_with_agent(
    payload: AgentChatRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        trace_id = f"trace-{uuid.uuid4().hex[:8]}"

        # 1. Perform Dual-Scope RAG Retrieval for the user's exact query & private user_id
        rag_response = RAGService.query_rag_pipeline(
            db=db,
            question=payload.message,
            top_k=5,
            user_id=current_user.id,
            scope="COMBINED"
        )

        retrieved_chunks = rag_response.retrieved_chunks or []
        retrieved_policies = [
            {
                "policy_id": chunk.policy_id,
                "title": chunk.title,
                "content": chunk.content,
                "source_file": (chunk.metadata or {}).get("source_file", "unknown"),
                "similarity_score": chunk.similarity_score,
                "knowledge_scope": (chunk.metadata or {}).get("knowledge_scope", "UNIVERSITY"),
            }
            for chunk in retrieved_chunks
        ]

        # 2. Fetch Student Profile & Vault Documents
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        student_docs = db.query(StudentDocument).filter(StudentDocument.user_id == current_user.id).all()
        doc_names = [d.file_name for d in student_docs if d.file_name]

        # 3. Always include Student Private Document Chunks in retrieved policies
        student_pk_chunks = db.query(PolicyKnowledge).filter(
            PolicyKnowledge.knowledge_scope == "STUDENT",
            PolicyKnowledge.user_id == current_user.id
        ).all()

        existing_titles = set(p.get("title") for p in retrieved_policies)
        for pk in student_pk_chunks:
            if pk.title not in existing_titles:
                retrieved_policies.append({
                    "policy_id": f"[STUDENT] {pk.source_file or 'doc'}",
                    "title": pk.title,
                    "content": pk.content,
                    "source_file": pk.source_file or "student_document",
                    "similarity_score": 0.88,
                    "knowledge_scope": "STUDENT"
                })

        # 4. Construct Context for LLM Grounding
        context_blocks = []
        context_blocks.append(f"Student Profile Context: Name: {current_user.full_name}, Roll Number: {profile.roll_number if profile else 'AP24110012146'}")
        if doc_names:
            context_blocks.append(f"Uploaded Documents in Vault ({len(doc_names)}): {', '.join(doc_names)}")
        else:
            context_blocks.append("Uploaded Documents in Vault: None")

        if retrieved_policies:
            context_blocks.append("RETRIEVED KNOWLEDGE & DOCUMENT CONTEXT:")
            for p in retrieved_policies:
                scope_label = f"[{p.get('knowledge_scope', 'UNIVERSITY')}]"
                context_blocks.append(f"- {scope_label} {p.get('title')}: {p.get('content')}")

        context_str = "\n\n".join(context_blocks)

        # 4. Generate LLM Response grounded in user document context
        llm_response = LLMService.generate_response(message=payload.message, context=context_str)

        # 5. Invoke LangGraph agent for workflow state evaluation
        result_state = campusflow_agent.invoke(
            {
                "user_message": payload.message,
                "user_id": current_user.id,
                "trace_id": trace_id
            }
        )

        workflow_status = result_state.get("workflow_status", "unknown")
        missing_docs = result_state.get("missing_documents", [])

        # 6. Build Suggested Actions
        suggested_actions = []
        if missing_docs or not doc_names:
            suggested_actions.append("Go to Document Vault")
        if workflow_status in ["waiting_for_approval", "approved", "completed"]:
            suggested_actions.append("Go to Human Approvals Queue")

        return AgentChatResponse(
            response=llm_response,
            workflow_status=workflow_status,
            retrieved_policies=retrieved_policies if retrieved_policies else result_state.get("retrieved_policies", []),
            suggested_actions=suggested_actions,
            missing_documents=missing_docs,
            attached_workflow_id=result_state.get("request_id")
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
