"""Page-aware extraction over ONE original PDF, for upload and email intake."""
import asyncio
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import uuid
import pymupdf
import pytest
from sqlalchemy import select
from app.db import session_scope
from app.models import Email,EmailAttachment,Invoice
from app.services import extraction,invoice_parts,document_context,documents,pipeline
from app.services.common import now
from conftest import _TMP

SOURCE=Path(__file__).parent/'fixtures/multi_invoice/Tax_Invoices_31121_31122_Extracted.pdf'


def field(value,page=1):return dict(value=value,confidence=.99,page=page,box_2d=[])


@pytest.fixture
def page_model(client,fake,monkeypatch):
    content=SOURCE.read_bytes()
    base=copy.deepcopy(next(iter(fake.by_hash.values())))
    records=[]
    class PageModel:
        async def extract(self,path,mime,pages):return await fake.extract(path,mime,pages)
        async def extract_pages(self,path,mime,pages,start,end):
            assert Path(path).read_bytes()==content
            assert pages==5
            records.append((path,start,end))
            data=copy.deepcopy(base)
            for key,val in list(data.items()):
                if isinstance(val,dict) and 'value' in val:data[key]=field(None,start)
            number,sub,tax,total,desc=('31121','10234130.30','1842143.45','12076273.75','FIXED STORAGE FEES') if start==2 else ('31122','7429065.56','1337231.80','8766297.36','VARIABLE STORAGE FEES')
            for key,value in dict(vendor_name='Tanzania International Petroleum Reserves Ltd.',vendor_tin='100-103-362',vendor_vat='10-00-1155/Z',invoice_number=number,invoice_date='2026-09-23',currency='TZS',buyer_name='DALBIT PETROLEUM (T) LTD',subtotal=sub,total_tax=tax,total=total).items():data[key]=field(value,start)
            data['line_items']=[dict(description=desc,quantity=508.967,rate=float(sub)/508.967,taxable_value=float(sub),tax_rate=18,cgst=0,sgst=0,igst=0,page=start,box_2d=[],confidence=.99)]
            data['is_invoice']=True;data['document_type']='tax_invoice'
            return data
    extraction.set_extractor(PageModel())
    yield content,records
    extraction.set_extractor(fake)


def details(client,first):
    return [client.get('/api/invoices/'+x['id']).json() for x in first['documentInvoices']]


def assert_original_cases(client,cases,content):
    assert len(cases)==2
    async def paths():
        async with session_scope() as db:return [(await db.get(Invoice,i['id'])).file_path for i in cases]
    stored=client.portal.call(paths)
    assert stored[0]==stored[1]
    assert Path(stored[0]).read_bytes()==content
    for i,start,total,tax in zip(cases,[2,4],[12076273.75,8766297.36],[1842143.45,1337231.80]):
        assert i['pages']==5 and i['pipeline']['state']=='done',i['pipeline']
        assert i['invoiceStartPage']==start and i['invoiceEndPage']==start+1
        assert i['number']==('31121' if start==2 else '31122')
        assert i['total']==total and i['tax']==tax
        for f in i['fields']:
            if f['key'] in ('number','tinNumber','vatNo','tax'):
                assert f['page']==start and f['bbox'],f
        assert i['items'][0]['page']==start
        assert client.get(f"/api/invoices/{i['id']}/document").content==content
        assert client.get(f"/api/invoices/{i['id']}/pages/5").status_code==200
        assert next(c for c in i['checks'] if c['code']=='duplicate')['status']=='pass'


def test_direct_upload_keeps_original_and_page_contexts(client,page_model):
    content,records=page_model
    response=client.post('/api/invoices',files={'file':('two.pdf',content,'application/pdf')})
    assert response.status_code==202,response.text
    cases=details(client,response.json())
    assert_original_cases(client,cases,content)
    assert [r[1:] for r in records]==[(2,3),(4,5)]
    if os.environ.get('PAGE_QA_EXPORT'):
        out=Path(os.environ['PAGE_QA_EXPORT']);out.mkdir(parents=True,exist_ok=True)
        (out/'invoices.json').write_text(json.dumps(cases),encoding='utf-8')
        (out/'config.json').write_text(json.dumps(client.get('/api/config').json()),encoding='utf-8')
        (out/'dashboard.json').write_text(json.dumps(client.get('/api/dashboard').json()),encoding='utf-8')
        with pymupdf.open(SOURCE) as pdf:
            for index,p in enumerate(pdf,1):p.get_pixmap().save(str(out/f'page-{index}.png'))


