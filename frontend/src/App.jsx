import React, { useState, useRef, useEffect, useCallback } from 'react';
import DisclaimerScreen from './components/DisclaimerScreen.jsx';
import EmotionPulse from './components/EmotionPulse.jsx';
import TrendTimeline from './components/TrendTimeline.jsx';
import StrategyBadge from './components/StrategyBadge.jsx';
import FeedbackStars from './components/FeedbackStars.jsx';
import SessionSummary from './components/SessionSummary.jsx';
import ResearcherView from './components/ResearcherView.jsx';
import { sendMessage, clearSession, getSession } from './api/aida.js';

const CLUSTER_META = {
  POSITIVE:  { label: 'Positive',  color: '#4edea3', bar: '#4edea3' },
  SADNESS:   { label: 'Sadness',   color: '#7cb9e8', bar: '#7cb9e8' },
  ANXIETY:   { label: 'Anxiety',   color: '#ffb869', bar: '#ffb869' },
  ANGER:     { label: 'Anger',     color: '#ff8a80', bar: '#ff8a80' },
  NEUTRAL:   { label: 'Neutral',   color: '#9e94a8', bar: '#9e94a8' },
  AMBIGUOUS: { label: 'Ambiguous', color: '#c8b8ff', bar: '#c8b8ff' },
  CRISIS:    { label: 'Crisis',    color: '#ff7b7b', bar: '#ff7b7b' },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SUGGESTIONS = shuffle([
  "I've been feeling overwhelmed lately",
  "I'm not sure how I feel today",
  "Something good happened and I want to share it",
  "I need someone to talk to",
]);

function timeStr() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lowConfidenceTurns, setLowConfidenceTurns] = useState([]);
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
        mode: result.mode || 'aeif',
        low_confidence: result.low_confidence || false,
        time: timeStr(),
        id: Date.now() + 1,
      }]);
      if (result.low_confidence && result.turn_number) {
        setLowConfidenceTurns(prev => [...prev, result.turn_number]);
      }
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
    setLowConfidenceTurns([]);
    turnRef.current = 0;
  };

  const handleConsentGiven = async () => {
    try {
      await fetch('http://localhost:8000/data/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (e) {
      console.error('Consent save failed:', e);
    }
    newSession();
  };

  const handleConsentDeclined = () => {
    newSession();
  };

  if (window.location.hash === '#researcher') {
    return <ResearcherView />;
  }

  if (!accepted) {
    return <DisclaimerScreen onAccept={() => setAccepted(true)} />;
  }

  const totalEmotions = messages.filter(m => m.role === 'assistant' && m.emotion && m.emotion !== 'CRISIS').length;
  const emotionCounts = {};
  messages.filter(m => m.role === 'assistant' && m.emotion).forEach(m => {
    emotionCounts[m.emotion] = (emotionCounts[m.emotion] || 0) + 1;
  });

  return (
    <>
      <EmotionPulse emotionCluster={currentEmotion} />

      <div className="fixed top-[-20%] left-[-20%] w-[80vw] h-[80vw] aura-primary pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] aura-secondary pointer-events-none z-0" />

      <header className="fixed top-0 left-0 right-0 z-50 h-14 md:h-16 flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawerOpen(d => !d)}
            className="flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="material-symbols-outlined text-primary text-2xl md:text-3xl">bubble_chart</span>
          <h1 className="text-lg md:text-xl font-bold text-primary tracking-tight">AIDA</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/20">
            <div className="w-2 h-2 rounded-full bg-secondary emotion-pulse" />
            <span className="text-xs text-on-surface-variant">
              {currentStrategy ? 'Listening' : 'Ready'}
            </span>
          </div>
          <button className="flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
      )}

      <div className="flex h-screen pt-14 md:pt-16 relative z-10">

        <aside className={`
          fixed md:static inset-y-0 left-0 z-50 md:z-auto
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${drawerOpen ? '' : 'md:hidden'}
          transform transition-transform duration-300 ease-in-out
          flex flex-col w-72 md:w-64 lg:w-72 shrink-0 h-full
          bg-background/95 backdrop-blur-xl md:bg-background/50
          border-r border-outline-variant/20
          p-4 md:p-5 overflow-y-auto gap-5
        `}>

          <div className="glass-card rounded-lg p-stack-md flex flex-col gap-stack-md shadow-xl">
            <div className="flex items-center gap-stack-md w-full">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/30 bg-primary/10 flex items-center justify-center text-2xl">
                🌿
              </div>
              <div className="flex flex-col">
                <span className="text-headline-md text-primary font-semibold">AIDA</span>
                <span className="text-body-md text-on-surface-variant opacity-70">Session active</span>
              </div>
            </div>
            <div className="w-full h-px bg-outline-variant/20" />
            <div className="flex items-center justify-between w-full">
              <span className="text-label-caps text-on-surface-variant uppercase">Current feeling</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CLUSTER_META[currentEmotion]?.color || '#9e94a8' }} />
                <span className="text-label-caps text-on-surface">{CLUSTER_META[currentEmotion]?.label || 'Neutral'}</span>
              </div>
            </div>
            <div className="w-full h-px bg-outline-variant/20" />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-label-caps text-on-surface-variant uppercase">Trend</span>
                {currentTrend && (
                  <span className="text-[11px] text-on-surface-variant/80 italic">{currentTrend.replace(/_/g, ' ')}</span>
                )}
              </div>
              <TrendTimeline history={emotionHistory} />
            </div>
          </div>

          <StrategyBadge strategy={currentStrategy} />

          <div className="flex flex-col gap-1">
            <div className="text-label-caps text-on-surface-variant uppercase mb-2">This session</div>
            <div className="flex flex-col gap-1.5">
              {Object.entries(CLUSTER_META).map(([key, meta]) => {
                const count = emotionCounts[key] || 0;
                const pct = totalEmotions > 0 ? (count / totalEmotions) * 100 : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                      <span className="text-xs text-on-surface-variant flex-1">{meta.label}</span>
                      <span className="text-xs font-medium text-on-surface tabular-nums">{count}</span>
                    </div>
                    {totalEmotions > 0 && (
                      <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', background: meta.bar }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <nav className="flex flex-col gap-1 mt-auto">
            <button onClick={endSession} disabled={messages.length === 0}
              className="flex items-center gap-stack-md p-3 rounded-full bg-secondary-container text-on-secondary-container transition-transform duration-300 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined">check_circle</span>
              <span className="text-body-md">End session</span>
            </button>
            <button onClick={newSession}
              className="flex items-center gap-stack-md p-3 rounded-full text-on-surface-variant hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined">add_circle</span>
              <span className="text-body-md">New conversation</span>
            </button>
            <div className="text-[11px] text-on-surface-variant/50 leading-relaxed px-3 pt-2">
              This conversation is private and not stored after the session ends.
            </div>
          </nav>
        </aside>

        <section className="flex-1 flex flex-col h-full overflow-hidden">

          <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 flex flex-col gap-4">
            {messages.length === 0 && !loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-4">
                <div className="text-3xl md:text-[40px] bg-primary/5 w-16 h-16 md:w-[72px] md:h-[72px] rounded-full flex items-center justify-center mb-2 backdrop-blur border border-white/10">
                  🌿
                </div>
                <div className="text-xl md:text-2xl font-semibold text-on-surface">How are you feeling today?</div>
                <p className="text-xs md:text-sm max-w-[280px] md:max-w-[320px] leading-relaxed text-on-surface-variant">
                  This is a quiet space. Take your time — there is no rush.
                  You can start with whatever is on your mind.
                </p>
                <div className="flex flex-col gap-2 mt-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => chat(s)}
                      className="glass-card border border-white/10 backdrop-blur rounded-full px-3 md:px-[18px] py-1.5 md:py-2 text-xs md:text-sm text-on-surface-variant cursor-pointer transition-all hover:bg-primary/10 hover:border-primary/30 hover:text-on-surface hover:-translate-y-0.5 font-sans">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-[slideUp_0.3s_ease]`}>

                    <div className={`springy-bubble max-w-[92%] md:max-w-[85%] p-3 md:p-stack-md shadow-lg ${msg.role === 'user'
                      ? 'bg-primary-container text-on-primary-container rounded-2xl rounded-tr-none'
                      : msg.crisis
                        ? 'glass-card rounded-2xl rounded-tl-none border-l-2 border-l-[#ff7b7b]'
                        : 'glass-card rounded-2xl rounded-tl-none border-l-2 shadow-lg'
                    }`}
                      style={msg.role === 'assistant' && !msg.crisis && msg.emotion
                        ? { borderLeftColor: (CLUSTER_META[msg.emotion] || CLUSTER_META.NEUTRAL).color }
                        : undefined}
                    >
                      <p className="text-body-md leading-relaxed text-on-surface">{msg.text}</p>
                    </div>

                    {msg.role === 'assistant' && msg.emotion && !msg.crisis && msg.turn && (
                      <div className="flex items-center gap-2 md:gap-3 flex-wrap mt-0.5">
                        <FeedbackStars sessionId={sessionId} turnNumber={msg.turn} strategy={msg.strategy} emotionCluster={msg.emotion} mode="aeif" lowConfidence={msg.low_confidence} />
                      </div>
                    )}
                    <span className="text-[11px] text-on-surface-variant/60 px-1">{msg.time}</span>
                  </div>
                ))}
                {loading && (
                  <div className="flex flex-col gap-1 items-start">
                    <div className="glass-card rounded-2xl rounded-tl-none border-l-2 border-l-primary p-3 md:p-stack-md inline-flex gap-1.5 items-center shadow-lg">
                      <div className="w-[7px] h-[7px] rounded-full bg-primary animate-[bounce_1.2s_infinite]" />
                      <div className="w-[7px] h-[7px] rounded-full bg-primary animate-[bounce_1.2s_infinite]" style={{ animationDelay: '0.15s' }} />
                      <div className="w-[7px] h-[7px] rounded-full bg-primary animate-[bounce_1.2s_infinite]" style={{ animationDelay: '0.30s' }} />
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 px-4 md:px-6 lg:px-8 pb-3 md:pb-4 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">

            {emotionHistory.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto scroll-hide pb-2 mb-2">
                {emotionHistory.map((em, i) => (
                  <div key={i} className="flex items-center gap-0.5 shrink-0">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: (CLUSTER_META[em] || CLUSTER_META.NEUTRAL).color }} />
                    {i < emotionHistory.length - 1 && (
                      <div className="w-3 h-px bg-outline-variant/20" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="glass-panel rounded-full px-4 md:px-5 py-1.5 md:py-2 flex items-center gap-2 shadow-xl backdrop-blur-md border border-outline-variant/20">
              <textarea
                ref={textareaRef}
                placeholder="Share what's on your mind..."
                value={input}
                onChange={handleTextarea}
                onKeyDown={handleKey}
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent border-none focus:outline-none text-on-surface placeholder:text-outline/50 resize-none max-h-[100px] md:max-h-[120px] leading-relaxed text-sm md:text-base py-1.5"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <button
                onClick={() => chat()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                aria-label="Send"
              >
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
            </div>
            <div className="text-center text-[10px] text-on-surface-variant/40 mt-1.5">
              Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </section>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 bg-surface-container-lowest/80 backdrop-blur-md border-t border-outline-variant/10">
        <button onClick={() => { setDrawerOpen(false); textareaRef.current?.focus(); }}
          className={`flex flex-col items-center justify-center p-3 rounded-full transition-all ${!drawerOpen ? 'bg-primary-container/30 text-primary shadow-[0_0_15px_rgba(208,188,255,0.3)]' : 'text-outline'}`}>
          <span className="material-symbols-outlined" data-weight={!drawerOpen ? 'fill' : '0'}>chat_bubble</span>
        </button>
        <button onClick={() => setDrawerOpen(d => !d)}
          className={`flex flex-col items-center justify-center p-3 transition-all ${drawerOpen ? 'bg-primary-container/30 text-primary rounded-full shadow-[0_0_15px_rgba(208,188,255,0.3)]' : 'text-outline'}`}>
          <span className="material-symbols-outlined" data-weight={drawerOpen ? 'fill' : '0'}>timeline</span>
        </button>
        <button onClick={endSession} disabled={messages.length === 0}
          className="flex flex-col items-center justify-center text-outline p-3 disabled:opacity-30">
          <span className="material-symbols-outlined">analytics</span>
        </button>
        <button onClick={newSession}
          className="flex flex-col items-center justify-center text-outline p-3">
          <span className="material-symbols-outlined">person</span>
        </button>
      </nav>

      {showSummary && (
        <SessionSummary
          dominantEmotion={sessionData?.dominant_emotion}
          trend={sessionData?.trend}
          turnCount={sessionData?.turn_count || messages.length}
          onClose={newSession}
          hasLowConfidenceTurns={lowConfidenceTurns.length > 0}
          onConsentGiven={handleConsentGiven}
          onConsentDeclined={handleConsentDeclined}
        />
      )}
    </>
  );
}
