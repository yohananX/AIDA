import React from 'react';

export default function DisclaimerScreen({ onAccept }) {
  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-card">
        <div className="disclaimer-eyebrow">Before we begin</div>
        <h1 className="disclaimer-title">This is a safe space,<br />not a clinical one.</h1>
        <p className="disclaimer-body">
          AIDA is an AI designed to listen, reflect, and offer supportive conversation.
          It is not a substitute for professional mental health care.
        </p>
        <ul className="disclaimer-rules">
          <li>This chatbot does not provide medical diagnoses or clinical advice</li>
          <li>Your conversation is not stored after the session ends</li>
          <li>If you are in crisis, please contact a professional immediately</li>
          <li>Responses are AI-generated and may not always be perfect</li>
        </ul>
        <div className="crisis-line">
          <strong>Nigeria Crisis Resources</strong>
          Mentally Aware Nigeria Initiative (MANI): 08091116264 &nbsp;·&nbsp;
          Lagos State Emergency Line: 08000432584 &nbsp;·&nbsp;
          National Emergency Services: 112
        </div>
        <button className="btn-primary" onClick={onAccept}>
          I understand — begin the conversation
        </button>
      </div>
    </div>
  );
}
