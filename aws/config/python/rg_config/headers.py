"""
headers.py - Utility functions for HTTP header normalization and origin extraction.
Part of rg_config shared Lambda layer.
"""

def normalize_headers(headers):
    """
    Normalize all incoming HTTP header keys to lowercase.

    Args:
        headers (dict): Incoming headers from event.get("headers")

    Returns:
        dict: A new dictionary with all keys lowercased
    """
    return {k.lower(): v for k, v in headers.items()} if headers else {}


def get_origin(headers, default_origin="https://rocketgeek.org"):
    """
    Return the requester origin using normalized headers.
    Prefers 'origin', falls back to 'referer', otherwise default_origin.

    Args:
        headers (dict): Incoming headers from event.get("headers")
        default_origin (str): Fallback origin to use if none found

    Returns:
        str: The best-origin string
    """
    h = normalize_headers(headers or {})
    return h.get("origin") or h.get("referer") or default_origin
