# ===============================
# Lambda Function: get-profile
# ===============================

import json
import logging
import urllib.request
from jose import jwk, jwt
from jose.utils import base64url_decode
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

USER_POOL_ID = "us-east-1_5j4lDdV1A"
APP_CLIENT_ID = "2mnmesf3f1olrit42g2oepmiak"
REGION = "us-east-1"
JWKS_URL = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"
S3_BUCKET = "rocket-geek-user-data--use1-az6--x-s3"
ALLOWED_ORIGINS = [
    "https://rocketgeek.org",
    "https://www.rocketgeek.org",
    "https://test.rocketgeek.org"
]

PROFILE_FILENAME = "profile.json"
cached_keys = None
s3 = boto3.client("s3")

def lambda_handler(event, context):
    headers = {k.lower(): v for k, v in event.get("headers", {}).items()}
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "").upper()
    logger.info("Method: %s", method)

    if method != "POST":
        return build_response(event, 405, { "error": "Method Not Allowed" })

    token = extract_token(headers.get("authorization"))
    if not token:
        logger.warning("No Authorization header.")
        return build_response(event, 401, { "error": "Missing or invalid token" })

    user_id = validate_and_extract_sub(token)
    if not user_id:
        logger.warning("Invalid token claims.")
        return build_response(event, 401, { "error": "Unauthorized" })

    s3_key = f"{user_id}/{PROFILE_FILENAME}"
    logger.info(f"Fetching profile from S3 key: {s3_key}")
    try:
        response = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
        profile_data = response["Body"].read().decode("utf-8")
        return build_response(event, 200, json.loads(profile_data))
    except s3.exceptions.NoSuchKey:
        logger.warning("Profile not found for user: %s", user_id)
        return build_response(event, 404, { "error": "Profile not found" })
    except Exception as e:
        logger.error("S3 error: %s", str(e))
        return build_response(event, 500, { "error": "Internal Server Error" })

def extract_token(auth_header):
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ")[1]

def validate_and_extract_sub(token):
    global cached_keys
    try:
        headers = jwt.get_unverified_header(token)
        kid = headers["kid"]

        if cached_keys is None:
            with urllib.request.urlopen(JWKS_URL) as response:
                cached_keys = json.loads(response.read())["keys"]

        key = next((k for k in cached_keys if k["kid"] == kid), None)
        if not key:
            logger.warning("JWKS key not found")
            return None

        public_key = jwk.construct(key)
        message, sig = token.rsplit(".", 1)
        if not public_key.verify(message.encode("utf-8"), base64url_decode(sig.encode("utf-8"))):
            logger.warning("Signature verification failed")
            return None

        claims = jwt.get_unverified_claims(token)
        if claims.get("token_use") != "id" or claims.get("aud") != APP_CLIENT_ID:
            logger.warning("Claim mismatch. use=%s, aud=%s", claims.get("token_use"), claims.get("aud"))
            return None

        return claims.get("sub")
    except Exception as e:
        logger.error("Token validation error: %s", str(e))
        return None

#def build_response(event, status_code, body_dict):
#    return {
#        "statusCode": status_code,
#        "headers": {
#            "Content-Type": "application/json"
#        },
#        "body": json.dumps(body_dict)
#    }

# START: Utility function to build HTTP response
def build_response(event, status_code, body_dict):
    headers_in = {k.lower(): v for k, v in event.get("headers", {}).items()}
    origin = headers_in.get("origin")
    cors_origin = origin if origin in ALLOWED_ORIGINS else None

    response_headers = {
        "Content-Type": "application/json"
    }

    if cors_origin:
        response_headers["Access-Control-Allow-Origin"] = cors_origin
        response_headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response_headers["Access-Control-Allow-Headers"] = "content-type, authorization"
        response_headers["Access-Control-Allow-Credentials"] = "true"

    return {
        "statusCode": status_code,
        "headers": response_headers,
        "body": json.dumps(body_dict)
    }
# END
