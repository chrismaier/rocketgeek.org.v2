# corsheaders.py

import json
from rg_config import settings
from rg_config.headers import get_origin

def build_cors_response(event, status_code, body_dict=None):
    """
    Build a CORS-compliant JSON response based on the incoming Origin header.
    Adds Vary: Origin to prevent caching issues across different origins.
    """
    body_dict = body_dict or {}

    origin = get_origin(event.get("headers", {}), default_origin="https://rocketgeek.org")
    cors_origin = origin if origin in settings.ALLOWED_ORIGINS else "https://rocketgeek.org"

    print(f"[DEBUG] Origin received: {origin}")
    print(f"[DEBUG] CORS origin selected: {cors_origin}")

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin"
        },
        "body": json.dumps(body_dict)
    }
