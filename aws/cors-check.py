import json
from rg_config import corsheaders

def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    headers = event.get("headers", {})
    origin = headers.get("origin", "N/A")

    print(f"[INFO] Received {method} request for CORS check.")
    print(f"[DEBUG] Request origin: {origin}")
    print(f"[DEBUG] Request headers: {json.dumps(headers)}")

    base_response = { "hello": "from cors-check" }

    if method == "OPTIONS":
        return corsheaders.build_cors_response(event, 204, base_response)

    elif method == "POST":
        return corsheaders.build_cors_response(event, 200, {
            **base_response,
            "message": "CORS check successful.",
            "headers_received": headers
        })

    else:
        return corsheaders.build_cors_response(event, 405, {
            **base_response,
            "error": "Method not allowed."
        })
