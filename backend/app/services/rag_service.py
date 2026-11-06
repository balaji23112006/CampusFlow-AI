"""
RAGService — CampusFlow AI Dual-Scope Policy & Student Document Retrieval Engine
=================================================================================
Architecture:
  - RAG SCOPE 1 (UNIVERSITY): Official SRM University–AP documents (knowledge_scope="UNIVERSITY", user_id=None).
  - RAG SCOPE 2 (STUDENT): Authenticated student private documents (knowledge_scope="STUDENT", user_id=authenticated_user_id).

Constraints:
  - Student documents NEVER enter the UNIVERSITY scope.
  - Student retrieval is strictly filtered by authenticated user_id. Cross-student data leaks are impossible.
"""

import os
import time
import uuid
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from app.models.policy import PolicyKnowledge
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService
from app.schemas.rag import RAGQueryResponseSchema, RetrievedChunkSchema

logger = logging.getLogger("RAGService")

KNOWLEDGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "knowledge")
SRMAP_DOC_DIR = os.path.join(KNOWLEDGE_DIR, "srmap_internship")
SYNTHETIC_MARKER = "SYNTHETIC"


class RAGService:

    # ─────────────────────────────────────────────────────────────
    # Synthetic Data Removal
    # ─────────────────────────────────────────────────────────────

    @classmethod
    def clear_synthetic_rows(cls, db: Session) -> int:
        rows = db.query(PolicyKnowledge).all()
        removed = 0
        for row in rows:
            meta = row.metadata_json or {}
            disclaimer = str(meta.get("disclaimer", ""))
            title = (row.title or "").lower()
            content = (row.content or "").lower()
            is_synthetic = (
                SYNTHETIC_MARKER in disclaimer.upper()
                or "studenta" in title or "studentb" in title
                or "studenta" in content or "studentb" in content
                or "tech corp" in content or "data inc" in content
                or "alex chen" in content or "secret offer" in content
                or "secret joining" in content
                or (row.source_file is None and "synthetic" in title)
            )
            if is_synthetic:
                db.delete(row)
                removed += 1
                logger.info(f"  Removed synthetic/fake row: '{row.title}'")

        db.commit()
        logger.info(f"RAGService: cleared {removed} synthetic/fake row(s) from policy_knowledge.")
        return removed

    # ─────────────────────────────────────────────────────────────
    # Scope 1: Official University Knowledge Base Ingestion
    # ─────────────────────────────────────────────────────────────

    @classmethod
    def seed_from_real_docs(cls, db: Session) -> dict:
        from app.services.doc_loader import DocLoader

        if not os.path.isdir(SRMAP_DOC_DIR):
            logger.warning(f"RAGService: SRMAP doc directory not found: {SRMAP_DOC_DIR}")
            return {"files_found": 0, "files_parsed": 0, "chunks_total": 0,
                    "chunks_inserted": 0, "chunks_updated": 0, "files_flagged": []}

        all_chunks = DocLoader.load_directory(SRMAP_DOC_DIR)
        files_found = len(set(c["source_file"] for c in all_chunks)) if all_chunks else 0

        files_parsed = files_found
        chunks_total = len(all_chunks)
        chunks_inserted = 0
        chunks_updated = 0
        files_flagged: List[str] = []

        for chunk in all_chunks:
            if chunk.get("academic_year") == "unknown":
                src = chunk["source_file"]
                if src not in files_flagged:
                    files_flagged.append(src)

        for chunk in all_chunks:
            source_file = chunk["source_file"]
            chunk_index = chunk["chunk_index"]
            content = chunk["content"]
            title = chunk["doc_title"]
            category = chunk["category"]

            metadata = {
                "doc_type": chunk["doc_type"],
                "academic_year": chunk["academic_year"],
                "page_approx": chunk["page_approx"],
                "source_file": source_file,
                "chunk_index": chunk_index,
                "knowledge_scope": "UNIVERSITY"
            }
            if chunk.get("academic_year") == "unknown":
                metadata["flag"] = "academic_year_unknown_flagged_for_review"

            embedding_vec = EmbeddingService.get_embedding(f"{title} {category} {content}")
            metadata["embedding_vec"] = embedding_vec

            existing = (
                db.query(PolicyKnowledge)
                .filter(
                    PolicyKnowledge.source_file == source_file,
                    PolicyKnowledge.chunk_index == chunk_index,
                    PolicyKnowledge.knowledge_scope == "UNIVERSITY"
                )
                .first()
            )

            if existing:
                existing.title = title
                existing.category = category
                existing.content = content
                existing.metadata_json = metadata
                existing.knowledge_scope = "UNIVERSITY"
                existing.user_id = None
                chunks_updated += 1
            else:
                pk = PolicyKnowledge(
                    id=str(uuid.uuid4()),
                    title=title,
                    category=category,
                    content=content,
                    metadata_json=metadata,
                    source_file=source_file,
                    chunk_index=chunk_index,
                    knowledge_scope="UNIVERSITY",
                    user_id=None
                )
                db.add(pk)
                chunks_inserted += 1

        db.commit()
        return {
            "files_found": files_found,
            "files_parsed": files_parsed,
            "chunks_total": chunks_total,
            "chunks_inserted": chunks_inserted,
            "chunks_updated": chunks_updated,
            "files_flagged": files_flagged,
        }

    @classmethod
    def seed_knowledge_base(cls, db: Session) -> dict:
        removed = cls.clear_synthetic_rows(db)
        result = cls.seed_from_real_docs(db)
        result["synthetic_removed"] = removed
        return result

    # ─────────────────────────────────────────────────────────────
    # Scope 2: Authenticated Student Private Document Ingestion
    # ─────────────────────────────────────────────────────────────

    @classmethod
    def ingest_student_document(
        cls,
        db: Session,
        user_id: str,
        document_id: str,
        filename: str,
        extracted_text: str,
        doc_type: str = "STUDENT_DOC"
    ) -> int:
        """
        Chunks and embeds a student's uploaded document.
        STRICT SECURITY: Stores with knowledge_scope="STUDENT" and user_id=user_id.
        Will NEVER insert into UNIVERSITY scope.
        """
        if not extracted_text or not extracted_text.strip():
            logger.warning(f"RAGService: Empty text extracted for student doc '{filename}'.")
            return 0

        # Remove previous chunks for this document if re-uploading
        db.query(PolicyKnowledge).filter(
            PolicyKnowledge.document_id == document_id,
            PolicyKnowledge.user_id == user_id,
            PolicyKnowledge.knowledge_scope == "STUDENT"
        ).delete()

        # Simple text chunker (~500 chars with 100 char overlap)
        paragraphs = [p.strip() for p in extracted_text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [extracted_text[i:i+500] for i in range(0, len(extracted_text), 400)]

        chunks_inserted = 0
        for i, para in enumerate(paragraphs):
            embedding_vec = EmbeddingService.get_embedding(f"{filename} {para}")
            metadata = {
                "knowledge_scope": "STUDENT",
                "user_id": user_id,
                "document_id": document_id,
                "source_file": filename,
                "chunk_index": i,
                "doc_type": doc_type,
                "embedding_vec": embedding_vec
            }

            pk = PolicyKnowledge(
                id=str(uuid.uuid4()),
                title=f"Student Doc: {filename}",
                category="STUDENT_PRIVATE_DOCUMENT",
                content=para,
                metadata_json=metadata,
                source_file=filename,
                chunk_index=i,
                knowledge_scope="STUDENT",
                user_id=user_id,
                document_id=document_id
            )
            db.add(pk)
            chunks_inserted += 1

        db.commit()
        logger.info(f"RAGService: Ingested {chunks_inserted} private chunks for student {user_id} file '{filename}'.")
        return chunks_inserted

    # ─────────────────────────────────────────────────────────────
    # Dual RAG Query Pipeline (University + Student Scope Search)
    # ─────────────────────────────────────────────────────────────

    @classmethod
    def query_rag_pipeline(
        cls,
        db: Session,
        question: str,
        top_k: int = 4,
        user_id: Optional[str] = None,
        scope: str = "COMBINED"  # UNIVERSITY, STUDENT, or COMBINED
    ) -> RAGQueryResponseSchema:
        start_time = time.time()

        # 1. Ensure real university docs are ingested
        existing_real = (
            db.query(PolicyKnowledge)
            .filter(PolicyKnowledge.knowledge_scope == "UNIVERSITY")
            .count()
        )
        if existing_real == 0:
            logger.info("RAGService: no university chunks found — seeding now...")
            cls.seed_knowledge_base(db)

        # 2. Build scope filtering query
        query = db.query(PolicyKnowledge)
        if scope.upper() == "UNIVERSITY":
            query = query.filter(PolicyKnowledge.knowledge_scope == "UNIVERSITY")
        elif scope.upper() == "STUDENT":
            if not user_id:
                query = query.filter(False)  # Unauthenticated student search returns empty
            else:
                query = query.filter(
                    and_(
                        PolicyKnowledge.knowledge_scope == "STUDENT",
                        PolicyKnowledge.user_id == user_id
                    )
                )
        else:  # COMBINED
            if user_id:
                query = query.filter(
                    or_(
                        PolicyKnowledge.knowledge_scope == "UNIVERSITY",
                        and_(
                            PolicyKnowledge.knowledge_scope == "STUDENT",
                            PolicyKnowledge.user_id == user_id
                        )
                    )
                )
            else:
                query = query.filter(PolicyKnowledge.knowledge_scope == "UNIVERSITY")

        chunks = query.all()

        q_tokens = set(w.lower().strip("?,.-!/") for w in question.split() if len(w) > 2)
        question_vec = EmbeddingService.get_embedding(question)

        scored_chunks = []
        for chunk in chunks:
            meta = chunk.metadata_json or {}
            vec = meta.get("embedding_vec")
            if not vec:
                vec = EmbeddingService.get_embedding(f"{chunk.title} {chunk.category} {chunk.content}")

            doc_tokens = set(
                w.lower().strip("?,.-!/")
                for w in f"{chunk.title} {chunk.category} {chunk.content}".split()
                if len(w) > 2
            )
            intersection = q_tokens.intersection(doc_tokens)

            cos_sim = EmbeddingService.cosine_similarity(question_vec, vec)
            overlap_ratio = len(intersection) / max(len(q_tokens), 1) if q_tokens else 0.0

            # Hybrid Vector + Keyword Similarity Score (Always uses vector similarity)
            score = (cos_sim * 0.7) + (overlap_ratio * 0.3)

            # Ensure student private documents owned by the user are properly boosted
            if chunk.knowledge_scope == "STUDENT" and user_id and chunk.user_id == user_id:
                score = max(score, cos_sim * 0.85 + 0.1)

            chunk_scope = chunk.knowledge_scope or "UNIVERSITY"
            scored_chunks.append({
                "id": chunk.id,
                "policy_id": f"[{chunk_scope}] {chunk.source_file or 'doc'}",
                "title": chunk.title,
                "category": chunk.category,
                "clause": f"Chunk {chunk.chunk_index}",
                "content": chunk.content,
                "similarity_score": round(score, 4),
                "knowledge_scope": chunk_scope,
                "metadata": {
                    **meta,
                    "knowledge_scope": chunk_scope,
                    "source_file": chunk.source_file,
                    "chunk_index": chunk.chunk_index,
                    "user_id": chunk.user_id
                },
            })

        scored_chunks.sort(key=lambda x: x["similarity_score"], reverse=True)

        SIMILARITY_THRESHOLD = 0.05
        top_chunks = [c for c in scored_chunks[:top_k] if c["similarity_score"] >= SIMILARITY_THRESHOLD]

        retrieved_schemas: List[RetrievedChunkSchema] = []
        source_docs: List[str] = []

        for c in top_chunks:
            retrieved_schemas.append(
                RetrievedChunkSchema(
                    id=c["id"],
                    policy_id=c["policy_id"],
                    title=c["title"],
                    category=c["category"],
                    clause=c["clause"],
                    content=c["content"],
                    similarity_score=c["similarity_score"],
                    metadata=c["metadata"],
                )
            )
            doc_label = f"[{c['knowledge_scope']}] {c['metadata'].get('source_file', 'unknown')}"
            if doc_label not in source_docs:
                source_docs.append(doc_label)

        if not top_chunks:
            generated_answer = (
                "No matching evidence found in the SRM University–AP policy knowledge base or your uploaded documents. "
                "Please check the official Summer Internship Course guidelines or contact your Academic Advisor."
            )
            is_grounded = False
        else:
            is_grounded = True
            context_text = "\n\n".join([
                f"[{c['knowledge_scope']} SOURCE - File: {c['metadata'].get('source_file', 'unknown')}, Chunk {c['metadata'].get('chunk_index', '?')}]:\n{c['content']}"
                for c in top_chunks
            ])
            generated_answer = LLMService.generate_response(message=question, context=context_text)

        exec_time = round((time.time() - start_time) * 1000, 2)

        return RAGQueryResponseSchema(
            question=question,
            retrieved_chunks=retrieved_schemas,
            source_documents=source_docs,
            generated_answer=generated_answer,
            is_grounded=is_grounded,
            execution_time_ms=exec_time,
        )
