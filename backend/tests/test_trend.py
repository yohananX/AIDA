import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from trend.trend_analyzer import TrendAnalyzer


def test_persistent_distress():
    t = TrendAnalyzer()
    assert t.analyze(["SADNESS", "SADNESS", "SADNESS"]) == "PERSISTENT_DISTRESS"
    assert t.analyze(["ANXIETY", "ANXIETY", "ANXIETY"]) == "PERSISTENT_DISTRESS"


def test_escalating_distress():
    t = TrendAnalyzer()
    assert t.analyze(["NEUTRAL", "ANXIETY", "SADNESS"]) == "ESCALATING_DISTRESS"


def test_elevated_anger():
    t = TrendAnalyzer()
    assert t.analyze(["ANGER", "ANGER"]) == "ELEVATED_ANGER"


def test_improving():
    t = TrendAnalyzer()
    assert t.analyze(["SADNESS", "NEUTRAL", "POSITIVE"]) == "IMPROVING"


def test_stable_positive():
    t = TrendAnalyzer()
    assert t.analyze(["POSITIVE", "POSITIVE", "POSITIVE"]) == "STABLE_POSITIVE"


def test_fluctuating():
    t = TrendAnalyzer()
    assert t.analyze(["SADNESS", "ANXIETY", "SADNESS"]) == "FLUCTUATING"
    assert t.analyze(["SADNESS", "ANXIETY", "SADNESS", "POSITIVE"]) == "FLUCTUATING"


def test_insufficient_data():
    t = TrendAnalyzer()
    assert t.analyze([]) == "INSUFFICIENT_DATA"
    assert t.analyze(["NEUTRAL"]) == "INSUFFICIENT_DATA"
    assert t.analyze(["NEUTRAL", "NEUTRAL"]) == "INSUFFICIENT_DATA"
