"""
Gemini SDK wrapper with exponential backoff retry.
Uses google.genai (new SDK, replaces deprecated google.generativeai).
"""

import os
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class GeminiClient:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.client = None
        self._init_client()

    def _init_client(self):
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set")
            return
        try:
            from google import genai
            from google.genai import types

            self._genai_types = types
            self.client = genai.Client(api_key=self.api_key)
            logger.info(f"Gemini client initialized (model: {self.model_name})")
        except Exception as e:
            logger.warning(f"Gemini SDK init failed: {e}")

    def available(self) -> bool:
        return self.client is not None

    def generate(self, messages: list[dict], max_tokens: int = 300, temperature: float = 0.7) -> str:
        if not self.client:
            raise RuntimeError("Gemini client not available")

        system_prompt = None
        user_content = None
        for msg in messages:
            if msg["role"] == "system":
                system_prompt = msg["content"]
            elif msg["role"] == "user":
                user_content = msg["content"]

        if not user_content:
            raise RuntimeError("No user message found in request")

        contents = [{"role": "user", "parts": [{"text": user_content}]}]

        config = self._genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_tokens,
            temperature=temperature,
        )

        last_err = None
        for attempt in range(1, 4):
            try:
                resp = self.client.models.generate_content(
                    model=self.model_name,
                    contents=contents,
                    config=config,
                )
                text = resp.text
                if text and text.strip():
                    return text.strip()
                last_err = RuntimeError("Empty response")
            except Exception as e:
                last_err = e
                backoff = 0.5 * (2 ** (attempt - 1))
                logger.warning(f"Gemini attempt {attempt} failed: {e}, retrying in {backoff:.1f}s")
                time.sleep(backoff)

        raise RuntimeError(f"Gemini generation failed: {last_err}")
