# ===============================
# Unified Lambda: create-or-update-profile
# ===============================

import json
import logging
import boto3
import urllib.request
from jose import jwk, jwt
from jose.utils import base64url_decode
from botocore.exceptions import ClientError

# START: Shared config and utilities
from rg_config.constants import (
    DIRECTORY_BUCKET,
    JWKS_URL
)
from rg_config.corsheaders import build_cors_response
# END

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
PROFILE_FILENAME = "profile.json"
cached_jwks_keys = None

def lambda_handler(event, context):
    headers = {k.lower(): v for k, v in event.get("headers", {}).items()}
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "POST")

    if method == "OPTIONS":
        return build_cors_response(event, 200, {})

    if method != "POST":
        return build_cors_response(event, 405, { "error": "Method Not Allowed" })

    token = extract_token(headers.get("authorization"))
    if not token:
        return build_cors_response(event, 401, { "error": "Missing or invalid token" })

    user_id = validate_and_extract_sub(token)
    if not user_id:
        return build_cors_response(event, 401, { "error": "Unauthorized" })

    try:
        body = json.loads(event.get("body", "{}"))
        if not isinstance(body, dict):
            raise ValueError("Expected JSON object in body")
    except Exception as e:
        logger.error("Failed to parse JSON body: %s", str(e))
        return build_cors_response(event, 400, { "error": "Invalid JSON in request body" })

    s3_key = f"user-profiles/{user_id}/{PROFILE_FILENAME}"
    logger.info(f"[Profile Save] Target S3 key: {s3_key}")

    path = event.get("rawPath", "").lower()
    creating = "create" in path
    updating = "update" in path

    # Decide whether to check existence
    exists = False
    try:
        s3.head_object(Bucket=DIRECTORY_BUCKET, Key=s3_key)
        exists = True
    except ClientError as e:
        if e.response['Error']['Code'] != "404":
            logger.error("Error checking for existing profile: %s", e)
            return build_cors_response(event, 500, { "error": "S3 head_object failed" })

    if creating and exists:
        return build_cors_response(event, 409, {
            "error": "Profile already exists",
            "detail": "Use update-profile instead."
        })

    if updating and not exists:
        return build_cors_response(event, 404, {
            "error": "No profile exists to update",
            "detail": "Use create-profile instead."
        })

    try:
        s3.put_object(
            Bucket=DIRECTORY_BUCKET,
            Key=s3_key,
            Body=json.dumps(body),
            ContentType="application/json"
        )
        return build_cors_response(event, 200, {
            "message": "Profile saved successfully",
            "action": "created" if creating else "updated"
        })
    except Exception as e:
        logger.error("S3 put_object error: %s", str(e))
        return build_cors_response(event, 500, { "error": "Failed to write profile to S3" })

# -- Helper: JWT Extraction
def extract_token(auth_header):
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ")[1]

# -- Helper: Token Validation
def validate_and_extract_sub(token):
    global cached_jwks_keys
    try:
        headers = jwt.get_unverified_header(token)
        kid = headers["kid"]

        if cached_jwks_keys is None:
            with urllib.request.urlopen(JWKS_URL) as response:
                cached_jwks_keys = json.loads(response.read())["keys"]

        key = next((k for k in cached_jwks_keys if k["kid"] == kid), None)
        if not key:
            logger.warning("JWKS key not found")
            return None

        public_key = jwk.construct(key)
        message, sig = token.rsplit(".", 1)
        if not public_key.verify(message.encode("utf-8"), base64url_decode(sig.encode("utf-8"))):
            logger.warning("Signature verification failed")
            return None

        claims = jwt.get_unverified_claims(token)
        if claims.get("token_use") != "id":
            logger.warning("Token use is not ID: %s", claims.get("token_use"))
            return None

        return claims.get("sub")

    except Exception as e:
        logger.error("JWT validation error: %s", str(e))
        return None
