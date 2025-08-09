# -------------------------------------------------------
# login-verification Lambda Function (Full JWT validation)
# - Validates Cognito id_token passed in body or cookie
# - Designed for AWS HTTP API (payload format v2.0)
# - Python 3.13 with PyJWT provided via Lambda layer
# -------------------------------------------------------

import json
import jwt
import urllib.request

# ------------------------
# Constants
# ------------------------
COGNITO_USER_POOL_ID = "us-east-1_5j4lDdV1A"
COGNITO_REGION = "us-east-1"
COGNITO_APP_CLIENT_ID = "2mnmesf3f1olrit42g2oepmiak"
JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"

cached_keys = None  # cache JWKS keys in memory between invocations

# ------------------------
# Download and cache Cognito public keys
# ------------------------
def get_jwks_keys():
    global cached_keys
    if cached_keys is None:
        with urllib.request.urlopen(JWKS_URL) as response:
            cached_keys = json.loads(response.read())['keys']
    return cached_keys

# ------------------------
# Lambda entry point
# ------------------------
def lambda_handler(event, context):
    # Log the incoming event
    print("=== EVENT RECEIVED ===")
    print(json.dumps(event))

    # ------------------------
    # Detect HTTP method
    # ------------------------
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
    if method != "POST":
        return {
            "statusCode": 405,
            "body": "Method Not Allowed"
        }

    # ------------------------
    # Parse token from JSON body or cookie
    # ------------------------
    headers = event.get("headers", {})
    body = json.loads(event.get("body") or "{}")
    token = extract_token(headers, body)

    if not token:
        return redirect_to_login()

    # ------------------------
    # Try to verify the JWT
    # ------------------------
    try:
        decoded_token = verify_jwt(token)
        return allow_access(decoded_token)
    except Exception as e:
        print(f"Token verification failed: {e}")
        return redirect_to_login()

# ------------------------
# Extract token from JSON body or cookie
# ------------------------
def extract_token(headers, body):
    # First try to get from POST body
    if "token" in body:
        return body["token"]

    # Then check cookies
    cookie_header = headers.get("Cookie") or headers.get("cookie")
    if cookie_header:
        for cookie in cookie_header.split(";"):
            if "id_token=" in cookie:
                return cookie.strip().split("=", 1)[1]

    return None

# ------------------------
# Verify JWT using Cognito public key
# ------------------------
def verify_jwt(token):
    keys = get_jwks_keys()

    # Decode header to get the key ID (kid)
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header["kid"]

    # Find the public key that matches the kid
    key = next((k for k in keys if k["kid"] == kid), None)
    if not key:
        raise Exception("Public key not found for kid")

    # Build public key object
    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))

    # Decode and verify token
    return jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        audience=COGNITO_APP_CLIENT_ID,
        issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
    )

# ------------------------
# Return success response
# ------------------------
def allow_access(decoded_token):
    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Access granted",
            "username": decoded_token.get("cognito:username"),
            "email": decoded_token.get("email")
        }),
        "headers": {
            "Content-Type": "application/json"
        }
    }

# ------------------------
# Redirect to login page
# ------------------------
def redirect_to_login():
    return {
        "statusCode": 302,
        "headers": {
            "Location": "/login.html"
        }
    }
