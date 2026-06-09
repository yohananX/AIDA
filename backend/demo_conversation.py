"""
AIDA — Multi-Turn Demo Conversation
Sends a sequence of messages to the /chat endpoint and prints responses.
Used to generate Chapter 4 screenshots.
"""

import time
import json
import sys
import urllib.request
import urllib.error

API_BASE = "http://localhost:8000"

messages = [
    "I have been feeling really down lately. Nothing seems to go right.",
    "I failed my final year project presentation today. I let everyone down.",
    "My supervisor was disappointed. I could see it on his face.",
    "I just feel so worthless and tired of trying.",
    "I don't know. Maybe things can get better. I'm not sure.",
    "Actually, my friend just called me and it helped a little.",
    "I think I just needed to talk to someone.",
]


def api_post(endpoint: str, data: dict) -> dict:
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}{endpoint}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode("utf-8"))


def api_get(endpoint: str) -> dict:
    req = urllib.request.Request(f"{API_BASE}{endpoint}", method="GET")
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode("utf-8"))


def main():
    session_id = "demo_session_001"
    print("=" * 70)
    print("  AIDA — Multi-Turn Demo Conversation")
    print("=" * 70)
    print()

    for i, msg in enumerate(messages, start=1):
        print(f"  Turn {i}")
        print(f"  User:            {msg}")

        try:
            result = api_post("/chat", {"message": msg, "session_id": session_id})
        except urllib.error.HTTPError as e:
            print(f"  ERROR: HTTP {e.code} — {e.read().decode()}")
            print()
            continue
        except Exception as e:
            print(f"  ERROR: {e}")
            print()
            continue

        emotion = result.get("emotion_cluster", "?")
        raw = result.get("raw_emotion", "?")
        conf = result.get("confidence", 0) * 100
        trend = result.get("trend", "?")
        strategy = result.get("strategy", "?")
        crisis = "true" if result.get("crisis_flag") else "false"
        response = result.get("response", "?")

        print(f"  Emotion:         {emotion} ({raw}, {conf:.0f}%)")
        print(f"  Trend:           {trend}")
        print(f"  Strategy:        {strategy}")
        print(f"  Crisis Flag:     {crisis}")
        print(f"  AIDA Response:   {response}")
        print("  " + "-" * 67)
        print()

        time.sleep(1)

    print("=" * 70)
    print("  Session Summary")
    print("=" * 70)
    try:
        summary = api_get(f"/session/{session_id}")
        print(f"  Dominant Emotion: {summary.get('dominant_emotion', '?')}")
        print(f"  Final Trend:      {summary.get('trend', '?')}")
        print(f"  Turn Count:       {summary.get('turn_count', '?')}")
    except Exception as e:
        print(f"  ERROR fetching session summary: {e}")

    print("=" * 70)


if __name__ == "__main__":
    main()
