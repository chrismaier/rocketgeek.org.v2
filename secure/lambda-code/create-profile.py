# START: Import libraries
import boto3
import json
import logging
from botocore.exceptions import ClientError
# END: Import libraries

# START: Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
# END: Setup logging

# START: Constants
BUCKET_NAME = "rocket-geek-user-data--use1-az6--x-s3"
PROFILE_FILE_NAME = "profile.json"
# END: Constants

# START: Utility function to build HTTP response
def build_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }
# END: Utility function to build HTTP response

# START: Lambda handler
def lambda_handler(event, context):
    logger.info("Received event: %s", json.dumps(event))

    # START: Flatten headers
    headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
    logger.info("Normalized headers: %s", headers)
    # END: Flatten headers

    # START: Extract HTTP method (for HTTP API v2.0)
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "")
    logger.info("HTTP Method received: %s", http_method)

    if http_method == "OPTIONS":
        return build_response(200, {"message": "CORS preflight OK"})
    if http_method != "POST":
        return build_response(405, {"message": f"Method {http_method} not allowed"})
    # END: Method verification and CORS

    # START: Get user ID from Cognito JWT claims
    claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    user_id = claims.get("sub")
    email = claims.get("email", "unknown")
    name = f"{claims.get('given_name', '')} {claims.get('family_name', '')}".strip()

    if not user_id:
        logger.warning("Missing user ID (sub claim) from JWT")
        return build_response(401, {"message": "Unauthorized"})
    # END: Get user ID

    logger.info("Authenticated user ID (sub): %s", user_id)

    # START: Build default profile
    profile_data = {
        "user_id": user_id,
        "created": context.aws_request_id,
        "profile_version": 1,
        "status": "initial",
        "fields": {
            "email": email,
            "name": name or "New User"
        }
    }
    # END: Build default profile

    # START: S3 upload
    s3 = boto3.client("s3")
    s3_key = f"{user_id}/{PROFILE_FILE_NAME}"

    try:
        logger.info("Writing profile to S3: s3://%s/%s", BUCKET_NAME, s3_key)
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=json.dumps(profile_data),
            ContentType="application/json"
        )
        return build_response(200, {"message": "Profile created", "profile": profile_data})
    except ClientError as e:
        logger.error("S3 error: %s", e)
        return build_response(500, {"message": "Internal Server Error", "error": str(e)})
    # END: S3 upload
# END: Lambda handler
