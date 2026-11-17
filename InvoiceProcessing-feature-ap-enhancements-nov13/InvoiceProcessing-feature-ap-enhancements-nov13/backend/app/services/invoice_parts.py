"""Find invoice ranges within an intact source PDF.

Contexts read only their selected page images; no split PDFs are created.
Never combine two invoices or silently guess an uncertain page boundary.
"""
import asyncio
import json
import re
from dataclasses import dataclass

import pymupdf
from pydantic import BaseModel, Field


class BoundaryError(ValueError):
    pass


@dataclass(frozen=True)
class InvoicePart:
    number: str | None
    start: int
    end: int


class PartResult(BaseModel):
    invoice_number: str = Field(description="Exact invoice number printed on this invoice")
    start_page: int = Field(ge=1)
    end_page: int = Field(ge=1)


class BoundaryResult(BaseModel):
    needs_review: bool
    reason: str
    invoices: list[PartResult]


def _text_plan(texts):
    """Strong, numbered invoice titles; other layouts use visual detection.

    A number appearing in an invoice summary or body is never a new boundary.
    Repeated titles with the same number remain one multi-page invoice.
    """
    starts=[]
    for page,text in enumerate(texts,1):
        title=re.search(r"^\s*(?:tax\s+)?invoice\s+(?:no\.?|number|#)\s*[:.]?\s*([\w/-]+)",text,re.I|re.M)
        if title and any(c.isdigit() for c in title[1]):
            number=title[1]
            if not starts or starts[-1][1].casefold()!=number.casefold():
                starts.append((page,number))
    if not starts:
        return None
    if len({n.casefold() for _,n in starts}) != len(starts):
        raise BoundaryError('repeated_invoice_copies_need_review')
    if len(starts)==1:
        # Established digital single-invoice documents retain their old path.
        # Other printed invoice headings are independently checked below.
        if starts[0][0]==1 and all(t.strip() for t in texts):
            return [InvoicePart(starts[0][1],1,len(texts))]
        return None
    if starts[0][0]>1 and not re.search(r'\b(summary|cover)\b',' '.join(texts[:starts[0][0]-1]),re.I):
        return None
    return [InvoicePart(n,p,starts[i+1][0]-1 if i+1<len(starts) else len(texts)) for i,(p,n) in enumerate(starts)]


def validate_plan(result, pages):
    if result.needs_review or not result.invoices:
        raise BoundaryError("invoice_boundaries_need_review")
    parts = []
    numbers = set()
    for item in result.invoices:
        number = item.invoice_number.strip()
        if not number or number.casefold() in numbers or not (1 <= item.start_page <= item.end_page <= pages):
            raise BoundaryError("invoice_boundaries_need_review")
        if parts and item.start_page <= parts[-1].end:
            raise BoundaryError("invoices_share_a_page_or_overlap_review_required")
        numbers.add(number.casefold())
        parts.append(InvoicePart(number, item.start_page, item.end_page))
    return parts


async def find_parts(content):
    with pymupdf.open(stream=content, filetype="pdf") as doc:
        pages = len(doc)
        texts = [page.get_text() for page in doc]
    if pages == 1:
        # The old single-page flow stays byte-for-byte unchanged.
        # Multi-invoice documents on a single physical page require manual split.
        with pymupdf.open(stream=content, filetype="pdf") as doc:
            text = doc[0].get_text()
        numbers = set(re.findall(r"(?im)^\s*(?:tax\s+)?invoice\s+(?:no\.?|number|#)\s*[:.]?\s*([\w/-]+)", text))
        numbers = {n for n in numbers if any(c.isdigit() for c in n)}
        if len(numbers) > 1:
            raise BoundaryError("invoices_share_a_page_or_overlap_review_required")
        return [InvoicePart(next(iter(numbers), None), 1, 1)]
    parts = _text_plan(texts) or await _vision_plan(content, pages)
    # Digital invoice headings must agree with the visual plan. Summary-table
    # references do not count as invoice headings. Do not lose a second invoice.
    headings = []
    for page, text in enumerate(texts, 1):
        for number in re.findall(r"(?im)^\s*(?:tax\s+)?invoice\s+(?:no\.?|number|#)\s*[:.]?\s*([\w/-]+)", text):
            if any(c.isdigit() for c in number):
                headings.append((page, number))
    known = {p.number.casefold() for p in parts if p.number}
    if any(number.casefold() not in known for _, number in headings):
        raise BoundaryError("invoice_plan_omits_printed_invoice_review_required")
    if len(parts) > 1 and any(not any(p.start <= page <= p.end and p.number.casefold() == number.casefold() for p in parts) for page, number in headings):
        raise BoundaryError("invoice_page_assignment_conflict_review_required")
    return parts


async def _vision_plan(content, pages):
    from google.genai import types
    from .extraction import GeminiExtractor, with_retry
    # Uses the same configured Gemini model and retry policy as extraction.
    extractor = GeminiExtractor()
    prompt = f"""Identify separate supplier invoices in this {pages}-page PDF.
Return page ranges in ascending order, one range per DISTINCT invoice number.
Use 1-based PHYSICAL PDF page indexes, not printed page numbers.
Inspect every page visually. Cover sheets, invoice summary tables, copies of
the same invoice and supporting bank/verification pages are NOT new invoices.
Keep actual invoice continuation pages, invoice tax totals and invoice line
items with their owning invoice. A separately titled invoice with a distinct
printed invoice number starts its own range, including on scanned/image pages.
Shared summary/cover sheets, shared calculations, shared quantity schedules,
and shared delivery/verification evidence are supporting pages, NOT invoices.
Exclude those shared pages from ALL invoice ranges; not every PDF page needs
to belong to a range. They remain viewable in the intact original PDF.
For example, if physical pages 1 and 2 each contain a complete, differently
numbered invoice and page 3 is their shared supporting schedule, return two
ranges: 1-1 and 2-2. Leave page 3 outside the ranges. Shared supporting evidence
alone does NOT require needs_review=true when invoice identities and ranges
are clear. Do not attach a shared trailing sheet arbitrarily to the last invoice.
Do NOT combine different invoice numbers, suppliers, currencies or totals.
Ranges must not overlap. Set needs_review=true if two invoices occupy one
physical page, an actual invoice boundary or continuation is uncertain,
numbering is unreadable, or there are conflicting duplicate invoice copies.
For a single invoice return its unambiguous invoice range with needs_review=false.
Never invent an invoice. Return the EXACT printed invoice numbers."""
    response = await with_retry(lambda: extractor.client.aio.models.generate_content(
        model=extractor.model,
        contents=[types.Part.from_bytes(data=content, mime_type="application/pdf"), prompt],
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=BoundaryResult, temperature=0)))
    result = response.parsed if response.parsed is not None else json.loads(response.text)
    result = result if isinstance(result, BoundaryResult) else BoundaryResult.model_validate(result)
    return validate_plan(result, pages)
