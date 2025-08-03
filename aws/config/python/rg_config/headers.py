"""
headers.py - Utility functions for HTTP header normalization.
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

