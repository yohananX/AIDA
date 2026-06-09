import React from 'react';

const TREND_LABELS = {
  PERSISTENT_DISTRESS: 'You were carrying a lot of weight this session.',
  ESCALATING_DISTRESS: 'Things felt overwhelming at times.',
  ELEVATED_ANGER: 'There was real frustration in this conversation.',
  IMPROVING: 'There was a shift toward relief and hope.',
  STABLE_POSITIVE: 'This was a warm, positive conversation.',
  FLUCTUATING: 'Your emotions moved in different directions.',
  INSUFFICIENT_DATA: 'A short but meaningful check-in.',
};

const EMOTION_NAMES = {
  POSITIVE: 'Positive',
  SADNESS: 'Sadness',
  ANXIETY: 'Anxiety',
  ANGER: 'Anger',
  NEUTRAL: 'Neutral',
  AMBIGUOUS: 'Ambiguous',
};

export default function SessionSummary({ dominantEmotion, trend, turnCount, onClose }) {
  return (
    <div className="summary-overlay">
      <div className="summary-card">
        <div className="summary-icon">🌿</div>
        <h2 className="summary-title">Session Complete</h2>
        <p className="summary-message">
          Thank you for sharing today. Here is a gentle reflection of your session.
        </p>

        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">Dominant emotion</span>
            <span className={`summary-stat-value emotion-${dominantEmotion?.toLowerCase()}`}>
              {EMOTION_NAMES[dominantEmotion] || dominantEmotion}
            </span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">Session length</span>
            <span className="summary-stat-value">{turnCount} messages</span>
          </div>
        </div>

        <p className="summary-trend">
          {TREND_LABELS[trend] || 'Thank you for this conversation.'}
        </p>

        <p className="summary-reminder">
          Remember: AIDA is an AI companion, not a therapist.
          If you need ongoing support, please reach out to a mental health professional.
        </p>

        <button className="btn-primary" onClick={onClose}>
          Start a new conversation
        </button>
      </div>
    </div>
  );
}
