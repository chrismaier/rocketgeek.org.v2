# ===============================
# Lambda Function: get-profile
# ===============================

import json
import logging
import urllib.request
from jose import jwk, jwt
from jose.utils import base64url_decode
import boto3

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
S3_BUCKET = "rocket-geek-user-data--use1-az6--x-s3"
PROFILE_FILENAME = "profile.json"
ALLOWED_ORIGINS = [
    "https://rocketgeek.org",
    "https://www.rocketgeek.org",
    "https://test.rocketgeek.org"
]

cached_keys = None
s3 = boto3.client("s3")

# -------------------------------
# Lambda Entry Point
# -------------------------------
def lambda_handler(event, context):
    try:
        origin = event.get("headers", {}).get("origin") or event.get("headers", {}).get("Origin")
        cors_origin = origin if origin in ALLOWED_ORIGINS else "https://rocketgeek.org"