@pytest.fixture
def email_document(client,page_model):
    content,_=page_model;ident=str(uuid.uuid4());folder=_TMP/'intact'/ident;folder.mkdir(parents=True)
    source=folder/'two.pdf';source.write_bytes(content)
    async def insert():
        async with session_scope() as db:
            email=Email(email_id=ident,source_sha256='0'*64,sender='test@example.com',recipient='ap@example.com',subject='Two invoices',received_datetime=now(),body='Test',folder_path=str(folder))
            email.attachments=[EmailAttachment(attachment_id=ident,filename='two.pdf',file_path=str(source),content_type='application/pdf',size_bytes=len(content),document_type='Invoice',extracted_information={'classification':dict(document_type='Invoice',version='step5-v4',method='pdf_gemini',confidence=.99,document_needs_review=False,needs_review=False,pdf_readable=True,document_evidence=['Invoice number','Total'],source_sha256=hashlib.sha256(content).hexdigest())})]
            db.add(email)
    client.portal.call(insert)
    return ident,content


def test_email_original_navigation_retry_and_original_tax_locations(client,email_document,page_model):
    ident,content=email_document
    result=client.post(f'/api/email-intake/attachments/{ident}/forward')
    assert result.status_code==200,result.text
    cases=[client.get('/api/invoices/'+x['invoice_id']).json() for x in result.json()['cases']]
    # Another uploaded copy in a previous test correctly triggers duplicate checks;
    # sibling contexts in this same original document must not be the reason.
    for case in cases:
        check=next(c for c in case['checks'] if c['code']=='duplicate')
        if check['status']=='fail':assert not any(other['caseId'] in check['detail'] for other in cases if other['id']!=case['id'])
    assert all(case['pages']==5 for case in cases)
    assert [case['invoiceStartPage'] for case in cases]==[2,4]
    assert [next(f for f in case['fields'] if f['key']=='tax')['page'] for case in cases]==[2,4]
    again=client.post(f'/api/email-intake/attachments/{ident}/forward').json()
    assert [x['invoice_id'] for x in again['cases']]==[x['id'] for x in cases]
    assert len(page_model[1])==2
    assert client.get(f'/api/email-inbox/attachments/{ident}/pdf').content==content
    detail=client.get('/api/email-inbox/emails/'+ident).json()
    if os.environ.get('PAGE_QA_EXPORT'):
        out=Path(os.environ['PAGE_QA_EXPORT']);out.mkdir(parents=True,exist_ok=True)
        (out/'email-invoices.json').write_text(json.dumps(cases),encoding='utf-8')
        (out/'email-detail.json').write_text(json.dumps(detail),encoding='utf-8')
        summary=next(x for x in client.get('/api/email-inbox/emails?limit=100').json()['items'] if x['email_id']==ident)
        (out/'email-summary.json').write_text(json.dumps(summary),encoding='utf-8')


def test_real_gemini_page_method_remaps_original_page_and_total(client,monkeypatch):
    # Exercise the real page-range method with a fake model response, not a
    # replacement range implementation. Model reads only images for pages 4-5.
    from app.services.extraction import GeminiExtractor,XInvoice
    instance=GeminiExtractor.__new__(GeminiExtractor)
    calls=[]
    async def model(images,hint):
        from types import SimpleNamespace
        calls.append(len(images));return SimpleNamespace(model_dump=lambda:dict(invoice_number=field('31122'),total_tax=field('1842143.45')))
    monkeypatch.setattr(instance,'_call',model)
    result=client.portal.call(instance.extract_pages,str(SOURCE),'application/pdf',5,4,5)
    assert calls and all(n==2 for n in calls)
    assert result['invoice_number']['page']==4
    assert result['total_tax']['value']=='1337231.80' and result['total_tax']['page']==4


