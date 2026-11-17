"""Indian GST rules: GSTIN and PAN validation, state codes, supply type, TDS."""

import re

from .common import policies

GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

STATE_CODES: dict[str, str] = {
    "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
    "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya",
    "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra",
    "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
    "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana",
    "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory",
}
_NAME_TO_CODE = {v.lower(): k for k, v in STATE_CODES.items()}


def clean_gstin(value: str | None) -> str:
    return re.sub(r"[^0-9A-Z]", "", (value or "").upper())


def gstin_checksum(first14: str) -> str:
    """The GSTIN check character: a Luhn mod-36 variant over the first 14 characters."""
    total = 0
    for i, ch in enumerate(first14):
        product = _CHARS.index(ch) * (1 if i % 2 == 0 else 2)
        total += product // 36 + product % 36
    return _CHARS[(36 - total % 36) % 36]


def validate_gstin(value: str | None) -> tuple[bool, str]:
    g = clean_gstin(value)
    if not g:
        return False, "GSTIN not present on the document"
    if not GSTIN_RE.match(g):
        return False, f"{g} is not a well-formed GSTIN"
    if g[:2] not in STATE_CODES:
        return False, f"{g} carries an unknown state code {g[:2]}"
    if gstin_checksum(g[:14]) != g[14]:
        return False, f"{g} fails the GSTIN checksum"
    return True, f"{g} is well-formed and the checksum verifies ({STATE_CODES[g[:2]]})"


def pan_from_gstin(gstin: str | None) -> str | None:
    g = clean_gstin(gstin)
    return g[2:12] if len(g) == 15 else None


def state_code(value: str | None) -> str | None:
    """Resolves a GSTIN, a 'Karnataka (29)' style label, a code or a state name."""
    if not value:
        return None
    s = value.strip()
    g = clean_gstin(s)
    if len(g) == 15 and g[:2] in STATE_CODES:
        return g[:2]
    zoho = {v: k for k, v in ZOHO_STATE.items()}.get(s.upper())
    if zoho:
        return zoho
    m = re.search(r"\b(\d{2})\b", s)
    if m and m.group(1) in STATE_CODES:
        return m.group(1)
    name = re.sub(r"\(.*?\)", "", s).strip().lower()
    return _NAME_TO_CODE.get(name)


def supply_type(vendor_gstin: str | None, place_of_supply: str | None, buyer_gstin: str | None) -> str:
    """'intra' (CGST+SGST) when supplier state equals place of supply, else 'inter' (IGST)."""
    supplier = state_code(vendor_gstin)
    pos = state_code(place_of_supply) or state_code(buyer_gstin)
    if not supplier or not pos:
        return "unknown"
    return "intra" if supplier == pos else "inter"


def is_sac(code: str | None) -> bool:
    return bool(code) and str(code).startswith("99")


def valid_hsn_sac(code: str | None) -> bool:
    return bool(code) and bool(re.fullmatch(r"\d{4}|\d{6}|\d{8}", str(code)))


def expected_tds(lines: list[tuple[str | None, float]]) -> tuple[str | None, float, float]:
    """(section, rate %, amount) for service lines, by longest SAC-prefix rule.

    ``lines`` is a list of (hsn_sac, taxable_value). TDS is computed on the
    taxable value excluding GST.
    """
    pol = policies()["tds"]
    rules = sorted(pol["rules"], key=lambda r: -len(r["sac_prefix"]))
    section, rate, base = None, 0.0, 0.0
    total = sum(t for _, t in lines)
    services = sum(t for code, t in lines if is_sac(code))
    if not total or services / total < pol.get("min_service_share", 0):
        return None, 0.0, 0.0
    for code, taxable in lines:
        if not is_sac(code):
            continue
        rule = next((r for r in rules if str(code).startswith(r["sac_prefix"])), None)
        if rule:
            section, rate = rule["section"], float(rule["rate"])
            base += taxable
    if not section or base < pol["threshold_single"]:
        return None, 0.0, 0.0
    return section, rate, round(base * rate / 100, 2)


# GST state code → the two-letter code Zoho Books uses for place of supply.
ZOHO_STATE: dict[str, str] = {
    "01": "JK", "02": "HP", "03": "PB", "04": "CH", "05": "UK", "06": "HR", "07": "DL", "08": "RJ",
    "09": "UP", "10": "BR", "11": "SK", "12": "AR", "13": "NL", "14": "MN", "15": "MZ", "16": "TR",
    "17": "ML", "18": "AS", "19": "WB", "20": "JH", "21": "OD", "22": "CG", "23": "MP", "24": "GJ",
    "26": "DN", "27": "MH", "29": "KA", "30": "GA", "31": "LD", "32": "KL", "33": "TN", "34": "PY",
    "35": "AN", "36": "TS", "37": "AP", "38": "LA",
}


def zoho_state(value: str | None) -> str | None:
    code = state_code(value)
    return ZOHO_STATE.get(code) if code else None
