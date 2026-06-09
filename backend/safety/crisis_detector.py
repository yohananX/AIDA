"""
Safety Layer — AEIF Layer 1.
Keyword + pattern matcher for crisis detection.
Runs first, always, unconditionally before any other pipeline layer.
"""

import re
import logging

logger = logging.getLogger(__name__)


class CrisisDetector:
    def __init__(self):
        self.critical_patterns = self._compile([
            "kill myself", "end it all", "want to die", "not want to be here",
            "can't take it anymore", "what's the point", "nobody would miss me",
            "tired of everything", "ending it", "hurting myself", "cut myself",
            "self harm", "suicide", "suicidal", "end my life", "end this now",
            "better off dead", "wish i was dead", "want to disappear forever",
            "no reason to live",             "i give up", "can't go on", "cannot go on",
            "go on much longer", "can't go on much longer",
            "no hope left", "nothing matters anymore",
            "no one cares about me", "i don't want to wake up",
            "i want to sleep forever",
            "i just want everything to stop", "what's even the point of waking up",
            "nobody would even notice if i disappeared",
            "i've been thinking about ending things",
            "i don tire", "e don be", "make I die", "God abeg",
            "I can't do this life again", "life no get meaning",
            "I no fit take am again", "make una leave me",
            "person wey no get hope", "my head dey pain me die",
            "I wan disappear", "better make I rest",
            "I just wan rest", "no one go miss me",
            "God when you go take me", "make I just sleep",
        ])

    def _compile(self, keywords):
        return re.compile(
            "|".join(re.escape(kw) for kw in keywords),
            re.IGNORECASE
        )

    def detect(self, text: str) -> tuple[bool, list[str]]:
        if not text or not text.strip():
            return False, []
        matches = self.critical_patterns.findall(text.lower())
        if matches:
            logger.warning(f"Crisis detected: {matches}")
            return True, matches
        return False, []
