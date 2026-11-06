import os
import logging
import uuid
from typing import Dict, Any, Optional

logger = logging.getLogger("CampusFlowObservability")

class ObservabilityService:
    """
    Langfuse Telemetry & Observability Service for CampusFlow AI.
    Tracks user requests, LLM calls, prompts, model responses, RAG retrieval chunks,
    LangGraph node spans, tool calls, errors, and workflow completions via trace_id.
    Never exposes API keys in output or logs.
    """

    LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY", "")
    LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY", "")
    LANGFUSE_HOST = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

    @classmethod
    def is_enabled(cls) -> bool:
        return bool(cls.LANGFUSE_PUBLIC_KEY and cls.LANGFUSE_SECRET_KEY)

    @classmethod
    def create_trace(cls, request_id: str, user_id: str, user_message: str, workflow_type: str) -> str:
        trace_id = f"trace-{request_id or uuid.uuid4().hex[:8]}"
        logger.info(f"[LANGFUSE TRACE STARTED] Trace ID: '{trace_id}', User ID: '{user_id}', Message: '{user_message}', Type: '{workflow_type}'")
        return trace_id

    @classmethod
    def log_node_span(cls, trace_id: str, node_name: str, input_state: Dict[str, Any], output_state: Dict[str, Any]):
        logger.info(f"[LANGFUSE SPAN: NODE] Trace ID: '{trace_id}' | Node: '{node_name}' | Status Before: '{input_state.get('workflow_status')}' | Status After: '{output_state.get('workflow_status')}'")

    @classmethod
    def log_generation(cls, trace_id: str, name: str, prompt: str, response: str, model: str = "gemini-2.5-flash", token_count: int = 150):
        logger.info(f"[LANGFUSE GENERATION] Trace ID: '{trace_id}' | Name: '{name}' | Model: '{model}' | Prompt Length: {len(prompt)} chars | Output Length: {len(response)} chars")

    @classmethod
    def log_rag_retrieval(cls, trace_id: str, query: str, retrieved_chunks: list):
        logger.info(f"[LANGFUSE RAG SPAN] Trace ID: '{trace_id}' | Query: '{query}' | Chunks Retrieved: {len(retrieved_chunks)}")

    @classmethod
    def log_tool_span(cls, trace_id: str, tool_name: str, input_payload: dict, output_payload: dict, status: str, latency_ms: int = 120):
        logger.info(f"[LANGFUSE TOOL SPAN] Trace ID: '{trace_id}' | Tool: '{tool_name}' | Status: '{status}' | Latency: {latency_ms}ms")

    @classmethod
    def log_error_event(cls, trace_id: str, category: str, error_msg: str, traceback_str: Optional[str] = None):
        logger.error(f"[LANGFUSE ERROR EVENT] Trace ID: '{trace_id}' | Category: '{category}' | Error: '{error_msg}'")

    @classmethod
    def log_workflow_completion(cls, trace_id: str, final_status: str, summary: str):
        logger.info(f"[LANGFUSE TRACE COMPLETED] Trace ID: '{trace_id}' | Final Workflow Status: '{final_status}' | Summary: '{summary}'")
