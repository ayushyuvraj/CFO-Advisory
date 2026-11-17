"""Test invoices for the GENSTAR Zoho Books demo organisation.

    .venv/Scripts/python scripts/genstar_invoices.py [output-folder]

Every invoice is built from data that exists in GENSTAR's Zoho Books: real
vendors and GSTINs, real purchase orders, item names, open quantities, rates
and tax codes, billed to GENSTAR's own GSTIN and address. Each one exercises a
different agent behaviour — see SCENARIOS and the generated README.txt.
"""

import sys
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf as fitz

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[3] / ".pdftestdata"
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_B = Path(r"C:\Windows\Fonts\arialbd.ttf")
W, H = 595, 842
M = 40  # page margin

BUYER = {
    "name": "GENSTAR NETWORK SOLUTIONS PVT.LTD",
    "addr": ["3rd Floor, Peninsula Chambers", "Peninsula Corporate Park", "Mumbai, Maharashtra 400013"],
    "gstin": "27AAQFV5235L1ZH",
    "pos": "Maharashtra (27)",
}


@dataclass
class Line:
    desc: str
    hsn: str
    qty: float
    uom: str
    rate: float
    gst: float


@dataclass
class Inv:
    file: str
    vendor: str
    gstin: str
    pan: str
    addr: list[str]
    number: str
    date: str  # printed form
    due: str
    terms: str
    po: str | None
    po_date: str | None
    lines: list[Line]
    inter: bool  # IGST (inter-state) vs CGST+SGST
    tds: tuple[str, float] | None = None  # (section, rate %)
    copy_label: str = "ORIGINAL FOR RECIPIENT"
    notes: list[str] = field(default_factory=list)
    scenario: str = ""
    expect: str = ""


