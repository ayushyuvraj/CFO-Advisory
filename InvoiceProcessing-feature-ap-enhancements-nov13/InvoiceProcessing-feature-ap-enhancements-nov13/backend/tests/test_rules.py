from app.services import gst
from app.services.common import inr, parse_amount, parse_date
from app.services.extraction import to_bbox


def test_gstin_checksum_accepts_valid_and_rejects_tampered():
    assert gst.validate_gstin("29AAJCA5567P1ZS")[0]
    assert gst.validate_gstin("27aabcb1234k1zx")[0]  # case-insensitive
    ok, detail = gst.validate_gstin("29AAJCA5567P1ZT")
    assert not ok and "checksum" in detail
    assert not gst.validate_gstin("29AAJCA5567")[0]
    assert not gst.validate_gstin(None)[0]


def test_supply_type_from_gstin_and_place_of_supply():
    assert gst.supply_type("29AAJCA5567P1ZS", "Karnataka (29)", None) == "intra"
    assert gst.supply_type("27AABCB1234K1ZX", None, "29AAACA9988R1ZG") == "inter"
    assert gst.supply_type("27AABCB1234K1ZX", "KA", None) == "inter"
    assert gst.supply_type(None, "Karnataka", None) == "unknown"


def test_tds_follows_the_longest_sac_prefix():
    assert gst.expected_tds([("998311", 802000)]) == ("194J", 10.0, 80200.0)
    assert gst.expected_tds([("73181500", 500000)]) == (None, 0.0, 0.0)
    assert gst.expected_tds([("998311", 1000)]) == (None, 0.0, 0.0)  # below threshold


def test_indian_formatting_and_parsing():
    assert inr(2215201.5) == "₹22,15,201.50"
    assert inr(-80200) == "-₹80,200.00"
    assert parse_amount("₹12,34,567.50") == 1234567.5
    assert parse_amount("(1,000)") == -1000
    assert str(parse_date("04/08/2026")) == "2026-08-04"  # day-first
    assert str(parse_date("2026-08-12")) == "2026-08-12"  # ISO is never day-swapped


def test_gemini_box_conversion():
    assert to_bbox([100, 200, 150, 400]) == [0.2, 0.1, 0.4, 0.15]
    assert to_bbox([]) is None
    assert to_bbox([10, 10, 5, 5]) is None


def test_boxes_snap_to_the_printed_value(tmp_path):
    """Gemini's box is only a hint: the located box must contain the printed value."""
    import pymupdf

    import sample_invoices
    from app.services import locate

    path = tmp_path / "apex.pdf"
    pos = sample_invoices.render("apex", path)
    t = sample_invoices.totals(sample_invoices.SAMPLES["apex"])
    # Hints deliberately a line off, the way a vision model's estimate can be.
    off = [0.60, 0.70, 0.90, 0.72]
    fields = [
        {"key": "total", "value": f"{t['total']:.2f}", "page": 3, "bbox": off},
        {"key": "po", "value": "4500131207", "page": 1, "bbox": off},
        {"key": "date", "value": "2026-08-04", "page": 1, "bbox": None},
    ]
    lines = [{"line_no": 4, "description": "Mild steel channel 100x50 (6m)", "page": 1, "bbox": None}]
    found, found_lines = locate.snap(str(path), fields, lines)

    doc = pymupdf.open(path)
    for key, printed in (("total", "total"), ("po", "po_number"), ("date", "invoice_date")):
        page_no, box = found[key]
        exp_page, exp = pos[printed]
        assert page_no == exp_page
        W, H = doc[page_no - 1].rect.width, doc[page_no - 1].rect.height
        cx, cy = (exp.x0 + exp.x1) / 2 / W, (exp.y0 + exp.y1) / 2 / H
        assert box[0] <= cx <= box[2] and box[1] <= cy <= box[3], (key, box, (cx, cy))
    assert found_lines[4][0] == 1


def test_scans_keep_the_model_boxes(tmp_path):
    import pymupdf

    from app.services import locate

    img = tmp_path / "scan.png"
    pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 60, 60), False)
    pix.save(img)
    assert locate.snap(str(img), [{"key": "po", "value": "4500131207", "page": 1, "bbox": None}], []) == ({}, {})
