from uuid import uuid4
import pytest
from app.services import document_classification as classifier


def answer(kind="Invoice", *, confidence=.99, review=False, readable=True, route="Pending verification"):
    evidence={"Invoice":["Tax Invoice","Invoice No.","Total"],"PO":["Purchase Order","Order Number"],
              "COA":["Transaction ID","Workflow Title","Finance Amount"],"Other Document":["Delivery Note"]}[kind]
    return dict(document_type=kind,confidence=confidence,needs_review=review,reason="Content evidence checked.",
                pdf_readable=readable,document_evidence=evidence,invoice_route=route,po_reference="",
                routing_evidence_type="explicit_non_po" if route=="Non-PO" else "insufficient",
                routing_evidence=["No purchase order required"] if route=="Non-PO" else [],
                routing_reason="Content routing evidence.",invoice_subtype="Tax Invoice" if kind=="Invoice" else "Not applicable")


def post(client, content, token=None, filename="document.pdf"):
    return client.post("/api/invoices",files={"file":(filename,content,"application/pdf")},
                       data={"request_id":token or str(uuid4()),"screen_document":"true"})


def count(client):return client.get("/api/invoices?limit=500").json()["total"]


@pytest.mark.parametrize("kind",["COA","PO","Other Document"])
def test_non_invoice_creates_no_case_even_with_invoice_filename(client,samples,monkeypatch,kind):
    async def model(*args):return answer(kind)
    monkeypatch.setattr(classifier,"gemini_classification",model)
    before=count(client);response=post(client,samples["bharat"],filename="invoice.pdf")
    assert response.status_code==202,response.text
    assert response.json()["outcome"]=="not_invoice"
    assert response.json()["documentType"]==kind
    assert "id" not in response.json() and count(client)==before


@pytest.mark.parametrize("value",[answer(confidence=.5),answer(review=True),answer(readable=False),answer("Other Document",review=True)])
def test_uncertain_unreadable_or_mixed_requires_review_without_case(client,samples,monkeypatch,value):
    async def model(*args):return value
    monkeypatch.setattr(classifier,"gemini_classification",model)
    before=count(client);response=post(client,samples["bharat"])
    assert response.status_code==202,response.text
    assert response.json()["outcome"]=="needs_review"
    assert count(client)==before


@pytest.mark.parametrize("route",["Pending verification","Non-PO"])
def test_real_invoices_are_not_rejected_for_missing_po_and_retry_is_stable(client,samples,monkeypatch,route):
    calls=[]
    async def model(*args):calls.append(True);return answer(route=route)
    monkeypatch.setattr(classifier,"gemini_classification",model)
    token=str(uuid4());response=post(client,samples["bharat"],token,filename="COA-misleading-name.pdf")
    assert response.status_code==202,response.text
    inv=response.json();assert inv["id"]
    before=count(client);again=post(client,samples["bharat"],token)
    assert again.json()["id"]==inv["id"] and count(client)==before and len(calls)==1


def test_technical_failure_is_retryable_and_does_not_expose_provider_message(client,samples,monkeypatch):
    async def model(*args):raise RuntimeError("private-provider-payload-secret-123")
    monkeypatch.setattr(classifier,"gemini_classification",model)
    before=count(client);response=post(client,samples["bharat"])
    assert response.status_code==503 and count(client)==before
    assert "private-provider" not in response.text and "secret-123" not in response.text


def test_corrupt_document_fails_before_classifier_or_case_creation(client,monkeypatch):
    async def model(*args):raise AssertionError("Must not call Gemini")
    monkeypatch.setattr(classifier,"gemini_classification",model)
    before=count(client);response=post(client,b"not a PDF")
    assert response.status_code==422 and count(client)==before


def test_supported_images_are_classified_as_in_memory_pdf_but_original_is_retained(client,samples,fake,monkeypatch):
    import copy,hashlib,pymupdf
    image=pymupdf.Pixmap(pymupdf.csRGB,(0,0,30,30));image.clear_with(255);content=image.tobytes("png")
    fake.register(content,copy.deepcopy(fake.by_hash[hashlib.sha256(samples["bharat"]).hexdigest()]))
    async def model(subject,body,filename,text,pdf):
        assert pdf.startswith(b"%PDF-")
        return answer()
    monkeypatch.setattr(classifier,"gemini_classification",model)
    response=post(client,content,filename="invoice.png")
    assert response.status_code==202,response.text
    assert client.get(f"/api/invoices/{response.json()['id']}/document").content==content
