"""Preview-first conversion from split case PDFs to intact original documents.

Run with the backend stopped. No cases, financial values or PDF files are deleted.
"""
import argparse
import asyncio
import copy
import hashlib
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import pymupdf
from sqlalchemy import select, func, or_
from app.db import session_scope, engine
from app.models import EmailAttachment, Invoice, Approval, Payment, Correction, SourceRequest, ChatMessage
from app.email_invoice_models import EmailInvoiceLink
from app.email_upload_models import EmailUploadJob
from app.services import document_context, invoice_parts, documents, approvals
from app.services.common import audit


async def guard(db, inv):
    if inv.status not in ('Received','Exception','Failed') or inv.pipeline_state not in ('done','error','queued') or inv.zoho_bill_id or inv.paid_at or inv.decided_at:
        raise RuntimeError(f'{inv.case_id}: active or protected workflow; stopped without database changes')
    if await db.scalar(select(func.count()).select_from(Approval).where(Approval.invoice_id==inv.id,
        or_(Approval.status.in_(('approved','rejected')),Approval.acted_at.is_not(None),Approval.acted_by.is_not(None)))):
        raise RuntimeError(f'{inv.case_id}: has an approval decision; manual review required')
    for model in (Payment,Correction,SourceRequest,ChatMessage):
        if await db.scalar(select(func.count()).select_from(model).where(model.invoice_id==inv.id)):
            raise RuntimeError(f'{inv.case_id}: has {model.__tablename__}; manual review required')


def move_pages(value, offset):
    value=copy.deepcopy(value)
    if isinstance(value,dict):
        if 'page' in value:
            value['page']=int(value['page'] or 1)+offset
        for key,child in list(value.items()):
            if key!=document_context.KEY:
                value[key]=move_pages(child,offset)
    elif isinstance(value,list):
        value=[move_pages(child,offset) for child in value]
    return value


