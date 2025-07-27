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
def build_response(status_code, body, origin=None):
    allowed_origins = [
        "https://rocketgeek.org",
        "https://www.rocketgeek.org",
        "https://test.rocketgeek.org",
        "https://blog.rocketgeek.org",
        "https://jenkins.rocketgeek.org",
        "https://jenkins.drunkenidiot.org"
    ]

    # Default to "null" if no match (blocks CORS)
    cors_origin = origin if origin in allowed_origins else "null"

    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": cors_origin,
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

    # START: Flatten headers to address CaSe SeNsItIvItY issues
    headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
    logger.info("Normalized headers: %s", headers)
    # END: Flatten headers

    # START: Extract HTTP method (for HTTP API v2.0)
    # Required for new HTTP lambdas as HTTP 1.1 functionality no longer works
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "")
    logger.info("HTTP Method received: %s", http_method)

    # START: Handle CORS preflight
    if http_method == "OPTIONS":
        return build_response(200, {"message": "CORS preflight OK"})
    # END: Handle CORS preflight

    # START: Verify HTTP method
    if http_method != "POST":
        return build_response(405, {"message": f"Method {http_method} not allowed"})
    # END: Verify HTTP method

    # START: Get user ID from Cognito JWT claims
    # Required for new HTTP lambdas as HTTP 1.1 functionality no longer works
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

    # Previous layout (was):
    # s3_key = f"{user_id}/{PROFILE_FILE_NAME}"

    # Put all the user profiles in a sub-directory
    s3_key = f"user-profiles/{user_id}/{PROFILE_FILE_NAME}"

    try:
        # Check if the profile already exists
        s3.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        logger.info("Profile already exists for user: %s", user_id)
        return build_response(409, {
            "message": "Profile already exists",
            "detail": "You already have a profile. Please use the Update Profile option instead of Create Profile."
        })
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code != '404':
            logger.error("Error checking for existing profile: %s", e)
            return build_response(500, {
                "message": "Error checking for existing profile",
                "error": str(e)
            })

    # If not found, proceed to create it
    try:
        logger.info("Creating new profile at s3://%s/%s", BUCKET_NAME, s3_key)
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=json.dumps(profile_data),
            ContentType="application/json"
        )
        return build_response(200, {"message": "Profile created", "profile": profile_data})
    except ClientError as e:
        logger.error("S3 error while writing profile: %s", e)
        return build_response(500, {
            "message": "Error creating profile",
            "error": str(e)
        })
    # END: S3 upload
# END: Lambda handler
