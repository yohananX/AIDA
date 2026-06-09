"""
Feedback Store — In-memory per-turn empathy ratings.
Used by the /feedback endpoint.
Supports summary aggregation by strategy, emotion cluster, and mode.
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class FeedbackStore:
    def __init__(self):
        self._ratings: dict[str, list[dict]] = defaultdict(list)

    def record(self, session_id: str, turn_number: int, empathy_rating: int,
               strategy: str = "", emotion_cluster: str = "", mode: str = "aeif") -> bool:
        if empathy_rating < 1 or empathy_rating > 5:
            return False
        entry = {
            "session_id": session_id,
            "turn_number": turn_number,
            "empathy_rating": empathy_rating,
            "strategy": strategy,
            "emotion_cluster": emotion_cluster,
            "mode": mode,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        self._ratings[session_id].append(entry)
        logger.info(f"Feedback recorded: session={session_id}, turn={turn_number}, rating={empathy_rating}")
        return True

    def get_session_ratings(self, session_id: str) -> list[dict]:
        return self._ratings.get(session_id, [])

    def get_summary(self) -> dict:
        all_ratings = [r for ratings in self._ratings.values() for r in ratings]
        if not all_ratings:
            return {
                "total_ratings": 0,
                "average_rating": 0.0,
                "by_strategy": {},
                "by_emotion_cluster": {},
                "by_mode": {},
            }

        def avg(values: list[float]) -> float:
            return round(sum(values) / len(values), 2) if values else 0.0

        by_strategy: dict[str, list[int]] = defaultdict(list)
        by_emotion: dict[str, list[int]] = defaultdict(list)
        by_mode: dict[str, list[int]] = defaultdict(list)

        for r in all_ratings:
            s = r.get("strategy", "") or "UNKNOWN"
            e = r.get("emotion_cluster", "") or "UNKNOWN"
            m = r.get("mode", "aeif")
            by_strategy[s].append(r["empathy_rating"])
            by_emotion[e].append(r["empathy_rating"])
            by_mode[m].append(r["empathy_rating"])

        return {
            "total_ratings": len(all_ratings),
            "average_rating": avg([r["empathy_rating"] for r in all_ratings]),
            "by_strategy": {k: {"count": len(v), "average": avg(v)} for k, v in sorted(by_strategy.items())},
            "by_emotion_cluster": {k: {"count": len(v), "average": avg(v)} for k, v in sorted(by_emotion.items())},
            "by_mode": {k: {"count": len(v), "average": avg(v)} for k, v in sorted(by_mode.items())},
        }

    def clear_session(self, session_id: str):
        if session_id in self._ratings:
            del self._ratings[session_id]
