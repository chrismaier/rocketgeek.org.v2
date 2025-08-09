import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def sanitize_email(value: str) -> str:
    """
    Strip spaces, lowercase, and remove characters that never belong in emails:
    quotes, backticks, angle brackets, and whitespace.
    Each removal is explicit, one per line for clarity.
    """
    if not isinstance(value, str):
        return ""

    original_email = value
    sanitized_email = value.strip().lower()

    # Remove quotes and backticks
    sanitized_email = sanitized_email.replace('"', '')
    sanitized_email = sanitized_email.replace("'", '')
    sanitized_email = sanitized_email.replace('`', '')

    # Remove angle brackets
    sanitized_email = sanitized_email.replace('<', '')
    sanitized_email = sanitized_email.replace('>', '')

    # Remove whitespace explicitly
    sanitized_email = sanitized_email.replace(' ', '')
    sanitized_email = sanitized_email.replace('\t', '')
    sanitized_email = sanitized_email.replace('\r', '')
    sanitized_email = sanitized_email.replace('\n', '')

    logger.info(
        "[inputfilters] sanitize_email raw=%s sanitized=%s",
        original_email,
        sanitized_email
    )
    return sanitized_email


def validEmailAddress(candidate_email: str) -> bool:
    """
    Lightweight format check without regex.
    Rules:
      - must be a non-empty string
      - no whitespace characters
      - exactly one '@'
      - non-empty local and domain parts
      - domain contains at least one dot and doesn't start/end with '.'
      - no consecutive dots in domain
      - no clearly disallowed characters
    """
    if not isinstance(candidate_email, str):
        return False

    if not candidate_email:
        return False

    # Reject any whitespace
    if any(char in candidate_email for char in (' ', '\t', '\r', '\n')):
        return False

    # Exactly one '@'
    local_and_domain = candidate_email.split('@')
    if len(local_and_domain) != 2:
        return False

    local_part, domain_part = local_and_domain
    if not local_part or not domain_part:
        return False

    # Domain must contain a dot, and not start or end with '.'
    if '.' not in domain_part:
        return False
    if domain_part[0] == '.' or domain_part[-1] == '.':
        return False
    if '..' in domain_part:
        return False

    # Disallowed characters in any part of the email
    disallowed_characters = set('<>()[]{};"\'`\\,')
    if any(char in disallowed_characters for char in candidate_email):
        return False

    return True


def looks_like_email(value: str) -> bool:
    """
    Wrapper for backward compatibility.
    Calls validEmailAddress() so old code continues to work.
    """
    return validEmailAddress(value)
