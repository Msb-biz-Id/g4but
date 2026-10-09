"""AI Service e-KASUARI (Fase AI-1/AI-2).

Service terpisah (modular monolith) dengan provider abstraction (AIG-005):
- Jika OPENAI_API_KEY + OPENAI_BASE_URL tersedia, memakai endpoint OpenAI-compatible.
- Jika TIDAK ada API key, service mengembalikan HTTP 503 agar Laravel mencatat
  status 'FAILED' yang sesungguhnya (BR-AI-008 — dilarang fallback diam-diam ke mock).
Layanan ini TIDAK memiliki akses tulis ke tabel transaksi inti (AIG-001).

Jalankan:
    pip install -r ai-service/requirements.txt
    uvicorn main:app --app-dir ai-service --port 8001
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("ekasuari_ai")

app = FastAPI(title="e-KASUARI AI Service")


class GenerateRequest(BaseModel):
    feature: str = "executive_summary"
    prompt: str = ""
    context: dict[str, Any] = {}


class HealthResponse(BaseModel):
    status: str
    provider: str


class GenerateResponse(BaseModel):
    output: str
    provider: str


def _llm_configured() -> bool:
    """Kembalikan True hanya jika API key dan base URL tersedia."""
    return (
        bool(os.getenv("OPENAI_API_KEY", "").strip())
        and bool(os.getenv("OPENAI_BASE_URL", "").strip())
    )


async def _llm_generate(feature: str, prompt: str) -> str:
    """Panggil LLM provider. Raise exception jika gagal — TANPA fallback (BR-AI-008)."""
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    # Timeout sesuai BR-AI-011: provider max 50 detik (dikurangi buffer jaringan)
    timeout = int(os.getenv("LLM_TIMEOUT_SECONDS", "45"))

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Buat analisis sesuai konteks dan format JSON yang diminta."},
                ],
                "response_format": {"type": "json_object"},  # enforce JSON output jika provider mendukung
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        provider="llm" if _llm_configured() else "unconfigured",
    )


@app.post("/api/v1/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest) -> GenerateResponse:
    """
    Generate output AI. Jika LLM belum dikonfigurasi atau gagal dipanggil,
    kembalikan HTTP 503 agar Laravel mencatat status FAILED (BR-AI-008).
    TIDAK ada fallback diam-diam ke rule-based.
    """
    if not _llm_configured():
        logger.error(
            "LLM provider tidak dikonfigurasi (OPENAI_API_KEY/OPENAI_BASE_URL kosong). "
            "Set environment variable dan restart service."
        )
        raise HTTPException(
            status_code=503,
            detail="AI provider belum dikonfigurasi. Hubungi Administrator untuk mengaktifkan API key.",
        )

    try:
        output = await _llm_generate(request.feature, request.prompt)
        return GenerateResponse(output=output, provider="llm")
    except httpx.TimeoutException as exc:
        logger.error("LLM timeout setelah %s detik: %s", os.getenv("LLM_TIMEOUT_SECONDS", "45"), exc)
        raise HTTPException(
            status_code=504,
            detail="Pemanggilan API AI timeout. Silakan coba lagi.",
        ) from exc
    except httpx.HTTPStatusError as exc:
        logger.error("LLM HTTP error %s: %s", exc.response.status_code, exc.response.text[:200])
        raise HTTPException(
            status_code=502,
            detail=f"Respons error dari AI provider (HTTP {exc.response.status_code}).",
        ) from exc
    except Exception as exc:
        logger.exception("LLM generate gagal: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Pemanggilan AI gagal. Silakan coba lagi atau hubungi Administrator.",
        ) from exc