def test_conversion_of_previous_split_cases_preserves_case_ids_and_values(client,email_document):
    ident,content=email_document
    result=client.post(f'/api/email-intake/attachments/{ident}/forward').json()
    ids=[c['invoice_id'] for c in result['cases']]
    # Simulate the previous patch's child PDFs ONLY in disposable test fixtures.
    async def old_state():
        async with session_scope() as db:
            for iid,start,end in zip(ids,[2,4],[3,5]):
                inv=await db.get(Invoice,iid)
                with pymupdf.open(stream=content,filetype='pdf') as source,pymupdf.open() as child:
                    child.insert_pdf(source,from_page=start-1,to_page=end-1);raw=child.tobytes()
                path,mime,sha,count=await documents.astore('old-'+iid,'old.pdf',raw)
                inv.file_path,inv.file_sha256,inv.pages=str(path),sha,count
                inv.raw_extraction={k:v for k,v in (inv.raw_extraction or {}).items() if k!=document_context.KEY}
                for f in inv.fields:f.page=max(1,f.page-start+1)
                for line in inv.lines:line.page=max(1,line.page-start+1)
    client.portal.call(old_state)
    import restore_original_document as converter
    from functools import partial
    client.portal.call(partial(converter.restore,email_id=ident))
    assert client.get('/api/invoices/'+ids[1]).json()['pages']==2
    before=[client.get('/api/invoices/'+iid).json()['total'] for iid in ids]
    client.portal.call(partial(converter.restore,email_id=ident,apply=True))
    after=[client.get('/api/invoices/'+iid).json() for iid in ids]
    assert [x['id'] for x in after]==ids and [x['total'] for x in after]==before
    assert all(x['pages']==5 for x in after)
    assert next(f for f in after[1]['fields'] if f['key']=='number')['page']==4
    assert client.get('/api/invoices/'+ids[1]+'/document').content==content


def test_legacy_unsplit_email_converts_without_deleting_original_case(client,email_document):
    ident,content=email_document
    result=client.post(f'/api/email-intake/attachments/{ident}/forward').json()
    ids=[c['invoice_id'] for c in result['cases']]
    from app.email_invoice_models import EmailInvoiceLink
    from sqlalchemy import delete
    async def old_state():
        async with session_scope() as db:
            await db.execute(delete(Invoice).where(Invoice.id==ids[1]))
            link=(await db.scalars(select(EmailInvoiceLink).where(EmailInvoiceLink.attachment_id==ident))).one()
            link.part_index=0;link.source_page_start=None;link.source_page_end=None
            inv=await db.get(Invoice,ids[0]);inv.raw_extraction={k:v for k,v in inv.raw_extraction.items() if k!=document_context.KEY}
    client.portal.call(old_state)
    import restore_original_document as converter
    from functools import partial
    client.portal.call(partial(converter.restore,email_id=ident,apply=True))
    detail=client.get('/api/email-inbox/emails/'+ident).json()
    newids=[a['invoice_id'] for a in detail['attachments']]
    assert len(newids)==2 and newids[0]==ids[0]
    for iid in newids:client.portal.call(pipeline.process,iid)
    assert client.get('/api/invoices/'+newids[1]).json()['number']=='31122'


def test_existing_direct_upload_gains_page_contexts_without_case_deletion(client,page_model):
    content,_=page_model
    # Create a legacy record using actual source bytes, with no contexts.
    from app.services.common import new_case_id,new_txn_id
    async def insert():
        async with session_scope() as db:
            inv=Invoice(txn_id=await new_txn_id(db),case_id=await new_case_id(db),channel='upload',file_name='two.pdf',file_path='',mime_type='',file_sha256='',uploaded_by='test',status='Exception',pipeline_state='done')
            db.add(inv);await db.flush()
            p,m,s,count=await documents.astore(inv.id,inv.file_name,content)
            inv.file_path,inv.mime_type,inv.file_sha256,inv.pages=str(p),m,s,count
            return inv.id
    iid=client.portal.call(insert)
    import restore_original_document as converter
    from functools import partial
    client.portal.call(partial(converter.restore,invoice_id=iid))
    assert client.get('/api/invoices/'+iid).json()['documentInvoices']==[]
    client.portal.call(partial(converter.restore,invoice_id=iid,apply=True))
    inv=client.get('/api/invoices/'+iid).json()
    assert inv['documentInvoices'][0]['id']==iid and len(inv['documentInvoices'])==2
    for ctx in inv['documentInvoices']:client.portal.call(pipeline.process,ctx['id'])
    assert client.get('/api/invoices/'+inv['documentInvoices'][1]['id']).json()['pages']==5
