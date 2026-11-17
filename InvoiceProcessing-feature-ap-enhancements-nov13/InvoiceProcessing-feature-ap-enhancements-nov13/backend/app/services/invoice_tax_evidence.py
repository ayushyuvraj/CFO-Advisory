"""Explicit invoice-total tax evidence; no supplier-master or posting overrides."""
import re
import pymupdf as fitz

from .common import parse_amount

TOTAL_LABELS = ('TAX TOTAL', 'TOTAL TAX', 'GST TOTAL', 'TOTAL GST', 'VAT TOTAL', 'TOTAL VAT')


def find_total_tax(path, page_range=None):
    """Locate a printed invoice-total tax amount on the same row as its label.

    Conservative digital-PDF fallback: scans and unrecognized layouts keep the
    model's reading. Rates/components such as VAT 18% are not total-tax labels.
    """
    try:
        with fitz.open(path) as doc:
            for label in TOTAL_LABELS:
                for number, page in enumerate(doc, 1):
                    if page_range and not page_range[0] <= number <= page_range[1]:
                        continue
                    for anchor in page.search_for(label):
                        cy = (anchor.y0 + anchor.y1) / 2
                        words = [w for w in page.get_text('words')
                                 if w[0] >= anchor.x1 - 1 and w[1] - 1 <= cy <= w[3] + 1]
                        for word in sorted(words, key=lambda w: w[0]):
                            token = word[4].strip()
                            if not re.fullmatch(r'-?\d[\d,]*\.\d{2}', token):
                                continue
                            value = parse_amount(token)
                            return {'value': f'{value:.2f}', 'confidence': 0.99, 'page': number,
                                    'box_2d': [round(word[1]/page.rect.height*1000),
                                               round(word[0]/page.rect.width*1000),
                                               round(word[3]/page.rect.height*1000),
                                               round(word[2]/page.rect.width*1000)]}
    except Exception:
        return None
    return None


def anchor_total_tax(path, result, page_range=None):
    total = find_total_tax(path, page_range=page_range)
    if total is not None:
        result = dict(result)
        result['total_tax'] = total
    return result


def is_foreign_tax_document(inv):
    return ((inv.currency or 'INR') != 'INR' and not inv.vendor_gstin
            and any(f.key in ('tinNumber', 'vatNo') and f.value for f in inv.fields))


def foreign_tax_check(inv, tolerance, make_check, adjust):
    """Arithmetic review only. Does not certify foreign tax-law compliance."""
    issues = []
    printed = next((f for f in inv.fields if f.key == 'tax'), None)
    if printed is None or printed.value is None:
        return make_check('gst', 'Invoice tax total checked', 'warn',
                          'No invoice-level total tax amount was extracted; review the source document')
    inv.tax_total = parse_amount(printed.value)
    if any((inv.cgst, inv.sgst, inv.igst)):
        issues.append('Indian GST components are present on a TIN/VAT invoice without GSTIN; review the source')
    if abs(inv.subtotal + inv.tax_total + inv.round_off - inv.total) > max(tolerance, 1):
        issues.append('Taxable value plus total tax does not equal the printed invoice total')
    for key in ('subtotal', 'tax', 'total'):
        adjust(inv, key, not issues)
    return make_check('gst', 'Invoice tax total checked', 'fail' if issues else 'pass',
                      '; '.join(issues) if issues else
                      'Printed total tax reconciles with invoice totals; foreign tax registration and statutory compliance are not verified',
                      'Tax mismatch' if issues else None)
