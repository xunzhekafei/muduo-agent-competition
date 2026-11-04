from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
from typing import Any, Protocol


@dataclass(slots=True)
class ASRRequest:
    audio: bytes
    source_name: str | None = None
    language: str | None = None
    prompt: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ASRSegment:
    start: float
    end: float
    text: str


@dataclass(slots=True)
class ASRResult:
    text: str
    segments: list[ASRSegment]
    language: str | None = None
    duration_seconds: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class ASRProvider(Protocol):
    def transcribe(self, request: ASRRequest) -> ASRResult:
        """Transcribe speech audio into text."""


class MockASRProvider:
    provider_name = "mock"

    def transcribe(self, request: ASRRequest) -> ASRResult:
        fingerprint = sha256(request.audio or b"mock-asr").hexdigest()[:12]
        label = request.source_name or f"audio-{fingerprint}"
        prefix = f"{request.prompt.strip()} " if request.prompt else ""
        text = f"{prefix}Transcript generated from {label}".strip()
        return ASRResult(
            text=text,
            segments=[ASRSegment(start=0.0, end=1.0, text=text)],
            language=request.language,
            duration_seconds=1.0,
            metadata={"provider": self.provider_name, **request.metadata},
        )


class FunASRProvider:
    """基于 fun-asr 的语音识别 Provider（本地部署）"""
    provider_name = "funasr"

    def __init__(self, model_name: str = "damo/speech_paraformer-large-vad-punc_asr_nat-zh-cn-16k-common-vocab8404"):
        self.model_name = model_name
        self.model = None
        self._initialized = False

    def _ensure_initialized(self):
        if self._initialized and self.model is not None:
            return

        try:
            from funasr import AutoModel

            self.model = AutoModel(
                model=self.model_name,
                vad_model="damo/speech_fsmn_vad_zh-cn-16k-common-pytorch",
                punc_model="damo/punc_ct-transformer_zh-cn-common-vocab272727",
                device="cpu",
            )
            self._initialized = True
        except Exception as e:
            import logging
            logging.warning(f"FunASR 初始化失败，降级为 MockASRProvider: {str(e)}")
            self._initialized = False

    def transcribe(self, request: ASRRequest) -> ASRResult:
        self._ensure_initialized()

        if not self._initialized or self.model is None:
            return MockASRProvider().transcribe(request)

        try:
            import io

            audio_bytes = request.audio

            if audio_bytes is None or len(audio_bytes) == 0:
                return MockASRProvider().transcribe(request)

            from funasr.utils.postprocess_utils import rich_transcription_postprocess

            result = self.model.generate(
                input=audio_bytes,
                cache={},
                language=request.language or "zh",
            )

            if not result or len(result) == 0:
                return ASRResult(
                    text="",
                    segments=[],
                    language=request.language,
                    duration_seconds=0.0,
                    metadata={"provider": self.provider_name, **request.metadata},
                )

            text = ""
            segments = []

            if isinstance(result[0], dict):
                text = result[0].get("text", "")
                raw_segments = result[0].get("segments", [])

                for seg in raw_segments:
                    if isinstance(seg, dict):
                        segments.append(ASRSegment(
                            start=seg.get("start", 0.0),
                            end=seg.get("end", 0.0),
                            text=seg.get("text", ""),
                        ))
                    elif isinstance(seg, list) and len(seg) >= 3:
                        segments.append(ASRSegment(
                            start=float(seg[0]),
                            end=float(seg[1]),
                            text=str(seg[2]),
                        ))

            return ASRResult(
                text=text,
                segments=segments,
                language=request.language,
                duration_seconds=sum(seg.end - seg.start for seg in segments) if segments else 0.0,
                metadata={"provider": self.provider_name, **request.metadata},
            )

        except Exception as e:
            import logging
            logging.error(f"FunASR 转写失败: {str(e)}")
            return MockASRProvider().transcribe(request)
