# START: Import libraries
import json
import logging
# END

# START: Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
# END

# START: Allowed CORS origins
ALLOWED_ORIGINS = [
    "https://rocketgeek.org",
    "https://www.rocketgeek.org",
    "https://blog.rocketgeek.org",
    "https://test.rocketgeek.org",
    "https://api.rocketgeek.org",
    "https://jenkins.drunkenidiot.org",
    "https://jenkins.rocketgeek.org"
]
# END

# START: Lambda handler
def lambda_handler(event, context):
    headers = {k.lower(): v for k, v in event.get("headers", {}).items()}
    origin = headers.get("origin")
    logger.info(f"OPTIONS request origin: {origin}")

    if origin in ALLOWED_ORIGINS:
        cors_headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "content-type, authorization",
            "Access-Control-Allow-Credentials": "true"
        }
        status_code = 200
        body = ""
    else:
        logger.warning(f"Origin not allowed: {origin}")
        cors_headers = {}
        status_code = 403
        body = json.dumps({ "error": "CORS origin not allowed" })

    response = {
        "statusCode": status_code,
        "headers": cors_headers,
        "body": body
    }

    return response
# END
