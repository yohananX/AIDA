import React, { useState } from 'react';
import { submitFeedback } from '../api/aida.js';

export default function FeedbackStars({ sessionId, turnNumber, strategy = '', emotionCluster = '', mode = 'aeif', lowConfidence = false }) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [hovered, setHovered] = useState(0);

  if (submitted || !turnNumber) return null;

  const handleClick = async (val) => {
    setRating(val);
    try {
      console.log('Submitting feedback:', {
        session_id: sessionId, turn_number: turnNumber,
        empathy_rating: val, strategy, emotionCluster, mode,
      });
      await submitFeedback(sessionId, turnNumber, val, strategy, emotionCluster, mode);
      setSubmitted(true);
    } catch (e) {
      console.error('Feedback submission failed:', e);
    }
  };

  return (
    <div className="inline-flex gap-0.5 items-center" style={lowConfidence ? { borderLeft: '2px solid #C9993A', paddingLeft: '6px' } : {}}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className={`bg-none border-none text-sm cursor-pointer p-0 px-0.5 leading-none transition-all duration-150 hover:scale-110 ${
            (hovered || rating) >= star ? 'text-[#ffb869]' : 'text-[#958ea0]'
          }`}
          onClick={() => handleClick(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`Rate ${star} out of 5`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
