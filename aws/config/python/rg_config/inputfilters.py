# inputfilters.py
"""
inputfilters.py - Reusable input sanitization and validation helpers.
Part of rg_config shared Lambda layer.
"""

import re

def sanitize_email(value: str) -> str:
    """
    Strip spaces, lowercase, and remove characters that never belong in emails:
    quotes, backticks, angle brackets, and whitespace.
    """
    if not isinstance(value, str):
        return ""
    v = value.strip().lower()
    return re.sub(r'[\'\"`<>\\s]', '', v)

def looks_like_email(value: str) -> bool:
    """
    Lightweight format check. Final authority remains with the IdP.
    Accepts most normal emails without overfitting.
    """
    if not value:
        return False
    return bool(re.match(r'^[^@]+@[^@]+\.[^@]+$', value))
