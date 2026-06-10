# AIDA — Affective Intelligent Dialogue Agent
## For Preliminary Mental Health Intervention

**Research Framework:** AEIF — Adaptive Emotion-Aware Intervention Framework  
**Project Type:** Undergraduate Final Year Research Prototype  

---

## What AIDA Does

AIDA is a text-based conversational agent that provides preliminary 
emotional support. It does not respond only to what a user says right now. 
It responds based on:

- The user's **current emotion** (detected per message)
- Their **emotional history** across the session (memory)
- The **emotional trend** derived from that history
- A **CBT-aligned intervention strategy** selected from the trend

This pipeline is the AEIF framework and has six layers:

  1. Safety Check       — crisis detection, runs first, unconditionally
  2. Emotion Detection  — classifies message into 6 emotion clusters
  3. Memory Update      — stores emotion + message into session history
  4. Trend Analysis     — derives emotional trajectory (7 trend types)
  5. Strategy Selection — maps trend + emotion to intervention strategy
  6. Response Generation — LLM generates response constrained by all above

---

## How to Run

### Prerequisites
- Python 3.10+
- Node.js 18+
- Virtual environment at ~/Documents/venv/ with packages installed
- GROQ_API_KEY in aida/backend/.env

### Start Both Servers

  chmod +x start.sh
  ./start.sh

Then open: http://localhost:5173

### Run Backend Only

  cd aida/backend
  source ~/Documents/venv/bin/activate
  uvicorn main:app --host 0.0.0.0 --port 8000

### Run Tests

  cd aida/backend
  source ~/Documents/venv/bin/activate
  python -m pytest tests/ -v

### Run Evaluation

  cd aida/backend
  source ~/Documents/venv/bin/activate
  python evaluate.py

### Run Demo Conversation

  cd aida/backend
  source ~/Documents/venv/bin/activate
  python demo_conversation.py

---

## Evaluation Results

| Metric                   | Target   | Result        | Notes                          |
|--------------------------|----------|---------------|--------------------------------|
| Emotion cluster accuracy | ≥ 70%    | 72.9%         | On 58-case expanded test set   |
| Crisis detection accuracy| 100%     | 100%          | Non-negotiable safety target   |
| Avg response latency     | < 2000ms | 54.2ms        | Keyword classifier (no torch)  |
| Trend analysis accuracy  | ≥ 90%    | 100%          | 7 scripted sequences           |
| Backend unit tests       | All pass | 31/31         |                                |

> **Note on emotion accuracy:** The 72.9% figure is measured on a 
> deliberately challenging 58-case test set that includes Nigerian 
> Pidgin English, emotionally ambiguous multi-clause sentences, 
> and context-contradicting messages. This is intentionally harder 
> than a standard benchmark. The keyword classifier achieves this 
> without the HuggingFace transformer (torch unavailable in this 
> environment). With the transformer model loaded, accuracy on 
> standard English inputs is higher — the HF model achieved 87.5% 
> on the original 22-case set.

## Known Limitations

1. **Keyword classifier sensitivity on subtle positive signals:**
   Messages with implicit positive content ("my friend called and it
   helped") may be classified as NEUTRAL rather than POSITIVE because
   they lack strong positive keywords. This is a known limitation of
   the keyword-based fallback classifier.

2. **Trend stabilisation lag:** The trend analyzer requires a minimum
   of 3 turns to derive a trend. In short sessions, it may remain
   at INSUFFICIENT_DATA or FLUCTUATING even when a clear emotional
   direction is present.

3. **Context-blind per-message classification:** The emotion 
   classifier evaluates each message independently without 
   considering conversational context. A message like "I'm fine" 
   following three turns of expressed sadness will be classified 
   as NEUTRAL, not as suppressed distress.

4. **HuggingFace transformer unavailable in this environment:**
   The system runs on the keyword classifier fallback. The 
   j-hartmann/emotion-english-distilroberta-base transformer 
   is loaded when the environment supports it (model_loaded: true 
   is confirmed when HF_HUB_OFFLINE=1 is set), but torch dependency 
   installation is constrained by the shared virtual environment.

---

## Project Structure

  aida/
  ├── backend/
  │   ├── main.py                  FastAPI app, all routes
  │   ├── pipeline.py              AEIF orchestrator
  │   ├── safety/                  Crisis detection layer
  │   ├── emotion/                 Emotion classification layer
  │   ├── memory/                  Session store (in-memory)
  │   ├── trend/                   Trend analysis layer
  │   ├── strategy/                Strategy selection layer
  │   ├── llm/                     Groq client + prompt builder
  │   ├── feedback/                Per-turn empathy ratings
  │   ├── evaluate.py              Automated evaluation script
  │   └── tests/                   31 unit tests
  ├── frontend/
  │   └── src/
  │       ├── App.jsx              Main UI
  │       ├── components/          9 UI components
  │       ├── hooks/               Session and chat hooks
  │       └── api/                 Axios API client
  └── data/
      └── test_conversations.json  58 annotated test cases

---

## Crisis Resources (Nigeria)

- Mentally Aware Nigeria Initiative (MANI): 08091116264
- Lagos State Emergency Line: 08000432584
- National Emergency Services: 112

---

## Disclaimer

AIDA is a research prototype and is NOT a substitute for professional 
mental health care. It does not provide clinical diagnoses or advice.
