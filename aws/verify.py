# verify.py

import json
import logging
import re
import boto3
from botocore.exceptions import ClientError

# START: shared config & CORS helper
from rg_config.constants import (
    USER_POOL_ID,
    REGION,
    ALLOWED_ORIGINS,  # imported for completeness; build_cors_response uses it
)
from rg_config.corsheaders import build_cors_response
# END

# START: logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)
# END


# START: utilities
def flatten_headers_lower(headers: dict | None) -> dict:
    if not headers:
        return {}
    return {str(k).lower(): v for k, v in headers.items()}

def ok(status_code: int, body: dict, origin: str):
    return build_cors_response(status_code=status_code, body=body, origin=origin)

def parse_json_body(event: dict) -> dict:
    body = event.get("body")
    if body is None:
        return {}
    if event.get("isBase64Encoded"):
        import base64
        try:
            body = base64.b64decode(body).decode("utf-8", errors="replace")
        except Exception:
            return {}
    try:
        return json.loads(body)
    except Exception:
        return {}

def sanitize_email(value: str) -> str:
    if not isinstance(value, str):
        return ""
    v = value.strip().lower()
    v = re.sub(r"[\'\"`\s<>]", "", v)
    return v

def looks_like_email(value: str) -> bool:
    if not value:
        return False
    return bool(re.match(r"^[^@]+@[^@]+\.[^@]+$", value))

def obfuscate_email(email: str) -> str:
    try:
        local, domain = email.split("@", 1)
    except ValueError:
        return ""
    local_mask = (local[:1] + "***") if local else "***"
    dm, sep, tld = domain.rpartition(".")
    domain_mask = (dm[:1] + "***") if dm else "***"
    return f"{local_mask}@{domain_mask}{sep}{tld}" if sep else f"{local_mask}@{domain_mask}"
# END: utilities


# START: core lookup
def lookup_email_status(cognito, user_pool_id: str, email: str) -> tuple[bool, bool]:
    """
    Returns (exists, email_verified) for the provided email in the given User Pool.
    Uses ListUsers with a filter on email. Any error returns (False, False) to avoid leakage.
    """
    try:
        resp = cognito.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = "{email}"',
            Limit=1,
        )
        users = resp.get("Users") or []
        if not users:
            return False, False

        attrs = {a.get("Name"): a.get("Value") for a in users[0].get("Attributes", [])}
        email_verified = (attrs.get("email_verified", "false").lower() == "true")
        return True, email_verified

    except ClientError as e:
        logger.error("Cognito ListUsers client error: %s", e, exc_info=True)
        return False, False
    except Exception as e:
        logger.error("Unexpected error during lookup: %s", e, exc_info=True)
        return False, False
# END: core lookup


# START: Lambda handler
def handler(event, context):
    """
    POST /verify
    Body: { "email": "user@domain.com" }

    Response (always 200):
    {
      "exists": true|false,
      "email_verified": true|false,
      "email": "<obfuscated or empty>"
    }
    """
    headers = flatten_headers_lower(event.get("headers") or {})
    origin = headers.get("origin") or headers.get("referer") or ""

    http_method = (
            event.get("requestContext", {}).get("http", {}).get("method")
            or event.get("httpMethod")
            or ""
    ).upper()

    if http_method == "OPTIONS":
        return ok(204, {}, origin)

    if http_method != "POST":
        return ok(405, {"error": "method not allowed"}, origin)

    body = parse_json_body(event)
    raw_email = body.get("email", "")
    email = sanitize_email(raw_email)

    logger.info("Verify request received. raw_email=%s sanitized=%s", raw_email, email)

    # Do not disclose format errors via status codes; keep response uniform
    if not looks_like_email(email):
        return ok(
            200,
            {"exists": False, "email_verified": False, "email": ""},
            origin,
        )

    cognito = boto3.client("cognito-idp", region_name=REGION)
    exists, is_verified = lookup_email_status(cognito, USER_POOL_ID, email)

    response = {
        "exists": bool(exists),
        "email_verified": bool(is_verified),
        "email": obfuscate_email(email) if exists else "",
    }

    logger.info(
        "Verify outcome: exists=%s email_verified=%s email=%s",
        response["exists"],
        response["email_verified"],
        response["email"],
    )

    return ok(200, response, origin)
# END: Lambda handler
