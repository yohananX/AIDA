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

export default function SessionSummary({ dominantEmotion, trend, turnCount, onClose, hasLowConfidenceTurns, onConsentGiven, onConsentDeclined }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-6">
      <div className="glass-card rounded-[3rem] p-11 max-w-[480px] w-full shadow-xl text-center">
        <div className="text-[40px] mb-4">🌿</div>
        <h2 className="text-2xl font-semibold text-[#e7e0ed] mb-3">Session Complete</h2>
        <p className="text-sm text-[#cbc3d7] mb-6">
          Thank you for sharing today. Here is a gentle reflection of your session.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-white/[0.04] border border-white/10 rounded-[1rem] p-4">
            <span className="block text-[11px] text-[#8a8099] uppercase tracking-wider mb-1.5">Dominant emotion</span>
            <span className="text-xl font-semibold text-[#e7e0ed]">
              {EMOTION_NAMES[dominantEmotion] || dominantEmotion}
            </span>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-[1rem] p-4">
            <span className="block text-[11px] text-[#8a8099] uppercase tracking-wider mb-1.5">Session length</span>
            <span className="text-xl font-semibold text-[#e7e0ed]">{turnCount} messages</span>
          </div>
        </div>

        <p className="text-sm text-[#cbc3d7] leading-relaxed mb-5 italic">
          {TREND_LABELS[trend] || 'Thank you for this conversation.'}
        </p>

        <p className="text-xs text-[#8a8099] mb-6 leading-relaxed">
          Remember: AIDA is an AI companion, not a therapist.
          If you need ongoing support, please reach out to a mental health professional.
        </p>

        {hasLowConfidenceTurns && (
          <div className="mb-6 p-5 bg-white/[0.03] border border-white/10 rounded-[1.5rem] text-left">
            <h3 className="text-sm font-semibold text-[#e7e0ed] mb-3">Help improve AIDA  (optional)</h3>
            <p className="text-xs text-[#cbc3d7] leading-relaxed mb-4">
              Some responses in this session were hard for AIDA to classify confidently.
              You can choose to share this session's data anonymously to help train
              better emotion recognition for Nigerian English.
            </p>
            <p className="text-xs text-[#8a8099] leading-relaxed mb-4">
              <strong>What would be shared:</strong> your messages, AIDA's responses,
              detected emotions, and your star ratings.<br />
              <strong>What would NOT be shared:</strong> your name, device, or any
              identifying information.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 bg-teal-600/80 hover:bg-teal-600 text-white text-sm font-medium rounded-[1rem] px-4 py-3 transition-all"
                onClick={onConsentGiven}
              >
                Yes, share anonymously
              </button>
              <button
                className="flex-1 bg-white/5 hover:bg-white/10 text-[#cbc3d7] text-sm font-medium rounded-[1rem] px-4 py-3 border border-white/10 transition-all"
                onClick={onConsentDeclined}
              >
                No thanks
              </button>
            </div>
          </div>
        )}

        <button
          className="w-full bg-white/10 text-[#e7e0ed] border border-white/10 rounded-[1rem] px-6 py-3.5 text-base font-medium cursor-pointer transition-all hover:bg-[rgba(208,188,255,0.12)] hover:border-primary hover:-translate-y-0.5 active:translate-y-0"
          onClick={onConsentDeclined}
        >
          Start a new conversation
        </button>
      </div>
    </div>
  );
}