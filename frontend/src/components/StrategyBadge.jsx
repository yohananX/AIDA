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
    <div className="glass-card rounded-lg p-stack-md flex flex-col gap-stack-md">
      <h3 className="text-label-caps text-on-surface-variant uppercase">Active Approach</h3>
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/30 text-secondary text-[11px] font-semibold">
          <span className="material-symbols-outlined text-[14px]">psychology</span>
          {label}
        </div>
      </div>
    </div>
  );
}
