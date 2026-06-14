"""
Emotion Detection Layer — AEIF Layer 2.
Classifies current message into one of six emotion clusters.
Uses j-hartmann/emotion-english-distilroberta-base via HuggingFace pipeline.
Fallback: GoEmotions 4-cluster keyword classifier.
"""

import os
import re
import logging

logger = logging.getLogger(__name__)

EMOTION_CLUSTERS = {
    "POSITIVE": {"joy", "love", "optimism", "relief", "gratitude", "admiration"},
    "SADNESS": {"sadness", "grief", "disappointment", "remorse"},
    "ANXIETY": {"fear", "nervousness", "worry"},
    "ANGER": {"anger", "annoyance", "disgust"},
    "NEUTRAL": {"neutral"},
    "AMBIGUOUS": {"confusion", "surprise"},
}

HF_LABEL_TO_CLUSTER = {}
for cluster, labels in EMOTION_CLUSTERS.items():
    for label in labels:
        HF_LABEL_TO_CLUSTER[label] = cluster

GOEMOTIONS_TO_CLUSTER = {
    "admiration": "POSITIVE", "amusement": "POSITIVE", "approval": "POSITIVE",
    "caring": "POSITIVE", "desire": "POSITIVE", "excitement": "POSITIVE",
    "gratitude": "POSITIVE", "joy": "POSITIVE", "love": "POSITIVE",
    "optimism": "POSITIVE", "pride": "POSITIVE", "relief": "POSITIVE",
    "anger": "ANGER", "annoyance": "ANGER", "disapproval": "ANGER",
    "disgust": "ANGER", "embarrassment": "SADNESS", "remorse": "SADNESS",
    "sadness": "SADNESS", "grief": "SADNESS", "disappointment": "SADNESS",
    "fear": "ANXIETY", "nervousness": "ANXIETY",
    "confusion": "AMBIGUOUS", "curiosity": "AMBIGUOUS",
    "realization": "AMBIGUOUS", "surprise": "AMBIGUOUS",
    "neutral": "NEUTRAL",
}

CONTRADICTORY_BUT_PATTERN = re.compile(
    r"\b(but|though|however|yet)\b", re.IGNORECASE
)

POSITIVE_WORDS_SET = {
    "happy", "joy", "glad", "excited", "great", "wonderful", "love",
    "grateful", "proud", "accomplish", "blessed", "fantastic", "amazing",
    "beautiful", "delight", "cheerful", "good", "care", "best", "won",
    "proud", "finished", "finally",
}

NEGATIVE_WORDS_SET = {
    "sad", "depress", "down", "unhappy", "lonely", "miserable", "cry",
    "grief", "disappointed", "remorse", "regret", "heartbroken",
    "hopeless", "empty", "lost", "hurt", "broken", "miss",
    "anxious", "anxiety", "fear", "scared", "afraid", "worried", "worry",
    "nervous", "panic", "terrified", "dread", "uneasy", "restless",
    "overwhelm", "stress", "angry", "annoyed", "furious", "mad",
    "frustrated", "rage", "irritated", "disgust", "hate", "bitter",
    "exhausted", "terrified", "messed", "don't care", "don't deserve",
    "could be worse", "i guess", "pretending",
}

KEYWORD_CLUSTER_MAP = {
    "POSITIVE": [
        "happy", "joy", "glad", "excited", "great", "wonderful", "love",
        "grateful", "thankful", "optimistic", "relieved", "admire", "proud",
        "accomplish", "blessed", "fantastic", "amazing", "beautiful",
        "care deeply", "mean the world", "best day", "so happy",
        "delight", "cheerful", "good news",
        "God dey", "everything go dey alright",
        "helped", "better", "feel better", "helped a little", "feel good",
        "not alone", "someone to talk", "needed to talk", "thank you",
        "relieved", "appreciate", "that helped", "feeling better",
        "starting to", "little better", "bit better",
    ],
    "SADNESS": [
        "sad", "depress", "down", "unhappy", "lonely", "miserable", "cry",
        "grief", "griev", "disappointed", "remorse", "regret", "heartbroken",
        "hopeless", "empty", "lost", "hurt", "broken", "miss them",
        "miss", "giving up", "feel like giving up", "nobody understands",
        "going through", "fail", "failed", "moved away",
        "life no balance", "nobody dey for me", "my heart dey pain",
        "worthless", "tired of trying", "let everyone down",
        "letting people down", "not enough",
    ],
    "ANXIETY": [
        "anxious", "anxiety", "fear", "scared", "afraid", "worried", "worry",
        "nervous", "panic", "terrified", "dread", "uneasy", "restless",
        "overwhelm", "stress", "disappoint everyone", "what if",
        "my mind dey scatter", "I no fit sleep", "wawu",
    ],
    "ANGER": [
        "angry", "annoyed", "furious", "mad", "frustrated", "rage", "irritated",
        "disgust", "hate", "resent", "bitter", "pissed",
        "I dey vex", "no be small", "wahala dey",
    ],
    "AMBIGUOUS": [
        "confused", "unsure", "surprised", "unexpected", "shocked", "curious",
        "uncertain", "mixed", "confusing", "can't believe",
        "e be like say", "but I", "should be happy",
        "not sure", "don't know", "not certain", "hard to say",
        "not really sure", "can't tell", "not clear",
    ],
}

