"""Generates sample GST invoices matching the demo Zoho organisation.

    python scripts/sample_invoices.py            # writes samples/*.pdf

bharat — clean PO-backed goods invoice, intra-state CGST+SGST, match passes
apex   — three pages, mixed 18% / 5% GST, 120 channels billed vs 100 ordered → fails
vertex — non-PO consulting invoice, SAC 998311, TDS u/s 194J → exception

``render`` also returns where every value was drawn, so tests can build the
extraction a model would return (see ``fake_extraction``) without calling Gemini.
"""

import sys
from pathlib import Path

import pymupdf as fitz

W, H = 595, 842  # A4 points

SAMPLES: dict[str, dict] = {
    "bharat": {
        "vendor_name": "Bharat Technologies Pvt Ltd", "vendor_gstin": "27AABCB1234K1ZX", "vendor_pan": "AABCB1234K",
        "vendor_address": "Unit 402, Cyber Towers, Hinjawadi Phase II\nPune, Maharashtra 411057",
        "invoice_number": "INV-2026-08452", "invoice_date": "2026-08-12", "po_number": "4500127845",
        "payment_terms": "Net 45", "currency": "INR",
        "buyer_name": "Aurora Manufacturing India Pvt Ltd", "buyer_gstin": "27AAACA9988R1ZK",
        "buyer_address": "Plot 14, MIDC Chakan\nPune, Maharashtra 410501", "ship_to": "Chakan Plant — Gate 3, Stores",
        "place_of_supply": "Maharashtra (27)", "pages": 1,
        "lines": [
            ("Edge gateway controller EG-450", "85176290", 60, 24500, 18),
            ("Industrial IoT sensor module S-22", "85311020", 180, 4850, 18),
            ("Ruggedised network switch 16-port", "85176290", 24, 38900, 18),
            ("Cabling & termination kit", "85444999", 40, 6200, 18),
            ("On-site commissioning (per day)", "998719", 12, 18500, 18),
            ("Extended warranty - 24 months", "998719", 1, 148000, 18),
        ],
    },
    "apex": {
        "vendor_name": "Apex Industrial Supplies India Pvt Ltd", "vendor_gstin": "29AAJCA5567P1ZS",
        "vendor_pan": "AAJCA5567P", "vendor_address": "Shed 7, Peenya Industrial Area, 3rd Stage\nBengaluru, Karnataka 560058",
        "invoice_number": "AIS/26-27/1184", "invoice_date": "2026-08-04", "po_number": "4500131207",
        "payment_terms": "Net 60", "currency": "INR",
        "buyer_name": "Aurora Manufacturing India Pvt Ltd", "buyer_gstin": "29AAACA9988R1ZG",
        "buyer_address": "Survey 88, Bommasandra Link Road\nBengaluru, Karnataka 560099",
        "ship_to": "Bommasandra Plant — Receiving Dock 2", "place_of_supply": "Karnataka (29)", "pages": 3,
        "lines": [
            ("Hex bolt M12 x 60 - grade 8.8", "73181500", 4800, 27.5, 18),
            ("Hardened washer M12", "73182200", 9600, 4.2, 18),
            ("Self-locking nut M12", "73181600", 4800, 9.8, 18),
            ("Mild steel channel 100x50 (6m)", "72162100", 120, 4380, 18),
            ("Welding electrode 3.15mm (5kg pack)", "83112000", 210, 1120, 18),
            ("Industrial adhesive 1L", "35061000", 96, 890, 18),
            ("Abrasive cutting disc 300mm", "68042290", 320, 265, 18),
            ("Hydraulic hose assembly 1/2 in", "40093100", 64, 2180, 18),
            ("Safety gloves - cut level 5 (pair)", "61161000", 600, 245, 12),
            ("Packing & forwarding", "998540", 1, 18600, 18),
            ("Freight - Bengaluru local", "996511", 1, 42400, 5),
        ],
    },
    "vertex": {
        "vendor_name": "Vertex Consulting Services LLP", "vendor_gstin": "06AAFFV2201Q1Z2", "vendor_pan": "AAFFV2201Q",
        "vendor_address": "3rd Floor, Tower B, Cyber Hub Extension\nGurugram, Haryana 122002",
        "invoice_number": "VCS/2026/0417", "invoice_date": "2026-08-18", "po_number": None,
        "payment_terms": "Net 30", "currency": "INR",
        "buyer_name": "Aurora Manufacturing India Pvt Ltd", "buyer_gstin": "06AAACA9988R1ZO",
        "buyer_address": "Corporate Office, DLF Cyber City\nGurugram, Haryana 122002",
        "ship_to": "Corporate — Finance Transformation", "place_of_supply": "Haryana (06)", "pages": 1,
        "tds_section": "194J",
        "lines": [
            ("Finance transformation advisory - Aug 2026", "998311", 1, 560000, 18),
            ("Process assessment workshops (4 sessions)", "998311", 4, 45000, 18),
            ("Reimbursable travel - at actuals", "998311", 1, 62000, 18),
        ],
    },
}


