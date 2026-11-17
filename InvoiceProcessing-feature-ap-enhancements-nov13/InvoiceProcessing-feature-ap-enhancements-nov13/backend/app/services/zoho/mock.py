"""A seeded Zoho Books organisation for development and demos.

Returns the same JSON shapes as the live API, so sync, evidence and matching run
unchanged against it. The data mirrors the front-end prototype: the Bharat,
Apex and Vertex scenarios plus the rest of the procurement register.
"""

import copy
import itertools
from typing import Any

_ids = itertools.count(460000000000001)


def _id() -> str:
    return str(next(_ids))


VENDORS: list[dict[str, Any]] = [
    {"contact_id": "V-100482", "contact_name": "Bharat Technologies Pvt Ltd", "gst_no": "27AABCB1234K1ZX",
     "pan_no": "AABCB1234K", "gst_treatment": "business_gst", "place_of_contact": "MH",
     "payment_terms": 45, "payment_terms_label": "Net 45", "email": "billing@bharattech.in",
     "custom_fields": [{"label": "Bank Account", "value": "HDFC ****8871"}]},
    {"contact_id": "V-100915", "contact_name": "Apex Industrial Supplies India Pvt Ltd", "gst_no": "29AAJCA5567P1ZS",
     "pan_no": "AAJCA5567P", "gst_treatment": "business_gst", "place_of_contact": "KA",
     "payment_terms": 60, "payment_terms_label": "Net 60", "email": "accounts@apexindustrial.in",
     "custom_fields": [{"label": "Bank Account", "value": "ICICI ****2290"}, {"label": "MSME", "value": "true"}]},
    {"contact_id": "V-101334", "contact_name": "Vertex Consulting Services LLP", "gst_no": "06AAFFV2201Q1Z2",
     "pan_no": "AAFFV2201Q", "gst_treatment": "business_gst", "place_of_contact": "HR",
     "payment_terms": 30, "payment_terms_label": "Net 30", "email": "finance@vertexconsulting.in",
     "custom_fields": [{"label": "TDS Section", "value": "194J"}]},
    {"contact_id": "V-100233", "contact_name": "Sundaram Precision Components Ltd", "gst_no": "33AADCS4410M1ZH",
     "pan_no": "AADCS4410M", "gst_treatment": "business_gst", "place_of_contact": "TN",
     "payment_terms": 45, "payment_terms_label": "Net 45", "email": "ar@sundaramprecision.in", "custom_fields": []},
    {"contact_id": "V-100617", "contact_name": "Deccan Facility Management Pvt Ltd", "gst_no": "36AAECD4471M1ZC",
     "pan_no": "AAECD4471M", "gst_treatment": "business_gst", "place_of_contact": "TS",
     "payment_terms": 30, "payment_terms_label": "Net 30", "email": "billing@deccanfm.in",
     "custom_fields": [{"label": "TDS Section", "value": "194C"}]},
    {"contact_id": "V-100771", "contact_name": "Indus Steel & Alloys Pvt Ltd", "gst_no": "29AAFCI3321H1ZP",
     "pan_no": "AAFCI3321H", "gst_treatment": "business_gst", "place_of_contact": "KA",
     "payment_terms": 60, "payment_terms_label": "Net 60", "email": "accounts@indussteel.in", "custom_fields": []},
    {"contact_id": "V-100889", "contact_name": "Nexgen IT Services Pvt Ltd", "gst_no": "27AAGCN9012B1ZR",
     "pan_no": "AAGCN9012B", "gst_treatment": "business_gst", "place_of_contact": "MH",
     "payment_terms": 30, "payment_terms_label": "Net 30", "email": "ar@nexgenit.in",
     "custom_fields": [{"label": "TDS Section", "value": "194J"}]},
]

