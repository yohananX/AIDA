"""
Tests for the DataCollector module.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data_collection.collector import DataCollector


def test_record_and_retrieve():
    dc = DataCollector()
    rid = dc.record_low_confidence_turn(
        session_id="s1", turn_number=1, message="hello",
        emotion="NEUTRAL", confidence=0.45, raw_emotion="neutral",
        trend="INSUFFICIENT_DATA", strategy="OPEN_CHECKIN",
        llm_response="Hi there!",
    )
    all_records = dc.get_all()
    assert len(all_records) == 1
    assert all_records[0]["id"] == rid
    assert all_records[0]["original_message"] == "hello"


def test_attach_rating():
    dc = DataCollector()
    dc.record_low_confidence_turn(
        session_id="s2", turn_number=1, message="test",
        emotion="NEUTRAL", confidence=0.50, raw_emotion="neutral",
        trend="INSUFFICIENT_DATA", strategy="OPEN_CHECKIN",
        llm_response="Hello!",
    )
    ok = dc.attach_rating("s2", 1, 4)
    assert ok is True
    rated = dc.get_rated()
    assert len(rated) == 1
    assert rated[0]["empathy_rating"] == 4


def test_attach_rating_not_found():
    dc = DataCollector()
    dc.record_low_confidence_turn(
        session_id="s3", turn_number=1, message="test",
        emotion="NEUTRAL", confidence=0.50, raw_emotion="neutral",
        trend="INSUFFICIENT_DATA", strategy="OPEN_CHECKIN",
        llm_response="Hello!",
    )
    ok = dc.attach_rating("nonexistent", 1, 3)
    assert ok is False
    ok = dc.attach_rating("s3", 999, 3)
    assert ok is False


def test_mark_consented():
    dc = DataCollector()
    dc.record_low_confidence_turn(
        session_id="A", turn_number=1, message="msg1",
        emotion="NEUTRAL", confidence=0.40, raw_emotion="neutral",
        trend="INSUFFICIENT_DATA", strategy="OPEN_CHECKIN",
        llm_response="Hi",
    )
    dc.record_low_confidence_turn(
        session_id="A", turn_number=2, message="msg2",
        emotion="SADNESS", confidence=0.30, raw_emotion="sadness",
        trend="INSUFFICIENT_DATA", strategy="VALIDATION",
        llm_response="I hear you",
    )
    dc.record_low_confidence_turn(
        session_id="B", turn_number=1, message="msg3",
        emotion="NEUTRAL", confidence=0.50, raw_emotion="neutral",
        trend="INSUFFICIENT_DATA", strategy="OPEN_CHECKIN",
        llm_response="Hi",
    )

    consented = dc.mark_consented("A")
    assert len(consented) == 2

    for entry in dc.get_by_session("A"):
        assert entry["consented"] is True
    for entry in dc.get_by_session("B"):
        assert entry["consented"] is False


def test_update_annotation():
    dc = DataCollector()
    rid = dc.record_low_confidence_turn(
        session_id="s4", turn_number=1, message="annotate me",
        emotion="NEUTRAL", confidence=0.45, raw_emotion="neutral",
        trend="INSUFFICIENT_DATA", strategy="OPEN_CHECKIN",
        llm_response="Hello",
    )
    ok = dc.update_annotation(rid, correct_emotion_guess="SADNESS", notes="looks sad")
    assert ok is True
    record = dc.get_all()[0]
    assert record["correct_emotion_guess"] == "SADNESS"
    assert record["notes"] == "looks sad"


def test_update_annotation_not_found():
    dc = DataCollector()
    ok = dc.update_annotation("fake-id", correct_emotion_guess="NEUTRAL")
    assert ok is False


def test_export_jsonl_only_consented_and_rated():
    dc = DataCollector()
    dc.record_low_confidence_turn(
        session_id="s5", turn_number=1, message="turn1",
        emotion="NEUTRAL", confidence=0.40, raw_emotion="neutral",
        trend="INSUFFICIENT_DATA", strategy="OPEN_CHECKIN",
        llm_response="Hi",
    )
    dc.record_low_confidence_turn(
        session_id="s5", turn_number=2, message="turn2",
        emotion="SADNESS", confidence=0.35, raw_emotion="sadness",
        trend="INSUFFICIENT_DATA", strategy="VALIDATION",
        llm_response="I hear you",
    )
    dc.record_low_confidence_turn(
        session_id="s5", turn_number=3, message="turn3",
        emotion="NEUTRAL", confidence=0.50, raw_emotion="neutral",
        trend="INSUFFICIENT_DATA", strategy="OPEN_CHECKIN",
        llm_response="Hello again",
    )

    dc.attach_rating("s5", 1, 5)
    dc.attach_rating("s5", 2, 3)
    dc.mark_consented("s5")

    jsonl = dc.export_jsonl()
    lines = [l for l in jsonl.split("\n") if l.strip()]
    assert len(lines) == 2, f"Expected 2 lines, got {len(lines)}"

    parsed = [__import__("json").loads(l) for l in lines]
    turn_numbers = [p["turn_number"] for p in parsed]
    assert 1 in turn_numbers
    assert 2 in turn_numbers
    assert 3 not in turn_numbers


def test_clear():
    dc = DataCollector()
    dc.record_low_confidence_turn(
        session_id="s6", turn_number=1, message="clear me",
        emotion="NEUTRAL", confidence=0.40, raw_emotion="neutral",
        trend="INSUFFICIENT_DATA", strategy="OPEN_CHECKIN",
        llm_response="Hello",
    )
    assert len(dc.get_all()) == 1
    dc.clear()
    assert len(dc.get_all()) == 0