SCENARIOS: list[Inv] = [
    Inv(
        file="GS-01-166384-4-clean-po-match.pdf",
        vendor="166384-4", gstin="27AAACZ4820E1ZH", pan="AAACZ4820E",
        addr=["Gala No. 7, Marol Industrial Estate", "Andheri East, Mumbai, Maharashtra 400059"],
        number="166/26-27/0412", date="15 Sep 2026", due="15 Sep 2026", terms="Advance 10%",
        po="PO-00081", po_date="01 Jul 2025",
        lines=[Line("Dual Castor Nylon Wheels", "83022000", 20, "Nos", 500, 18)], inter=False,
        scenario="Clean PO-backed goods invoice, intra-state CGST + SGST 9% + 9%.",
        expect="3-way: PO-00081 has 80 received and 80 billed, so the 20 invoiced are NOT yet received -> "
               "Exception (quantity vs receipt). In Zoho, receive the remaining 20 wheels on PO-00081 (purchase "
               "receive), then Sync now: the invoice re-checks itself and passes -> approve -> submit creates the Bill.",
    ),
    Inv(
        file="GS-02-cosmos-impex-quantity-variance.pdf",
        vendor="COSMOS IMPEX (INDIA) PRIVATE LIMITED", gstin="24AAACC7621C1Z9", pan="AAACC7621C",
        addr=["85/2, Cosmos House, Atladra-Padra Road", "Vadodara, Gujarat 390012"],
        number="CI/26-27/1187", date="12 Sep 2026", due="12 Sep 2026", terms="Due on Receipt",
        po="PO-00100", po_date="21 May 2026",
        lines=[Line("Berring", "84821011", 15, "Nos", 100, 18)], inter=True,
        scenario="Inter-state IGST 18% from Gujarat; bills 15 units against 10 still open on the PO.",
        expect="Exception — quantity variance (+5). Correct the quantity to 10 in Source Evidence → match "
               "passes, or park / raise a source correction.",
    ),
    Inv(
        file="GS-03-vj-infonet-price-variance.pdf",
        vendor="V J INFONET PRIVATE LIMITED", gstin="07AACCV6717A1ZL", pan="AACCV6717A",
        addr=["621, Hemkunt Chamber, Building No. 89", "Nehru Place, South Delhi, Delhi 110019"],
        number="VJIPL/26227/000318", date="10 Sep 2026", due="10 Sep 2026", terms="Due on Receipt",
        po="PO-00099", po_date="04 May 2026",
        lines=[Line("CISCO: C9200L-48P-4X-E", "85176290", 5, "Nos", 36500, 18)], inter=True,
        scenario="Inter-state IGST; unit rate Rs 36,500 against Rs 34,000 on the PO (+7.4%, tolerance 2%).",
        expect="Exception — price variance (and, 3-way, nothing received on PO-00099 yet). Correct the rate to "
               "34,000 and receive the goods in Zoho, or park it. "
               "(PO-00099 is still a draft in Zoho — posting a bill against it may be refused by Zoho.)",
    ),
    Inv(
        file="GS-04-value-score-services-tds-194j.pdf",
        vendor="VALUE SCORE BUSINESS SOLUTIONS LLP", gstin="27AAQFV5235L1ZH", pan="AAQFV5235L",
        addr=["Flat No. A/604, 6th Floor, Park Side II CHS Ltd", "Kulupwadi Road, Borivali East, Mumbai, Maharashtra 400066"],
        number="VSBS/26-27/0088", date="05 Sep 2026", due="05 Sep 2026", terms="Due on Receipt",
        po="PO-00103", po_date="29 Jul 2026",
        lines=[Line("IT Services", "998313", 2, "Months", 50000, 18)], inter=False,
        tds=("194J", 10),
        notes=["Service period: July – August 2026.",
               "TDS u/s 194J @ 10% to be deducted by the recipient on the value excluding GST."],
        scenario="Professional IT services against PO-00103 (2 of 5 remaining), TDS 194J.",
        expect="Match passes (2 of 5 open on PO-00103; a service line with no service receipt is matched 2-way "
               "with a note); TDS Rs 10,000 u/s 194J, net payable Rs 1,08,000. Status "
               "Validation Required: three vendor records in GENSTAR's Zoho share this GSTIN (it is also GENSTAR's "
               "own), so the agent picks Value Score by name and asks for a vendor-master clean-up. Approve to continue.",
    ),
    Inv(
        file="GS-05-indian-national-theatre-non-po.pdf",
        vendor="INDIAN NATIONAL THEATRE", gstin="27AAATI1269B1Z0", pan="AAATI1269B",
        addr=["Dr. Dadabhai Naoroji Road, Fort", "Mumbai, Maharashtra 400001"],
        number="INT/2026/0241", date="08 Sep 2026", due="08 Sep 2026", terms="Advance 10%",
        po=None, po_date=None,
        lines=[Line("Auditorium hire - annual day event (1 day)", "997212", 1, "Day", 75000, 18),
               Line("Sound and lighting services", "998596", 1, "Lot", 10000, 18)], inter=False,
        scenario="Non-PO service invoice — no purchase order referenced anywhere.",
        expect="Exception — missing PO. Apply a cost centre in Source Evidence → routed for business-owner "
               "approval; or park / request clarification.",
    ),
    Inv(
        file="GS-06-popat-raja-invalid-gstin.pdf",
        vendor="POPAT RAJA AND SONS", gstin="27AICPG4750P1Z7", pan="AICPG4750P",
        addr=["Shop 14, Lohar Chawl", "Mumbai, Maharashtra 400001"],
        number="PRS/26-27/0561", date="11 Sep 2026", due="11 Oct 2026", terms="Net 30",
        po="PO-00082", po_date="16 Jul 2025",
        lines=[Line("Aluminium Coil", "73209010", 6, "TON", 1000, 18)], inter=False,
        scenario="Correct PO match (6 of 6 open) but the vendor's GSTIN — as held in Zoho — fails the checksum.",
        expect="Exception — GST mismatch (GSTIN checksum; the GSTIN in Zoho's vendor master needs correcting) and, "
               "3-way, nothing received on PO-00082 yet.",
    ),
    Inv(
        file="GS-07-vj-infonet-already-billed-in-zoho.pdf",
        vendor="V J INFONET PRIVATE LIMITED", gstin="07AACCV6717A1ZL", pan="AACCV6717A",
        addr=["621, Hemkunt Chamber, Building No. 89", "Nehru Place, South Delhi, Delhi 110019"],
        number="VJIPL/26227/000055", date="01 May 2026", due="01 May 2026", terms="Due on Receipt",
        po=None, po_date=None,
        lines=[Line("CISCO: C9200L-48P-4X-E", "85176290", 24, "Nos", 43000, 18)], inter=True,
        scenario="Re-submission of an invoice already booked in Zoho (bill VJIPL/26227/000055, Rs 12,17,760).",
        expect="Exception — duplicate suspected: 'Bill VJIPL/26227/000055 is already recorded in Zoho Books'. "
               "Recommended action: Reject — duplicate.",
    ),
]
# A second copy of GS-01, as vendors sometimes send the transporter's copy too.
_dup = SCENARIOS[0]
SCENARIOS.append(Inv(**{**_dup.__dict__, "file": "GS-08-166384-4-duplicate-copy.pdf",
                        "copy_label": "DUPLICATE FOR TRANSPORTER",
                        "scenario": "The same invoice as GS-01, sent again (transporter's copy).",
                        "expect": "Upload after GS-01: Exception — duplicate suspected (same vendor + invoice number "
                                  "as GS-01's case). GS-01 stays the original."}))