VENDORS.append(
    {"contact_id": "V-101502", "contact_name": "Helvetia Instruments GmbH", "gst_no": "", "pan_no": "",
     "gst_treatment": "overseas", "place_of_contact": "", "currency_code": "EUR",
     "payment_terms": 30, "payment_terms_label": "30 days from B/L", "email": "export@helvetia-instruments.de",
     "custom_fields": [{"label": "VAT ID", "value": "DE312847596"}]},
)

ACCOUNTS = [
    {"account_id": "A-4201300", "account_name": "Plant & machinery spares", "account_code": "4201300", "account_type": "expense"},
    {"account_id": "A-4102100", "account_name": "Consumables & indirect materials", "account_code": "4102100", "account_type": "expense"},
    {"account_id": "A-4101100", "account_name": "Raw materials", "account_code": "4101100", "account_type": "cost_of_goods_sold"},
    {"account_id": "A-5301200", "account_name": "Professional fees", "account_code": "5301200", "account_type": "expense"},
    {"account_id": "A-5402100", "account_name": "Facility services", "account_code": "5402100", "account_type": "expense"},
    {"account_id": "A-5203100", "account_name": "IT services", "account_code": "5203100", "account_type": "expense"},
    {"account_id": "A-5105100", "account_name": "Freight inward", "account_code": "5105100", "account_type": "expense"},
    {"account_id": "A-1204100", "account_name": "Measuring instruments (capital)", "account_code": "1204100", "account_type": "fixed_asset"},
    {"account_id": "A-1102001", "account_name": "HDFC Bank — current account", "account_code": "1102001", "account_type": "bank"},
]

TAXES = [
    {"tax_id": f"T-{kind}{rate}", "tax_name": f"{'IGST' if kind == 'I' else 'GST'}{rate}",
     "tax_percentage": rate, "tax_type": "tax" if kind == "I" else "tax_group",
     "tax_specific_type": "igst" if kind == "I" else ""}
    for rate in (5, 12, 18, 28)
    for kind in ("I", "G")
]

TDS_TAXES = [
    {"tax_id": "TDS-194J-10", "tax_name": "Professional fees 194J [10%]", "tax_percentage": 10},
    {"tax_id": "TDS-194C-2", "tax_name": "Contractors 194C [2%]", "tax_percentage": 2},
]


def _line(order: int, name: str, hsn: str, qty: float, rate: float, tax: float, account: str, unit: str = "nos") -> dict:
    return {"line_item_id": _id(), "item_id": "ITEM-" + hsn + "-" + str(order), "item_order": order, "name": name, "description": name,
            "hsn_or_sac": hsn, "quantity": qty, "quantity_billed": 0, "rate": rate,
            "tax_percentage": tax, "account_id": account, "unit": unit}


def _cf(cc: str, bu: str, pr: str, buyer: str, plant: str) -> list[dict]:
    return [{"label": "Cost Centre", "value": cc}, {"label": "Business Unit", "value": bu},
            {"label": "PR Number", "value": pr}, {"label": "Buyer", "value": buyer},
            {"label": "Plant", "value": plant}]


