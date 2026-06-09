#!/bin/bash
# AIDA — Start Script
# Run from the aida/ directory or the parent directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$HOME/Documents/venv"

echo "Starting AIDA backend..."
cd "$SCRIPT_DIR/backend"
source "$VENV/bin/activate"
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "Backend running on http://localhost:8000 (PID $BACKEND_PID)"

echo "Starting AIDA frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "Frontend running on http://localhost:5173 (PID $FRONTEND_PID)"

echo ""
echo "AIDA is running."
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  Health:   http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'AIDA stopped.'" EXIT
wait
