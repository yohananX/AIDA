"""
Groq SDK wrapper with exponential backoff retry.
Used by AEIF Layer 6 (Response Generation).
"""

import os
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class GroqClient:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.client = None
        self._init_client()

    def _init_client(self):
        if not self.api_key:
            logger.warning("GROQ_API_KEY not set")
            return
        try:
            from groq import Groq
            self.client = Groq(api_key=self.api_key)
        except Exception as e:
            logger.warning(f"Groq SDK init failed: {e}")

    def available(self) -> bool:
        return self.client is not None

    def generate(self, messages: list[dict], max_tokens: int = 300, temperature: float = 0.7) -> str:
        if not self.client:
            raise RuntimeError("Groq client not available")

        last_err = None
        for attempt in range(1, 4):
            try:
                resp = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                content = resp.choices[0].message.content
                if content and content.strip():
                    return content.strip()
                last_err = RuntimeError("Empty response")
            except Exception as e:
                last_err = e
                backoff = 0.5 * (2 ** (attempt - 1))
                logger.warning(f"Groq attempt {attempt} failed: {e}, retrying in {backoff:.1f}s")
                time.sleep(backoff)

        raise RuntimeError(f"Groq generation failed: {last_err}")