PURCHASE_ORDERS: list[dict[str, Any]] = [
    {
        "purchaseorder_id": "PO-ID-127845", "purchaseorder_number": "4500127845", "vendor_id": "V-100482",
        "vendor_name": "Bharat Technologies Pvt Ltd", "date": "2026-07-28", "delivery_date": "2026-08-10",
        "status": "open", "currency_code": "INR", "destination_of_supply": "KA", "payment_terms_label": "Net 45",
        "custom_fields": _cf("CC-BLR-MFG-02", "Aurora India — Bommasandra", "PR-2026-00418", "S. Rao", "Bommasandra (1030)"),
        "line_items": [
            _line(10, "Edge gateway controller EG-450", "85176290", 60, 24500, 18, "A-4201300"),
            _line(20, "Industrial IoT sensor module S-22", "85311020", 180, 4850, 18, "A-4201300"),
            _line(30, "Ruggedised network switch 16-port", "85176290", 24, 38900, 18, "A-4201300"),
            _line(40, "Cabling & termination kit", "85444999", 40, 6200, 18, "A-4201300"),
            _line(50, "On-site commissioning (per day)", "998719", 12, 18500, 18, "A-4201300", "day"),
            _line(60, "Extended warranty — 24 months", "998719", 1, 148000, 18, "A-4201300"),
        ],
    },
    {
        "purchaseorder_id": "PO-ID-131207", "purchaseorder_number": "4500131207", "vendor_id": "V-100915",
        "vendor_name": "Apex Industrial Supplies India Pvt Ltd", "date": "2026-07-18", "delivery_date": "2026-08-01",
        "status": "open", "currency_code": "INR", "destination_of_supply": "KA", "payment_terms_label": "Net 60",
        "custom_fields": _cf("CC-BLR-MFG-02", "Aurora India — Bommasandra", "PR-2026-00512", "N. Bhatia", "Bommasandra (1030)"),
        "line_items": [
            _line(10, "Hex bolt M12 x 60 — grade 8.8", "73181500", 4800, 27.5, 18, "A-4102100"),
            _line(20, "Hardened washer M12", "73182200", 9600, 4.2, 18, "A-4102100"),
            _line(30, "Self-locking nut M12", "73181600", 4800, 9.8, 18, "A-4102100"),
            _line(40, "Mild steel channel 100x50 (6m)", "72162100", 100, 4380, 18, "A-4102100"),
            _line(50, "Welding electrode 3.15mm (5kg pack)", "83112000", 210, 1120, 18, "A-4102100"),
            _line(60, "Industrial adhesive 1L", "35061000", 96, 890, 18, "A-4102100"),
            _line(70, "Abrasive cutting disc 300mm", "68042290", 320, 265, 18, "A-4102100"),
            _line(80, "Hydraulic hose assembly 1/2 in", "40093100", 64, 2180, 18, "A-4102100"),
            _line(90, "Safety gloves — knitted, cut level 5 (pair)", "61161000", 600, 245, 12, "A-4102100", "pair"),
            _line(100, "Packing & forwarding", "998540", 1, 18600, 18, "A-5105100"),
            _line(110, "Freight — Bengaluru local", "996511", 1, 42400, 5, "A-5105100"),
        ],
    },
    {
        "purchaseorder_id": "PO-ID-129940", "purchaseorder_number": "4500129940", "vendor_id": "V-100233",
        "vendor_name": "Sundaram Precision Components Ltd", "date": "2026-08-02", "delivery_date": "2026-08-25",
        "status": "partially_received", "currency_code": "INR", "destination_of_supply": "TN", "payment_terms_label": "Net 45",
        "custom_fields": _cf("CC-CHN-MFG-01", "Aurora India — Oragadam", "PR-2026-00476", "K. Subramanian", "Oragadam (1040)"),
        "line_items": [_line(10, "Precision machined bush PB-20", "84879000", 500, 2568, 18, "A-4101100")],
    },
    {
        "purchaseorder_id": "PO-ID-132118", "purchaseorder_number": "4500132118", "vendor_id": "V-100617",
        "vendor_name": "Deccan Facility Management Pvt Ltd", "date": "2026-08-06", "delivery_date": "2026-08-31",
        "status": "open", "currency_code": "INR", "destination_of_supply": "TS", "payment_terms_label": "Net 30",
        "custom_fields": _cf("CC-BLR-FAC-03", "Aurora India — Bommasandra", "PR-2026-00534", "M. Reddy", "Bommasandra (1030)"),
        "line_items": [
            _line(10, "General housekeeping & cleaning services — monthly", "998533", 1, 218500, 18, "A-5402100", "month"),
            _line(20, "Security manpower deployment (per guard-month)", "998519", 12, 19500, 18, "A-5402100"),
            _line(30, "HVAC preventive maintenance — quarterly visit", "998719", 1, 104000, 18, "A-5402100", "lot"),
        ],
    },
    {
        "purchaseorder_id": "PO-ID-133402", "purchaseorder_number": "4500133402", "vendor_id": "V-100771",
        "vendor_name": "Indus Steel & Alloys Pvt Ltd", "date": "2026-08-11", "delivery_date": "2026-09-05",
        "status": "open", "currency_code": "INR", "destination_of_supply": "KA", "payment_terms_label": "Net 60",
        "custom_fields": _cf("CC-BLR-MFG-02", "Aurora India — Bommasandra", "PR-2026-00559", "N. Bhatia", "Bommasandra (1030)"),
        "line_items": [_line(10, "HR steel plate 10mm", "72085110", 240, 13002, 18, "A-4101100")],
    },
    {
        "purchaseorder_id": "PO-ID-134771", "purchaseorder_number": "4500134771", "vendor_id": "V-100889",
        "vendor_name": "Nexgen IT Services Pvt Ltd", "date": "2026-08-16", "delivery_date": "2026-08-31",
        "status": "billed", "currency_code": "INR", "destination_of_supply": "MH", "payment_terms_label": "Net 30",
        "custom_fields": _cf("CC-COR-ITS-02", "Aurora India — Corporate", "PR-2026-00571", "P. Shah", "Corporate — IT"),
        "line_items": [_line(10, "IT managed services — Aug 2026", "998313", 1, 968000, 18, "A-5203100", "month")],
    },
]

