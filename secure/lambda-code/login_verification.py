import json
import jwt
import urllib.request
import os

COGNITO_USER_POOL_ID = "us-east-1_5j4lDdV1A"
COGNITO_REGION = "us-east-1"
COGNITO_APP_CLIENT_ID = "2mnmesf3f1olrit42g2oepmiak"
JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"

cached_keys = None

def get_jwks_keys():
    global cached_keys
    if cached_keys is None:
        with urllib.request.urlopen(JWKS_URL) as response:
            cached_keys = json.loads(response.read())['keys']
    return cached_keys

def lambda_handler(event, context):
    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "body": "Method Not Allowed"}

    headers = event.get("headers", {})
    body = json.loads(event.get("body") or "{}")
    token = extract_token(headers, body)

    if not token:
        return redirect_to_login()

    try:
        decoded_token = verify_jwt(token)
        return allow_access(decoded_token)
    except Exception as e:
        print(f"Token verification failed: {e}")
        return redirect_to_login()

def extract_token(headers, body):
    if "token" in body:
        return body["token"]
    cookie_header = headers.get("Cookie") or headers.get("cookie")
    if cookie_header:
        for cookie in cookie_header.split(";"):
            if "id_token=" in cookie:
                return cookie.strip().split("=", 1)[1]
    return None

def verify_jwt(token):
    keys = get_jwks_keys()
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header["kid"]
    key = next((k for k in keys if k["kid"] == kid), None)
    if not key:
        raise Exception("Public key not found for kid")

    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
    return jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        audience=COGNITO_APP_CLIENT_ID,
        issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
    )

def allow_access(decoded_token):
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Access granted"}),
        "headers": {
            "Content-Type": "application/json"
        }
    }

def redirect_to_login():
    return {
        "statusCode": 302,
        "headers": {
            "Location": "/login.html"
        }
    }
