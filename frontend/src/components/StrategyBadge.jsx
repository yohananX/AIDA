import React from 'react';

const STRATEGY_LABELS = {
  VALIDATION_AND_REFLECTION: 'Listening carefully',
  GROUNDING: 'Offering grounding',
  CALM_REFLECTION: 'Understanding your frustration',
  ENCOURAGEMENT: 'Supporting your progress',
  POSITIVE_REINFORCEMENT: 'Celebrating with you',
  EXPLORATORY_INQUIRY: 'Exploring with you',
  VALIDATION: 'Listening to you',
  CLARIFICATION_REQUEST: 'Seeking clarity',
  OPEN_CHECKIN: 'Checking in warmly',
  CRISIS_INTERVENTION: 'Crisis support',
};

export default function StrategyBadge({ strategy }) {
  if (!strategy || strategy === 'CRISIS_INTERVENTION') return null;
  const label = STRATEGY_LABELS[strategy] || strategy;
  return (
    <div className="strategy-badge">
      <span className="strategy-dot" />
      {label}
    </div>
  );
}
