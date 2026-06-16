"""
AEIF Pipeline Orchestrator.
Calls all 6 layers in order: Safety → Emotion → Memory → Trend → Strategy → Response.

layers:
  1. Safety Check       — crisis detection (runs first, always)
  2. Emotion Detection  — classify message into emotion cluster
  3. Memory Update      — store emotion + message into session history
  4. Trend Analysis     — derive emotional trajectory from session history
  5. Strategy Selection — choose CBT-aligned intervention strategy
  6. Response Generation — LLM generates response (or fallback templates)
"""

import logging
import os

from safety.crisis_detector import CrisisDetector
from emotion.classifier import EmotionClassifier
from memory.session_store import SessionStore
from trend.trend_analyzer import TrendAnalyzer
from strategy.strategy_engine import StrategyEngine
from llm.prompt_builder import PromptBuilder
from llm.groq_client import GroqClient
from llm.gemini_client import GeminiClient
from feedback.feedback_store import FeedbackStore
from data_collection.collector import DataCollector

logger = logging.getLogger(__name__)

LOW_CONFIDENCE_THRESHOLD = 0.55

CRISIS_RESPONSE = """I hear you, and I'm really glad you said something. What you're feeling right now matters, and you don't have to sit with it by yourself.

Please reach out to someone who can be there with you through this:
- Mentally Aware Nigeria Initiative (MANI): 08091116264
- Lagos State Emergency Line: 08000432584
- National Emergency Services: 112

Would you be willing to call one of those numbers with me? You are not alone in this. 💙"""

TEMPLATE_FALLBACKS = {
    "VALIDATION_AND_REFLECTION": "That's really heavy. I'm here with you in it.",
    "GROUNDING": "Let's take a breath together. What's one thing you can see right now?",
    "DIRECT_ENGAGEMENT": "Alright. Tell me what actually set this off.",
    "ENCOURAGEMENT": "You've been climbing out of a hard place. That takes real strength.",
    "POSITIVE_REINFORCEMENT": "That's genuinely great to hear. You've earned that peace.",
    "EXPLORATORY_INQUIRY": "Things seem to be moving around a bit. What's shifting for you right now?",
    "VALIDATION": "That's a lot to carry. I'm here whenever you're ready.",
    "CLARIFICATION_REQUEST": "I want to make sure I understand. Could you tell me a bit more?",
    "OPEN_CHECKIN": "How are you feeling about things right now?",
}


