"""KPMG CFO Advisory Platform Telemetry Emitter.

Lightweight, non-blocking telemetry emitter connecting Invoice Processing (P2P)
to the central CFO Advisory audit mesh. Fails silently so invoice processing
is never blocked or interrupted.
"""

import os
import asyncio
import logging
from typing import Any
import httpx

log = logging.getLogger(__name__)

TELEMETRY_ENDPOINT = os.getenv("KPMG_CFO_TELEMETRY_ENDPOINT", "http://localhost:3000/api/telemetry")
PRODUCT_API_KEY = os.getenv("KPMG_CFO_PRODUCT_API_KEY", "kpmg_sec_prod_invoice_p2p_live")


async def emit_cfo_telemetry_event(
    action_name: str,
    target_entity_id: str,
    model_name: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    duration_ms: int = 0,
    status: str = "SUCCESS",
    sanitized_query: str = "",
    sanitized_response: str = "",
) -> None:
    """Non-blocking background emission of telemetry to KPMG CFO Advisory platform."""
    try:
        total_tokens = prompt_tokens + completion_tokens
        cost_usd = round((prompt_tokens * 0.00000125) + (completion_tokens * 0.000005), 6) if total_tokens else 0.005

        payload = {
            "tenant_id": "org_acme_corp_global",
            "engagement_code": "ENG-2026-CFO-9042",
            "user_id": "usr_kpmg_lead_01",
            "user_email": "lead.director@kpmg.com",
            "user_role": "KPMG_LEAD",
            "product_id": "invoice-processing-p2p",
            "product_name": "AI Invoice Processing & P2P Intelligence",
            "product_version": "v1.4.2",
            "environment": "production",
            "workflow_id": "wf_ap_invoice_extraction",
            "workflow_name": "AP Autonomous Tax Invoice Intake",
            "step_name": "GEMINI_VISION_EXTRACTION",
            "step_sequence": 1,
            "action_name": action_name,
            "action_status": status,
            "target_entity_type": "INVOICE",
            "target_entity_id": target_entity_id,
            "ai_provider": "google_vertex",
            "model_name": model_name,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "estimated_cost_usd": cost_usd,
            "duration_ms": duration_ms,
            "input_query_sanitized": sanitized_query,
            "output_response_sanitized": sanitized_response,
            "requires_human_signoff": True,
            "signoff_status": "AUTO_APPROVED",
        }

        async with httpx.AsyncClient(timeout=2.0) as client:
            headers = {"Authorization": f"Bearer {PRODUCT_API_KEY}"} if PRODUCT_API_KEY else {}
            await client.post(TELEMETRY_ENDPOINT, json=payload, headers=headers)
    except Exception as exc:
        log.debug("[KPMG Telemetry Non-Fatal]: %s", exc)


def fire_cfo_telemetry(
    action_name: str,
    target_entity_id: str,
    model_name: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    duration_ms: int = 0,
    status: str = "SUCCESS",
    sanitized_query: str = "",
    sanitized_response: str = "",
) -> None:
    """Schedule the telemetry emission in the running event loop without awaiting."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            emit_cfo_telemetry_event(
                action_name=action_name,
                target_entity_id=target_entity_id,
                model_name=model_name,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                duration_ms=duration_ms,
                status=status,
                sanitized_query=sanitized_query,
                sanitized_response=sanitized_response,
            )
        )
    except Exception:
        pass