# The demo happy path: one PO with exactly one open receipt, billed in full.
# PO-00107 (Cosmos Impex) was raised for it: 10 × Berring at Rs 100, IGST 18%,
# fully received on PR-00073 and not yet billed. The PO line carries no HSN, so
# the invoice prints the bearing code GS-02 uses for the same item.
SCENARIOS.append(Inv(
    file="GS-09-cosmos-impex-happy-path.pdf",
    vendor="COSMOS IMPEX (INDIA) PRIVATE LIMITED", gstin="24AAACC7621C1Z9", pan="AAACC7621C",
    addr=["85/2, Cosmos House, Atladra-Padra Road", "Vadodara, Gujarat 390012"],
    number="CI/26-27/1204", date="22 Sep 2026", due="22 Sep 2026", terms="Due on Receipt",
    po="PO-00107", po_date="22 Sep 2026",
    lines=[Line("Berring", "84821011", 10, "Nos", 100, 18)], inter=True,
    scenario="Happy path: 1 PO (PO-00107) with 1 open receipt (PR-00073: 10 received, 0 billed); the invoice "
             "bills exactly those 10 at the PO rate, IGST 18% from Gujarat.",
    expect="Every check passes and the 3-way match passes (PO 10 = receipt 10 = invoice 10) -> Awaiting Approval. "
           "Approve as AP Processor, then Business Owner -> Submit creates the Bill in Zoho against PO-00107 and "
           "PR-00073, with the PDF attached -> release and confirm the payment. Single use: once billed, "
           "PR-00073 is no longer open.",
))

# The demo correction path: one PO with exactly one receipt; the invoice over-bills
# the quantity. PO-00108 (Team One Arteq): 25 × Dual Castor Nylon Wheels at Rs 400,
# GST 18% intra-state, received on PR-00074. Zoho holds no address and no HSN for
# them, so the invoice prints the state only and the wheel code GS-01 uses.
SCENARIOS.append(Inv(
    file="GS-10-team-one-arteq-quantity-correction.pdf",
    vendor="TEAM ONE ARTEQ PRIVATE LIMITED", gstin="27AAHCT3172A1ZL", pan="AAHCT3172A",
    addr=["Maharashtra, India"],
    number="TOA/26-27/0561", date="22 Sep 2026", due="22 Sep 2026", terms="Advance 100%",
    po="PO-00108", po_date="22 Sep 2026",
    lines=[Line("Dual Castor Nylon Wheels", "83022000", 30, "Nos", 400, 18)], inter=False,
    scenario="Correction path: 1 PO (PO-00108) with 1 receipt (PR-00074: 25 received, 0 billed); the invoice "
             "bills 30 at the PO rate, CGST + SGST 9% + 9% within Maharashtra.",
    expect="Exception — quantity discrepancy +5 (PO 25, receipt 25, invoice 30). In Source Evidence the corrected "
           "value is pre-filled with 25 -> pick a reason -> Apply & Revalidate: total Rs 14,160 -> Rs 11,800 and the "
           "match passes -> approve -> submit -> pay. Needs PR-00074 marked Received in Zoho (not In Transit).",
))

