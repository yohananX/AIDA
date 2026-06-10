"""
AEIF vs Baseline comparison script.
Runs the same conversation through both pipeline modes
and compares the outputs for analysis (Chapter 4 evaluation).
"""

from dotenv import load_dotenv
load_dotenv()

import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from pipeline import AEIFPipeline

TEST_CONVERSATIONS = {
    "sadness_sequence": [
        "I failed my exam and feel like giving up",
        "I've been feeling really down lately",
        "Nothing seems to interest me anymore",
    ],
    "anxiety_sequence": [
        "I'm really anxious about my exam next week",
        "What if I fail and disappoint everyone?",
        "I can't stop worrying about it",
    ],
    "mixed_sequence": [
        "I got the job but I'm terrified I'll mess it up",
        "Everyone says I should be happy",
        "I'm starting to feel like myself again",
    ],
}


def run_comparison():
    pipeline = AEIFPipeline()
    results = {}

    for conv_name, messages in TEST_CONVERSATIONS.items():
        aeif_sid = f"compare_aeif_{conv_name}"
        base_sid = f"compare_base_{conv_name}"

        pipeline.session_store.clear_session(aeif_sid)
        pipeline.session_store.clear_session(base_sid)

        aeif_turns = []
        baseline_turns = []

        for msg in messages:
            aeif_result = pipeline.process_message(msg, aeif_sid, use_aeif=True)
            baseline_result = pipeline.process_message(msg, base_sid, use_aeif=False)

            aeif_turns.append({
                "message": msg,
                "emotion_cluster": aeif_result["emotion_cluster"],
                "trend": aeif_result["trend"],
                "strategy": aeif_result["strategy"],
                "response": aeif_result["response"],
                "confidence": aeif_result["confidence"],
            })
            baseline_turns.append({
                "message": msg,
                "emotion_cluster": baseline_result["emotion_cluster"],
                "trend": baseline_result["trend"],
                "strategy": baseline_result["strategy"],
                "response": baseline_result["response"],
                "confidence": baseline_result["confidence"],
            })

        results[conv_name] = {
            "aeif": aeif_turns,
            "baseline": baseline_turns,
        }

    return results


def main():
    print("=" * 70)
    print("AIDA — AEIF vs Baseline Pipeline Comparison")
    print("=" * 70)

    results = run_comparison()

    for conv_name, conv_data in results.items():
        print(f"\n{'─' * 70}")
        print(f"Conversation: {conv_name}")
        print(f"{'─' * 70}")

        for i in range(len(conv_data["aeif"])):
            aeif = conv_data["aeif"][i]
            base = conv_data["baseline"][i]

            print(f"\n  Turn {i + 1}: \"{aeif['message']}\"")
            print(f"  ┌─── AEIF     ─── emotion={aeif['emotion_cluster']:12s} trend={aeif['trend']:22s} strategy={aeif['strategy']}")
            print(f"  │    Response: {aeif['response'][:120]}...")
            print(f"  ├─── Baseline ─── emotion={base['emotion_cluster']:12s} trend={base['trend']:22s} strategy={base['strategy']}")
            print(f"  │    Response: {base['response'][:120]}...")
            print(f"  └──")

    output_path = "data/pipeline_comparison.json"
    os.makedirs("data", exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nDetailed comparison written to {output_path}")


if __name__ == "__main__":
    main()
