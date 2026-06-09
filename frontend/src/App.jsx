import React, { useState, useRef, useEffect, useCallback } from 'react';
import DisclaimerScreen from './components/DisclaimerScreen.jsx';
import EmotionPulse from './components/EmotionPulse.jsx';
import TrendTimeline from './components/TrendTimeline.jsx';
import StrategyBadge from './components/StrategyBadge.jsx';
import FeedbackStars from './components/FeedbackStars.jsx';
import SessionSummary from './components/SessionSummary.jsx';
import { sendMessage, clearSession, getSession } from './api/aida.js';

const CLUSTER_META = {
  POSITIVE:  { label: 'Positive',  color: '#5BAD7A', bar: '#5BAD7A' },
  SADNESS:   { label: 'Sadness',   color: '#4682B4', bar: '#4682B4' },
  ANXIETY:   { label: 'Anxiety',   color: '#C8963C', bar: '#C8963C' },
  ANGER:     { label: 'Anger',     color: '#B44646', bar: '#B44646' },
  NEUTRAL:   { label: 'Neutral',   color: '#8A94A0', bar: '#8A94A0' },
  AMBIGUOUS: { label: 'Ambiguous', color: '#7864A0', bar: '#7864A0' },
  CRISIS:    { label: 'Crisis',    color: '#B05050', bar: '#B05050' },
};

const SUGGESTIONS = [
  "I've been feeling overwhelmed lately",
  "I'm not sure how I feel today",
  "Something good happened and I want to share it",
  "I need someone to talk to",
];

function timeStr() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function EmotionTag({ emotion, confidence }) {
  const meta = CLUSTER_META[emotion] || CLUSTER_META.NEUTRAL;
  return (
    <span className="emotion-tag" style={{ color: meta.color, background: meta.color + '15' }}>
      <span className="emotion-dot" style={{ background: meta.color }} />
      {meta.label}{confidence ? ` · ${Math.round(confidence * 100)}%` : ''}
    </span>
  );
}

