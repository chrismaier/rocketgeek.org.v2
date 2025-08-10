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

def get_bearer_access_token(event: dict) -> str:
    """
    Extract the OAuth Bearer token from the Authorization header.
    We expect an **ACCESS token** for Cognito's user attribute APIs.
    """
    headers = event.get("headers") or {}
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if not auth.lower().startswith("bearer "):
        return ""
    return auth.split(" ", 1)[1].strip()

def attribute_for_channel(channel: str) -> str:
    """
    Map frontend channel to Cognito attribute names.
    Frontend should send channel 'email' or 'phone' (not 'sms').
    """
    c = (channel or "").lower()
    if c in ("phone", "sms", "phone_number"):
        return "phone_number"
    return "email"


def parse_json_body(event: dict) -> dict:
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

def lookup_email_status(cognito_client, user_pool_id: str, email: str):
    try:
        response = cognito_client.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = "{email}"',
            Limit=1,
        )
        users = response.get("Users") or []
        if not users:
            return False, False
        attributes = {a.get("Name"): a.get("Value") for a in users[0].get("Attributes", [])}
        email_verified = (attributes.get("email_verified", "false").lower() == "true")
        return True, email_verified
    except ClientError as error:
        logger.error("Cognito ListUsers error: %s", error, exc_info=True)
        return False, False
    except Exception as error:
        logger.error("Unexpected lookup error: %s", error, exc_info=True)
        return False, False

def lambda_handler(event, context):
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
    action = (body.get("action") or "preflight").lower()
    channel = (body.get("channel") or "email").lower()

    raw_email = body.get("email", "")
    email = sanitize_email(raw_email)

    logger.info("[verify] request action=%s channel=%s email raw=%s sanitized=%s",
                action, channel, raw_email, email)

    cognito_client = boto3.client("cognito-idp", region_name=settings.REGION)

    # ----- ACTION: PREFLIGHT  (no auth required) -----
    if action == "preflight":
        if not looks_like_email(email):
            return build_cors_response(event, 200, {
                "exists": False,
                "email_verified": False,
                "phone_verified": False,
                "email": ""
            })
        exists, email_is_verified = lookup_email_status(cognito_client, settings.USER_POOL_ID, email)
        response_body = {
            "exists": bool(exists),
            "email_verified": bool(email_is_verified),
            "phone_verified": False,  # we only compute this in authenticated flows
            "email": obfuscate_email(email) if exists else ""
        }
        logger.info("[verify] outcome exists=%s email_verified=%s email=%s",
                    response_body["exists"], response_body["email_verified"], response_body["email"])
        return build_cors_response(event, 200, response_body)

    # For all other actions we require an ACCESS token
    access_token = get_bearer_access_token(event)
    if not access_token:
        return build_cors_response(event, 401, {"error": "missing or invalid Authorization bearer token"})

    attr_name = attribute_for_channel(channel)

    # ----- ACTION: SEND (email or phone) -----
    if action == "send":
        try:
            # Send verification code for the attribute of the **signed-in user**
            cognito_client.get_user_attribute_verification_code(
                AccessToken=access_token,
                AttributeName=attr_name
            )
            # You may choose to return masked values only
            return build_cors_response(event, 200, {"sent": True})
        except ClientError as e:
            logger.error("get_user_attribute_verification_code error: %s", e, exc_info=True)
            code = (e.response.get("Error") or {}).get("Code")
            # Optional: include throttling hint
            if code in ("LimitExceededException", "TooManyRequestsException"):
                return build_cors_response(event, 429, {"sent": False, "throttled": True})
            return build_cors_response(event, 400, {"sent": False, "error": code or "send_failed"})

    # ----- ACTION: CONFIRM (email or phone) -----
    if action == "confirm":
        code = (body.get("code") or "").strip()
        if not code:
            return build_cors_response(event, 400, {"confirmed": False, "error": "missing_code"})
        try:
            cognito_client.verify_user_attribute(
                AccessToken=access_token,
                AttributeName=attr_name,
                Code=code
            )
            # After successful verify, re-check state for a consistent response
            # For email we can reflect verified; for phone we leave preflight as unauthenticated only
            email_ok = looks_like_email(email)
            exists, email_is_verified = (False, False)
            if email_ok:
                exists, email_is_verified = lookup_email_status(cognito_client, settings.USER_POOL_ID, email)

            return build_cors_response(event, 200, {
                "confirmed": True,
                "email_verified": bool(email_is_verified),
                "phone_verified": (attr_name == "phone_number")  # we just verified it
            })
        except ClientError as e:
            logger.error("verify_user_attribute error: %s", e, exc_info=True)
            code = (e.response.get("Error") or {}).get("Code")
            return build_cors_response(event, 400, {"confirmed": False, "error": code or "confirm_failed"})

    # ----- Unknown action -----
    return build_cors_response(event, 400, {"error": f"unsupported action: {action}"})
