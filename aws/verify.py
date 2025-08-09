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
    raw_email = body.get("email", "")
    email = sanitize_email(raw_email)

    logger.info("[verify] request email raw=%s sanitized=%s", raw_email, email)

    if not looks_like_email(email):
        return build_cors_response(event, 200, {
            "exists": False,
            "email_verified": False,
            "phone_verified": False,
            "email": ""
        })

    cognito_client = boto3.client("cognito-idp", region_name=settings.REGION)
    exists, email_is_verified = lookup_email_status(cognito_client, settings.USER_POOL_ID, email)

    response_body = {
        "exists": bool(exists),
        "email_verified": bool(email_is_verified),
        "phone_verified": False,  # phone handled only in authenticated flow
        "email": obfuscate_email(email) if exists else ""
    }

    logger.info(
        "[verify] outcome exists=%s email_verified=%s email=%s",
        response_body["exists"], response_body["email_verified"], response_body["email"]
    )
    return build_cors_response(event, 200, response_body)
