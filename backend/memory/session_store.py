"""
Memory Update Layer — AEIF Layer 3.
In-memory session store. No database. No disk writes.
Session data lives in RAM and is cleared on reset.
Capped at 20 turns per session.
"""

import logging
from datetime import datetime, timezone
from collections import defaultdict

logger = logging.getLogger(__name__)

MAX_TURNS = 20


class SessionStore:
    def __init__(self):
        self.sessions: dict[str, list[dict]] = defaultdict(list)

    def _new_entry(self, role: str, text: str, emotion_cluster: str, raw_emotion: str, confidence: float, strategy: str = "", low_confidence: bool = False) -> dict:
        return {
            "role": role,
            "text": text,
            "emotion_cluster": emotion_cluster,
            "raw_emotion": raw_emotion,
            "confidence": confidence,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "strategy": strategy,
            "low_confidence": low_confidence,
        }

    def add_message(self, session_id: str, role: str, text: str, emotion_cluster: str = "NEUTRAL", raw_emotion: str = "neutral", confidence: float = 0.0, strategy: str = "", low_confidence: bool = False) -> dict:
        entry = self._new_entry(role, text, emotion_cluster, raw_emotion, confidence, strategy, low_confidence)
        session = self.sessions[session_id]
        session.append(entry)
        if len(session) > MAX_TURNS:
            self.sessions[session_id] = session[-MAX_TURNS:]
        return entry

    def get_history(self, session_id: str) -> list[dict]:
        return self.sessions.get(session_id, [])

    def get_emotion_history(self, session_id: str) -> list[str]:
        return [
            m["emotion_cluster"]
            for m in self.sessions.get(session_id, [])
            if m["role"] == "user"
        ]

    def get_turn_count(self, session_id: str) -> int:
        return len(self.sessions.get(session_id, []))

    def get_dominant_emotion(self, session_id: str) -> str:
        emotions = self.get_emotion_history(session_id)
        if not emotions:
            return "NEUTRAL"
        from collections import Counter
        return Counter(emotions).most_common(1)[0][0]

    def clear_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Session cleared: {session_id}")

    def export_session(self, session_id: str, trend_progression: list[dict] | None = None) -> dict:
        history = self.get_history(session_id)
        if not history:
            return {"error": True, "message": "Session not found", "code": "SESSION_NOT_FOUND"}
        turns = []
        i = 0
        while i < len(history):
            user_msg = history[i] if history[i]["role"] == "user" else None
            asst_msg = history[i + 1] if i + 1 < len(history) and history[i + 1]["role"] == "assistant" else None
            if user_msg:
                turns.append({
                    "user_message": user_msg.get("text", ""),
                    "user_emotion": user_msg.get("emotion_cluster", ""),
                    "user_confidence": user_msg.get("confidence", 0.0),
                    "assistant_response": asst_msg.get("text", "") if asst_msg else "",
                    "strategy": (asst_msg or user_msg).get("strategy", ""),
                })
            i += 2
        return {
            "session_id": session_id,
            "turn_count": len(history),
            "user_turn_count": len(turns),
            "dominant_emotion": self.get_dominant_emotion(session_id),
            "turns": turns,
            "trend_progression": trend_progression or [],
        }