def totals(s: dict) -> dict:
    lines = [(d, h, q, r, t, round(q * r, 2)) for d, h, q, r, t in s["lines"]]
    subtotal = round(sum(x[5] for x in lines), 2)
    tax = round(sum(x[5] * x[4] / 100 for x in lines), 2)
    out = {"lines": lines, "subtotal": subtotal, "cgst": round(tax / 2, 2), "sgst": round(tax / 2, 2),
           "tax": tax, "total": round(subtotal + tax, 2)}
    if s.get("tds_section"):
        out["tds"] = round(subtotal * 0.10, 2)
        out["net"] = round(out["total"] - out["tds"], 2)
    return out


def _fmt(n: float) -> str:
    return f"{n:,.2f}"


def render(key: str, path: Path) -> dict[str, tuple[int, fitz.Rect]]:
    """Writes the PDF. Returns field → (page, rect) for every value drawn."""
    s, t = SAMPLES[key], totals(SAMPLES[key])
    doc = fitz.open()
    pos: dict[str, tuple[int, fitz.Rect]] = {}
    for _ in range(s["pages"]):
        doc.new_page(width=W, height=H)

    def text(pg: int, x: float, y: float, value: str, size: float = 9, key: str | None = None, bold: bool = False):
        font = "hebo" if bold else "helv"
        doc[pg - 1].insert_text((x, y), value, fontsize=size, fontname=font)
        if key:
            width = fitz.get_text_length(value, fontname=font, fontsize=size)
            pos[key] = (pg, fitz.Rect(x, y - size, x + width, y + 2))

    for i in range(s["pages"]):
        text(i + 1, 40, 40, s["vendor_name"], 14, "vendor_name" if i == 0 else None, bold=True)
        text(i + 1, 480, 40, "TAX INVOICE", 11, bold=True)
        text(i + 1, 480, 820, f"Page {i + 1} of {s['pages']}", 8)

    y = 58
    for ln in s["vendor_address"].split("\n"):
        text(1, 40, y, ln, 8, "vendor_address" if y == 58 else None)
        y += 11
    text(1, 40, y + 2, "GSTIN: ", 9)
    text(1, 75, y + 2, s["vendor_gstin"], 9, "vendor_gstin")
    text(1, 200, y + 2, "PAN: ", 9)
    text(1, 225, y + 2, s["vendor_pan"], 9, "vendor_pan")

    text(1, 380, 70, "Invoice No:", 9)
    text(1, 440, 70, s["invoice_number"], 9, "invoice_number", bold=True)
    text(1, 380, 84, "Date:", 9)
    d = s["invoice_date"].split("-")
    text(1, 440, 84, f"{d[2]}/{d[1]}/{d[0]}", 9, "invoice_date")
    text(1, 380, 98, "PO No:", 9)
    text(1, 440, 98, s["po_number"] or "-", 9, "po_number" if s["po_number"] else None)
    text(1, 380, 112, "Terms:", 9)
    text(1, 440, 112, s["payment_terms"], 9, "payment_terms")
    text(1, 380, 126, "Currency:", 9)
    text(1, 440, 126, s["currency"], 9, "currency")

    text(1, 40, 150, "Bill to:", 9, bold=True)
    text(1, 40, 163, s["buyer_name"], 9, "buyer_name")
    yy = 175
    for ln in s["buyer_address"].split("\n"):
        text(1, 40, yy, ln, 8)
        yy += 11
    text(1, 40, yy + 2, "GSTIN: ", 9)
    text(1, 75, yy + 2, s["buyer_gstin"], 9, "buyer_gstin")
    text(1, 320, 163, "Ship to: ", 9)
    text(1, 360, 163, s["ship_to"], 9, "ship_to")
    text(1, 320, 177, "Place of supply: ", 9)
    text(1, 395, 177, s["place_of_supply"], 9, "place_of_supply")

    cols = [40, 60, 270, 330, 380, 440, 480]
    per_page = {1: [0, 1, 2, 3, 4], 2: [5, 6, 7, 8], 3: [9, 10]} if s["pages"] == 3 else {1: list(range(len(t["lines"])))}
    for pg, idxs in per_page.items():
        y = 230 if pg == 1 else 80
        for c, head in zip(cols, ["#", "Description", "HSN/SAC", "Qty", "Rate", "GST%", "Taxable"]):
            text(pg, c, y, head, 8, bold=True)
        y += 16
        for i in idxs:
            desc, hsn, q, r, tax, taxable = t["lines"][i]
            text(pg, cols[0], y, str(i + 1), 8)
            text(pg, cols[1], y, desc, 8, f"line{i}")
            text(pg, cols[2], y, hsn, 8)
            text(pg, cols[3], y, f"{q:g}", 8, f"qty{i}")
            text(pg, cols[4], y, _fmt(r), 8)
            text(pg, cols[5], y, f"{tax:g}", 8)
            text(pg, cols[6], y, _fmt(taxable), 8)
            y += 15

    last = s["pages"]
    y = 600
    rows = [("Taxable value", t["subtotal"], "subtotal"), ("CGST", t["cgst"], "cgst"), ("SGST", t["sgst"], "sgst"),
            ("Invoice total", t["total"], "total")]
    if "tds" in t:
        rows += [(f"Less TDS u/s {s['tds_section']}", t["tds"], "tds_amount"), ("Net payable", t["net"], "net_payable")]
    for label, value, k in rows:
        text(last, 360, y, label, 9, bold=label in ("Invoice total", "Net payable"))
        text(last, 480, y, _fmt(value), 9, k, bold=label in ("Invoice total", "Net payable"))
        y += 15
    text(last, 40, 780, "Computer-generated invoice. Payment by NEFT/RTGS.", 7)

    path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(path)
    doc.close()
    return pos


