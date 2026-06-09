import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from safety.crisis_detector import CrisisDetector


def test_crisis_detection_direct():
    d = CrisisDetector()
    assert d.detect("I want to kill myself") == (True, ["kill myself"])
    assert d.detect("I want to end it all") == (True, ["end it all"])
    assert d.detect("I feel sad today") == (False, [])


def test_crisis_detection_colloquial():
    d = CrisisDetector()
    assert d.detect("I can't take it anymore")[0] is True
    assert d.detect("what's the point")[0] is True
    assert d.detect("nobody would miss me")[0] is True


def test_crisis_detection_nigerian():
    d = CrisisDetector()
    assert d.detect("I don tire")[0] is True
    assert d.detect("make I die")[0] is True
    assert d.detect("I no fit take am again")[0] is True


def test_crisis_detection_normal():
    d = CrisisDetector()
    assert d.detect("I had a great day") == (False, [])
    assert d.detect("") == (False, [])
    assert d.detect("Hello, how are you?") == (False, [])


def test_crisis_detection_edge():
    d = CrisisDetector()
    assert d.detect("suicidal thoughts") == (True, ["suicidal"])
    assert d.detect("better off dead")[0] is True
