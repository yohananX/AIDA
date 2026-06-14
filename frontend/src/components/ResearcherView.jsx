import React, { useEffect, useState } from 'react';

const EMOTION_OPTIONS = [
  'POSITIVE', 'SADNESS', 'ANXIETY', 'ANGER',
  'NEUTRAL', 'AMBIGUOUS', 'UNKNOWN',
];

function renderStars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

export default function ResearcherView() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [annotations, setAnnotations] = useState({});
  const [saved, setSaved] = useState({});

  useEffect(() => {
    fetch('http://localhost:8000/data/low-confidence/rated')
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const total = records.length;
  const avgRating = total > 0
    ? (records.reduce((s, r) => s + (r.empathy_rating || 0), 0) / total).toFixed(1)
    : '—';
  const lowConfCount = records.filter(r => r.confidence < 0.55).length;

  const handleSave = async (recordId) => {
    const data = annotations[recordId] || {};
    try {
      await fetch(`http://localhost:8000/data/low-confidence/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correct_emotion_guess: data.correct_emotion_guess || null,
          notes: data.notes || '',
        }),
      });
      setSaved(prev => ({ ...prev, [recordId]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [recordId]: false })), 2000);
    } catch (e) {
      console.error('Annotation save failed:', e);
    }
  };

  const handleDownload = () => {
    fetch('http://localhost:8000/data/low-confidence/export')
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aida_lowconf_dataset.jsonl';
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const pct = (v) => Math.round(v * 100);

  return (
    <div style={{
      minHeight: '100vh', background: '#1a1721', color: '#e7e0ed',
      fontFamily: "'DM Sans', 'Calibri', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#d0bcff' }}>Researcher View</h1>
          <button onClick={handleDownload} style={{
            padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(208,188,255,0.1)', color: '#d0bcff', cursor: 'pointer', fontSize: 13,
          }}>
            Download dataset (.jsonl)
          </button>
        </div>

        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24,
          padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)', fontSize: 13,
        }}>
          <span>Total collected: <strong>{records.length}</strong></span>
          <span>Rated: <strong>{total}</strong></span>
          <span>Avg rating: <strong>{avgRating}/5</strong></span>
          <span>Low confidence (&lt;55%): <strong style={{ color: '#C9993A' }}>{lowConfCount}</strong></span>
        </div>

        {loading && <p style={{ color: '#8a8099' }}>Loading...</p>}

        {!loading && records.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 20px', color: '#8a8099',
            background: 'rgba(255,255,255,0.02)', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <p style={{ fontSize: 15, marginBottom: 8 }}>No low-confidence turns collected yet.</p>
            <p style={{ fontSize: 13 }}>Use AIDA normally and rate some responses to start building the dataset.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {records.map(record => {
            const recId = record.id;
            const annot = annotations[recId] || {};
            const isSaved = saved[recId];

            return (
              <div key={recId} style={{
                borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)', overflow: 'hidden',
              }}>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontSize: 12, color: '#8a8099', display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>Turn {record.turn_number} · {record.timestamp ? new Date(record.timestamp).toLocaleString() : ''}</span>
                  <span>Session: {record.session_id?.slice(0, 8)}...</span>
                </div>

                <div style={{ padding: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#8a8099', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>User said</div>
                    <div style={{ fontSize: 14, color: '#e7e0ed', fontStyle: 'italic', lineHeight: 1.5 }}>"{record.original_message}"</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 10, color: '#8a8099', textTransform: 'uppercase', marginBottom: 4 }}>Detected emotion</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{record.detected_emotion}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 10, color: '#8a8099', textTransform: 'uppercase', marginBottom: 4 }}>Confidence</div>
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        color: record.confidence < 0.55 ? '#C9993A' : '#4edea3',
                      }}>{pct(record.confidence)}%</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 10, color: '#8a8099', textTransform: 'uppercase', marginBottom: 4 }}>Trend</div>
                      <div style={{ fontSize: 13 }}>{record.trend}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 10, color: '#8a8099', textTransform: 'uppercase', marginBottom: 4 }}>Strategy</div>
                      <div style={{ fontSize: 13 }}>{record.strategy}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#8a8099', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>AIDA responded</div>
                    <div style={{ fontSize: 13, color: '#cbc3d7', fontStyle: 'italic', lineHeight: 1.5 }}>"{record.llm_response}"</div>
                  </div>

                  <div style={{
                    marginBottom: 12, padding: 10, borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ fontSize: 10, color: '#8a8099', textTransform: 'uppercase', marginBottom: 4 }}>User rated this</div>
                    <div style={{ fontSize: 16, color: '#ffb869' }}>
                      {renderStars(record.empathy_rating)}  ({record.empathy_rating}/5)
                    </div>
                  </div>

                  <div style={{
                    padding: 12, borderRadius: 12,
                    background: 'rgba(201,153,58,0.06)', border: '1px solid rgba(201,153,58,0.15)',
                  }}>
                    <div style={{ fontSize: 10, color: '#C9993A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Researcher annotation</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#8a8099', marginBottom: 4, display: 'block' }}>Correct emotion</label>
                        <select
                          value={annot.correct_emotion_guess || ''}
                          onChange={e => setAnnotations(prev => ({
                            ...prev, [recId]: { ...prev[recId], correct_emotion_guess: e.target.value }
                          }))}
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)', color: '#e7e0ed', fontSize: 13,
                          }}
                        >
                          <option value="">— select —</option>
                          {EMOTION_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#8a8099', marginBottom: 4, display: 'block' }}>Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. single letter, no signal"
                          value={annot.notes || ''}
                          onChange={e => setAnnotations(prev => ({
                            ...prev, [recId]: { ...prev[recId], notes: e.target.value }
                          }))}
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)', color: '#e7e0ed', fontSize: 13,
                          }}
                        />
                      </div>
                      <button
                        onClick={() => handleSave(recId)}
                        style={{
                          padding: '8px 16px', borderRadius: 8, border: 'none',
                          background: isSaved ? '#4edea3' : 'rgba(208,188,255,0.15)',
                          color: isSaved ? '#1a1721' : '#d0bcff',
                          cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          alignSelf: 'flex-end', transition: 'all 0.2s',
                        }}
                      >
                        {isSaved ? 'Saved ✓' : 'Save annotation'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}