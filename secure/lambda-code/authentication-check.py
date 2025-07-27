# ===============================
# Lambda Function: authentication-check
# ===============================

import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# -------------------------------
# Lambda Handler
# -------------------------------
def lambda_handler(event, context):
    try:
        # -------------------------------
        # Validate HTTP Method
        # -------------------------------
        if event.get("httpMethod") != "POST":
            logger.warning("Method not allowed: %s", event.get("httpMethod"))
            return {
                "statusCode": 405,
                "headers": { "Content-Type": "application/json" },
                "body": json.dumps({ "authenticated": False, "error": "Method Not Allowed" })
            }

        # -------------------------------
        # Extract Cognito Identity Claims
        # -------------------------------
        identity_claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        is_authenticated = bool(identity_claims)

        # -------------------------------
        # Log and Return Result
        # -------------------------------
        logger.info("Authentication status: %s", is_authenticated)

        return {
            "statusCode": 200,
            "headers": { "Content-Type": "application/json" },
            "body": json.dumps({ "authenticated": is_authenticated })
        }

    except Exception as e:
        logger.error("Unhandled exception: %s", str(e))
        return {
            "statusCode": 500,
            "headers": { "Content-Type": "application/json" },
            "body": json.dumps({ "authenticated": False, "error": "Internal Server Error" })
        }