class AEIFPipeline:
    def __init__(self):
        self.crisis_detector = CrisisDetector()
        self.emotion_classifier = EmotionClassifier()
        self.session_store = SessionStore()
        self.trend_analyzer = TrendAnalyzer()
        self.strategy_engine = StrategyEngine()
        self.prompt_builder = PromptBuilder()
        self.gemini_client = GeminiClient()
        self.groq_client = GroqClient()
        self.data_collector = DataCollector()
        self.feedback_store = FeedbackStore(data_collector=self.data_collector)

    def process_message(self, message: str, session_id: str, use_aeif: bool = True) -> dict:
        if not message or not message.strip():
            return {
                "error": True,
                "message": "Empty message",
                "code": "EMPTY_MESSAGE",
            }

        # Layer 1: Safety Check
        is_crisis, crisis_keywords = self.crisis_detector.detect(message)
        if is_crisis:
            self.session_store.add_message(
                session_id, "user", message,
                emotion_cluster="CRISIS", raw_emotion="crisis",
                confidence=1.0, strategy="CRISIS_INTERVENTION"
            )
            self.session_store.add_message(
                session_id, "assistant", CRISIS_RESPONSE,
                emotion_cluster="CRISIS", raw_emotion="crisis",
                confidence=1.0, strategy="CRISIS_INTERVENTION"
            )
            return {
                "response": CRISIS_RESPONSE,
                "emotion_cluster": "CRISIS",
                "raw_emotion": "crisis",
                "confidence": 1.0,
                "trend": "INSUFFICIENT_DATA",
                "strategy": "CRISIS_INTERVENTION",
                "crisis_flag": True,
                "session_id": session_id,
                "turn_number": self.session_store.get_turn_count(session_id) // 2,
            }

        # Layer 2: Emotion Detection
        emotion_result = self.emotion_classifier.classify(message)
        emotion_cluster = emotion_result["emotion_cluster"]
        raw_emotion = emotion_result["raw_emotion"]
        confidence = emotion_result["confidence"]

        is_low_confidence = not is_crisis and confidence < LOW_CONFIDENCE_THRESHOLD

        # Layer 3: Memory Update (user message)
        self.session_store.add_message(
            session_id, "user", message,
            emotion_cluster=emotion_cluster, raw_emotion=raw_emotion,
            confidence=confidence, strategy="",
            low_confidence=is_low_confidence,
        )

        if use_aeif:
            # Layer 4: Trend Analysis
            emotion_history = self.session_store.get_emotion_history(session_id)
            trend = self.trend_analyzer.analyze(emotion_history)

            # Layer 5: Strategy Selection
            strategy = self.strategy_engine.select(trend, emotion_cluster)

            # Layer 6: AEIF Response Generation
            response = self._generate_response(message, emotion_cluster, trend, strategy, session_id)
        else:
            trend = "INSUFFICIENT_DATA"
            strategy = "STANDARD"
            response = self._generate_baseline_response(message, session_id)

        # Memory Update (assistant response)
        self.session_store.add_message(
            session_id, "assistant", response,
            emotion_cluster=emotion_cluster, raw_emotion=raw_emotion,
            confidence=confidence, strategy=strategy
        )

        if is_low_confidence:
            self.data_collector.record_low_confidence_turn(
                session_id=session_id,
                turn_number=self.session_store.get_turn_count(session_id) // 2,
                message=message,
                emotion=emotion_cluster,
                confidence=confidence,
                raw_emotion=raw_emotion,
                trend=trend,
                strategy=strategy,
                llm_response=response,
            )

        return {
            "response": response,
            "emotion_cluster": emotion_cluster,
            "raw_emotion": raw_emotion,
            "confidence": confidence,
            "trend": trend,
            "strategy": strategy,
            "crisis_flag": False,
            "session_id": session_id,
            "turn_number": self.session_store.get_turn_count(session_id) // 2,
            "mode": "aeif" if use_aeif else "baseline",
            "low_confidence": is_low_confidence,
        }

    def _generate_baseline_response(self, message: str, session_id: str) -> str:
        for client_name, client in [("Gemini", self.gemini_client), ("Groq", self.groq_client)]:
            if client.available():
                try:
                    history = self.session_store.get_history(session_id)
                    messages = self.prompt_builder.build_baseline(history)
                    messages.append({"role": "user", "content": message})
                    return client.generate(messages, max_tokens=200, temperature=0.8)
                except Exception as e:
                    logger.warning(f"Baseline {client_name} failed ({e}), trying next")
        return TEMPLATE_FALLBACKS["OPEN_CHECKIN"]

    def _generate_response(self, message: str, emotion_cluster: str, trend: str, strategy: str, session_id: str) -> str:
        for client_name, client in [("Gemini", self.gemini_client), ("Groq", self.groq_client)]:
            if client.available():
                try:
                    history = self.session_store.get_history(session_id)
                    messages = self.prompt_builder.build(emotion_cluster, trend, strategy, history)
                    messages.append({"role": "user", "content": message})
                    return client.generate(messages, max_tokens=200, temperature=0.8)
                except Exception as e:
                    logger.warning(f"{client_name} failed ({e}), trying next")

        fallback = TEMPLATE_FALLBACKS.get(strategy, TEMPLATE_FALLBACKS["OPEN_CHECKIN"])
        return fallback