def _box(pos: dict, key: str) -> tuple[int, list[int]]:
    if key not in pos:
        return 1, []
    pg, r = pos[key]
    return pg, [int(r.y0 / H * 1000), int(r.x0 / W * 1000), int(r.y1 / H * 1000), int(r.x1 / W * 1000)]


def fake_extraction(key: str, pos: dict, conf: float = 0.97, **overrides) -> dict:
    """What Gemini would return for this sample, in the extraction schema."""
    s, t = SAMPLES[key], totals(SAMPLES[key])

    def f(k: str, value) -> dict:
        pg, box = _box(pos, k)
        return {"value": None if value is None else str(value), "confidence": conf if value is not None else 0,
                "page": pg, "box_2d": box}

    out = {
        "is_invoice": True, "document_type": "tax_invoice",
        "vendor_name": f("vendor_name", s["vendor_name"]), "vendor_gstin": f("vendor_gstin", s["vendor_gstin"]),
        "vendor_pan": f("vendor_pan", s["vendor_pan"]), "vendor_address": f("vendor_address", s["vendor_address"]),
        "invoice_number": f("invoice_number", s["invoice_number"]), "invoice_date": f("invoice_date", s["invoice_date"]),
        "due_date": f("due_date", None), "po_number": f("po_number", s["po_number"]),
        "currency": f("currency", s["currency"]), "payment_terms": f("payment_terms", s["payment_terms"]),
        "buyer_name": f("buyer_name", s["buyer_name"]), "buyer_gstin": f("buyer_gstin", s["buyer_gstin"]),
        "buyer_address": f("buyer_address", s["buyer_address"]), "ship_to": f("ship_to", s["ship_to"]),
        "place_of_supply": f("place_of_supply", s["place_of_supply"]), "irn": f("irn", None),
        "subtotal": f("subtotal", t["subtotal"]), "cgst": f("cgst", t["cgst"]), "sgst": f("sgst", t["sgst"]),
        "igst": f("igst", None), "cess": f("cess", None), "round_off": f("round_off", None),
        "total": f("total", t["total"]), "tds_section": f("tds_section", s.get("tds_section")),
        "tds_amount": f("tds_amount", t.get("tds")), "net_payable": f("net_payable", t.get("net")),
        "line_items": [],
    }
    for i, (desc, hsn, q, r, tax, taxable) in enumerate(t["lines"]):
        pg, box = _box(pos, f"line{i}")
        out["line_items"].append({
            "description": desc, "hsn_sac": hsn, "quantity": q, "uom": None, "rate": r, "discount": 0,
            "taxable_value": taxable, "tax_rate": tax, "cgst": round(taxable * tax / 200, 2),
            "sgst": round(taxable * tax / 200, 2), "igst": 0, "page": pg, "box_2d": box, "confidence": conf,
        })
    out.update(overrides)
    return out


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "samples"
    for k in SAMPLES:
        p = out / f"{k}.pdf"
        render(k, p)
        print(f"wrote {p}  —  total {_fmt(totals(SAMPLES[k])['total'])}")
