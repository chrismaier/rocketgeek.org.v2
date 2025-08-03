# settings.py

REGION = "us-east-1"
USER_POOL_ID = "us-east-1_clrYuNqI3"
APP_CLIENT_ID = "3u51gurg8r0ri4riq2isa8aq7h"

JWKS_URL = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

