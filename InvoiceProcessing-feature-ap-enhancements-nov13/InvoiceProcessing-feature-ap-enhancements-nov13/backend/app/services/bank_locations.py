"""Exact bank value spans inside OCR rows; keep adjacent accounts separate."""
import pymupdf as fitz


def normalized(text):
    return ''.join(c for c in str(text or '').upper() if c.isalnum())


def value_rects(characters, value, identifier=False):
    """Match complete characters, never fuzzy-match or repair account digits."""
    actual, mapping = [], []
    for char, score, box in characters:
        for c in normalized(char):
            actual.append(c)
            mapping.append((float(score), fitz.Rect(box)))
    actual = ''.join(actual)
    wanted = normalized(value)
    if not wanted or len(wanted) < 2:
        return []
    hits, start = [], 0
    while (start := actual.find(wanted, start)) >= 0:
        end = start+len(wanted)
        # A substring of a longer account identifier is not evidence.
        numeric = wanted.isdigit()
        before, after = actual[start-1:start] if start else '', actual[end:end+1]
        unsafe = numeric and (before.isdigit() or after.isdigit())
        if not unsafe and (not identifier or not (before.isdigit() or after.isdigit())):
            selected = mapping[start:end]
            if sum(s for s, _ in selected)/len(selected) >= .90:
                rect = fitz.Rect(selected[0][1])
                for _, box in selected[1:]:
                    rect |= box
                hits.append(rect)
        start += 1
    return hits


def locate(doc, fields, scanned, rows, norm, multiline=None):
    """Resolve all bank fields together so repeated branch/currency uses its account."""
    from .scan_locations import read_row_characters
    candidates, character_cache = {}, {}
    for field in fields:
        page_no, value = field['page'], field['value']
        page = doc[page_no-1]
        if scanned(page_no):
            hits = []
            wanted = normalized(value)
            for text, _, box in rows(page_no):
                if wanted not in normalized(text):
                    continue
                cache_key = (page_no, tuple(box))
                if cache_key not in character_cache:
                    character_cache[cache_key] = read_row_characters(page, box)
                hits.extend(value_rects(character_cache[cache_key], value,
                            field['key'].endswith(('.account_number', '.iban', '.swift_bic', '.ifsc'))))
            # Remove identical detector results before ambiguity handling.
            unique = {}
            for hit in hits:
                unique[tuple(round(n, 1) for n in hit)] = hit
            hits = list(unique.values())
            if not hits and multiline:
                # Preserve the existing exact multi-line value matcher.
                matched = multiline(page, rows(page_no), [value], field.get('bbox'), field['key'])
                if matched:
                    hits = [matched]
        else:
            # Text search uses unrotated PDF coordinates; the viewer displays
            # the rotated page image, as does the scan OCR path above.
            hits = [hit*page.rotation_matrix for hit in page.search_for(value)]
        candidates[field['key']] = hits

    anchors = {}
    priority = {'account_number': 4, 'iban': 3, 'bank_name': 2, 'swift_bic': 1}
    for field in fields:
        key = field['key']
        hits = candidates[key]
        group, name = key.rsplit('.', 1)
        rank = priority.get(name, 0)
        if rank and len(hits) == 1 and rank > anchors.get(group, (0,))[0]:
            anchors[group] = (rank, field['page'], hits[0])

    found = {}
    for field in fields:
        key, page_no = field['key'], field['page']
        hits = candidates[key]
        anchor = anchors.get(key.rsplit('.', 1)[0])
        hint = field.get('bbox')
        if len(hits) > 1:
            if anchor and anchor[1] == page_no:
                target = anchor[2]
            elif hint and len(hint) == 4:
                page = doc[page_no-1]
                target = fitz.Rect(hint[0]*page.rect.width, hint[1]*page.rect.height,
                                   hint[2]*page.rect.width, hint[3]*page.rect.height)
            else:
                found[key] = (page_no, None)
                continue
            distance = lambda r: ((r.x0+r.x1-target.x0-target.x1)**2 +
                                  (r.y0+r.y1-target.y0-target.y1)**2)
            hits.sort(key=distance)
            if abs(distance(hits[0])-distance(hits[1])) < 1:
                found[key] = (page_no, None)
                continue
        found[key] = (page_no, norm(hits[0], doc[page_no-1]) if hits else None)
    return found
