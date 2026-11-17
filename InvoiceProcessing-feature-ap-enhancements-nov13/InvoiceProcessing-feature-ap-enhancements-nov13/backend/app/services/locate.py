"""Exact value locations from the PDF's own text layer.

Gemini's ``box_2d`` is an estimate from the page image — usually close, but it
can land a few millimetres off or on a neighbouring value. For digital PDFs the
printed text and its coordinates are in the file, so each extracted value is
searched for as it would be printed, and the hit nearest Gemini's estimate wins
(values such as totals are often printed more than once). Scanned documents
have no text layer and use offline OCR; unmatched estimates are cleared.
"""

import re
from datetime import date

import pymupdf as fitz

from .common import parse_amount, parse_date

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
PAD = 1.5  # points around the text, so the outline does not touch the glyphs


def _indian(n: float, decimals: bool = True) -> str:
    s = f"{abs(n):.2f}" if decimals else f"{abs(round(n)):d}"
    whole, _, frac = s.partition(".")
    if len(whole) > 3:
        head = re.sub(r"(\d)(?=(\d{2})+$)", r"\1,", whole[:-3])
        whole = head + "," + whole[-3:]
    return whole + ("." + frac if frac else "")


def amount_variants(value: str | None) -> list[str]:
    n = abs(parse_amount(value))
    if not n:
        return []
    out = [_indian(n), f"{n:,.2f}", f"{n:.2f}"]
    if n == int(n):
        out += [_indian(n, False), f"{int(n):,}"]
    return list(dict.fromkeys(out))


def date_variants(value: str | None) -> list[str]:
    d = parse_date(value)
    if not isinstance(d, date):
        return []
    m = MONTHS[d.month - 1]
    return list(dict.fromkeys([
        f"{d.day:02d} {m} {d.year}", f"{d.day} {m} {d.year}", f"{d.day:02d}-{m}-{d.year}",
        f"{d.day:02d}/{d.month:02d}/{d.year}", f"{d.day:02d}-{d.month:02d}-{d.year}",
        f"{d.day:02d}.{d.month:02d}.{d.year}", f"{m} {d.day}, {d.year}", d.isoformat(),
        f"{d.month}/{d.day}/{d.year}", f"{d.month:02d}/{d.day:02d}/{d.year}",
    ]))


def text_variants(value: str | None) -> list[str]:
    if not value:
        return []
    first = value.strip().splitlines()[0].strip()
    words = first.split()
    out = [first]
    # Long values wrap on the page; progressively shorter prefixes still land on them.
    for n in (6, 4, 3, 2):
        if len(words) > n:
            out.append(" ".join(words[:n]))
    return [v for v in dict.fromkeys(out) if len(v) >= 2]


# Field key → how its value is printed.
KIND = {
    "subtotal": "amount", "tax": "amount", "total": "amount", "tds": "amount", "netPayable": "amount",
    "date": "date", "dueDate": "date",
}