# The multi-line happy path: PO-00109 (Viscon Rubber), three goods lines at GST 18%
# intra-state, to be received in full on one receipt. The address is Viscon's from
# Zoho; the PO lines carry no HSN, so the invoice prints the codes for the goods.
SCENARIOS.append(Inv(
    file="GS-15-viscon-rubber-multi-line-happy-path.pdf",
    vendor="VISCON RUBBER PRIVATE LIMITED", gstin="27AAGCV2472A1ZJ", pan="AAGCV2472A",
    addr=["GAT 844/3, Waki, Chakan, Khed", "Pune, Maharashtra 410501"],
    number="VRPL/26-27/0233", date="22 Sep 2026", due="22 Sep 2026", terms="Advance 100%",
    po="PO-00109", po_date="22 Sep 2026",
    lines=[Line("Black Leather Bag", "42022110", 10, "Kg", 30, 18),
           Line("Embark Perfume", "33030090", 25, "Box", 800, 18),
           Line("Fresh Paneer", "04061000", 40, "Nos", 100, 18)], inter=False,
    scenario="Multi-line happy path: 1 PO (PO-00109) with 3 goods lines, received in full on 1 receipt; the "
             "invoice bills every line exactly as ordered, CGST + SGST 9% + 9% within Maharashtra.",
    expect="All three lines pass the 3-way match (10 = 10, 25 = 25, 40 = 40 at the PO rates) -> Awaiting Approval "
           "-> approve as AP Processor and Business Owner (Rs 28,674 is below the Finance Controller's Rs 10 L "
           "threshold) -> submit -> pay. Needs one receipt on PO-00109 receiving all three lines, status Received.",
))

# The multi-line correction path: PO-00110 (V J Infonet), the same three goods at IGST
# 18% from Delhi, received in full on PR-00076. Lines 2 and 3 over-bill the quantity.
SCENARIOS.append(Inv(
    file="GS-17-vj-infonet-multi-line-corrections.pdf",
    vendor="V J INFONET PRIVATE LIMITED", gstin="07AACCV6717A1ZL", pan="AACCV6717A",
    addr=["621, Hemkunt Chamber, Building No. 89", "Nehru Place, South Delhi, Delhi 110019"],
    number="VJIPL/26227/000412", date="22 Sep 2026", due="22 Sep 2026", terms="Due on Receipt",
    po="PO-00110", po_date="22 Sep 2026",
    lines=[Line("Black Leather Bag", "42022110", 20, "Kg", 30, 18),
           Line("Embark Perfume", "33030090", 18, "Box", 800, 18),
           Line("Fresh Paneer", "04061000", 70, "Nos", 100, 18)], inter=True,
    scenario="Multi-line correction path: 1 PO (PO-00110) with 3 lines received in full on 1 receipt (PR-00076: "
             "20 / 15 / 60); the invoice bills line 1 correctly but over-bills line 2 (18 vs 15) and line 3 "
             "(70 vs 60). IGST 18% from Delhi.",
    expect="Exception — quantity discrepancy on lines 2 (+3) and 3 (+10); line 1 passes. Correct line 2 to 15 -> "
           "Apply & Revalidate (line 3 still fails) -> correct line 3 to 60 -> Apply & Revalidate: total "
           "Rs 25,960 -> Rs 21,948, every line passes -> approve -> submit -> pay.",
))

