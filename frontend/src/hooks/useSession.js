import { useState, useCallback, useRef } from 'react';
import { sendMessage, clearSession, getSession } from '../api/aida.js';

export function useSession() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [currentTrend, setCurrentTrend] = useState(null);
  const [currentStrategy, setCurrentStrategy] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const sessionIdRef = useRef(() => Math.random().toString(36).slice(2, 10));
  const turnRef = useRef(0);

  const sessionId = sessionIdRef.current();

  const chat = useCallback(async (message) => {
    if (!message.trim() || loading) return null;
    setLoading(true);
    try {
      const result = await sendMessage(message, sessionId);
      turnRef.current = result.turn_number || 0;
      setCurrentEmotion({
        cluster: result.emotion_cluster,
        raw: result.raw_emotion,
        confidence: result.confidence,
      });
      setCurrentTrend(result.trend);
      setCurrentStrategy(result.strategy);
      if (result.emotion_cluster && result.emotion_cluster !== 'CRISIS') {
        setEmotionHistory(prev => [...prev, result.emotion_cluster]);
      }
      return result;
    } catch (err) {
      return {
        response: 'I seem to be having trouble connecting. Please check that the server is running.',
        emotion_cluster: 'NEUTRAL',
        raw_emotion: 'neutral',
        confidence: 0,
        trend: 'INSUFFICIENT_DATA',
        strategy: 'OPEN_CHECKIN',
        crisis_flag: false,
        session_id: sessionId,
        turn_number: turnRef.current,
      };
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId]);

  const reset = useCallback(async () => {
    try { await clearSession(sessionId); } catch { }
    setMessages([]);
    setCurrentEmotion(null);
    setCurrentTrend(null);
    setCurrentStrategy(null);
    setEmotionHistory([]);
    turnRef.current = 0;
  }, [sessionId]);

  return {
    messages,
    setMessages,
    loading,
    currentEmotion,
    currentTrend,
    currentStrategy,
    emotionHistory,
    sessionId,
    chat,
    reset,
    turnNumber: turnRef.current,
  };
}
