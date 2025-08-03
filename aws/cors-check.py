import json
from rg_config import corsheaders

def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    print(f"[INFO] Received {method} request for CORS check.")

    # Base response payload always includes hello
    base_response = { "hello": "from cors-check" }

    if method == "OPTIONS":
        return corsheaders.build_cors_response(event, 204, base_response)

    elif method == "POST":
        return corsheaders.build_cors_response(event, 200, {
            **base_response,
            "message": "CORS check successful."
        })

    else:
        return corsheaders.build_cors_response(event, 405, {
            **base_response,
            "error": "Method not allowed."
        })
