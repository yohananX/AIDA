import React, { useState } from 'react';
import { submitFeedback } from '../api/aida.js';

export default function FeedbackStars({ sessionId, turnNumber, strategy = '', emotionCluster = '', mode = 'aeif' }) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [hovered, setHovered] = useState(0);

  if (submitted || !turnNumber) return null;

  const handleClick = async (val) => {
    setRating(val);
    try {
      await submitFeedback(sessionId, turnNumber, val, strategy, emotionCluster, mode);
      setSubmitted(true);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="feedback-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className={`star-btn ${(hovered || rating) >= star ? 'active' : ''}`}
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
