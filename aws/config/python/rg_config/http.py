# http.py
"""
http.py - Common HTTP helpers for Lambda functions.
Part of rg_config shared Lambda layer.
"""

import json
import base64

from rg_config.headers import get_origin
from rg_config.corsheaders import build_cors_response


def parse_json_body(event):
    """
    Safely parse JSON body from API Gateway event.
    Handles base64-encoded bodies if isBase64Encoded is True.

    Args:
        event (dict): Lambda event object

    Returns:
        dict: Parsed JSON object, or {} if parsing fails.
    """
    body = event.get("body")
    if body is None:
        return {}
    if event.get("isBase64Encoded"):
        try:
            body = base64.b64decode(body).decode("utf-8", errors="replace")
        except Exception:
            return {}
    try:
        return json.loads(body)
    except Exception:
        return {}


def get_http_method(event):
    """
    Return the HTTP method from an API Gateway (HTTP or REST) event.
    """
    return (
            event.get("requestContext", {}).get("http", {}).get("method")
            or event.get("httpMethod")
            or ""
    ).upper()


def cors_response(event, status_code, body_dict=None):
    """
    Shortcut to build a CORS-enabled JSON response.
    """
    return build_cors_response(event, status_code, body_dict or {})


def get_request_origin(event, default_origin="https://rocketgeek.org"):
    """
    Shortcut to extract origin from a Lambda event's headers.
    """
    return get_origin(event.get("headers", {}), default_origin=default_origin)
