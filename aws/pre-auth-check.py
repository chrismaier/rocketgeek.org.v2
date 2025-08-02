# START: Import libraries
import logging
import json
from datetime import datetime
# END: Import libraries

# START: Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
# END: Setup logging

# START: Feature toggles
EMAIL_VERIFICATION_CHECK_ENABLED = True   # Set to False to disable email verification
PHONE_VERIFICATION_CHECK_ENABLED = True   # Set to False to disable phone verification
# END: Feature toggles

# START: User-facing error messages
ERROR_MESSAGES = {
    "email": "Login is unable to be completed until your email address is verified.",
    "phone": "Login is unable to be completed until your phone number is verified.",
    "email and phone": "Login is unable to be completed until both your email address and phone number are verified.",
    "missing": "Login is unable to be completed. Required verification attributes are missing."
}
# END: Error messages

# START: Helper - raise formatted error and log
def raise_error(email, email_verified, phone_verified, failure_key):
    timestamp = datetime.utcnow().isoformat() + "Z"
    message = ERROR_MESSAGES.get(failure_key, "Login is temporarily unavailable.")
    logger.warning(
        "Login attempt BLOCKED for user [%s] at %s: %s "
        "(email_verified=%s, phone_verified=%s)",
        email, timestamp, message, email_verified, phone_verified
    )
    raise Exception(message)
# END: Helper - raise formatted error and log

# START: Lambda handler
def lambda_handler(event, context):
    logger.info("PreAuthentication event received.")

    user_attrs = event.get("request", {}).get("userAttributes", {})
    email = user_attrs.get("email", "unknown")
    email_verified = user_attrs.get("email_verified", "").lower() == "true"
    phone_verified = user_attrs.get("phone_number_verified", "").lower() == "true"
    timestamp = datetime.utcnow().isoformat() + "Z"

    # Handle missing userAttributes
    if not user_attrs:
        raise_error(email, email_verified, phone_verified, "missing")

    # START: Conditional verification enforcement
    if EMAIL_VERIFICATION_CHECK_ENABLED and PHONE_VERIFICATION_CHECK_ENABLED:
        if not email_verified and not phone_verified:
            raise_error(email, email_verified, phone_verified, "email and phone")
        elif not email_verified:
            raise_error(email, email_verified, phone_verified, "email")
        elif not phone_verified:
            raise_error(email, email_verified, phone_verified, "phone")
    elif EMAIL_VERIFICATION_CHECK_ENABLED and not email_verified:
        raise_error(email, email_verified, phone_verified, "email")
    elif PHONE_VERIFICATION_CHECK_ENABLED and not phone_verified:
        raise_error(email, email_verified, phone_verified, "phone")
    # END: Conditional verification enforcement

    # Log success
    logger.info(
        "Login SUCCESS for user [%s] at %s: user fully verified. "
        "(email_verified=%s, phone_verified=%s)",
        email, timestamp, email_verified, phone_verified
    )

    return event  # Allow login
# END: Lambda handler