# Three-level approval: PO-00111 (Viscon Rubber) is worth Rs 17.7 L, over the
# Finance Controller's Rs 10 L threshold and under the CFO's Rs 50 L.
SCENARIOS.append(Inv(
    file="GS-18-viscon-rubber-finance-controller-approval.pdf",
    vendor="VISCON RUBBER PRIVATE LIMITED", gstin="27AAGCV2472A1ZJ", pan="AAGCV2472A",
    addr=["GAT 844/3, Waki, Chakan, Khed", "Pune, Maharashtra 410501"],
    number="VRPL/26-27/0241", date="23 Sep 2026", due="23 Sep 2026", terms="Advance 100%",
    po="PO-00111", po_date="23 Sep 2026",
    lines=[Line("Bikes-Hybrid", "412566", 30, "Nos", 50000, 18)], inter=False,
    scenario="High-value happy path: 1 PO (PO-00111) with 1 open receipt (PR-00077: 30 received, 0 billed); the "
             "invoice bills all 30 at the PO rate, CGST + SGST 9% + 9% within Maharashtra. Total Rs 17,70,000.",
    expect="Every check passes and the 3-way match passes -> Awaiting Approval with three levels: AP Processor, "
           "Business Owner and Finance Controller (Rs 17.7 L is above the Rs 10 L threshold); CFO shows as not "
           "required. Approve as each in turn -> submit -> pay.",
))

# Non-PO at a value that needs both GPO sign-off (over Rs 5 L) and the Finance
# Controller (over Rs 10 L). Nothing to set up in Zoho: no PO, no receipt.
SCENARIOS.append(Inv(
    file="GS-19-cosmos-impex-non-po-high-value.pdf",
    vendor="COSMOS IMPEX (INDIA) PRIVATE LIMITED", gstin="24AAACC7621C1Z9", pan="AAACC7621C",
    addr=["85/2, Cosmos House, Atladra-Padra Road", "Vadodara, Gujarat 390012"],
    number="CI/26-27/1288", date="23 Sep 2026", due="23 Sep 2026", terms="Due on Receipt",
    po=None, po_date=None,
    lines=[Line("Industrial bearing assembly, heavy duty", "84821011", 200, "Nos", 5000, 18)], inter=True,
    notes=["Emergency replacement supply — purchase order to follow."],
    scenario="Non-PO at Rs 11,80,000: no purchase order referenced anywhere, IGST 18% from Gujarat.",
    expect="Exception — missing PO. Enter a cost centre in Source Evidence -> Apply coding: the invoice is routed "
           "for approval with three levels (AP Processor, Business Owner, Finance Controller — Rs 11.8 L is over "
           "Rs 10 L) and the recommendation notes GPO sign-off, required for non-PO invoices over Rs 5 L. Submit "
           "creates a Zoho bill with no PO or receipt link, posted to the default expense account.",
))

# Charges beside the goods: freight at 5% and transit insurance at 18%, neither on
# the PO. Two GST rates on one invoice, and the policy's allowed-charges rule.
SCENARIOS.append(Inv(
    file="GS-20-viscon-rubber-freight-and-mixed-gst.pdf",
    vendor="VISCON RUBBER PRIVATE LIMITED", gstin="27AAGCV2472A1ZJ", pan="AAGCV2472A",
    addr=["GAT 844/3, Waki, Chakan, Khed", "Pune, Maharashtra 410501"],
    number="VRPL/26-27/0248", date="23 Sep 2026", due="23 Sep 2026", terms="Advance 100%",
    po="PO-00112", po_date="23 Sep 2026",
    lines=[Line("Automation Control Panel (ABB + PLC Based)", "84371000", 20, "Pcs", 2000, 18),
           Line("Freight — road transport to plant", "996511", 1, "Lot", 3600, 5),
           Line("Transit insurance", "997136", 1, "Lot", 1500, 18)], inter=False,
    scenario="Goods at 18% plus two charge lines that are not on the PO: freight at GST 5% and transit insurance "
             "at 18%. Intra-state CGST + SGST. Total Rs 52,750.",
    expect="The goods line matches PO-00112 and PR-00078 3-way; freight and insurance are allowed by policy "
           "(allow_unmatched_charges) and shown as notes, so the match still passes -> Awaiting Approval. The tax "
           "summary lists both rates. On posting, the goods line carries the PO and receipt link while the two "
           "charge lines go to the default expense account. Not yet confirmed: that Zoho accepts a PO-linked bill "
           "carrying extra lines that are not on the PO.",
))


