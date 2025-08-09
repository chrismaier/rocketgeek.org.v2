# phonefilters.py
"""
phonefilters.py - Phone number sanitization and validation helpers.
Part of rg_config shared Lambda layer.

Goals for this module:
- No regex usage (explicit, one-change-per-line where applicable).
- Clear, meaningful variable names (no single-letter names).
- Backward compatibility: looks_like_phone() wraps validPhoneNumber().
"""

from typing import Tuple
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# --------------------------------------------------------------------
# START: Sanitization
# --------------------------------------------------------------------
def sanitize_phone(value: str) -> str:
    """
    Keep only digits and (optionally) a single leading '+' if present
    as the very first character. Strip spaces, dashes, parentheses,
    and other punctuation explicitly.

    Returns a string like "+15551234567" or "5551234567".
    """
    if not isinstance(value, str):
        return ""

    original_input = value
    trimmed_input = value.strip()

    # Record whether the very first character is a plus.
    leading_plus = trimmed_input.startswith("+")

    # Build the digit-only string explicitly (no regex).
    digits_only = []
    for char in trimmed_input:
        if char.isdigit():
            digits_only.append(char)
        # All other characters are ignored (spaces, dashes, (), etc.)

    sanitized_digits = "".join(digits_only)

    # Reattach a single leading '+' if it was the first char originally.
    sanitized_phone = ("+" if leading_plus else "") + sanitized_digits

    logger.info(
        "[phonefilters] sanitize_phone raw=%s sanitized=%s",
        original_input,
        sanitized_phone
    )
    return sanitized_phone
# --------------------------------------------------------------------
# END: Sanitization
# --------------------------------------------------------------------


# --------------------------------------------------------------------
# START: Validation (no regex)
# --------------------------------------------------------------------
def validPhoneNumber(value: str) -> bool:
    """
    Lightweight plausibility check without regex.

    Rules:
      - After sanitization, the number must be digits with an optional single leading '+'.
      - Count only the digits (exclude a leading '+').
      - Digit count must be between 7 and 15 (inclusive), per common E.164 limits.
    """
    if not isinstance(value, str):
        return False

    sanitized_phone = sanitize_phone(value)

    if not sanitized_phone:
        return False

    # Extract digits (ignore the plus if present)
    digits_part = sanitized_phone[1:] if sanitized_phone.startswith("+") else sanitized_phone

    # All characters in digits_part must be digits (defensive double-check)
    if not digits_part.isdigit():
        return False

    digit_count = len(digits_part)
    if digit_count < 7 or digit_count > 15:
        return False

    return True


def looks_like_phone(value: str) -> bool:
    """
    Backward-compatibility wrapper.
    Calls validPhoneNumber() so older code continues to work unchanged.
    """
    return validPhoneNumber(value)
# --------------------------------------------------------------------
# END: Validation (no regex)
# --------------------------------------------------------------------


# --------------------------------------------------------------------
# START: Normalization to E.164 (no regex)
# --------------------------------------------------------------------
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
    if not isinstance(value, str):
        return ""

    sanitized_phone = sanitize_phone(value)
    digits_part = sanitized_phone[1:] if sanitized_phone.startswith("+") else sanitized_phone

    # If already has a leading plus, validate length and return as-is (up to 15 digits)
    if sanitized_phone.startswith("+"):
        if 1 <= len(digits_part) <= 15 and digits_part.isdigit():
            return "+" + digits_part
        return ""

    # Country-specific default handling (US only for now)
    if default_country.upper() == "US":
        if not digits_part.isdigit():
            return ""

        if len(digits_part) == 11 and digits_part.startswith("1"):
            # Already includes country code
            return "+" + digits_part

        if len(digits_part) == 10:
            # Add US country code
            return "+1" + digits_part

        # Anything else is too ambiguous to normalize safely
        return ""

    # Unknown default country handling not implemented to avoid mistakes
    return ""
# --------------------------------------------------------------------
# END: Normalization to E.164 (no regex)
# --------------------------------------------------------------------
