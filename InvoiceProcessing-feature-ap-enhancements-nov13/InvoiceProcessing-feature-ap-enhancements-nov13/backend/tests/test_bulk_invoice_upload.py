"""Batch files use the existing upload endpoint with stable retry IDs."""
from uuid import uuid4
import pytest
from fastapi import HTTPException
from app.services.upload_requests import upload_invoice_id


def post(client, content, token=None, name="invoice.pdf", actor="s.joshi@genstar-demo.in"):
    return client.post("/api/invoices", files={"file": (name, content, "application/pdf")},
                       data={"request_id": token} if token else {}, headers={"X-User": actor})


def test_retry_returns_original_case_without_extra_records(client, samples):
    token=str(uuid4())
    first=post(client,samples["bharat"],token).json()
    before=client.get("/api/invoices?limit=500").json()["total"]
    again=post(client,samples["bharat"],token)
    assert again.status_code==202,again.text
    assert again.json()["id"]==first["id"]
    assert again.json()["caseId"]==first["caseId"]
    assert client.get("/api/invoices?limit=500").json()["total"]==before


def test_reusing_token_for_different_content_is_rejected(client,samples):
    token=str(uuid4());first=post(client,samples["bharat"],token).json()
    response=post(client,samples["apex"],token)
    assert response.status_code==409
    assert client.get(f"/api/invoices/{first['id']}/document").content==samples["bharat"]


def test_invalid_file_does_not_block_next_valid_upload(client,samples):
    assert post(client,b"not a PDF",str(uuid4())).status_code==422
    response=post(client,samples["bharat"],str(uuid4()))
    assert response.status_code==202,response.text
    assert response.json()["pipeline"]["state"]=="done"


def test_existing_single_upload_still_accepts_no_token(client,samples):
    response=post(client,samples["bharat"])
    assert response.status_code==202,response.text
    assert response.json()["id"]


def test_retry_key_is_scoped_to_actor_and_validated():
    token=str(uuid4())
    assert upload_invoice_id("one",token)!=upload_invoice_id("two",token)
    with pytest.raises(HTTPException): upload_invoice_id("one","bad-token")


def test_multi_invoice_pdf_retry_retains_all_contexts_and_original(client,fake,samples,monkeypatch):
    import copy
    import hashlib
    import pymupdf
    from app.services import extraction, invoice_parts
    source=pymupdf.open(stream=samples["bharat"],filetype="pdf")
    combined=pymupdf.open();combined.insert_pdf(source);combined.insert_pdf(source)
    content=combined.tobytes();source.close();combined.close()
    async def parts(_content):
        return [invoice_parts.InvoicePart("BULK-1",1,1),invoice_parts.InvoicePart("BULK-2",2,2)]
    monkeypatch.setattr(invoice_parts,"find_parts",parts)
    calls=[]
    base=copy.deepcopy(fake.by_hash[hashlib.sha256(samples["bharat"]).hexdigest()])
    class PageExtractor:
        async def extract_pages(self,path,mime,pages,start,end):
            calls.append(start)
            data=copy.deepcopy(base)
            data["invoice_number"]["value"]=f"BULK-{start}"
            for value in data.values():
                if isinstance(value,dict) and "value" in value: value["page"]=start
            for line in data.get("line_items",[]):line["page"]=start
            return data
    extraction.set_extractor(PageExtractor())
    try:
        token=str(uuid4());first=post(client,content,token,"two.pdf")
        assert first.status_code==202,first.text
        contexts=first.json()["documentInvoices"]
        assert len(contexts)==2
        before=client.get("/api/invoices?limit=500").json()["total"]
        again=post(client,content,token,"two.pdf")
        assert again.status_code==202,again.text
        assert again.json()["documentInvoices"]==contexts
        assert client.get("/api/invoices?limit=500").json()["total"]==before
        assert calls==[1,2]
        for entry in contexts:
            assert client.get(f"/api/invoices/{entry['id']}/document").content==content
    finally: extraction.set_extractor(fake)
