from typing import Any


def data_response(data: Any) -> dict[str, Any]:
    return {"data": data}


def error_response(code: str, message: str, details: Any | None = None) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        }
    }

