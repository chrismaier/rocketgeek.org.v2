# privacy.py
"""
privacy.py - Privacy helpers for obfuscating user identifiers.
Part of rg_config shared Lambda layer.
"""

def obfuscate_email(email: str) -> str:
    """
    Obfuscate an email address to reduce data leakage in unauthenticated flows.
    Examples:
      "john.doe@example.com" -> "j***@e***.com"
      "a@b.co"               -> "a***@b***.co"
    If input is malformed, returns an empty string.
    """
    if not isinstance(email, str):
        return ""
    email = email.strip()
    if "@" not in email:
        return ""

    local, domain = email.split("@", 1)
    if not local or not domain:
        return ""

    # Mask local: keep first char if available, then ***
    local_mask = (local[:1] + "***") if local else "***"

    # Split domain into main + tld (handles multi-char TLDs; if no dot, just mask main)
    main, sep, tld = domain.rpartition(".")
    if sep:
        domain_mask = (main[:1] + "***") if main else "***"
        return f"{local_mask}@{domain_mask}.{tld}"
    else:
        domain_mask = (domain[:1] + "***") if domain else "***"
        return f"{local_mask}@{domain_mask}"
