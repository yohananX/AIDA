import React from 'react';

const PULSE_COLORS = {
  POSITIVE: { bg: 'rgba(93, 173, 122, 0.08)', glow: 'rgba(93, 173, 122, 0.15)' },
  SADNESS: { bg: 'rgba(70, 130, 180, 0.08)', glow: 'rgba(70, 130, 180, 0.15)' },
  ANXIETY: { bg: 'rgba(200, 150, 60, 0.08)', glow: 'rgba(200, 150, 60, 0.15)' },
  ANGER: { bg: 'rgba(180, 70, 70, 0.08)', glow: 'rgba(180, 70, 70, 0.15)' },
  NEUTRAL: { bg: 'rgba(90, 100, 112, 0.05)', glow: 'rgba(90, 100, 112, 0.08)' },
  AMBIGUOUS: { bg: 'rgba(120, 100, 160, 0.08)', glow: 'rgba(120, 100, 160, 0.15)' },
  CRISIS: { bg: 'rgba(180, 50, 50, 0.12)', glow: 'rgba(180, 50, 50, 0.2)' },
};

export default function EmotionPulse({ emotionCluster }) {
  const colors = PULSE_COLORS[emotionCluster] || PULSE_COLORS.NEUTRAL;
  return (
    <div
      className="emotion-pulse"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${colors.glow} 0%, transparent 70%)`,
        transition: 'background 0.8s ease',
      }}
    >
      <div
        className="pulse-ring"
        style={{
          background: colors.bg,
          boxShadow: `0 0 60px ${colors.glow}`,
        }}
      />
    </div>
  );
}