export default function App() {
  const [accepted, setAccepted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('NEUTRAL');
  const [currentTrend, setCurrentTrend] = useState(null);
  const [currentStrategy, setCurrentStrategy] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const sessionIdRef = useRef(Math.random().toString(36).slice(2, 10));
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const turnRef = useRef(0);

  const sessionId = sessionIdRef.current;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const chat = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setMessages(prev => [...prev, {
      role: 'user', text: msg, time: timeStr(), id: Date.now(),
    }]);
    setLoading(true);

    try {
      const result = await sendMessage(msg, sessionId);
      turnRef.current = result.turn_number || 0;
      setCurrentEmotion(result.emotion_cluster || 'NEUTRAL');
      setCurrentTrend(result.trend);
      setCurrentStrategy(result.strategy);
      if (result.emotion_cluster && result.emotion_cluster !== 'CRISIS') {
        setEmotionHistory(prev => [...prev, result.emotion_cluster]);
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: result.response || "I'm here. Could you tell me more?",
        emotion: result.emotion_cluster,
        rawEmotion: result.raw_emotion,
        confidence: result.confidence,
        crisis: result.crisis_flag,
        strategy: result.strategy,
        turn: result.turn_number,
        time: timeStr(),
        id: Date.now() + 1,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I seem to be having trouble connecting. Please check that the server is running.',
        emotion: 'NEUTRAL',
        time: timeStr(),
        id: Date.now() + 1,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chat();
    }
  };

  const handleTextarea = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const endSession = async () => {
    try {
      const data = await getSession(sessionId);
      setSessionData(data);
    } catch { }
    setShowSummary(true);
  };

  const newSession = async () => {
    try {
      await clearSession(sessionId);
    } catch { }
    setMessages([]);
    setCurrentEmotion('NEUTRAL');
    setCurrentTrend(null);
    setCurrentStrategy(null);
    setEmotionHistory([]);
    setShowSummary(false);
    setSessionData(null);
    turnRef.current = 0;
  };

  if (!accepted) {
    return (
      <>
        <style>{styles}</style>
        <DisclaimerScreen onAccept={() => setAccepted(true)} />
      </>
    );
  }

  const totalEmotions = messages.filter(m => m.role === 'assistant' && m.emotion && m.emotion !== 'CRISIS').length;
  const emotionCounts = {};
  messages.filter(m => m.role === 'assistant' && m.emotion).forEach(m => {
    emotionCounts[m.emotion] = (emotionCounts[m.emotion] || 0) + 1;
  });

  return (
    <>
      <style>{styles}</style>
      <EmotionPulse emotionCluster={currentEmotion} />
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">AIDA</div>
          <div className="sidebar-tagline">
            Affective Intelligent Dialogue Agent
          </div>

          <StrategyBadge strategy={currentStrategy} />

          <div className="sidebar-divider" />

          <div className="sidebar-label">This session</div>
          <div className="sidebar-stats">
            {Object.entries(CLUSTER_META).map(([key, meta]) => {
              const count = emotionCounts[key] || 0;
              const pct = totalEmotions > 0 ? (count / totalEmotions) * 100 : 0;
              return (
                <div key={key}>
                  <div className="stat-row">
                    <span className="stat-dot" style={{ background: meta.color }} />
                    <span className="stat-name">{meta.label}</span>
                    <span className="stat-count">{count}</span>
                  </div>
                  {totalEmotions > 0 && (
                    <div className="stat-bar-wrap">
                      <div className="stat-bar" style={{ width: pct + '%', background: meta.bar }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <TrendTimeline history={emotionHistory} />

          <div className="sidebar-divider" />
          <button className="btn-secondary" onClick={endSession} disabled={messages.length === 0}>
            ☶ &nbsp; End session
          </button>
          <button className="btn-secondary" onClick={newSession}>
            ↺ &nbsp; New conversation
          </button>
          <div className="sidebar-footer">
            This conversation is private and not stored after the session ends.
          </div>
        </aside>

        <main className="chat-main">
          <header className="chat-header">
            <div className="header-avatar">🌿</div>
            <div>
              <div className="header-name">AIDA</div>
              <div className="header-status">
                <span className="header-online" />
                {currentStrategy ? 'Listening' : 'Ready'}
              </div>
            </div>
          </header>

          <div className="messages-wrap">
            {messages.length === 0 && !loading ? (
              <div className="welcome-state">
                <div className="welcome-icon">🌿</div>
                <div className="welcome-title">How are you feeling today?</div>
                <p className="welcome-body">
                  This is a quiet space. Take your time — there is no rush.
                  You can start with whatever is on your mind.
                </p>
                <div className="welcome-suggestions">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} className="suggestion-chip" onClick={() => chat(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={'message-group ' + msg.role}>
                    <div className={'message-bubble' + (msg.crisis ? ' crisis' : '')}>
                      {msg.text}
                    </div>
                    {msg.role === 'assistant' && msg.emotion && (
                      <div className="message-meta">
                        <EmotionTag emotion={msg.emotion} confidence={msg.confidence} />
                        {!msg.crisis && msg.turn && (
                          <FeedbackStars sessionId={sessionId} turnNumber={msg.turn} strategy={msg.strategy} emotionCluster={msg.emotion} mode="aeif" />
                        )}
                      </div>
                    )}
                    <div className="message-time">{msg.time}</div>
                  </div>
                ))}
                {loading && (
                  <div className="message-group assistant">
                    <div className="typing-bubble">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="input-area">
            <div className="input-wrap">
              <textarea
                ref={textareaRef}
                className="input-field"
                placeholder="Share what's on your mind…"
                value={input}
                onChange={handleTextarea}
                onKeyDown={handleKey}
                rows={1}
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={() => chat()}
                disabled={!input.trim() || loading}
                aria-label="Send"
              >
                ↑
              </button>
            </div>
            <div className="input-hint">
              Press Enter to send &nbsp;·&nbsp; Shift+Enter for a new line
            </div>
          </div>
        </main>
      </div>

      {showSummary && (
        <SessionSummary
          dominantEmotion={sessionData?.dominant_emotion}
          trend={sessionData?.trend}
          turnCount={sessionData?.turn_count || messages.length}
          onClose={newSession}
        />
      )}
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:          #F7F3EE;
    --surface:     #FFFFFF;
    --surface2:    #F0EBE3;
    --border:      #E2D9CE;
    --text:        #2C2420;
    --text-soft:   #7A6A60;
    --text-faint:  #B8A89A;
    --accent:      #7C6E5E;
    --accent-warm: #C4956A;
    --accent-light:#EDE0D0;
    --crisis:      #8B2E2E;
    --crisis-bg:   #FDF0F0;
    --positive:    #3D6B4F;
    --positive-bg: #EBF5EE;
    --negative:    #6B4C3D;
    --negative-bg: #F5EDE8;
    --neutral:     #5A6470;
    --neutral-bg:  #EEF0F2;
    --ambiguous:   #5A5070;
    --ambiguous-bg:#EEEDF5;
    --shadow-sm:   0 1px 3px rgba(44,36,32,0.08);
    --shadow-md:   0 4px 16px rgba(44,36,32,0.10);
    --radius:      16px;
    --radius-sm:   10px;
    --font-display:'DM Serif Display', Georgia, serif;
    --font-body:   'DM Sans', system-ui, sans-serif;
    --transition:  0.2s ease;
  }

  html, body, #root { height: 100%; }

  body {
    background: var(--bg);
    font-family: var(--font-body);
    color: var(--text);
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  .disclaimer-overlay {
    position: fixed; inset: 0;
    background: rgba(44,36,32,0.55);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    z-index: 100;
    padding: 24px;
    animation: fadeIn 0.4s ease;
  }
  .disclaimer-card {
    background: var(--surface);
    border-radius: 24px;
    padding: 40px 44px;
    max-width: 520px; width: 100%;
    box-shadow: 0 24px 64px rgba(44,36,32,0.18);
  }
  .disclaimer-eyebrow {
    font-size: 11px; font-weight: 500;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent-warm);
    margin-bottom: 12px;
  }
  .disclaimer-title {
    font-family: var(--font-display);
    font-size: 28px; line-height: 1.25;
    color: var(--text);
    margin-bottom: 20px;
  }
  .disclaimer-body {
    color: var(--text-soft);
    font-size: 14px; line-height: 1.7;
    margin-bottom: 24px;
  }
  .disclaimer-rules {
    background: var(--surface2);
    border-radius: var(--radius-sm);
    padding: 16px 20px;
    margin-bottom: 28px;
    list-style: none;
  }
  .disclaimer-rules li {
    font-size: 13px; color: var(--text-soft);
    padding: 5px 0;
    display: flex; gap: 10px; align-items: flex-start;
  }
  .disclaimer-rules li::before {
    content: "—"; color: var(--accent-warm); flex-shrink: 0;
    margin-top: 1px;
  }
  .crisis-line {
    background: var(--crisis-bg);
    border-left: 3px solid var(--crisis);
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 28px;
    font-size: 13px; color: var(--crisis);
    line-height: 1.6;
  }
  .crisis-line strong { display: block; margin-bottom: 2px; }
  .btn-primary {
    width: 100%;
    background: var(--text);
    color: #fff;
    border: none; border-radius: 12px;
    padding: 14px 24px;
    font-family: var(--font-body);
    font-size: 15px; font-weight: 500;
    cursor: pointer;
    transition: background var(--transition), transform var(--transition);
  }
  .btn-primary:hover { background: var(--accent); transform: translateY(-1px); }
  .btn-primary:active { transform: translateY(0); }

  .app {
    height: 100vh;
    display: grid;
    grid-template-columns: 260px 1fr;
    grid-template-rows: 1fr;
    position: relative;
  }

  .sidebar {
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    padding: 32px 24px;
    overflow-y: auto;
  }
  .sidebar-logo {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--text);
    margin-bottom: 4px;
    font-style: italic;
  }
  .sidebar-tagline {
    font-size: 12px; color: var(--text-faint);
    font-weight: 300;
    margin-bottom: 24px;
  }
  .sidebar-label {
    font-size: 10px; font-weight: 500;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--text-faint);
    margin-bottom: 12px;
  }
  .sidebar-stats {
    display: flex; flex-direction: column;
    gap: 6px;
    margin-bottom: 20px;
  }
  .stat-row {
    display: flex; align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 8px;
    transition: background var(--transition);
  }
  .stat-row:hover { background: var(--surface2); }
  .stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .stat-name { font-size: 12px; color: var(--text-soft); flex: 1; }
  .stat-count {
    font-size: 12px; font-weight: 500;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .stat-bar-wrap { width: 100%; height: 3px; background: var(--surface2); border-radius: 2px; overflow: hidden; }
  .stat-bar { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
  .sidebar-divider { height: 1px; background: var(--border); margin: 16px 0; }

  .btn-secondary {
    display: flex; align-items: center; gap: 8px;
    background: none; border: 1px solid var(--border);
    border-radius: 10px; padding: 10px 14px;
    color: var(--text-soft); font-size: 13px;
    font-family: var(--font-body);
    cursor: pointer;
    transition: all var(--transition);
    width: 100%;
    margin-bottom: 8px;
  }
  .btn-secondary:hover:not(:disabled) {
    background: var(--surface2);
    color: var(--text);
    border-color: var(--accent);
  }
  .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  .sidebar-footer {
    margin-top: auto;
    font-size: 11px; color: var(--text-faint);
    line-height: 1.5;
  }

  .chat-main {
    display: flex; flex-direction: column;
    height: 100vh; overflow: hidden;
  }
  .chat-header {
    padding: 20px 32px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
    background: var(--surface);
    flex-shrink: 0;
  }
  .header-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--accent-light);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  }
  .header-name {
    font-family: var(--font-display);
    font-size: 17px; color: var(--text);
  }
  .header-status { font-size: 12px; color: var(--text-faint); }
  .header-online {
    display: inline-block;
    width: 6px; height: 6px; border-radius: 50%;
    background: #5BAD7A;
    margin-right: 4px;
    vertical-align: middle;
  }

  .messages-wrap {
    flex: 1; overflow-y: auto;
    padding: 32px;
    display: flex; flex-direction: column;
    gap: 24px;
    scroll-behavior: smooth;
  }
  .messages-wrap::-webkit-scrollbar { width: 4px; }
  .messages-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .message-group {
    display: flex; flex-direction: column;
    gap: 4px;
    animation: slideUp 0.3s ease;
  }
  .message-group.user { align-items: flex-end; }
  .message-group.assistant { align-items: flex-start; }

  .message-bubble {
    max-width: 62%;
    padding: 14px 18px;
    border-radius: 18px;
    font-size: 15px; line-height: 1.6;
    position: relative;
  }
  .message-group.user .message-bubble {
    background: var(--text);
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  .message-group.assistant .message-bubble {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-bottom-left-radius: 4px;
    box-shadow: var(--shadow-sm);
  }
  .message-bubble.crisis {
    background: var(--crisis-bg);
    border-color: #E8B4B4;
    border-left: 3px solid var(--crisis);
  }

  .message-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 2px;
  }

  .emotion-tag {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 11px; font-weight: 500;
    letter-spacing: 0.04em;
  }
  .emotion-dot { width: 5px; height: 5px; border-radius: 50%; }

  .message-time {
    font-size: 11px; color: var(--text-faint);
    margin-top: 2px;
    padding: 0 4px;
  }

  .typing-bubble {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px; border-bottom-left-radius: 4px;
    padding: 14px 18px;
    display: inline-flex; gap: 5px; align-items: center;
    box-shadow: var(--shadow-sm);
  }
  .typing-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--text-faint);
    animation: bounce 1.2s infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .typing-dot:nth-child(3) { animation-delay: 0.30s; }

  .welcome-state {
    flex: 1; display: flex;
    flex-direction: column; align-items: center; justify-content: center;
    text-align: center; gap: 16px;
    padding: 40px;
    color: var(--text-soft);
  }
  .welcome-icon {
    font-size: 40px;
    background: var(--accent-light);
    width: 72px; height: 72px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 8px;
  }
  .welcome-title {
    font-family: var(--font-display);
    font-size: 24px; color: var(--text);
    font-style: italic;
  }
  .welcome-body { font-size: 14px; max-width: 320px; line-height: 1.7; }
  .welcome-suggestions { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .suggestion-chip {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 8px 18px;
    font-size: 13px; color: var(--text-soft);
    cursor: pointer;
    transition: all var(--transition);
    font-family: var(--font-body);
  }
  .suggestion-chip:hover {
    background: var(--accent-light);
    border-color: var(--accent-warm);
    color: var(--text);
  }

  .input-area {
    padding: 20px 32px 24px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .input-wrap {
    display: flex; align-items: flex-end; gap: 12px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 16px;
    padding: 12px 16px;
    transition: border-color var(--transition), box-shadow var(--transition);
  }
  .input-wrap:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(124,110,94,0.10);
  }
  .input-field {
    flex: 1; border: none; background: transparent;
    font-family: var(--font-body);
    font-size: 15px; color: var(--text);
    resize: none; outline: none;
    max-height: 120px; line-height: 1.5;
    padding: 2px 0;
  }
  .input-field::placeholder { color: var(--text-faint); }
  .send-btn {
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--text); border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    transition: background var(--transition), transform var(--transition);
    color: white; font-size: 16px;
  }
  .send-btn:hover:not(:disabled) { background: var(--accent); transform: scale(1.05); }
  .send-btn:disabled { background: var(--border); cursor: not-allowed; transform: none; }
  .input-hint { text-align: center; font-size: 11px; color: var(--text-faint); margin-top: 10px; }

  /* Emotion Pulse */
  .emotion-pulse {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  }
  .pulse-ring {
    position: absolute;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 400px;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.6;
    animation: softPulse 4s ease-in-out infinite;
  }

  /* Strategy Badge */
  .strategy-badge {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    background: var(--surface2);
    border-radius: 20px;
    font-size: 11px; font-weight: 500;
    color: var(--text-soft);
    margin-bottom: 8px;
  }
  .strategy-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent-warm);
  }

  /* Trend Timeline */
  .trend-timeline {
    padding: 12px 0;
    margin-bottom: 8px;
  }
  .timeline-label {
    font-size: 10px; font-weight: 500;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--text-faint);
    margin-bottom: 10px;
  }
  .timeline-track {
    display: flex;
    align-items: center;
    gap: 0;
  }
  .timeline-dot-wrap {
    display: flex;
    align-items: center;
  }
  .timeline-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }
  .timeline-dot.current {
    transform: scale(1.4);
    box-shadow: 0 0 0 3px rgba(44,36,32,0.08);
  }
  .timeline-connector {
    width: 12px;
    height: 2px;
    opacity: 0.4;
  }

  /* Feedback Stars */
  .feedback-stars {
    display: inline-flex;
    gap: 2px;
    align-items: center;
  }
  .star-btn {
    background: none;
    border: none;
    font-size: 14px;
    color: var(--text-faint);
    cursor: pointer;
    padding: 0 1px;
    transition: color 0.15s ease, transform 0.15s ease;
    line-height: 1;
  }
  .star-btn.active {
    color: var(--accent-warm);
  }
  .star-btn:hover {
    transform: scale(1.2);
  }

  /* Session Summary */
  .summary-overlay {
    position: fixed; inset: 0;
    background: rgba(44,36,32,0.55);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    z-index: 100;
    padding: 24px;
    animation: fadeIn 0.4s ease;
  }
  .summary-card {
    background: var(--surface);
    border-radius: 24px;
    padding: 40px 44px;
    max-width: 480px; width: 100%;
    box-shadow: 0 24px 64px rgba(44,36,32,0.18);
    text-align: center;
  }
  .summary-icon {
    font-size: 40px;
    margin-bottom: 16px;
  }
  .summary-title {
    font-family: var(--font-display);
    font-size: 24px;
    color: var(--text);
    margin-bottom: 12px;
  }
  .summary-message {
    color: var(--text-soft);
    font-size: 14px;
    margin-bottom: 24px;
  }
  .summary-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  .summary-stat {
    background: var(--surface2);
    border-radius: var(--radius-sm);
    padding: 16px;
  }
  .summary-stat-label {
    display: block;
    font-size: 11px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .summary-stat-value {
    font-family: var(--font-display);
    font-size: 20px;
    color: var(--text);
  }
  .summary-trend {
    color: var(--text-soft);
    font-size: 14px;
    line-height: 1.7;
    margin-bottom: 20px;
    font-style: italic;
  }
  .summary-reminder {
    font-size: 12px;
    color: var(--text-faint);
    margin-bottom: 24px;
    line-height: 1.6;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
  @keyframes softPulse {
    0%, 100% { opacity: 0.4; transform: translateX(-50%) scale(1); }
    50% { opacity: 0.7; transform: translateX(-50%) scale(1.05); }
  }

  @media (max-width: 700px) {
    .app { grid-template-columns: 1fr; }
    .sidebar { display: none; }
    .messages-wrap, .input-area { padding-left: 16px; padding-right: 16px; }
    .message-bubble { max-width: 88%; }
  }
`;
