"""
Low-confidence data collection module.
Stores low-confidence turns in memory and supports
consent-triggered persistence to disk.
"""

import json
import os
import uuid
import logging
from datetime import datetime, timezone
from collections import defaultdict

logger = logging.getLogger(__name__)

COLLECTED_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "collected")


class DataCollector:
    def __init__(self):
        self._records: dict[str, list[dict]] = defaultdict(list)

    def record_low_confidence_turn(
        self, session_id: str, turn_number: int, message: str,
        emotion: str, confidence: float, raw_emotion: str,
        trend: str, strategy: str, llm_response: str
    ) -> str:
        record_id = str(uuid.uuid4())
        entry = {
            "id": record_id,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "session_id": session_id,
            "turn_number": turn_number,
            "original_message": message,
            "detected_emotion": emotion,
            "confidence": confidence,
            "raw_emotion": raw_emotion,
            "trend": trend,
            "strategy": strategy,
            "llm_response": llm_response,
            "empathy_rating": None,
            "consented": False,
            "correct_emotion_guess": None,
            "notes": "",
        }
        self._records[session_id].append(entry)
        logger.info(
            f"Low-confidence turn recorded: session={session_id}, "
            f"turn={turn_number}, emotion={emotion}, confidence={confidence}"
        )
        return record_id

    def attach_rating(self, session_id: str, turn_number: int, empathy_rating: int) -> bool:
        for entry in self._records.get(session_id, []):
            if entry["turn_number"] == turn_number:
                entry["empathy_rating"] = empathy_rating
                return True
        return False

    def mark_consented(self, session_id: str) -> list[dict]:
        matching = []
        for entry in self._records.get(session_id, []):
            entry["consented"] = True
            matching.append(entry)
        return matching

    def update_annotation(self, record_id: str, correct_emotion_guess: str = None, notes: str = None) -> bool:
        for entries in self._records.values():
            for entry in entries:
                if entry["id"] == record_id:
                    if correct_emotion_guess is not None:
                        entry["correct_emotion_guess"] = correct_emotion_guess
                    if notes is not None:
                        entry["notes"] = notes
                    return True
        return False

    def get_all(self) -> list[dict]:
        result = []
        for entries in self._records.values():
            result.extend(entries)
        return result

    def get_rated(self) -> list[dict]:
        return [e for entries in self._records.values() for e in entries if e["empathy_rating"] is not None]

    def get_by_session(self, session_id: str) -> list[dict]:
        return self._records.get(session_id, [])

    def _consented_and_rated(self) -> list[dict]:
        result = []
        for entries in self._records.values():
            for e in entries:
                if e["consented"] and e["empathy_rating"] is not None:
                    result.append(e)
        return result

    def export_jsonl(self) -> str:
        records = self._consented_and_rated()
        return "\n".join(json.dumps(r) for r in records)

    def export_session_jsonl(self, session_id: str) -> str:
        records = [
            e for e in self._records.get(session_id, [])
            if e["consented"] and e["empathy_rating"] is not None
        ]
        return "\n".join(json.dumps(r) for r in records)

    def clear(self) -> None:
        self._records.clear()
        logger.info("DataCollector cleared")