async def restore(email_id=None, invoice_id=None, apply=False):
    async with session_scope() as db:
        if email_id:
            job=await db.get(EmailUploadJob,email_id,with_for_update=True)
            if job and job.status in ('running','queued'):
                raise RuntimeError('Email job is active; finish/stop processing before conversion')
            attachments=list((await db.scalars(select(EmailAttachment).where(EmailAttachment.email_id==email_id).with_for_update())).all())
            if not attachments:
                raise RuntimeError('No attachments found for that Email ID')
            for attachment in attachments:
                rows=list((await db.execute(select(EmailInvoiceLink,Invoice).join(Invoice,Invoice.id==EmailInvoiceLink.invoice_id)
                    .where(EmailInvoiceLink.attachment_id==attachment.attachment_id).order_by(EmailInvoiceLink.part_index).with_for_update())).all())
                if not rows:
                    print(f'{attachment.filename}: no existing case; no conversion needed');continue
                if len(rows)==1:
                    link,inv=rows[0]
                    if document_context.context(inv):
                        print(f'{attachment.filename}: already uses original-document page contexts');continue
                    content=await documents.aread(attachment.file_path)
                    if hashlib.sha256(content).hexdigest()!=link.source_sha256:
                        raise RuntimeError('Original attachment hash mismatch')
                    parts=await invoice_parts.find_parts(content)
                    if len(parts)==1:
                        print(f'{attachment.filename}: one invoice; no conversion needed');continue
                    if link.part_index!=0:
                        raise RuntimeError('Missing invoice contexts/links; manual review required')
                    await guard(db,inv)
                    print(f'{inv.case_id}: preserve legacy case and original PDF; add {len(parts)-1} page context(s), then re-extract')
                    if apply:
                        stored=await documents.astore('original-'+attachment.attachment_id,attachment.filename,content)
                        inv.file_path,inv.mime_type,inv.file_sha256,inv.pages=str(stored[0]),stored[1],stored[2],stored[3]
                        inv.file_name=documents.safe_name(attachment.filename)
                        ids=await document_context.prepare_upload(db,inv,content,'local_conversion',parts)
                        for index,(iid,part) in enumerate(zip(ids,parts),1):
                            if index==1:
                                item=link;item.part_index=1
                            else:
                                item=EmailInvoiceLink(attachment_id=attachment.attachment_id,part_index=index,
                                    invoice_id=iid,source_sha256=link.source_sha256,classification_version=link.classification_version,
                                    forwarded_by='local_conversion',dispatch_state='dispatched');db.add(item)
                            item.source_page_start,item.source_page_end,item.source_invoice_number=part.start,part.end,part.number
                        approvals.reset(inv)
                        inv.pipeline_state,inv.pipeline_step,inv.status='queued',0,'Received'
                        attachment.extracted_information={**(attachment.extracted_information or {}),
                            'invoice_parts':[dict(number=p.number,start=p.start,end=p.end) for p in parts], 'invoice_parts_error':None}
                    continue
                if all(document_context.context(inv) for _,inv in rows):
                    print(f'{attachment.filename}: already uses original-document page contexts');continue
                content=await documents.aread(attachment.file_path)
                digest=hashlib.sha256(content).hexdigest()
                with pymupdf.open(stream=content,filetype='pdf') as pdf: pages=len(pdf)
                cases=[];parts=[]
                for link,inv in rows:
                    await guard(db,inv)
                    if link.source_sha256!=digest or not link.source_page_start or not link.source_page_end or not 1<=link.source_page_start<=link.source_page_end<=pages:
                        raise RuntimeError('Original hash/page metadata mismatch; nothing changed')
                    if link.source_invoice_number and inv.invoice_number and link.source_invoice_number!=inv.invoice_number:
                        raise RuntimeError('Extracted invoice number conflicts with original page assignment; review required')
                    parts.append(invoice_parts.InvoicePart(link.source_invoice_number,link.source_page_start,link.source_page_end));cases.append(inv)
                    print(f'{inv.case_id}: retain case/values; restore {pages}-page original; invoice pages {link.source_page_start}-{link.source_page_end}')
                if not apply: continue
                # A new dedicated source folder prevents reuse of stale child-page
                # image caches. Every case in the group points to this ONE PDF.
                path,mime,sha,count=await documents.astore('original-'+attachment.attachment_id,attachment.filename,content)
                for inv,part in zip(cases,parts):
                    if inv.file_sha256!=digest:
                        offset=part.start-1
                        for field in inv.fields: field.page+=offset
                        for line in inv.lines: line.page+=offset
                        inv.raw_extraction=move_pages(inv.raw_extraction or {},offset)
                    inv.file_path,inv.file_name,inv.mime_type=str(path),documents.safe_name(attachment.filename),mime
                    inv.file_sha256,inv.pages=sha,count
                    audit(db,'local_conversion','Restored intact original PDF and original page coordinates',inv,source_attachment_id=attachment.attachment_id)
                document_context.assign(cases,parts)
                attachment.extracted_information={**(attachment.extracted_information or {}),'invoice_parts_error':None}
            if apply and job and job.status in ('partial','interrupted','failed'):
                # Do not falsely mark a job complete or requeue the entire email.
                print('Existing email job status retained; no whole-email retry was scheduled.')
        else:
            inv=await db.get(Invoice,invoice_id,with_for_update=True)
            if not inv: raise RuntimeError('Invoice ID not found')
            if await db.scalar(select(func.count()).select_from(EmailInvoiceLink).where(EmailInvoiceLink.invoice_id==inv.id)):
                raise RuntimeError('This is an email-linked case. Use --email-id instead.')
            if document_context.context(inv):
                print('Already uses original-document page contexts');return
            await guard(db,inv)
            content=await documents.aread(inv.file_path)
            if hashlib.sha256(content).hexdigest()!=inv.file_sha256:
                raise RuntimeError('Original document hash mismatch')
            parts=await invoice_parts.find_parts(content)
            print(f'{inv.case_id}: original retained; {len(parts)} invoice context(s) detected')
            if apply and len(parts)>1:
                ids=await document_context.prepare_upload(db,inv,content,'local_conversion',parts)
                approvals.reset(inv)
                inv.pipeline_state,inv.pipeline_step,inv.status='queued',0,'Received'
                print(f'{len(ids)} contexts queued. Start backend to extract each original page range.')
        print('Conversion committed; originals and case IDs retained.' if apply else 'PREVIEW ONLY. No data or files changed. Add --apply after reviewing.')
    await engine.dispose()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--email-id');group.add_argument('--invoice-id')
    parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    asyncio.run(restore(args.email_id,args.invoice_id,args.apply))
