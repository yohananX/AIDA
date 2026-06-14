import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from strategy.strategy_engine import StrategyEngine


def test_persistent_distress_strategy():
    s = StrategyEngine()
    assert s.select("PERSISTENT_DISTRESS", "SADNESS") == "VALIDATION_AND_REFLECTION"
    assert s.select("PERSISTENT_DISTRESS", "ANXIETY") == "VALIDATION_AND_REFLECTION"


def test_escalating_distress_strategy():
    s = StrategyEngine()
    assert s.select("ESCALATING_DISTRESS", "ANXIETY") == "GROUNDING"


def test_elevated_anger_strategy():
    s = StrategyEngine()
    assert s.select("ELEVATED_ANGER", "ANGER") == "DIRECT_ENGAGEMENT"


def test_improving_strategy():
    s = StrategyEngine()
    assert s.select("IMPROVING", "POSITIVE") == "ENCOURAGEMENT"
    assert s.select("IMPROVING", "NEUTRAL") == "ENCOURAGEMENT"


def test_stable_positive_strategy():
    s = StrategyEngine()
    assert s.select("STABLE_POSITIVE", "POSITIVE") == "POSITIVE_REINFORCEMENT"


def test_fluctuating_strategy():
    s = StrategyEngine()
    assert s.select("FLUCTUATING", "AMBIGUOUS") == "EXPLORATORY_INQUIRY"


def test_insufficient_data_strategies():
    s = StrategyEngine()
    assert s.select("INSUFFICIENT_DATA", "SADNESS") == "VALIDATION"
    assert s.select("INSUFFICIENT_DATA", "ANXIETY") == "GROUNDING"
    assert s.select("INSUFFICIENT_DATA", "POSITIVE") == "POSITIVE_REINFORCEMENT"
    assert s.select("INSUFFICIENT_DATA", "NEUTRAL") == "OPEN_CHECKIN"
    assert s.select("INSUFFICIENT_DATA", "AMBIGUOUS") == "CLARIFICATION_REQUEST"
    assert s.select("INSUFFICIENT_DATA", "ANGER") == "DIRECT_ENGAGEMENT"
