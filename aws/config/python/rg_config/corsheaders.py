# cors-headers.py

from rg_config import settings
from rg_config.headers import normalize_headers
import json


def build_cors_response(event, status_code, body_dict=None):
    """
    Build a CORS-compliant JSON response based on the incoming Origin header.
    """
    body_dict = body_dict or {}
    headers_in = normalize_headers(event.get("headers", {}))
    origin = headers_in.get("origin", "https://rocketgeek.org")
    cors_origin = origin if origin in settings.ALLOWED_ORIGINS else "https://rocketgeek.org"

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        "body": json.dumps(body_dict)
    }

