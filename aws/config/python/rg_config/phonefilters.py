# phonefilters.py
"""
phonefilters.py - Phone number sanitization and validation helpers.
Part of rg_config shared Lambda layer.
"""

import re

def sanitize_phone(value: str) -> str:
    """
    Keep only digits and a single leading '+' if present.
    Strips spaces, dashes, parentheses, and other punctuation.
    """
    if not isinstance(value, str):
        return ""
    v = value.strip()
    # Keep first '+' if it's the first character, drop all others
    has_plus = v.startswith("+")
    digits = re.sub(r"\D", "", v)
    return ("+" if has_plus else "") + digits

def looks_like_phone(value: str) -> bool:
    """
    Lightweight plausibility check:
    7–15 digits after sanitization (E.164 allows up to 15 digits).
    """
    if not value:
        return False
    v = sanitize_phone(value)
    d = v[1:] if v.startswith("+") else v
    return 7 <= len(d) <= 15

def normalize_phone_e164(value: str, default_country: str = "US") -> str:
    """
    Best-effort normalization to E.164 without external libraries.
    Rules:
      - If the sanitized value starts with '+', return '+' plus up to 15 digits.
      - If not and default_country == 'US':
          * If 11 digits and starts with '1', treat as country code +1.
          * If 10 digits, prepend '+1'.
          * Otherwise, return empty string (unable to confidently normalize).
      - For other countries without explicit rules here, return empty string to avoid bad assumptions.
    """
    if not value:
        return ""
    v = sanitize_phone(value)
    digits = v[1:] if v.startswith("+") else v

    if v.startswith("+"):
        # Trim to 15 digits max
        if 1 <= len(digits) <= 15:
            return "+" + digits
        return ""

    if default_country.upper() == "US":
        if len(digits) == 11 and digits.startswith("1"):
            return "+" + digits
        if len(digits) == 10:
            return "+1" + digits
        return ""

    # Unknown default country handling could be added later
    return ""