def _center(r: fitz.Rect) -> tuple[float, float]:
    return ((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)


def _norm(r: fitz.Rect, page: fitz.Page) -> list[float]:
    w, h = page.rect.width, page.rect.height
    return [round(max(0, (r.x0 - PAD) / w), 4), round(max(0, (r.y0 - PAD) / h), 4),
            round(min(1, (r.x1 + PAD) / w), 4), round(min(1, (r.y1 + PAD) / h), 4)]


def _find(doc: fitz.Document, variants: list[str], page_hint: int, bbox_hint: list[float] | None,
          short_ok: bool = False, page_range=None) -> tuple[int, fitz.Rect] | None:
    """Best hit: on the hinted page first, nearest the hinted box; then any page."""
    order = [page_hint - 1] + [i for i in range(doc.page_count) if i != page_hint - 1]
    if page_range:
        order = [i for i in order if page_range[0]-1 <= i < page_range[1]]
    for variant in variants:
        if len(variant) < 3 and not short_ok:
            continue
        for idx in order:
            if not 0 <= idx < doc.page_count:
                continue
            page = doc[idx]
            hits = page.search_for(variant)
            if not hits:
                continue
            if bbox_hint and idx == page_hint - 1:
                w, h = page.rect.width, page.rect.height
                hx, hy = (bbox_hint[0] + bbox_hint[2]) / 2 * w, (bbox_hint[1] + bbox_hint[3]) / 2 * h
                hits.sort(key=lambda r: (_center(r)[0] - hx) ** 2 + (_center(r)[1] - hy) ** 2)
            return idx + 1, hits[0]
    return None


def _row(page: fitz.Page, anchor: fitz.Rect) -> fitz.Rect:
    """Everything printed on the same line as the anchor — the whole table row."""
    row = fitz.Rect(anchor)
    cy = (anchor.y0 + anchor.y1) / 2
    for x0, y0, x1, y1, *_ in page.get_text("words"):
        if y0 - 1 <= cy <= y1 + 1:
            row |= fitz.Rect(x0, y0, x1, y1)
    return row


def _scan_key(text):
    return ''.join(c for c in str(text or '').upper() if c.isalnum())


def _scan_match(page, rows, variants, hint, key):
    hits = []
    for value in variants:
        wanted = _scan_key(value)
        if len(wanted) < (2 if key == 'currency' else 3):
            continue
        for text, score, box in rows:
            actual = _scan_key(text)
            if actual == wanted or (key == 'line' and len(value.split()) >= 3 and wanted in actual):
                hits.append(fitz.Rect(box))
        # Multi-line fields: join only geometrically adjacent rows that together
        # spell the full value. Never fuzzy-match different digits or letters.
        if not hits:
            for text, score, box in rows:
                actual = _scan_key(text)
                if not actual or actual == wanted or not wanted.startswith(actual):
                    continue
                rect = fitz.Rect(box)
                for _ in range(5):
                    candidates = [(t, fitz.Rect(b)) for t, _, b in rows
                                  if b[1] > rect.y1 - 2 and b[1] - rect.y1 < max(12, rect.height)
                                  and abs(b[0] - box[0]) < 20
                                  and wanted.startswith(actual + _scan_key(t))]
                    if len(candidates) != 1:
                        break
                    text, nxt = candidates[0]
                    actual += _scan_key(text)
                    rect |= nxt
                    if actual == wanted:
                        hits.append(rect)
                        break
        if hits:
            break
    if not hits:
        return None
    if key == 'tax':
        labels = [fitz.Rect(b) for t, _, b in rows
                  if re.search(r'tax\s*total|total\s*tax', t, re.I)]
        anchored = [r for r in hits if any(r.x0 >= lab.x1 - 4 and
                    abs(_center(r)[1] - _center(lab)[1]) <= max(r.height, lab.height) * .65
                    for lab in labels)]
        if anchored:
            hits = anchored
    if hint and len(hint) == 4:
        hx, hy = (hint[0]+hint[2])/2*page.rect.width, (hint[1]+hint[3])/2*page.rect.height
        hits.sort(key=lambda r: (_center(r)[0]-hx)**2+(_center(r)[1]-hy)**2)
    elif len(hits) > 1:
        return None
    return hits[0]


def snap(path: str, fields: list[dict], lines: list[dict], page_range=None) -> tuple[dict, dict]:
    """Returns ({field_key: (page, bbox)}, {line_no: (page, bbox)}) for values found in the text layer.

    ``fields``: [{key, value, page, bbox}]; ``lines``: [{line_no, description, page, bbox}].
    Digital text matching retains existing fallbacks. Unverified scan estimates are cleared.
    """
    found_fields: dict[str, tuple[int, list[float] | None]] = {}
    found_lines: dict[int, tuple[int, list[float] | None]] = {}
    try:
        doc = fitz.open(path)
    except Exception:
        return found_fields, found_lines
    with doc:
        scan_rows = {}
        def scanned(page_no):
            return (1 <= page_no <= len(doc) and
                    len(doc[page_no-1].get_text("text").strip()) < 40)
        def rows(page_no):
            if page_no not in scan_rows:
                from .scan_locations import read_page
                scan_rows[page_no] = read_page(doc[page_no-1])
            return scan_rows[page_no]
        def permitted(page_no):
            return 1 <= page_no <= len(doc) and (not page_range or page_range[0] <= page_no <= page_range[1])

        # Banks often share labels/currency in one OCR row (e.g. A/C: ... TZS).
        # Resolve only the exact value span and use account-specific anchors.
        banks = [f for f in fields if f['key'].startswith('bank.') and f.get('value')
                 and permitted(f.get('page') or 1)]
        if banks:
            from .bank_locations import locate as locate_banks
            found_fields.update(locate_banks(doc, banks, scanned, rows, _norm, _scan_match))

        for f in fields:
            page_no = f.get('page') or 1
            if not permitted(page_no):
                found_fields[f['key']] = (page_no, None)
                continue
            if f['key'].startswith('bank.'):
                continue
            if scanned(page_no):
                kind = KIND.get(f['key'], 'text')
                variants = ([f['value']] if f['key'].startswith('bank.') else
                            (amount_variants if kind == 'amount' else date_variants if kind == 'date' else text_variants)(f['value']))
                rect = _scan_match(doc[page_no-1], rows(page_no), variants, f.get('bbox'), f['key'])
                if rect or f.get('bbox') is not None:
                    found_fields[f['key']] = (page_no, _norm(rect, doc[page_no-1]) if rect else None)
                continue
            if f["key"] == "tax":
                from .invoice_tax_evidence import find_total_tax
                total = find_total_tax(path, page_range=page_range)
                if total and abs(parse_amount(f["value"]) - parse_amount(total['value'])) < 0.005:
                    page = doc[total['page'] - 1]
                    y0, x0, y1, x1 = total['box_2d']
                    rect = fitz.Rect(x0/1000*page.rect.width, y0/1000*page.rect.height,
                                     x1/1000*page.rect.width, y1/1000*page.rect.height)
                    found_fields[f['key']] = (total['page'], _norm(rect, page))
                    continue
            kind = KIND.get(f["key"], "text")
            # Bank names/identifiers must match their full value, never a short
            # prefix that can accidentally anchor to a neighbouring account.
            variants = ([f['value']] if f['key'].startswith('bank.') else
                        (amount_variants if kind == "amount" else date_variants if kind == "date" else text_variants)(f["value"]))
            hit = _find(doc, variants, f.get("page") or 1, f.get("bbox"), short_ok=f["key"] == "currency", page_range=page_range)
            if hit:
                page_no, rect = hit
                found_fields[f["key"]] = (page_no, _norm(rect, doc[page_no - 1]))
            elif f['key'].startswith('bank.'):
                found_fields[f['key']] = (page_no, None)

        for ln in lines:
            page_no = ln.get('page') or 1
            if not permitted(page_no):
                found_lines[ln['line_no']] = (page_no, None)
                continue
            if scanned(page_no):
                rect = _scan_match(doc[page_no-1], rows(page_no), text_variants(ln['description']), ln.get('bbox'), 'line')
                if rect:
                    # The matched description anchors its own row only.
                    for _, _, box in rows(page_no):
                        candidate = fitz.Rect(box)
                        if abs(_center(candidate)[1]-_center(rect)[1]) <= min(candidate.height, rect.height)*.5:
                            rect |= candidate
                if rect or ln.get('bbox') is not None:
                    found_lines[ln['line_no']] = (page_no, _norm(rect, doc[page_no-1]) if rect else None)
                continue
            hit = _find(doc, text_variants(ln["description"]), ln.get("page") or 1, ln.get("bbox"), page_range=page_range)
            if hit:
                page_no, rect = hit
                page = doc[page_no - 1]
                found_lines[ln["line_no"]] = (page_no, _norm(_row(page, rect), page))
    return found_fields, found_lines