for cluster, words in KEYWORD_CLUSTER_MAP.items():
    KEYWORD_CLUSTER_MAP[cluster] = [re.compile(w, re.IGNORECASE) for w in words]


class EmotionClassifier:
    def __init__(self):
        self.pipeline = None
        self._load_pipeline()

    def _load_pipeline(self):
        try:
            from transformers import pipeline as hf_pipeline
            model = "j-hartmann/emotion-english-distilroberta-base"
            self.pipeline = hf_pipeline(
                "text-classification",
                model=model,
                top_k=None,
                device=-1,
            )
            logger.info(f"HF emotion pipeline loaded: {model}")
        except Exception as e:
            logger.warning(f"HF pipeline failed to load ({e}), using keyword fallback")

    def classify(self, text: str) -> dict:
        if not text or not text.strip():
            return {"emotion_cluster": "NEUTRAL", "raw_emotion": "neutral", "confidence": 0.0}

        if self._is_ambiguous_expression(text):
            return {"emotion_cluster": "AMBIGUOUS", "raw_emotion": "ambiguous", "confidence": 0.65}

        hf_result = self._classify_hf(text)
        if hf_result and hf_result["confidence"] >= 0.5:
            if self._check_ambiguity(text, hf_result):
                return {"emotion_cluster": "AMBIGUOUS", "raw_emotion": "ambiguous", "confidence": 0.6}
            return hf_result
        keyword_result = self._classify_keywords(text)
        if keyword_result and keyword_result["confidence"] >= 0.5:
            if self._check_ambiguity(text, keyword_result):
                return {"emotion_cluster": "AMBIGUOUS", "raw_emotion": "ambiguous", "confidence": 0.6}
            return keyword_result
        if hf_result and hf_result["confidence"] >= 0.3:
            return hf_result
        if keyword_result:
            return keyword_result
        return {"emotion_cluster": "NEUTRAL", "raw_emotion": "neutral", "confidence": 0.0}

    def _is_ambiguous_expression(self, text: str) -> bool:
        text_lower = text.lower().strip()
        ambiguous_patterns = [
            r"not\s*sure", r"don't\s*know", r"can't\s*tell",
            r"not\s*certain", r"hard\s*to\s*say", r"not\s*clear",
            r"can't\s*really\s*say", r"not\s*really\s*sure",
            r"uncertain", r"confused", r"confusing", r"confusion",
        ]
        for pattern in ambiguous_patterns:
            if re.search(pattern, text_lower):
                return True
        return False

    def _check_ambiguity(self, text: str, classification: dict) -> bool:
        text_lower = text.lower()
        if CONTRADICTORY_BUT_PATTERN.search(text_lower):
            has_positive = any(w in text_lower for w in POSITIVE_WORDS_SET)
            has_negative = any(w in text_lower for w in NEGATIVE_WORDS_SET)
            if has_positive and has_negative:
                return True
        ambiguous_phrases = [
            "should be happy but", "don't care", "don't deserve",
            "could be worse", "i guess", "pretending",
            "inside i felt nothing", "don't feel it",
            "not sure how i feel", "not sure how i'm feeling",
            "don't know how i feel", "can't tell how i feel",
        ]
        for phrase in ambiguous_phrases:
            if phrase in text_lower:
                return True
        return False

    def _classify_hf(self, text: str) -> dict | None:
        if not self.pipeline:
            return None
        try:
            results = self.pipeline(text[:512])
            if isinstance(results, list) and len(results) > 0:
                if isinstance(results[0], list):
                    scores = {r["label"].lower(): r["score"] for r in results[0]}
                elif isinstance(results[0], dict):
                    scores = {r["label"].lower(): r["score"] for r in results}
                else:
                    return None
                raw_emotion = max(scores, key=scores.get)
                confidence = scores[raw_emotion]
                cluster = HF_LABEL_TO_CLUSTER.get(raw_emotion, "AMBIGUOUS")
                return {"emotion_cluster": cluster, "raw_emotion": raw_emotion, "confidence": round(confidence, 4)}
        except Exception as e:
            logger.warning(f"HF classification error: {e}")
        return None

    def _classify_keywords(self, text: str) -> dict | None:
        scores = {}
        for cluster, patterns in KEYWORD_CLUSTER_MAP.items():
            count = sum(1 for p in patterns if p.search(text))
            if count > 0:
                scores[cluster] = count
        if not scores:
            return None
        total = sum(scores.values())
        best = max(scores, key=scores.get)
        confidence = round(scores[best] / (total + len(scores) * 0.1), 4)
        return {"emotion_cluster": best, "raw_emotion": best.lower(), "confidence": min(confidence, 0.85)}
