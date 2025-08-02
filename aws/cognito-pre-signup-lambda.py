# START: Import libraries
import boto3
import logging
import re
from botocore.exceptions import ClientError

# START: Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# START: Error message constants
ERROR_DUPLICATE_EMAIL = "duplicate email address found"
ERROR_DUPLICATE_PHONE = "duplicate phone number found"
ERROR_INVALID_EMAIL = "invalid email address format"
ERROR_INVALID_PHONE = "invalid phone number format"
ERROR_INTERNAL = "internal service error. please try again later."

# START: Initialize Cognito client
cognito = boto3.client('cognito-idp')

# START: Input sanitization
def sanitize_input(value: str, field_name: str) -> str:
    if not isinstance(value, str):
        logger.warning(f"{field_name} is not a string; received: {value}")
        return ""

    original = value
    value = value.strip()

    # Remove potentially dangerous characters (one per line)
    value = value.replace(";", "")
    value = value.replace("|", "")
    value = value.replace("&", "")
    value = value.replace("$", "")
    value = value.replace("<", "")
    value = value.replace(">", "")
    value = value.replace("\\", "")
    value = value.replace("'", "")
    value = value.replace("\"", "")

    logger.info(f"sanitize_input({field_name}): original='{original}' → sanitized='{value}'")
    return value

# START: Email validation
def is_valid_email(email: str) -> bool:
    pattern = r"^[^@]+@[^@]+\.[^@]+$"
    result = re.match(pattern, email) is not None
    logger.info(f"is_valid_email('{email}') → {result}")
    return result

# START: Phone number normalization and validation
def normalize_phone(phone: str) -> str:
    original = phone

    phone = phone.replace(" ", "")
    phone = phone.replace("-", "")
    phone = phone.replace("(", "")
    phone = phone.replace(")", "")

    if re.match(r"^\+\d{6,15}$", phone):
        logger.info(f"normalize_phone('{original}') → '{phone}' (valid)")
        return phone
    else:
        logger.warning(f"normalize_phone('{original}') → invalid format")
        return ""

# START: Main Lambda handler
def lambda_handler(event, context):
    logger.info("PreSignUp trigger initiated.")
    logger.info(f"Incoming Cognito event: {event}")

    try:
        # START: Cognito-triggered event structure
        user_pool_id = event.get('userPoolId', '')
        user_attrs = event.get('request', {}).get('userAttributes', {})

        raw_email = sanitize_input(user_attrs.get("email", ""), "email")
        raw_phone = sanitize_input(user_attrs.get("phone_number", ""), "phone_number")

        # Validate email
        if not is_valid_email(raw_email):
            raise Exception(ERROR_INVALID_EMAIL)

        # Validate phone
        normalized_phone = normalize_phone(raw_phone)
        if not normalized_phone:
            raise Exception(ERROR_INVALID_PHONE)

        # START: Check for existing user with same email
        logger.info(f"Checking uniqueness of email: {raw_email}")
        email_result = cognito.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = \"{raw_email}\"'
        )
        if email_result['Users']:
            logger.warning(f"Duplicate email detected: {raw_email}")
            raise Exception(ERROR_DUPLICATE_EMAIL)

        # START: Check for existing user with same phone
        logger.info(f"Checking uniqueness of phone: {normalized_phone}")
        phone_result = cognito.list_users(
            UserPoolId=user_pool_id,
            Filter=f'phone_number = \"{normalized_phone}\"'
        )
        if phone_result['Users']:
            logger.warning(f"Duplicate phone number detected: {normalized_phone}")
            raise Exception(ERROR_DUPLICATE_PHONE)

        logger.info("No duplicates found. Sign-up approved.")
        return event

    except ClientError as ce:
        logger.error(f"AWS ClientError during PreSignUp: {ce}")
        raise Exception(ERROR_INTERNAL)
    except Exception as ex:
        logger.error(f"PreSignUp failed: {str(ex)}")
        raise Exception(str(ex))