PURCHASE_ORDERS.append({
    "purchaseorder_id": "PO-ID-134902", "purchaseorder_number": "4500134902", "vendor_id": "V-101502",
    "vendor_name": "Helvetia Instruments GmbH", "date": "2026-08-11", "delivery_date": "2026-09-01",
    "status": "open", "currency_code": "EUR", "destination_of_supply": "KA", "payment_terms_label": "30 days from B/L",
    "custom_fields": _cf("CC-BLR-QA-01", "Aurora India — Bommasandra", "PR-2026-00566", "N. Bhatia", "Bommasandra (1030)"),
    "line_items": [
        _line(10, "Coordinate measuring probe kit CMM-40", "90319000", 4, 3850, 0, "A-1204100"),
        _line(20, "Calibration master set, ceramic (Class 0)", "90318000", 2, 2470, 0, "A-1204100", "set"),
        _line(30, "Surface roughness tester SRT-210", "90318000", 1, 2150, 0, "A-1204100"),
        _line(40, "Freight to CIP Bengaluru", "996521", 1, 520, 0, "A-5105100", "lot"),
        _line(50, "Marine insurance", "997136", 1, 130, 0, "A-5105100", "lot"),
    ],
})

for _po in PURCHASE_ORDERS:
    _po["total"] = round(sum(li["quantity"] * li["rate"] * (1 + li["tax_percentage"] / 100) for li in _po["line_items"]), 2)
# Nexgen is already fully billed in Zoho.
for _li in PURCHASE_ORDERS[5]["line_items"]:
    _li["quantity_billed"] = _li["quantity"]


def _po(number: str) -> dict:
    return next(p for p in PURCHASE_ORDERS if p["purchaseorder_number"] == number)


def _receive(number: str, po_number: str, date: str, kind: str, plant: str, status: str,
             qty: dict[int, tuple[float, float]] | None = None) -> dict:
    """``qty`` maps PO line index → (received, accepted); default is full receipt."""
    po = _po(po_number)
    lines = []
    for i, li in enumerate(po["line_items"]):
        rec, acc = (qty or {}).get(i, (li["quantity"], li["quantity"]))
        lines.append({"line_item_id": _id(), "purchaseorder_item_id": li["line_item_id"],
                      "name": li["name"], "quantity": rec, "quantity_accepted": acc})
    return {"receive_id": "R-" + number, "receive_number": number, "purchaseorder_id": po["purchaseorder_id"],
            "purchaseorder_number": po_number, "date": date, "status": status,
            "custom_fields": [{"label": "Receipt Type", "value": kind}, {"label": "Plant", "value": plant}],
            "line_items": lines}


