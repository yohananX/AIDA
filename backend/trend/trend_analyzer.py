"""
Trend Analysis Layer — AEIF Layer 4.
Derives emotional trajectory from session emotion history using
weighted severity scoring (replacing earlier streak-only logic).
"""

import logging
import statistics

logger = logging.getLogger(__name__)

WINDOW_SIZE = 10
MIN_TURNS = 3

SEVERITY_WEIGHTS = {
    "POSITIVE": 0.0,
    "NEUTRAL": 0.3,
    "AMBIGUOUS": 0.4,
    "ANXIETY": 0.6,
    "ANGER": 0.7,
    "SADNESS": 0.8,
    "CRISIS": 1.0,
}


class TrendAnalyzer:
    def analyze(self, emotion_history: list[str]) -> str:
        if not emotion_history:
            return "INSUFFICIENT_DATA"

        recent = emotion_history[-WINDOW_SIZE:]

        if self._is_elevated_anger(recent):
            return "ELEVATED_ANGER"

        if len(recent) < MIN_TURNS:
            return "INSUFFICIENT_DATA"

        scores = [SEVERITY_WEIGHTS.get(e, 0.3) for e in recent]
        avg_score = statistics.mean(scores)

        if self._is_escalating_distress(scores):
            return "ESCALATING_DISTRESS"
        if self._is_improving(scores, recent):
            return "IMPROVING"
        if self._is_fluctuating(recent, scores):
            return "FLUCTUATING"
        if self._is_persistent_distress(scores, avg_score):
            return "PERSISTENT_DISTRESS"
        if self._is_stable_positive(scores, recent):
            return "STABLE_POSITIVE"

        return "INSUFFICIENT_DATA"

    def _is_elevated_anger(self, recent: list[str]) -> bool:
        count = 0
        for e in recent:
            if e == "ANGER":
                count += 1
            else:
                count = 0
            if count >= 2:
                return True
        return False

    def _is_persistent_distress(self, scores: list[float], avg_score: float) -> bool:
        return avg_score > 0.55

    def _is_escalating_distress(self, scores: list[float]) -> bool:
        for i in range(1, len(scores)):
            if scores[i] <= scores[i - 1]:
                return False
        return True

    def _is_improving(self, scores: list[float], recent: list[str]) -> bool:
        for i in range(1, len(scores)):
            if scores[i] >= scores[i - 1]:
                return False
        first_half = recent[:len(recent) // 2] if len(recent) >= 2 else recent
        has_negative = any(e in ("SADNESS", "ANXIETY", "ANGER") for e in first_half)
        return has_negative

    def _is_fluctuating(self, recent: list[str], scores: list[float]) -> bool:
        direction_changes = 0
        for i in range(2, len(scores)):
            prev_diff = scores[i - 1] - scores[i - 2]
            curr_diff = scores[i] - scores[i - 1]
            if prev_diff != 0 and curr_diff != 0 and (prev_diff > 0) != (curr_diff > 0):
                direction_changes += 1
        return direction_changes >= 1

    def _is_stable_positive(self, scores: list[float], recent: list[str]) -> bool:
        avg = statistics.mean(scores)
        if avg > 0.2:
            return False
        tail = recent[-3:] if len(recent) >= 3 else recent
        return any(e == "POSITIVE" for e in tail)
