# ===============================
# Lambda Function: authentication-check
# ===============================

import json
import logging
import urllib.request
from jose import jwk, jwt
from jose.utils import base64url_decode

# -------------------------------
# Logger Configuration
# -------------------------------
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# -------------------------------
# Configuration Constants
# -------------------------------
USER_POOL_ID = "us-east-1_5j4lDdV1A"
APP_CLIENT_ID = "2mnmesf3f1olrit42g2oepmiak"
REGION = "us-east-1"
JWKS_URL = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

ALLOWED_ORIGINS = [
    "https://rocketgeek.org",
    "https://www.rocketgeek.org",
    "https://test.rocketgeek.org"
]

# -------------------------------
# JWKS Cache (persisted across invocations)
# -------------------------------
cached_keys = None

# -------------------------------
# Lambda Entry Point
# -------------------------------
def lambda_handler(event, context):
    try:
        origin = event.get("headers", {}).get("origin") or event.get("headers", {}).get("Origin")
        cors_origin = origin if origin in ALLOWED_ORIGINS else "https://rocketgeek.org"

        # -------------------------------
        # Enforce POST Method
        # -------------------------------
        if event.get("httpMethod") != "POST":
            logger.warning("Invalid HTTP method: %s", event.get("httpMethod"))
            return cors_response(cors_origin, 405, { "authenticated": False, "error": "Method Not Allowed" })

        # -------------------------------
        # Extract Bearer Token
        # -------------------------------
        headers = event.get("headers", {})
        token = extract_token(headers.get("Authorization"))

        if not token:
            logger.warning("Authorization header missing or malformed")
            return cors_response(cors_origin, 401, { "authenticated": False, "error": "Missing or invalid token" })

        # -------------------------------
        # Validate JWT Signature + Claims
        # -------------------------------
        if validate_jwt(token):
            logger.info("Authentication successful")
            return cors_response(cors_origin, 200, { "authenticated": True })
        else:
            logger.warning("Authentication failed")
            return cors_response(cors_origin, 401, { "authenticated": False, "error": "Invalid token" })

    except Exception as e:
        logger.error("Unhandled exception: %s", str(e))
        return cors_response("https://rocketgeek.org", 500, { "authenticated": False, "error": "Internal Server Error" })

# -------------------------------
# Return a CORS-compatible response
# -------------------------------
def cors_response(origin, status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        "body": json.dumps(body_dict)
    }

# -------------------------------
# Extract Token from Header
# -------------------------------
def extract_token(auth_header):
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ")[1]

# -------------------------------
# JWT Signature & Claim Validation
# -------------------------------
def validate_jwt(token):
    global cached_keys

    try:
        headers = jwt.get_unverified_header(token)
        kid = headers["kid"]
    except Exception as e:
        logger.warning("Failed to get token header: %s", str(e))
        return False

    if cached_keys is None:
        try:
            with urllib.request.urlopen(JWKS_URL) as response:
                cached_keys = json.loads(response.read())["keys"]
        except Exception as e:
            logger.error("Failed to fetch JWKS: %s", str(e))
            return False

    key = next((k for k in cached_keys if k["kid"] == kid), None)
    if not key:
        logger.warning("Key ID %s not found in JWKS", kid)
        return False

    try:
        public_key = jwk.construct(key)
        message, encoded_signature = token.rsplit(".", 1)
        decoded_signature = base64url_decode(encoded_signature.encode("utf-8"))

        if not public_key.verify(message.encode("utf-8"), decoded_signature):
            logger.warning("Signature verification failed")
            return False
    except Exception as e:
        logger.warning("JWT signature verification error: %s", str(e))
        return False

    try:
        claims = jwt.get_unverified_claims(token)

        if claims.get("token_use") != "id":
            logger.warning("Token use is not 'id': %s", claims.get("token_use"))
            return False

        if claims.get("aud") != APP_CLIENT_ID:
            logger.warning("Audience claim mismatch: %s", claims.get("aud"))
            return False

        return True
    except Exception as e:
        logger.warning("Failed to parse claims: %s", str(e))
        return False
