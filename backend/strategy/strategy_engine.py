"""
Strategy Selection Layer — AEIF Layer 5.
Maps trend + current emotion cluster to a CBT-aligned intervention strategy.
"""

import logging

logger = logging.getLogger(__name__)

STRATEGY_MAP = {
    "PERSISTENT_DISTRESS": "VALIDATION_AND_REFLECTION",
    "ESCALATING_DISTRESS": "GROUNDING",
    "ELEVATED_ANGER": "DIRECT_ENGAGEMENT",
    "IMPROVING": "ENCOURAGEMENT",
    "STABLE_POSITIVE": "POSITIVE_REINFORCEMENT",
    "FLUCTUATING": "EXPLORATORY_INQUIRY",
}

INSUFFICIENT_MAP = {
    "SADNESS": "VALIDATION",
    "ANXIETY": "GROUNDING",
    "POSITIVE": "POSITIVE_REINFORCEMENT",
    "NEUTRAL": "OPEN_CHECKIN",
    "AMBIGUOUS": "CLARIFICATION_REQUEST",
    "ANGER": "DIRECT_ENGAGEMENT",
}


class StrategyEngine:
    def select(self, trend: str, current_emotion: str) -> str:
        if trend in STRATEGY_MAP:
            return STRATEGY_MAP[trend]
        if trend == "INSUFFICIENT_DATA" and current_emotion in INSUFFICIENT_MAP:
            return INSUFFICIENT_MAP[current_emotion]
        return "OPEN_CHECKIN"
