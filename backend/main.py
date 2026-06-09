"""
FastAPI application entry point.
Registers all routes: /chat, /health, /session, /feedback
"""

import os
import logging
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pipeline import AEIFPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AIDA — Affective Intelligent Dialogue Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = AEIFPipeline()


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    mode: str = "aeif"


class FeedbackRequest(BaseModel):
    session_id: str
    turn_number: int
    empathy_rating: int = Field(ge=1, le=5)
    strategy: str = ""
    emotion_cluster: str = ""
    mode: str = "aeif"


@app.post("/chat")
async def chat(req: ChatRequest):
    use_aeif = req.mode == "aeif"
    result = pipeline.process_message(req.message, req.session_id, use_aeif=use_aeif)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result)
    return result


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": pipeline.emotion_classifier.pipeline is not None,
    }


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    history = pipeline.session_store.get_history(session_id)
    if not history:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Session not found", "code": "SESSION_NOT_FOUND"})
    return {
        "history": history,
        "trend": pipeline.trend_analyzer.analyze(pipeline.session_store.get_emotion_history(session_id)),
        "dominant_emotion": pipeline.session_store.get_dominant_emotion(session_id),
        "turn_count": pipeline.session_store.get_turn_count(session_id),
    }


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    pipeline.session_store.clear_session(session_id)
    pipeline.feedback_store.clear_session(session_id)
    return {"cleared": True}


@app.post("/feedback")
async def feedback(req: FeedbackRequest):
    recorded = pipeline.feedback_store.record(
        req.session_id, req.turn_number, req.empathy_rating,
        strategy=req.strategy, emotion_cluster=req.emotion_cluster, mode=req.mode,
    )
    if not recorded:
        raise HTTPException(status_code=400, detail={"error": True, "message": "Invalid rating (must be 1-5)", "code": "INVALID_RATING"})
    return {"recorded": True}


@app.get("/feedback/summary")
async def feedback_summary():
    return pipeline.feedback_store.get_summary()


@app.get("/session/{session_id}/export")
async def export_session(session_id: str):
    emotion_history = pipeline.session_store.get_emotion_history(session_id)
    trend_progression = []
    for i in range(len(emotion_history)):
        trend = pipeline.trend_analyzer.analyze(emotion_history[:i + 1])
        trend_progression.append({
            "turn": i + 1,
            "emotion": emotion_history[i],
            "trend": trend,
        })

    result = pipeline.session_store.export_session(session_id, trend_progression=trend_progression)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result)

    ratings = pipeline.feedback_store.get_session_ratings(session_id)
    result["feedback"] = ratings
    return result
