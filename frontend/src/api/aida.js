import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export async function sendMessage(message, sessionId) {
  const { data } = await api.post('/chat', { message, session_id: sessionId });
  return data;
}

export async function healthCheck() {
  const { data } = await api.get('/health');
  return data;
}

export async function getSession(sessionId) {
  const { data } = await api.get(`/session/${sessionId}`);
  return data;
}

export async function clearSession(sessionId) {
  const { data } = await api.delete(`/session/${sessionId}`);
  return data;
}

export async function submitFeedback(sessionId, turnNumber, empathyRating, strategy = '', emotionCluster = '', mode = 'aeif') {
  const { data } = await api.post('/feedback', {
    session_id: sessionId,
    turn_number: turnNumber,
    empathy_rating: empathyRating,
    strategy,
    emotion_cluster: emotionCluster,
    mode,
  });
  return data;
}

export async function exportSession(sessionId) {
  const { data } = await api.get(`/session/${sessionId}/export`);
  return data;
}
