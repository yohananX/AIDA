import React from 'react';

const DOT_COLORS = {
  POSITIVE: '#4edea3',
  SADNESS: '#7cb9e8',
  ANXIETY: '#ffb869',
  ANGER: '#ff8a80',
  NEUTRAL: '#9e94a8',
  AMBIGUOUS: '#c8b8ff',
};

const MAX_BARS = 7;

export default function TrendTimeline({ history = [] }) {
  const slice = history.slice(-MAX_BARS);
  const hasData = slice.length > 0;

  return (
    <>{hasData && (
      <div className="flex items-center gap-1 flex-wrap">
        {slice.map((emotion, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-transform duration-200 ${
              i === slice.length - 1 ? 'ring-1 ring-white/40 scale-125' : ''
            }`}
            style={{ background: DOT_COLORS[emotion] || '#9e94a8' }}
            title={`${emotion} (turn ${i + 1})`}
          />
        ))}
      </div>
    )}
    {!hasData && (
      <div className="flex items-center gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-white/10" />
        ))}
      </div>
    )}
    </>
  );
}
