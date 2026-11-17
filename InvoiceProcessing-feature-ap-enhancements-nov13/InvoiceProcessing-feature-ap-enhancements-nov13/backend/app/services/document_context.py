"""Independent invoice contexts over one intact source document."""
from ..models import Invoice
from .common import new_case_id, new_txn_id, activity, audit
from . import invoice_parts

KEY = '_document_context'


def context(inv):
    return (inv.raw_extraction or {}).get(KEY) or {}


def assign(cases, parts):
    if len(cases) < 2:
        return
    entries=[dict(id=inv.id,caseId=inv.case_id,number=part.number,startPage=part.start,endPage=part.end)
             for inv,part in zip(cases,parts)]
    for inv,part in zip(cases,parts):
        inv.raw_extraction={**(inv.raw_extraction or {}),KEY:dict(rootId=cases[0].id,
            startPage=part.start,endPage=part.end,invoices=entries)}


async def prepare_upload(db, root, content, actor, parts=None):
    if root.mime_type != 'application/pdf':
        return [root.id]
    parts=parts or await invoice_parts.find_parts(content)
    if len(parts)==1:
        return [root.id]
    cases=[root]
    for part in parts[1:]:
        inv=Invoice(txn_id=await new_txn_id(db),case_id=await new_case_id(db),
            channel=root.channel,file_name=root.file_name,file_path=root.file_path,
            mime_type=root.mime_type,file_sha256=root.file_sha256,pages=root.pages,
            uploaded_by=actor,status='Received',stage='intake',received_at=root.received_at)
        db.add(inv);await db.flush();cases.append(inv)
        activity(db,inv,f'Original document retained; invoice {part.number}, pages {part.start}-{part.end}')
        audit(db,actor,'Invoice context created from original document',inv,root_invoice_id=root.id)
    assign(cases,parts)
    return [inv.id for inv in cases]
