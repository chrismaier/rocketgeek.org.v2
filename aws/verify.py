# verify.py

import json
import logging
import base64
import boto3
from botocore.exceptions import ClientError

from rg_config import settings
from rg_config.corsheaders import build_cors_response
from rg_config.inputfilters import sanitize_email, looks_like_email
from rg_config.privacy import obfuscate_email

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def parse_json_body(event: dict) -> dict:
    """Parse JSON body from API Gateway event, handling base64 if needed."""
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


def lookup_email_status(cognito, user_pool_id: str, email: str) -> tuple[bool, bool]:
    """
    Returns (exists, email_verified) for the email in the given Cognito User Pool.
    Uses ListUsers with a filter on email. Any error returns (False, False).
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
        logger.error("Unexpected lookup error: %s", e, exc_info=True)
        return False, False


def handler(event, context):
    """
    POST /verify
    Body: { "email": "user@domain.com" }
    Always returns 200 with minimal, enumeration-aware payload:
    { "exists": bool, "email_verified": bool, "email": obfuscated-or-empty }
    """
    method = (
            event.get("requestContext", {}).get("http", {}).get("method")
            or event.get("httpMethod")
            or ""
    ).upper()

    if method == "OPTIONS":
        return build_cors_response(event, 204, {})

    if method != "POST":
        return build_cors_response(event, 405, {"error": "method not allowed"})

    body = parse_json_body(event)
    raw_email = body.get("email", "")
    email = sanitize_email(raw_email)

    logger.info("Verify request received. raw_email=%s sanitized=%s", raw_email, email)

    # For invalid email shapes, return a generic non-enumerating response
    if not looks_like_email(email):
        return build_cors_response(event, 200, {
            "exists": False,
            "email_verified": False,
            "email": ""
        })

    cognito = boto3.client("cognito-idp", region_name=settings.REGION)
    exists, is_verified = lookup_email_status(cognito, settings.USER_POOL_ID, email)

    resp = {
        "exists": bool(exists),
        "email_verified": bool(is_verified),
        "email": obfuscate_email(email) if exists else "",
    }

    logger.info(
        "Verify outcome: exists=%s email_verified=%s email=%s",
        resp["exists"], resp["email_verified"], resp["email"]
    )

    return build_cors_response(event, 200, resp)
