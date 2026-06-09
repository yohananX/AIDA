import React from 'react';

const DOT_COLORS = {
  POSITIVE: '#5BAD7A',
  SADNESS: '#4682B4',
  ANXIETY: '#C8963C',
  ANGER: '#B44646',
  NEUTRAL: '#8A94A0',
  AMBIGUOUS: '#7864A0',
};

const DOT_LABELS = {
  POSITIVE: 'Positive',
  SADNESS: 'Sadness',
  ANXIETY: 'Anxiety',
  ANGER: 'Anger',
  NEUTRAL: 'Neutral',
  AMBIGUOUS: 'Ambiguous',
};

export default function TrendTimeline({ history = [] }) {
  const dots = history.slice(-10);
  if (dots.length === 0) return null;

  return (
    <div className="trend-timeline">
      <div className="timeline-label">Emotional journey</div>
      <div className="timeline-track">
        {dots.map((emotion, i) => (
          <div
            key={i}
            className="timeline-dot-wrap"
            title={`${DOT_LABELS[emotion] || emotion} (turn ${i + 1})`}
          >
            <div
              className={`timeline-dot ${i === dots.length - 1 ? 'current' : ''}`}
              style={{ background: DOT_COLORS[emotion] || '#8A94A0' }}
            />
            {i < dots.length - 1 && (
              <div
                className="timeline-connector"
                style={{ background: DOT_COLORS[emotion] || '#8A94A0' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
