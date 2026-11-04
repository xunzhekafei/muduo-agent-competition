from __future__ import annotations

import os
import unittest

from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.errors import AppError, ErrorCode
from app.main import create_app


class CoreConfigTest(unittest.TestCase):
    def tearDown(self) -> None:
        os.environ.pop("MUDUO_APP_NAME", None)
        os.environ.pop("MUDUO_DATABASE_ECHO", None)
        os.environ.pop("MUDUO_ACCESS_TOKEN_EXPIRES_MINUTES", None)
        os.environ.pop("MUDUO_CORS_ORIGINS", None)
        get_settings.cache_clear()

    def test_settings_read_environment_values(self) -> None:
        os.environ["MUDUO_APP_NAME"] = "Muduo Test API"
        os.environ["MUDUO_DATABASE_ECHO"] = "true"
        os.environ["MUDUO_ACCESS_TOKEN_EXPIRES_MINUTES"] = "45"
        os.environ["MUDUO_CORS_ORIGINS"] = "http://localhost:5173,http://example.test"
        get_settings.cache_clear()

        settings = get_settings()

        self.assertEqual(settings.app_name, "Muduo Test API")
        self.assertTrue(settings.database_echo)
        self.assertEqual(settings.access_token_expires_minutes, 45)
        self.assertEqual(
            settings.cors_origins,
            ("http://localhost:5173", "http://example.test"),
        )

    def test_invalid_int_setting_falls_back_to_default(self) -> None:
        os.environ["MUDUO_ACCESS_TOKEN_EXPIRES_MINUTES"] = "invalid"
        get_settings.cache_clear()

        self.assertEqual(get_settings().access_token_expires_minutes, 30)


class CoreApiTest(unittest.TestCase):
    def test_health_endpoints_return_service_metadata(self) -> None:
        client = TestClient(create_app())

        root_response = client.get("/health")
        api_response = client.get("/api/v1/health")

        self.assertEqual(root_response.status_code, 200)
        self.assertEqual(api_response.status_code, 200)
        self.assertEqual(root_response.json()["data"]["status"], "ok")
        self.assertEqual(api_response.json()["data"]["service"], "Muduo API")

    def test_app_error_handler_returns_standard_error_body(self) -> None:
        app = create_app()
        router = APIRouter()

        @router.get("/raise-app-error")
        async def raise_app_error():
            raise AppError(
                ErrorCode.VALIDATION_ERROR,
                "业务校验失败",
                status_code=422,
                details={"field": "name"},
            )

        app.include_router(router)
        response = TestClient(app).get("/raise-app-error")

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], ErrorCode.VALIDATION_ERROR)
        self.assertEqual(response.json()["error"]["details"]["field"], "name")

    def test_validation_error_handler_returns_standard_error_body(self) -> None:
        app = create_app()
        router = APIRouter()

        @router.get("/needs-int")
        async def needs_int(value: int):
            return {"value": value}

        app.include_router(router)
        response = TestClient(app).get("/needs-int?value=not-int")

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], ErrorCode.VALIDATION_ERROR)
        self.assertIn("errors", response.json()["error"]["details"])


if __name__ == "__main__":
    unittest.main()