RECEIVES = [
    _receive("5001279043", "4500127845", "2026-08-10", "Goods", "Chakan (1010)", "Posted"),
    _receive("5001284471", "4500131207", "2026-08-02", "Goods", "Bommasandra (1030)", "Posted"),
    _receive("5001286620", "4500129940", "2026-08-07", "Goods", "Oragadam (1040)", "Partial receipt", {0: (300, 292)}),
    _receive("5001288104", "4500133402", "2026-08-14", "Goods", "Bommasandra (1030)", "Quality hold", {0: (84, 80)}),
    _receive("SES-2026-0948", "4500134771", "2026-08-20", "Service", "Corporate — IT", "Service confirmed"),
    _receive("SES-2026-0912", "4500132118", "2026-08-31", "Service", "Bommasandra (1030)", "Service confirmed"),
    _receive("5001291884", "4500134902", "2026-09-10", "Goods", "Bommasandra (1030)", "Posted"),
]

BILLS = [
    {"bill_id": "B-4310", "bill_number": "INV/26-27/4310", "vendor_id": "V-100889", "vendor_name": "Nexgen IT Services Pvt Ltd",
     "date": "2026-08-22", "due_date": "2026-09-21", "total": 1142240.0, "balance": 0.0, "status": "paid"},
    {"bill_id": "B-4219", "bill_number": "INV/26-27/4219", "vendor_id": "V-100617", "vendor_name": "Deccan Facility Management Pvt Ltd",
     "date": "2026-08-14", "due_date": "2026-09-13", "total": 656640.0, "balance": 656640.0, "status": "overdue"},
]

REQUISITIONS = [
    {"pr_number": "PR-2026-00512", "title": "Structural steel for line 3 retrofit", "raised_by": "V. Naik",
     "department": "Plant Engineering", "date": "2026-07-12", "value": 2100000, "approved_by": "R. Kulkarni",
     "approval_route": "Zoho DOA IN-PR-02", "status": "Approved", "po_number": "4500131207"},
    {"pr_number": "PR-2026-00418", "title": "Edge gateway rollout — Chakan plant", "raised_by": "A. Deshpande",
     "department": "Manufacturing IT", "date": "2026-07-20", "value": 4900000, "approved_by": "S. Iyer",
     "approval_route": "Zoho DOA IN-PR-01", "status": "Approved", "po_number": "4500127845"},
]


