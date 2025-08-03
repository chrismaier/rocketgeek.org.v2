# ===============================
# Lambda Function: update-profile
# ===============================

import json
import logging
import boto3
import urllib.request
from jose import jwk, jwt
from jose.utils import base64url_decode
from botocore.exceptions import ClientError

# START: Import shared configuration and CORS utility
from rg_config.constants import (
    USER_POOL_ID,
    APP_CLIENT_ID,
    REGION,
    JWKS_URL,
    DIRECTORY_BUCKET,
    ALLOWED_ORIGINS
)
from rg_config.corsheaders import build_cors_response
# END

# START: Logger setup
logger = logging.getLogger()
logger.setLevel(logging.INFO)
# END

# START: AWS S3 setup
s3 = boto3.client("s3")
# END

# START: Constants
PROFILE_FILENAME = "profile.json"
cached_jwks_keys = None
# END

def lambda_handler(event, context):
    headers = {k.lower(): v for k, v in event.get("headers", {}).items()}
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "").upper()
    logger.info("Method: %s", method)

    if method == "OPTIONS":
        return build_cors_response(event, 200, {})

    if method != "POST":
        return build_cors_response(event, 405, { "error": "Method Not Allowed" })

    token = extract_token(headers.get("authorization"))
    if not token:
        logger.warning("Missing or invalid Authorization header.")
        return build_cors_response(event, 401, { "error": "Missing or invalid token" })

    user_id = validate_and_extract_email(token)
    if not user_id:
        logger.warning("Token could not be validated.")
        return build_cors_response(event, 401, { "error": "Unauthorized" })

    try:
        body = json.loads(event.get("body", "{}"))
        if not isinstance(body, dict):
            raise ValueError("Expected JSON object in body")
    except Exception as e:
        logger.error("Failed to parse JSON body: %s", str(e))
        return build_cors_response(event, 400, { "error": "Invalid JSON in request body" })

    s3_key = f"user-profiles/{user_id}/{PROFILE_FILENAME}"
    logger.info(f"Storing profile to: {s3_key}")

    try:
        s3.put_object(
            Bucket=DIRECTORY_BUCKET,
            Key=s3_key,
            Body=json.dumps(body),
            ContentType="application/json"
        )
        logger.info("Profile saved successfully.")
        return build_cors_response(event, 200, { "message": "Profile updated successfully" })

    except ClientError as e:
        logger.error("S3 ClientError: %s", str(e))
        return build_cors_response(event, 500, { "error": "Failed to write profile to S3" })
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return build_cors_response(event, 500, { "error": "Internal Server Error" })


# START: Token extraction helper
def extract_token(auth_header):
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ")[1]
# END

# START: JWT validation and email extraction
def validate_and_extract_email(token):
    global cached_jwks_keys
    try:
        headers = jwt.get_unverified_header(token)
        kid = headers["kid"]

        if cached_jwks_keys is None:
            with urllib.request.urlopen(JWKS_URL) as response:
                cached_jwks_keys = json.loads(response.read())["keys"]

        key = next((k for k in cached_jwks_keys if k["kid"] == kid), None)
        if not key:
            logger.warning("JWKS key not found.")
            return None

        public_key = jwk.construct(key)
        message, sig = token.rsplit(".", 1)
        if not public_key.verify(message.encode("utf-8"), base64url_decode(sig.encode("utf-8"))):
            logger.warning("Signature verification failed.")
            return None

        claims = jwt.get_unverified_claims(token)

        if claims.get("token_use") != "id":
            logger.warning("Token use not 'id': %s", claims.get("token_use"))
            return None

        email = claims.get("email")
        if not email:
            logger.warning("Email not found in token claims.")
        return email

    except Exception as e:
        logger.error("Token validation error: %s", str(e))
        return None
# END
