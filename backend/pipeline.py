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
from feedback.feedback_store import FeedbackStore

logger = logging.getLogger(__name__)

CRISIS_RESPONSE = """I hear that you're carrying something very heavy right now, and I'm glad you reached out.

Please speak to someone who can truly be there for you:
- Mentally Aware Nigeria Initiative (MANI): 08091116264
- Lagos State Emergency Line: 08000432584
- National Emergency Services: 112

You do not have to face this alone. 💙"""

TEMPLATE_FALLBACKS = {
    "VALIDATION_AND_REFLECTION": "That sounds incredibly difficult. I want you to know that what you're feeling is completely valid, and I'm here to listen without any judgment.",
    "GROUNDING": "I can hear how overwhelming this feels right now. Let's take a gentle moment together — can you notice three things you can hear around you?",
    "CALM_REFLECTION": "That sounds really frustrating. I can understand why you'd feel that way. Would you like to tell me more about what happened?",
    "ENCOURAGEMENT": "It sounds like things are shifting in a better direction. That takes real strength. What do you think helped make that change?",
    "POSITIVE_REINFORCEMENT": "That's wonderful to hear. It's important to recognise these positive moments. What do you think is contributing to how you feel right now?",
    "EXPLORATORY_INQUIRY": "I'm picking up on a few different emotions there. Could you help me understand a bit more about what's going on?",
    "VALIDATION": "I hear you. That's a lot to carry. I'm here to listen whenever you're ready.",
    "CLARIFICATION_REQUEST": "I want to make sure I understand you correctly. Could you tell me a bit more about what you mean?",
    "OPEN_CHECKIN": "Thanks for sharing. How are you feeling about things right now?",
}


class AEIFPipeline:
    def __init__(self):
        self.crisis_detector = CrisisDetector()
        self.emotion_classifier = EmotionClassifier()
        self.session_store = SessionStore()
        self.trend_analyzer = TrendAnalyzer()
        self.strategy_engine = StrategyEngine()
        self.prompt_builder = PromptBuilder()
        self.groq_client = GroqClient()
        self.feedback_store = FeedbackStore()

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

        # Layer 3: Memory Update (user message)
        self.session_store.add_message(
            session_id, "user", message,
            emotion_cluster=emotion_cluster, raw_emotion=raw_emotion,
            confidence=confidence, strategy=""
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
        }

    def _generate_baseline_response(self, message: str, session_id: str) -> str:
        if self.groq_client.available():
            try:
                history = self.session_store.get_history(session_id)
                messages = self.prompt_builder.build_baseline(history)
                messages.append({"role": "user", "content": message})
                return self.groq_client.generate(messages)
            except Exception as e:
                logger.warning(f"Baseline LLM failed ({e}), using standard fallback")
        return TEMPLATE_FALLBACKS["OPEN_CHECKIN"]

    def _generate_response(self, message: str, emotion_cluster: str, trend: str, strategy: str, session_id: str) -> str:
        if self.groq_client.available():
            try:
                history = self.session_store.get_history(session_id)
                messages = self.prompt_builder.build(emotion_cluster, trend, strategy, history)
                messages.append({"role": "user", "content": message})
                return self.groq_client.generate(messages)
            except Exception as e:
                logger.warning(f"LLM generation failed ({e}), using template fallback")

        fallback = TEMPLATE_FALLBACKS.get(strategy, TEMPLATE_FALLBACKS["OPEN_CHECKIN"])
        return fallback