# ── Rendering ────────────────────────────────────────────────────────────────

def indian(n: float) -> str:
    s = f"{abs(n):.2f}"
    whole, frac = s.split(".")
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        whole = ",".join(parts + [tail])
    return ("-" if n < 0 else "") + whole + "." + frac


ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
        "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def _two(n: int) -> str:
    return ONES[n] if n < 20 else TENS[n // 10] + (" " + ONES[n % 10] if n % 10 else "")


def _three(n: int) -> str:
    out = (ONES[n // 100] + " Hundred" if n >= 100 else "")
    rest = n % 100
    return (out + (" " if out and rest else "") + (_two(rest) if rest else "")).strip()


def words(n: float) -> str:
    rupees, paise = int(n), round((n - int(n)) * 100)
    parts = []
    for div, name in ((10_000_000, "Crore"), (100_000, "Lakh"), (1000, "Thousand")):
        if rupees >= div:
            parts.append(_three(rupees // div) + " " + name)
            rupees %= div
    if rupees:
        parts.append(_three(rupees))
    text = "Rupees " + " ".join(parts or ["Zero"])
    if paise:
        text += " and " + _two(paise) + " Paise"
    return text + " Only"


class Page:
    def __init__(self, doc: fitz.Document):
        self.p = doc.new_page(width=W, height=H)
        self.p.insert_font(fontname="ar", fontfile=str(FONT))
        self.p.insert_font(fontname="arb", fontfile=str(FONT_B))
        self.f = fitz.Font(fontfile=str(FONT))
        self.fb = fitz.Font(fontfile=str(FONT_B))

    def text(self, x, y, s, size=8.5, bold=False, right=False, color=(0.1, 0.1, 0.12)):
        font = self.fb if bold else self.f
        if right:
            x -= font.text_length(s, fontsize=size)
        self.p.insert_text((x, y), s, fontsize=size, fontname="arb" if bold else "ar", color=color)

    def wrap(self, s: str, width: float, size: float, bold: bool = False) -> list[str]:
        font = self.fb if bold else self.f
        out, cur = [], ""
        for w in s.split():
            if cur and font.text_length(cur + " " + w, fontsize=size) > width:
                out.append(cur)
                cur = w
            else:
                cur = (cur + " " + w).strip()
        return out + [cur]

    def line(self, x0, y0, x1, y1, width=0.6, color=(0.75, 0.77, 0.8)):
        self.p.draw_line((x0, y0), (x1, y1), color=color, width=width)

    def fill(self, rect, color=(0.95, 0.96, 0.97)):
        self.p.draw_rect(fitz.Rect(*rect), color=None, fill=color)


def render(inv: Inv, path: Path) -> dict:
    doc = fitz.open()
    pg = Page(doc)
    grey = (0.42, 0.45, 0.5)

    # Supplier block
    pg.text(M, 58, inv.vendor, 15, bold=True)
    y = 74
    for a in inv.addr + ["India"]:
        pg.text(M, y, a, 8, color=grey)
        y += 11
    pg.text(M, y + 3, "GSTIN", 8, color=grey)
    pg.text(M + 34, y + 3, inv.gstin, 8.5, bold=True)
    pg.text(M + 140, y + 3, "PAN  " + inv.pan, 8.5)
    pg.text(W - M, 58, "TAX INVOICE", 13, bold=True, right=True)
    pg.text(W - M, 72, inv.copy_label, 7.5, right=True, color=grey)
    pg.line(M, 132, W - M, 132, 1.2, (0.15, 0.2, 0.3))

    # Bill to / Ship to / Invoice details
    top = 150
    for x, head in ((M, "BILL TO"), (M + 180, "SHIP TO")):
        pg.text(x, top, head, 7, bold=True, color=grey)
        yy = top + 13
        for part in pg.wrap(BUYER["name"], 165, 8.5, bold=True):
            pg.text(x, yy, part, 8.5, bold=True)
            yy += 11
        yy += 1
        for a in BUYER["addr"]:
            pg.text(x, yy, a, 8)
            yy += 11
        if head == "BILL TO":
            pg.text(x, yy + 3, "GSTIN", 8, color=grey)
            pg.text(x + 34, yy + 3, BUYER["gstin"], 8.5, bold=True)
    details = [("Invoice No.", inv.number), ("Invoice Date", inv.date), ("Due Date", inv.due),
               ("Payment Terms", inv.terms), ("PO Number", inv.po or "— not referenced —")]
    if inv.po_date:
        details.append(("PO Date", inv.po_date))
    details += [("Place of Supply", BUYER["pos"]), ("Currency", "INR"), ("Reverse Charge", "No")]
    pg.text(M + 360, top, "INVOICE DETAILS", 7, bold=True, color=grey)
    yy = top + 13
    for k, v in details:
        pg.text(M + 360, yy, k, 8, color=grey)
        pg.text(M + 440, yy, v, 8.5, bold=k in ("Invoice No.", "PO Number"))
        yy += 12.5

    # Line items
    y = max(yy, top + 80) + 16
    if inv.inter:
        heads = ["#", "DESCRIPTION", "HSN/SAC", "QTY", "UOM", "RATE", "TAXABLE", "IGST", "AMOUNT"]
        cols = [(M, 0), (M + 16, 0), (M + 205, 0), (M + 272, 1), (M + 280, 0), (M + 355, 1), (M + 410, 1),
                (M + 460, 1), (W - M, 1)]
        desc_w = 180
    else:
        heads = ["#", "DESCRIPTION", "HSN/SAC", "QTY", "UOM", "RATE", "TAXABLE", "CGST", "SGST", "AMOUNT"]
        cols = [(M, 0), (M + 16, 0), (M + 170, 0), (M + 232, 1), (M + 240, 0), (M + 310, 1), (M + 370, 1),
                (M + 415, 1), (M + 463, 1), (W - M, 1)]
        desc_w = 146
    pg.fill((M, y - 11, W - M, y + 6))
    for h, (x, right) in zip(heads, cols):
        pg.text(x, y, h, 7, bold=True, right=bool(right))
    y += 20
    subtotal = tax_total = 0.0
    by_rate: dict[float, float] = {}
    for n, ln in enumerate(inv.lines, 1):
        taxable = round(ln.qty * ln.rate, 2)
        tax = round(taxable * ln.gst / 100, 2)
        subtotal += taxable
        tax_total += tax
        by_rate[ln.gst] = by_rate.get(ln.gst, 0) + taxable
        cells = [str(n), "", ln.hsn, f"{ln.qty:g}", ln.uom, indian(ln.rate), indian(taxable)]
        cells += [indian(tax)] if inv.inter else [indian(tax / 2), indian(tax / 2)]
        cells.append(indian(taxable + tax))
        for c, (x, right) in zip(cells, cols):
            if c:
                pg.text(x, y, c, 8, right=bool(right))
        desc_lines = pg.wrap(ln.desc, desc_w, 8)
        for i, d in enumerate(desc_lines):
            pg.text(cols[1][0], y + i * 10, d, 8)
        pct = f"{ln.gst:g}%" if inv.inter else f"{ln.gst / 2:g}%"
        for i in ([7] if inv.inter else [7, 8]):
            pg.text(cols[i][0], y + 9, pct, 6.5, right=True, color=grey)
        row_h = max(14, len(desc_lines) * 10 + 4)
        pg.line(M, y + row_h, W - M, y + row_h)
        y += row_h + 12

    # Tax summary
    y += 14
    pg.text(M, y, "TAX SUMMARY BY RATE", 7, bold=True, color=grey)
    y += 14
    for rate, base in by_rate.items():
        t = round(base * rate / 100, 2)
        label = f"GST {rate:g}%  on  {indian(base)}"
        heads_txt = f"IGST {indian(t)}" if inv.inter else f"CGST {indian(t / 2)}   SGST {indian(t / 2)}"
        pg.text(M, y, label, 8)
        pg.text(M + 200, y, heads_txt, 8)
        pg.text(M + 400, y, "Total tax " + indian(t), 8)
        y += 12

    # Totals
    total = round(subtotal + tax_total, 2)
    y += 16
    rows = [("Taxable Value", indian(subtotal))]
    rows += [("IGST", indian(tax_total))] if inv.inter else [("CGST", indian(tax_total / 2)), ("SGST", indian(tax_total / 2))]
    rows.append(("Invoice Total", "₹" + indian(total)))
    net = total
    if inv.tds:
        sec, r = inv.tds
        tds = round(subtotal * r / 100, 2)
        net = round(total - tds, 2)
        rows += [(f"Less: TDS u/s {sec} @ {r:g}%", "-₹" + indian(tds)), ("Net Payable to Supplier", "₹" + indian(net))]
    tx = M + 330
    words_y = y
    for k, v in rows:
        strong = k in ("Invoice Total", "Net Payable to Supplier")
        pg.text(tx, y, k, 9 if strong else 8.5, bold=strong)
        pg.text(W - M, y, v, 9 if strong else 8.5, bold=strong, right=True)
        pg.line(tx, y + 5, W - M, y + 5)
        y += 16
    pg.text(M, words_y, "AMOUNT IN WORDS", 7, bold=True, color=grey)
    wrap, lines_w = words(total), []
    cur = ""
    for w_ in wrap.split():
        if pg.f.text_length(cur + " " + w_, fontsize=8) > 270:
            lines_w.append(cur)
            cur = w_
        else:
            cur = (cur + " " + w_).strip()
    lines_w.append(cur)
    for i, l_ in enumerate(lines_w):
        pg.text(M, words_y + 13 + i * 11, l_, 8)

    # Notes and payment details
    y = max(y, words_y + 60) + 20
    pg.text(M, y, "PAYMENT DETAILS", 7, bold=True, color=grey)
    pg.text(M, y + 13, "Bank transfer (NEFT/RTGS) to the account registered with GENSTAR's vendor master.", 8)
    y += 36
    for note in inv.notes + ["Certified that the particulars given above are true and correct."]:
        pg.text(M, y, "• " + note, 7.5, color=grey)
        y += 11
    pg.text(W - M, H - 110, f"For {inv.vendor}", 8.5, bold=True, right=True)
    pg.line(W - M - 150, H - 80, W - M, H - 80)
    pg.text(W - M, H - 70, "Authorised Signatory", 7.5, right=True, color=grey)
    pg.line(M, H - 48, W - M, H - 48)
    pg.text(M, H - 36, f"{inv.vendor} · Tax Invoice {inv.number} · {inv.date} · Page 1 of 1", 6.5, color=grey)
    pg.text(W - M, H - 36, "Sample document for system testing — not a real invoice", 6.5, right=True, color=grey)

    path.parent.mkdir(parents=True, exist_ok=True)
    doc.subset_fonts()  # embed only the glyphs used
    doc.save(path, garbage=4, deflate=True)
    doc.close()
    return {"subtotal": subtotal, "tax": tax_total, "total": total, "net": net}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    readme = ["GENSTAR test invoices — built from the GENSTAR Zoho Books demo organisation",
              "Upload in order (GS-01 before GS-08). Expected outcome for each:", ""]
    for inv in SCENARIOS:
        t = render(inv, OUT / inv.file)
        readme += [f"{inv.file}", f"  Vendor: {inv.vendor} ({inv.gstin})   PO: {inv.po or 'none'}",
                   f"  Total: Rs {indian(t['total'])}" + (f"   Net after TDS: Rs {indian(t['net'])}" if inv.tds else ""),
                   f"  Scenario: {inv.scenario}", f"  Expected: {inv.expect}", ""]
        print(f"wrote {inv.file:<48} total {indian(t['total'])}")
    (OUT / "README.txt").write_text("\n".join(readme), encoding="utf-8")


if __name__ == "__main__":
    main()
