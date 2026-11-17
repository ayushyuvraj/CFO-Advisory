"""Ask Agent — a copilot grounded in one transaction.

The model sees only this transaction's facts (extraction, checks, match lines,
corrections, approvals, payments, audit) and must answer from them: state what
it checked, the finding, and a recommendation. If Gemini is unavailable, the
agent falls back to the rule-based recommendation rather than failing.
"""

import json
import logging

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models import ChatMessage, Invoice
from . import serializers
from .extraction import with_retry

log = logging.getLogger(__name__)

SUGGESTED = [
    "Why did this invoice fail validation?",
    "What is causing the mismatch?",
    "Can this invoice be posted?",
    "Where did the PO number come from?",
    "Summarize this invoice.",
]

SYSTEM = """You are the Invoice Processing Agent inside an accounts-payable command center (India, GST).
Answer the user's question about ONE transaction using ONLY the JSON facts provided. Never invent
figures, documents or policies that are not in the facts. If the facts do not answer the question, say so.
Be concise (2–4 sentences). Use Indian number formatting with ₹ for amounts.
Return: text (the finding), sources (the documents / checks you relied on, joined with ' · '),
recommendation (one sentence, the next action)."""


class Answer(BaseModel):
    text: str
    sources: str = Field(description="What was checked, e.g. 'Invoice · Purchase Order 4500131207 · GR 5001284471'")
    recommendation: str


async def _facts(db: AsyncSession, inv: Invoice) -> dict:
    d = serializers.invoice_detail(inv)
    keep = ["txnId", "caseId", "status", "vendor", "vendorId", "gstin", "number", "date", "dueDate", "po", "currency",
            "terms", "entity", "buyerGstin", "pos", "supplyType", "costCentre", "items", "subtotal", "cgst", "sgst",
            "igst", "tax", "total", "tds", "netPayable", "fields", "extractionConfidence", "checks", "matchStatus",
            "matchMode", "matchConfidence", "riskLevel", "recommendedAction", "recommendation", "discrepancy",
            "matchLines", "corrections", "sourceRequests", "approvals", "decision", "zohoBillId", "payments"]
    facts = {k: d[k] for k in keep}
    for f in facts["fields"]:
        f.pop("bbox", None)
    for it in facts["items"]:
        it.pop("bbox", None)
    facts["audit"] = await serializers.audit_rows(db, inv.id, limit=30)
    return facts


async def ask(db: AsyncSession, inv: Invoice, question: str, user: str) -> ChatMessage:
    db.add(ChatMessage(invoice_id=inv.id, role="You", text=question))
    try:
        answer = await _gemini(db, inv, question)
    except Exception as e:  # never leave the user without an answer
        log.warning("Copilot fell back to rules: %s", e)
        answer = _fallback(inv, question)
    msg = ChatMessage(invoice_id=inv.id, role="Invoice Processing Agent", text=answer.text,
                      sources=answer.sources, recommendation=answer.recommendation)
    db.add(msg)
    await db.flush()
    return msg


async def _gemini(db: AsyncSession, inv: Invoice, question: str) -> Answer:
    s = get_settings()
    if not s.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=s.gemini_api_key)
    history = [f"{m.role}: {m.text}" for m in inv.chat[-6:]]
    prompt = (f"FACTS:\n{json.dumps(await _facts(db, inv), default=str)}\n\n"
              + ("CONVERSATION SO FAR:\n" + "\n".join(history) + "\n\n" if history else "")
              + f"QUESTION: {question}")
    resp = await with_retry(lambda: client.aio.models.generate_content(
        model=s.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(system_instruction=SYSTEM, response_mime_type="application/json",
                                           response_schema=Answer, temperature=0.2),
    ))
    return resp.parsed if resp.parsed is not None else Answer.model_validate_json(resp.text)


def _fallback(inv: Invoice, question: str) -> Answer:
    q = question.lower()
    d = serializers.invoice_detail(inv)
    if "po" in q or "purchase order" in q:
        f = next((f for f in d["fields"] if f["key"] == "po"), None)
        text = (f"PO number {f['value']} was read from page {f['page']} with {f['confidence']}% confidence."
                if f and f["value"] else "No PO reference was found on the document.")
        return Answer(text=text, sources="Extracted fields", recommendation=inv.recommended_action or "—")
    if "summar" in q:
        text = (f"{inv.vendor_name} — {inv.invoice_number} dated {d['date']}, {len(inv.lines)} line items, "
                f"taxable value {d['subtotalText']}, GST {d['taxText']}, total {d['totalText']}. "
                f"Extraction confidence {d['extractionConfidence']}.")
        return Answer(text=text, sources="Extracted fields · Line items", recommendation=inv.recommended_action or "—")
    return Answer(text=inv.narrative or inv.recommendation or "The invoice is still being processed.",
                  sources="Checks · Match result", recommendation=inv.recommendation or "—")
