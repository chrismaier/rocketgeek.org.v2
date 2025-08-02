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

    # Log current feature toggle state
    logger.info("EMAIL_VERIFICATION_CHECK_ENABLED: %s", EMAIL_VERIFICATION_CHECK_ENABLED)
    logger.info("PHONE_VERIFICATION_CHECK_ENABLED: %s", PHONE_VERIFICATION_CHECK_ENABLED)

    # Extract user attributes
    user_attrs = event.get("request", {}).get("userAttributes", {})
    email = user_attrs.get("email", "unknown")
    email_verified = user_attrs.get("email_verified", "").lower() == "true"
    phone_verified = user_attrs.get("phone_number_verified", "").lower() == "true"
    timestamp = datetime.utcnow().isoformat() + "Z"

    logger.info(
        "Parsed userAttributes for [%s] - email_verified=%s, phone_verified=%s",
        email, email_verified, phone_verified
    )

    # Handle missing userAttributes
    if not user_attrs:
        logger.warning("User attributes are missing from event.")
        raise_error(email, email_verified, phone_verified, "missing")

    # START: Conditional verification enforcement
    if EMAIL_VERIFICATION_CHECK_ENABLED and PHONE_VERIFICATION_CHECK_ENABLED:
        logger.info("Both email and phone verification checks are enabled.")
        if not email_verified and not phone_verified:
            logger.info("Triggering block: BOTH email and phone not verified.")
            raise_error(email, email_verified, phone_verified, "email and phone")
        elif not email_verified:
            logger.info("Triggering block: Email not verified.")
            raise_error(email, email_verified, phone_verified, "email")
        elif not phone_verified:
            logger.info("Triggering block: Phone not verified.")
            raise_error(email, email_verified, phone_verified, "phone")
        else:
            logger.info("Both email and phone verified. No block triggered.")
    elif EMAIL_VERIFICATION_CHECK_ENABLED:
        logger.info("Only email verification check is enabled.")
        if not email_verified:
            logger.info("Triggering block: Email not verified.")
            raise_error(email, email_verified, phone_verified, "email")
        else:
            logger.info("Email verified. No block triggered.")
    elif PHONE_VERIFICATION_CHECK_ENABLED:
        logger.info("Only phone verification check is enabled.")
        if not phone_verified:
            logger.info("Triggering block: Phone not verified.")
            raise_error(email, email_verified, phone_verified, "phone")
        else:
            logger.info("Phone verified. No block triggered.")
    else:
        logger.info("No verification checks are enabled. Skipping all checks.")
    # END: Conditional verification enforcement

    # Log success
    logger.info(
        "Login SUCCESS for user [%s] at %s: user fully verified. "
        "(email_verified=%s, phone_verified=%s)",
        email, timestamp, email_verified, phone_verified
    )

    return event  # Allow login
# END: Lambda handler
