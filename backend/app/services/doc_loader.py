"""
DocLoader — SRMAP Internship Document Loader & Chunker
=======================================================
Extracts text from local DOCX and PPTX files, attempts to detect the
academic year from source content, and produces overlapping text chunks
suitable for RAG embedding.

Design rules:
  - Never invent or paraphrase content. Output source wording only.
  - Academic year extracted from document text via regex.
    If not found → academic_year = "unknown" (flagged for review).
  - No CGPA, backlog, NOC, or approval requirements are injected.
  - DOCX paragraph boundaries are respected in chunking.
  - PPTX slides are treated as individual paragraph units.
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("DocLoader")

# ── Category mapping keyed by source filename stem (lower, normalised)
FILENAME_CATEGORY_MAP: Dict[str, str] = {
    "summer internship course guidelines": "internship_policy",
    "joining report sip 2026": "joining_procedure",
    "internship completion certificate": "completion_certificate",
    "project report format": "project_report",
    "rubrics for final assessment": "assessment_rubrics",
    "synopsis format": "synopsis_format",
    "weekly diary report": "weekly_diary",           # matches any weekly diary
    "mid sem ppt help": "presentation_guidelines",
}

# Regex to find academic years of the form 2023-24, 2025-2026, 2025–26, etc.
ACADEMIC_YEAR_RE = re.compile(
    r"20\d{2}\s*[–\-]\s*(?:20)?\d{2}",
    re.IGNORECASE,
)

# ── Chunking parameters
CHUNK_SIZE_WORDS = 150       # target words per chunk (small docs need fine-grained chunks)
OVERLAP_WORDS    = 30        # words of overlap between consecutive chunks


class DocLoader:
    """Load and chunk DOCX / PPTX documents for RAG ingestion."""

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    @classmethod
    def load_directory(cls, directory: str) -> List[Dict[str, Any]]:
        """
        Walk *directory*, parse every .docx and .pptx file, and return
        a flat list of chunk dicts ready for embedding & storage.

        Each chunk dict contains:
          source_file, doc_title, category, doc_type,
          academic_year, chunk_index, content, page_approx
        """
        all_chunks: List[Dict[str, Any]] = []

        if not os.path.isdir(directory):
            logger.warning(f"DocLoader: directory not found → {directory}")
            return all_chunks

        for fname in sorted(os.listdir(directory)):
            fpath = os.path.join(directory, fname)
            ext = os.path.splitext(fname)[1].lower()

            if ext == ".docx":
                chunks = cls._process_docx(fpath, fname)
            elif ext == ".pptx":
                chunks = cls._process_pptx(fpath, fname)
            else:
                logger.debug(f"DocLoader: skipping unsupported file → {fname}")
                continue

            if chunks:
                logger.info(
                    f"DocLoader: {fname} → {len(chunks)} chunks "
                    f"(academic_year={chunks[0].get('academic_year', 'unknown')})"
                )
                all_chunks.extend(chunks)
            else:
                logger.warning(f"DocLoader: {fname} produced 0 chunks — check file content")

        return all_chunks

    # ─────────────────────────────────────────────────────────────
    # DOCX Extraction
    # ─────────────────────────────────────────────────────────────

    @classmethod
    def _process_docx(cls, fpath: str, fname: str) -> List[Dict[str, Any]]:
        try:
            from docx import Document  # python-docx
        except ImportError:
            logger.error("python-docx is not installed. Run: pip install python-docx")
            return []

        try:
            doc = Document(fpath)
        except Exception as exc:
            logger.error(f"DocLoader: cannot open DOCX {fname}: {exc}")
            return []

        # Extract all non-empty paragraph texts
        paragraphs: List[str] = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                paragraphs.append(text)

        # Also extract text from tables
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(
                    cell.text.strip() for cell in row.cells if cell.text.strip()
                )
                if row_text:
                    paragraphs.append(row_text)

        full_text = "\n".join(paragraphs)
        academic_year = cls._extract_academic_year(full_text)
        doc_title = cls._infer_title(fname, paragraphs)
        category = cls._infer_category(fname)

        return cls._chunk_paragraphs(
            paragraphs=paragraphs,
            source_file=fname,
            doc_title=doc_title,
            category=category,
            doc_type="DOCX",
            academic_year=academic_year,
        )

    # ─────────────────────────────────────────────────────────────
    # PPTX Extraction
    # ─────────────────────────────────────────────────────────────

    @classmethod
    def _process_pptx(cls, fpath: str, fname: str) -> List[Dict[str, Any]]:
        try:
            from pptx import Presentation  # python-pptx
        except ImportError:
            logger.error("python-pptx is not installed. Run: pip install python-pptx")
            return []

        try:
            prs = Presentation(fpath)
        except Exception as exc:
            logger.error(f"DocLoader: cannot open PPTX {fname}: {exc}")
            return []

        paragraphs: List[str] = []
        for slide_num, slide in enumerate(prs.slides, 1):
            slide_texts: List[str] = []
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    slide_texts.append(shape.text.strip())
            if slide_texts:
                # Prefix each slide with its number so chunk metadata is traceable
                paragraphs.append(f"[Slide {slide_num}] " + " ".join(slide_texts))

        full_text = "\n".join(paragraphs)
        academic_year = cls._extract_academic_year(full_text)
        doc_title = cls._infer_title(fname, paragraphs)
        category = cls._infer_category(fname)

        return cls._chunk_paragraphs(
            paragraphs=paragraphs,
            source_file=fname,
            doc_title=doc_title,
            category=category,
            doc_type="PPTX",
            academic_year=academic_year,
        )

    # ─────────────────────────────────────────────────────────────
    # Chunking — word-level sliding window, paragraph-boundary aware
    # ─────────────────────────────────────────────────────────────

    @classmethod
    def _chunk_paragraphs(
        cls,
        paragraphs: List[str],
        source_file: str,
        doc_title: str,
        category: str,
        doc_type: str,
        academic_year: str,
    ) -> List[Dict[str, Any]]:
        """
        Build overlapping chunks from paragraph list.
        A new chunk starts when the word count exceeds CHUNK_SIZE_WORDS.
        The last OVERLAP_WORDS of the previous chunk seed the next chunk.
        """
        chunks: List[Dict[str, Any]] = []
        current_words: List[str] = []
        current_paras: List[str] = []
        chunk_index = 0
        para_cursor = 0  # tracks approximate "page" (paragraph index)

        def flush_chunk(words: List[str], para_start: int) -> None:
            nonlocal chunk_index
            text = " ".join(words).strip()
            if not text:
                return
            chunks.append({
                "source_file": source_file,
                "doc_title": doc_title,
                "category": category,
                "doc_type": doc_type,
                "academic_year": academic_year,
                "chunk_index": chunk_index,
                "page_approx": para_start + 1,  # 1-indexed
                "content": text,
            })
            chunk_index += 1

        for para_idx, para in enumerate(paragraphs):
            para_words = para.split()
            current_words.extend(para_words)
            current_paras.append(para)

            if len(current_words) >= CHUNK_SIZE_WORDS:
                flush_chunk(current_words, para_cursor)
                # Seed next chunk with overlap
                current_words = current_words[-OVERLAP_WORDS:]
                current_paras = []
                para_cursor = para_idx

        # Flush remaining
        if current_words:
            flush_chunk(current_words, para_cursor)

        return chunks

    # ─────────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────────

    @classmethod
    def _extract_academic_year(cls, text: str) -> str:
        """
        Searches the first ~3000 characters of text for a pattern like
        2025-26, 2025–2026, etc. Returns the first match normalised
        (e.g. "2025-26"), or "unknown" if not found.
        """
        sample = text[:3000]
        match = ACADEMIC_YEAR_RE.search(sample)
        if match:
            raw = match.group(0).strip()
            # Normalise separator to "-"
            return re.sub(r"[–\s]+", "-", raw)
        return "unknown"

    @classmethod
    def _infer_title(cls, fname: str, paragraphs: List[str]) -> str:
        """
        Use the first non-empty paragraph as the document title if it looks
        like a heading (≤ 15 words). Otherwise fall back to the filename stem.
        """
        if paragraphs:
            first = paragraphs[0].strip()
            if first and len(first.split()) <= 15:
                return first
        stem = os.path.splitext(fname)[0]
        # Remove trailing " (1)" artifacts from downloaded files
        stem = re.sub(r"\s*\(\d+\)\s*$", "", stem).strip()
        return stem

    @classmethod
    def _infer_category(cls, fname: str) -> str:
        """
        Map filename to a RAG category using FILENAME_CATEGORY_MAP.
        Falls back to "general_internship" if no match found.
        This mapping is based on the filename only — no content inference.
        """
        fname_lower = fname.lower()
        for key, cat in FILENAME_CATEGORY_MAP.items():
            if key in fname_lower:
                return cat
        return "general_internship"
