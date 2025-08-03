import json
from rg_config import corsheaders

def lambda_handler(event, context):
    # Normalize headers to lowercase for consistent processing
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")

    # Log the request method for traceability
    print(f"[INFO] Received {method} request for CORS check.")

    if method == "OPTIONS":
        return corsheaders.build_response(204, None)
    elif method == "POST":
        return corsheaders.build_response(200, { "message": "CORS check successful." })
    else:
        return corsheaders.build_response(405, { "error": "Method not allowed." })
