# ===============================
# Lambda Function: authentication-check
# ===============================

import json
import logging
import time
import urllib.request
from jose import jwk, jwt
from jose.utils import base64url_decode

# START: Configure logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)
# END: Configure logger

# START: Configuration constants
USER_POOL_ID = "us-east-1_5j4lDdV1A"
APP_CLIENT_ID = "2mnmesf3f1olrit42g2oepmiak"
REGION = "us-east-1"
JWKS_URL = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"
ALLOWED_ORIGINS = [
    "https://rocketgeek.org",
    "https://www.rocketgeek.org",
    "https://test.rocketgeek.org",
    "https://blog.rocketgeek.org",
    "https://jenkins.drunkenidiot.org",
    "https://jenkins.rocketgeek.org"
]
cached_keys = None
# END: Configuration constants

# -------------------------------
# Lambda Entry Point
# -------------------------------
def lambda_handler(event, context):
    # START: Normalize headers and method
    headers = {k.lower(): v for k, v in event.get("headers", {}).items()}
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "").upper()
    logger.info("Request method: %s", method)
    # END: Normalize headers and method

    if method == "OPTIONS":
        # CORS preflight support
        return build_response(event, 200, {})

    if method != "POST":
        return build_response(event, 405, { "authenticated": False, "error": "Method Not Allowed" })

    token = extract_token(headers.get("authorization"))
    if not token:
        logger.warning("No Authorization header present or malformed.")
        return build_response(event, 401, { "authenticated": False, "error": "Missing or invalid token" })

    is_valid, claims = validate_jwt(token)
    if is_valid:
        logger.info("Authentication successful.")
        return build_response(event, 200, {
            "authenticated": True,
            "claims": claims  # Optional; remove if you do not want to expose claims
        })
    else:
        logger.warning("Token failed validation.")
        return build_response(event, 401, {
            "authenticated": False,
            "error": "Invalid token",
            "claims": claims  # Helps debugging invalid claims; remove in prod
        })

# -------------------------------
# Token Extraction
# -------------------------------
def extract_token(auth_header):
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ")[1]

# -------------------------------
# JWT Validation
# -------------------------------
def validate_jwt(token):
    global cached_keys
    try:
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")
        logger.info("Token header kid: %s", kid)
    except Exception as e:
        logger.warning("Failed to parse token header: %s", str(e))
        return False, {}

    try:
        if cached_keys is None:
            with urllib.request.urlopen(JWKS_URL) as response:
                cached_keys = json.loads(response.read())["keys"]
                logger.info("JWKS keys cached.")

        key = next((k for k in cached_keys if k["kid"] == kid), None)
        if not key:
            logger.warning("No matching JWKS key found for kid: %s", kid)
            return False, {}

        public_key = jwk.construct(key)
        message, signature = token.rsplit(".", 1)

        if not public_key.verify(message.encode("utf-8"), base64url_decode(signature.encode("utf-8"))):
            logger.warning("Token signature failed verification.")
            return False, {}

        claims = jwt.get_unverified_claims(token)
        logger.info("Token claims: %s", json.dumps(claims))

        # Check token_use and audience
        token_use = claims.get("token_use")
        aud = claims.get("aud")
        if token_use not in ["id", "access"]:
            logger.warning("Unexpected token_use: %s", token_use)
            return False, claims
        if aud != APP_CLIENT_ID:
            logger.warning("Audience claim mismatch: %s (expected %s)", aud, APP_CLIENT_ID)
            return False, claims

        # Expiration check
        exp = claims.get("exp")
        now = int(time.time())
        if exp:
            logger.info("Token expiration: %s; Current time: %s", exp, now)
            if exp < now:
                logger.warning("Token has expired.")
                return False, claims

        return True, claims

    except Exception as e:
        logger.error("Token validation exception: %s", str(e))
        return False, {}

# -------------------------------
# CORS-Compatible Response Builder
# -------------------------------
def build_response(event, status_code, body_dict):
    headers_in = {k.lower(): v for k, v in event.get("headers", {}).items()}
    origin = headers_in.get("origin", "https://rocketgeek.org")
    cors_origin = origin if origin in ALLOWED_ORIGINS else "https://rocketgeek.org"

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
