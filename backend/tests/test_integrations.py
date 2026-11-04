from __future__ import annotations

import unittest

from app.core.config import Settings
from app.integrations import (
    ASRRequest,
    EmbeddingRequest,
    LLMGenerationRequest,
    LLMMessage,
    OCRRequest,
    ObjectStorageUploadRequest,
    build_integrations,
)


class IntegrationsTest(unittest.TestCase):
    def test_mock_llm_provider_generates_deterministic_response(self) -> None:
        integrations = build_integrations(Settings())

        response = integrations.llm.generate(
            LLMGenerationRequest(
                model="mock-chat",
                messages=[
                    LLMMessage(role="system", content="You summarize notes."),
                    LLMMessage(role="user", content="Explain matrix multiplication."),
                ],
            )
        )

        self.assertEqual(response.model, "mock-chat")
        self.assertIn("Explain matrix multiplication.", response.content)
        self.assertGreater(response.usage.total_tokens, 0)
        self.assertEqual(response.metadata["provider"], "mock")

    def test_mock_ocr_and_asr_providers_return_text_results(self) -> None:
        integrations = build_integrations(Settings())

        ocr_result = integrations.ocr.extract_text(
            OCRRequest(image=b"fake-image", source_name="slide.png", language="zh")
        )
        asr_result = integrations.asr.transcribe(
            ASRRequest(audio=b"fake-audio", source_name="lecture.wav", language="zh")
        )

        self.assertIn("slide.png", ocr_result.text)
        self.assertEqual(ocr_result.pages[0].page_number, 1)
        self.assertIn("lecture.wav", asr_result.text)
        self.assertEqual(asr_result.segments[0].start, 0.0)

    def test_mock_embedding_provider_is_deterministic(self) -> None:
        integrations = build_integrations(Settings())
        request = EmbeddingRequest(inputs=["linear algebra"], dimensions=6)

        first = integrations.embedding.embed(request)
        second = integrations.embedding.embed(request)

        self.assertEqual(first.dimensions, 6)
        self.assertEqual(first.vectors, second.vectors)
        self.assertEqual(len(first.vectors[0]), 6)

    def test_mock_object_storage_provider_uploads_downloads_and_deletes(self) -> None:
        storage = build_integrations(Settings()).object_storage
        stored = storage.upload(
            ObjectStorageUploadRequest(
                key="uploads/lecture.txt",
                body=b"hello",
                content_type="text/plain",
            )
        )

        self.assertEqual(stored.key, "uploads/lecture.txt")
        self.assertTrue(storage.exists(stored.key))
        downloaded = storage.download(stored.key)
        self.assertEqual(downloaded.body, b"hello")

        storage.delete(stored.key)

        self.assertFalse(storage.exists(stored.key))

    def test_non_mock_provider_names_are_rejected_until_adapter_exists(self) -> None:
        settings = Settings(llm_provider="openai")

        with self.assertRaises(ValueError):
            build_integrations(settings)


if __name__ == "__main__":
    unittest.main()
