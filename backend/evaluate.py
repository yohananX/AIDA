"""
Automated evaluation script.
Tests emotion accuracy, crisis accuracy, trend accuracy, and latency.
"""

import json
import os
import sys
import time
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from safety.crisis_detector import CrisisDetector
from emotion.classifier import EmotionClassifier
from trend.trend_analyzer import TrendAnalyzer
from strategy.strategy_engine import StrategyEngine


def load_test_data(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def run_emotion_tests(data: list[dict]) -> dict:
    classifier = EmotionClassifier()
    correct = 0
    total = 0
    per_cluster = Counter()
    per_cluster_correct = Counter()
    misclassified = []
    latencies = []

    for case in data:
        text = case.get("input", "")
        expected = case.get("expected_emotion", "NEUTRAL")
        expected_crisis = case.get("expected_crisis", False)

        if expected_crisis:
            continue

        start = time.time()
        result = classifier.classify(text)
        elapsed = (time.time() - start) * 1000
        latencies.append(elapsed)

        predicted = result["emotion_cluster"]
        total += 1
        per_cluster[expected] += 1
        if predicted == expected:
            correct += 1
            per_cluster_correct[expected] += 1
        else:
            misclassified.append({
                "text": text[:100],
                "expected": expected,
                "predicted": predicted,
                "raw": result["raw_emotion"],
                "confidence": result["confidence"],
            })

    clusters = set(list(per_cluster.keys()) + list(per_cluster_correct.keys()))
    cluster_metrics = {}
    for c in sorted(clusters):
        tp = per_cluster_correct.get(c, 0)
        fp = sum(1 for m in misclassified if m["predicted"] == c)
        fn = per_cluster.get(c, 0) - tp
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        cluster_metrics[c] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": per_cluster.get(c, 0),
        }

    return {
        "accuracy": round(correct / total, 4) if total else 0,
        "correct": correct,
        "total": total,
        "per_cluster": cluster_metrics,
        "misclassified": misclassified,
        "avg_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0,
    }


def run_crisis_tests(data: list[dict]) -> dict:
    detector = CrisisDetector()
    total = 0
    correct = 0
    misclassified = []

    for case in data:
        text = case.get("input", "")
        expected = bool(case.get("expected_crisis", False))

        result, _ = detector.detect(text)
        total += 1
        if result == expected:
            correct += 1
        else:
            misclassified.append({
                "text": text[:100],
                "expected_crisis": expected,
                "predicted_crisis": result,
            })

    return {
        "accuracy": round(correct / total, 4) if total else 0,
        "correct": correct,
        "total": total,
        "misclassified": misclassified,
    }


def run_trend_tests() -> dict:
    analyzer = TrendAnalyzer()
    tests = [
        (["SADNESS", "SADNESS", "SADNESS"], "PERSISTENT_DISTRESS"),
        (["ANXIETY", "NEUTRAL", "POSITIVE"], "IMPROVING"),
        (["ANGER", "ANGER"], "ELEVATED_ANGER"),
        (["SADNESS", "ANXIETY", "SADNESS"], "FLUCTUATING"),
        (["POSITIVE", "POSITIVE", "POSITIVE"], "STABLE_POSITIVE"),
        (["NEUTRAL"], "INSUFFICIENT_DATA"),
        (["NEUTRAL", "ANXIETY", "SADNESS", "SADNESS"], "PERSISTENT_DISTRESS"),
    ]

    results = []
    correct = 0
    for emotions, expected in tests:
        predicted = analyzer.analyze(emotions)
        match = predicted == expected
        if match:
            correct += 1
        results.append({
            "input": emotions,
            "expected": expected,
            "predicted": predicted,
            "match": match,
        })

    return {
        "accuracy": round(correct / len(tests), 4),
        "correct": correct,
        "total": len(tests),
        "results": results,
    }


def main():
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "test_conversations.json")

    if not os.path.exists(data_path):
        # try alternative path
        alt_path = os.path.join(os.path.dirname(__file__), "..", "..", "empathic-chatbot", "data", "test_conversations.json")
        if os.path.exists(alt_path):
            data_path = alt_path
        else:
            print(json.dumps({"error": f"Test data not found at {data_path} or {alt_path}"}, indent=2))
            return

    data = load_test_data(data_path)

    print("=" * 60)
    print("AIDA — AEIF Pipeline Evaluation")
    print("=" * 60)

    print("\n--- Emotion Classification Tests ---")
    emotion_results = run_emotion_tests(data)
    print(f"  Accuracy: {emotion_results['accuracy']:.2%} ({emotion_results['correct']}/{emotion_results['total']})")
    print(f"  Avg Latency: {emotion_results['avg_latency_ms']:.2f}ms")
    print("\n  Per-Cluster Metrics:")
    for cluster, metrics in sorted(emotion_results["per_cluster"].items()):
        print(f"    {cluster:15s}  P: {metrics['precision']:.4f}  R: {metrics['recall']:.4f}  F1: {metrics['f1']:.4f}  (n={metrics['support']})")

    if emotion_results["misclassified"]:
        print(f"\n  Misclassified ({len(emotion_results['misclassified'])}):")
        for m in emotion_results["misclassified"]:
            print(f"    '{m['text']}' → expected={m['expected']}, got={m['predicted']} ({m['raw']})")

    print("\n--- Crisis Detection Tests ---")
    crisis_results = run_crisis_tests(data)
    print(f"  Accuracy: {crisis_results['accuracy']:.2%} ({crisis_results['correct']}/{crisis_results['total']})")
    if crisis_results["misclassified"]:
        print(f"  FAILED: {len(crisis_results['misclassified'])} misclassified cases:")
        for m in crisis_results["misclassified"]:
            print(f"    '{m['text']}' → expected_crisis={m['expected_crisis']}, got={m['predicted_crisis']}")
    else:
        print("  All crisis detections correct.")

    if crisis_results["accuracy"] < 1.0:
        print("\n  ⚠ CRISIS DETECTION ACCURACY MUST BE 100%. FAILING.")

    print("\n--- Trend Analysis Tests ---")
    trend_results = run_trend_tests()
    print(f"  Accuracy: {trend_results['accuracy']:.2%} ({trend_results['correct']}/{trend_results['total']})")
    for r in trend_results["results"]:
        status = "✓" if r["match"] else "✗"
        print(f"    [{status}] {r['input']} → expected={r['expected']}, got={r['predicted']}")

    print("\n" + "=" * 60)

    summary = {
        "emotion_accuracy": emotion_results["accuracy"],
        "emotion_avg_latency_ms": emotion_results["avg_latency_ms"],
        "emotion_cluster_metrics": emotion_results["per_cluster"],
        "crisis_accuracy": crisis_results["accuracy"],
        "trend_accuracy": trend_results["accuracy"],
        "overall_status": (
            "PASS" if (
                emotion_results["accuracy"] >= 0.7
                and crisis_results["accuracy"] == 1.0
                and emotion_results["avg_latency_ms"] < 2000
            ) else "FAIL"
        ),
    }
    print("\nSummary:", json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
