"""Consistent API error codes and exception handlers (spec §10.3).

Wire format for every error:

    {"error": {"code": "INVALID_IMAGE", "message": "safe message"}}

Internal exception details are never exposed to clients.
"""

from __future__ import annotations

import logging

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.errors")

# --- stable error codes ----------------------------------------------------
UNAUTHENTICATED = "UNAUTHENTICATED"
INVALID_IMAGE = "INVALID_IMAGE"
IMAGE_TOO_LARGE = "IMAGE_TOO_LARGE"
PREDICTION_NOT_FOUND = "PREDICTION_NOT_FOUND"
DISEASE_NOT_FOUND = "DISEASE_NOT_FOUND"
FEEDBACK_EXISTS = "FEEDBACK_EXISTS"
MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"
SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
STORAGE_ERROR = "STORAGE_ERROR"
VALIDATION_ERROR = "VALIDATION_ERROR"
NOT_FOUND = "NOT_FOUND"
INTERNAL_ERROR = "INTERNAL_ERROR"


class ApiError(Exception):
    """Application error carrying an HTTP status and a stable machine code."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


class FeedbackConflict(Exception):
    """Raised by feedback repositories when a duplicate row would be created."""


_HTTP_CODE_MAP = {
    401: UNAUTHENTICATED,
    404: NOT_FOUND,
    405: "METHOD_NOT_ALLOWED",
    422: VALIDATION_ERROR,
}


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


def register_error_handlers(app) -> None:
    """Attach all error handlers to the FastAPI application."""
    from app.ml.predictor import ModelUnavailableError
    from app.ml.preprocessing import ImageTooLargeError, InvalidImageError

    @app.exception_handler(ApiError)
    async def _api_error(_request: Request, exc: ApiError) -> JSONResponse:
        return error_response(exc.status_code, exc.code, exc.message)

    @app.exception_handler(InvalidImageError)
    async def _invalid_image(_request: Request, exc: InvalidImageError) -> JSONResponse:
        return error_response(400, INVALID_IMAGE, str(exc))

    @app.exception_handler(ImageTooLargeError)
    async def _too_large(_request: Request, exc: ImageTooLargeError) -> JSONResponse:
        return error_response(413, IMAGE_TOO_LARGE, str(exc))

    @app.exception_handler(ModelUnavailableError)
    async def _model_unavailable(
        _request: Request, exc: ModelUnavailableError
    ) -> JSONResponse:
        logger.warning("model unavailable: %s", exc)
        return error_response(
            503, MODEL_UNAVAILABLE, "The classifier is temporarily unavailable."
        )

    @app.exception_handler(HTTPException)
    async def _http_error(_request: Request, exc: HTTPException) -> JSONResponse:
        code = _HTTP_CODE_MAP.get(exc.status_code, "HTTP_ERROR")
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return error_response(exc.status_code, code, detail)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return error_response(
            422, VALIDATION_ERROR, "Request validation failed."
        )

    @app.exception_handler(Exception)
    async def _unhandled(_request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error", exc_info=exc)
        return error_response(
            500, INTERNAL_ERROR, "An unexpected error occurred."
        )
