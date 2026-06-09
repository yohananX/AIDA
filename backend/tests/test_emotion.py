import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from emotion.classifier import EmotionClassifier


def test_emotion_positive():
    c = EmotionClassifier()
    r = c.classify("I'm so happy and excited about this wonderful news!")
    assert r["emotion_cluster"] == "POSITIVE"


def test_emotion_sadness():
    c = EmotionClassifier()
    r = c.classify("I feel so sad and lonely. Everything seems hopeless.")
    assert r["emotion_cluster"] == "SADNESS"


def test_emotion_anxiety():
    c = EmotionClassifier()
    r = c.classify("I'm really anxious about my exam next week.")
    assert r["emotion_cluster"] == "ANXIETY"


def test_emotion_anger():
    c = EmotionClassifier()
    r = c.classify("I'm so angry and frustrated right now!")
    assert r["emotion_cluster"] == "ANGER"


def test_emotion_neutral():
    c = EmotionClassifier()
    r = c.classify("The sky is blue and the grass is green.")
    assert r["emotion_cluster"] == "NEUTRAL"


def test_emotion_ambiguous():
    c = EmotionClassifier()
    r = c.classify("I'm confused about what happened. It was so unexpected.")
    assert r["emotion_cluster"] == "AMBIGUOUS"


def test_emotion_empty():
    c = EmotionClassifier()
    r = c.classify("")
    assert r["emotion_cluster"] == "NEUTRAL"
