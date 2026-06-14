import React from 'react';

const PULSE_COLORS = {
  POSITIVE: 'rgba(78, 222, 163, 0.12)',
  SADNESS: 'rgba(124, 185, 232, 0.12)',
  ANXIETY: 'rgba(255, 184, 105, 0.12)',
  ANGER: 'rgba(255, 138, 128, 0.12)',
  NEUTRAL: 'rgba(158, 148, 168, 0.08)',
  AMBIGUOUS: 'rgba(200, 184, 255, 0.12)',
  CRISIS: 'rgba(255, 123, 123, 0.18)',
};

export default function EmotionPulse({ emotionCluster }) {
  const glow = PULSE_COLORS[emotionCluster] || PULSE_COLORS.NEUTRAL;
  return (
    <div
      className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] pointer-events-none z-0"
      style={{
        background: `radial-gradient(circle, ${glow} 0%, rgba(21, 18, 27, 0) 70%)`,
        transition: 'background 0.8s ease',
      }}
    />
  );
}
