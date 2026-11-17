"""Dynamic, evidence-linked supplier accounts. Never used to choose/pay a bank."""
import math
import re

FIELDS = (
    ('bank_name', 'Bank Name'), ('account_holder', 'Account Holder'),
    ('account_number', 'Account Number'), ('branch', 'Branch'),
    ('swift_bic', 'SWIFT/BIC'), ('ifsc', 'IFSC'), ('iban', 'IBAN'),
    ('currency', 'Currency'),
)
KEY = re.compile(r'^bank\.(\d+)\.([a-z_]+)$')


def account_fields(accounts, pages, context=None):
    """Yield existing InvoiceField-compatible rows; reject out-of-context evidence.

    Keep records in printed order. Do not deduplicate by bank name: one bank may
    have several accounts. Model instructions handle repeated page copies.
    """
    from .extraction import to_bbox
    if not isinstance(accounts, list):
        return
    start, end = (context['startPage'], context['endPage']) if context else (1, pages)
    index = 0
    seen = set()
    for account in accounts:
        if not isinstance(account, dict):
            continue
        rows = []
        for name, label in FIELDS:
            item = account.get(name)
            item = item if isinstance(item, dict) else {}
            value = item.get('value')
            # Never coerce numeric bank identifiers: leading zeros may be lost.
            value = value.strip() if isinstance(value, str) and value.strip() else None
            try:
                page = int(item.get('page') or start)
            except (TypeError, ValueError):
                page = start
            if value and not start <= page <= end:
                raise ValueError('Bank field source is outside the selected invoice pages')
            try:
                confidence = float(item.get('confidence') or 0)
            except (TypeError, ValueError):
                confidence = 0
            confidence = max(0, min(1, confidence)) if math.isfinite(confidence) and value else 0
            box = item.get('box_2d')
            valid = (isinstance(box, list) and len(box) == 4 and
                     all(isinstance(n, (int, float)) and math.isfinite(n) and 0 <= n <= 1000 for n in box)
                     and box[0] < box[2] and box[1] < box[3])
            rows.append(dict(label=label, value=value, original_value=value,
                             confidence=confidence, model_confidence=confidence,
                             page=page if value else start, bbox=to_bbox(box) if valid and value else None))
        if not any(row['value'] for row in rows):
            continue
        # Collapse exact repeated account blocks only when an account identifier
        # exists. Never collapse different accounts merely sharing a bank name.
        signature = tuple(row['value'] for row in rows)
        if rows[2]['value'] or rows[6]['value']:
            if signature in seen:
                continue
            seen.add(signature)
        index += 1
        for (name, _), row in zip(FIELDS, rows):
            yield dict(key=f'bank.{index}.{name}', **row)


def bank_accounts(fields):
    groups = {}
    for field in fields:
        match = KEY.fullmatch(field.key)
        if not match or match[2] not in dict(FIELDS):
            continue
        index = int(match[1])
        groups.setdefault(index, []).append(dict(
            key=field.key, label=field.label, value=field.value,
            confidence=round((field.confidence or 0)*100, 1),
            page=field.page, bbox=field.bbox))
    order = dict((name, i) for i, (name, _) in enumerate(FIELDS))
    return [dict(id=f'bank.{index}', fields=sorted(rows, key=lambda f: order[f['key'].split('.')[-1]]))
            for index, rows in sorted(groups.items())]