class MockZohoClient:
    """In-memory stand-in with the live client's interface."""

    def __init__(self) -> None:
        self.bills = copy.deepcopy(BILLS)
        self.bill_payloads: list[dict] = []
        self.payments: list[dict] = []
        self.attachments: dict[str, str] = {}

    async def get_organization(self) -> dict:
        return {"organization_id": "60028941", "name": "Aurora Manufacturing India Pvt Ltd (demo)"}

    async def list_vendors(self) -> list[dict]:
        return copy.deepcopy(VENDORS)

    async def get_vendor(self, contact_id: str) -> dict:
        return copy.deepcopy(next(v for v in VENDORS if v["contact_id"] == contact_id))

    async def search_vendors(self, name: str) -> list[dict]:
        return [copy.deepcopy(v) for v in VENDORS if name.lower() in v["contact_name"].lower()]

    async def list_accounts(self) -> list[dict]:
        return copy.deepcopy(ACCOUNTS)

    async def list_taxes(self) -> list[dict]:
        return copy.deepcopy(TAXES)

    async def list_tds_taxes(self) -> list[dict]:
        return copy.deepcopy(TDS_TAXES)

    async def list_custom_fields(self) -> dict:
        return {"purchaseorder": [{"label": "Cost centre", "api_name": "cf_cost_centre", "data_type": "dropdown",
                                   "values": [{"name": "CC-BLR-MFG-02"}, {"name": "CC-COR-ITS-02"},
                                              {"name": "CC-COR-FIN-01"}]}],
                "bill": [{"label": "Cost centre", "api_name": "cf_cost_centre", "data_type": "dropdown",
                          "values": [{"name": "CC-BLR-MFG-02"}, {"name": "CC-COR-ITS-02"},
                                     {"name": "CC-COR-FIN-01"}]}]}

    async def list_purchase_orders(self) -> list[dict]:
        return [{k: v for k, v in p.items() if k != "line_items"} for p in PURCHASE_ORDERS]

    async def search_purchase_orders(self, number: str) -> list[dict]:
        return [{k: v for k, v in p.items() if k != "line_items"} for p in PURCHASE_ORDERS
                if number.lower() in p["purchaseorder_number"].lower()]

    async def get_purchase_order(self, po_id: str) -> dict:
        po = copy.deepcopy(next(p for p in PURCHASE_ORDERS if p["purchaseorder_id"] == po_id))
        # Like Zoho's PO detail: references to the PO's receipts.
        po["purchasereceives"] = [{"receive_id": r["receive_id"], "receive_number": r["receive_number"],
                                   "date": r["date"]} for r in RECEIVES if r["purchaseorder_id"] == po_id]
        return po

    async def list_purchase_receives(self) -> list[dict]:
        return copy.deepcopy(RECEIVES)

    async def get_purchase_receive(self, receive_id: str) -> dict:
        return copy.deepcopy(next(r for r in RECEIVES if r["receive_id"] == receive_id))

    async def list_bills(self) -> list[dict]:
        return copy.deepcopy(self.bills)

    async def get_bill(self, bill_id: str) -> dict:
        return copy.deepcopy(next(b for b in self.bills if b["bill_id"] == bill_id))

    async def find_bills(self, bill_number: str) -> list[dict]:
        return [copy.deepcopy(b) for b in self.bills if b["bill_number"] == bill_number]

    async def list_requisitions(self) -> list[dict]:
        return copy.deepcopy(REQUISITIONS)

    async def create_bill(self, payload: dict) -> dict:
        # Mock tax ids encode the rate: T-I18 / T-G18.
        pct = {t["tax_id"]: t["tax_percentage"] for t in TAXES}
        tds_pct = {t["tax_id"]: t["tax_percentage"] for t in TDS_TAXES}
        total = sum(li["quantity"] * li["rate"] * (1 + pct.get(li.get("tax_id", ""), 0) / 100)
                    for li in payload["line_items"])
        tds = sum(li["quantity"] * li["rate"] * tds_pct.get(li.get("tds_tax_id", ""), 0) / 100
                  for li in payload["line_items"])
        bill = {"bill_id": "B-" + _id()[-6:], "bill_number": payload["bill_number"], "vendor_id": payload["vendor_id"],
                "date": payload["date"], "due_date": payload.get("due_date"), "total": round(total, 2),
                "balance": round(total - tds, 2), "status": "open"}
        self.bills.append(bill)
        self.bill_payloads.append(payload)
        # Like Zoho: billing a PO line raises its billed quantity (and marks the PO modified).
        for li in payload["line_items"]:
            for po in PURCHASE_ORDERS:
                for pl in po["line_items"]:
                    if pl["line_item_id"] == li.get("purchaseorder_item_id"):
                        pl["quantity_billed"] += li["quantity"]
                        po["last_modified_time"] = _id()
        return bill

    async def attach_to_bill(self, bill_id: str, filename: str, content: bytes, mime: str) -> None:
        self.attachments[bill_id] = filename

    async def create_vendor_payment(self, payload: dict) -> dict:
        payment = {"payment_id": "VP-" + _id()[-6:], **payload}
        self.payments.append(payment)
        for applied in payload.get("bills", []):
            for b in self.bills:
                if b["bill_id"] == applied["bill_id"]:
                    b["balance"] = round(b["balance"] - applied["amount_applied"], 2)
                    b["status"] = "paid" if b["balance"] <= 0.5 else "partially_paid"
        return payment

    async def aclose(self) -> None:
        return None
