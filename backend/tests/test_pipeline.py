import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pipeline import AEIFPipeline


def test_pipeline_normal_message():
    p = AEIFPipeline()
    result = p.process_message("I'm feeling happy today!", "test_session_1")
    assert result["crisis_flag"] is False
    assert result["emotion_cluster"] in ("POSITIVE", "NEUTRAL")
    assert "response" in result
    assert "session_id" in result
    assert result["session_id"] == "test_session_1"


def test_pipeline_crisis_message():
    p = AEIFPipeline()
    result = p.process_message("I want to kill myself", "test_session_2")
    assert result["crisis_flag"] is True
    assert result["emotion_cluster"] == "CRISIS"
    assert "MANI" in result["response"] or "Mentally" in result["response"]


def test_pipeline_empty_message():
    p = AEIFPipeline()
    result = p.process_message("", "test_session_3")
    assert result.get("error") is True


def test_pipeline_session_tracking():
    p = AEIFPipeline()
    p.process_message("I'm sad", "test_session_4")
    p.process_message("I feel better now", "test_session_4")
    hist = p.session_store.get_emotion_history("test_session_4")
    assert len(hist) == 2


def test_pipeline_clear_session():
    p = AEIFPipeline()
    p.process_message("Hello", "test_session_5")
    p.session_store.clear_session("test_session_5")
    assert p.session_store.get_history("test_session_5") == []
