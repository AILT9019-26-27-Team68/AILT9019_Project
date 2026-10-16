"""
test_model.py — Standalone showcase of the trained Random Forest pipeline.

Loads the shipped student_risk_model.joblib and runs a set of illustrative
profiles through the full inference chain:

    RF probability  ->  risk tier  ->  z-bands  ->  categorical signals
                    ->  crisis rule  ->  prompt selection

No FastAPI, no Express, no LLM call. Deterministic and offline.
Useful for demonstrating the model in a presentation.
"""

import os
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

# Make the project root importable so we can reuse the live-service helpers.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from python.inference_service import (  # noqa: E402
    model,
    threshold,
    NUMERIC,
    CATEGORICAL,
    FEATURES,
    RISK_TIERS,
    PEER_STATS,
    CRISIS_RULES,
    NORMAL_PROMPT_TEMPLATE,
    CRISIS_PROMPT_TEMPLATE,
    _z_band,
    _categorical_signal,
    _check_crisis,
    _risk_tier,
)

# ---------------------------------------------------------------- colors
_NO_COLOR = bool(os.environ.get("NO_COLOR")) or not sys.stdout.isatty()


class C:
    RESET = "" if _NO_COLOR else "\033[0m"
    BOLD = "" if _NO_COLOR else "\033[1m"
    DIM = "" if _NO_COLOR else "\033[2m"
    RED = "" if _NO_COLOR else "\033[31m"
    GREEN = "" if _NO_COLOR else "\033[32m"
    YELLOW = "" if _NO_COLOR else "\033[33m"
    BLUE = "" if _NO_COLOR else "\033[34m"
    MAGENTA = "" if _NO_COLOR else "\033[35m"
    CYAN = "" if _NO_COLOR else "\033[36m"


TIER_COLOR = {
    "Very Low": C.GREEN,
    "Low": C.CYAN,
    "Moderate": C.YELLOW,
    "High": C.RED,
}

# ---------------------------------------------------------------- profiles
PROFILES: List[Dict[str, Any]] = [
    {
        "name": "Healthy student",
        "description": "Good sleep, low stress, high attendance, no exam soon",
        "features": {
            "Study_Hours_Per_Day": 4,
            "Sleep_Hours_Per_Day": 8,
            "Stress_Level": 3,
            "Attendance_Rate": 95,
            "Age": 20,
            "Extracurricular_Activities": "Yes",
            "Exam_Proximity": "No",
            "Part_Time_Job": "No",
        },
    },
    {
        "name": "Busy but stable",
        "description": "Part-time job, moderate stress, decent sleep",
        "features": {
            "Study_Hours_Per_Day": 5,
            "Sleep_Hours_Per_Day": 7,
            "Stress_Level": 5,
            "Attendance_Rate": 85,
            "Age": 21,
            "Extracurricular_Activities": "No",
            "Exam_Proximity": "No",
            "Part_Time_Job": "Yes",
        },
    },
    {
        "name": "Exam crunch",
        "description": "Exam approaching, moderate sleep, elevated stress",
        "features": {
            "Study_Hours_Per_Day": 6,
            "Sleep_Hours_Per_Day": 6,
            "Stress_Level": 7,
            "Attendance_Rate": 80,
            "Age": 22,
            "Extracurricular_Activities": "Yes",
            "Exam_Proximity": "Yes",
            "Part_Time_Job": "No",
        },
    },
    {
        "name": "At-risk pattern",
        "description": "Poor sleep, high stress, low attendance, exam soon",
        "features": {
            "Study_Hours_Per_Day": 2,
            "Sleep_Hours_Per_Day": 4,
            "Stress_Level": 8,
            "Attendance_Rate": 55,
            "Age": 21,
            "Extracurricular_Activities": "No",
            "Exam_Proximity": "Yes",
            "Part_Time_Job": "Yes",
        },
    },
    {
        "name": "CRISIS pattern",
        "description": "Extreme stress + minimal sleep -> triggers crisis rule",
        "features": {
            "Study_Hours_Per_Day": 1,
            "Sleep_Hours_Per_Day": 2,
            "Stress_Level": 10,
            "Attendance_Rate": 50,
            "Age": 22,
            "Extracurricular_Activities": "No",
            "Exam_Proximity": "Yes",
            "Part_Time_Job": "Yes",
        },
    },
]

# ---------------------------------------------------------------- formatting
WIDTH = 72


def hr(char: str = "=") -> None:
    print(char * WIDTH)


def render_bar(proba: float, width: int = 30) -> str:
    filled = int(round(proba * width))
    return "[" + "█" * filled + "░" * (width - filled) + "]"


# ---------------------------------------------------------------- inference
def run_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
    feats = profile["features"]

    # 1. RF probability
    X = pd.DataFrame([feats], columns=FEATURES)
    proba = float(model.predict_proba(X)[0, 1])

    # 2. Decision + tier
    decision = "At Risk" if proba >= threshold else "Stable"
    tier = _risk_tier(proba)

    # 3. Z-bands + key factors
    z_bands: Dict[str, str] = {}
    key_factors: List[Dict[str, Any]] = []
    for col in NUMERIC:
        mean = PEER_STATS[col]["mean"]
        std = PEER_STATS[col]["std"] or 1.0
        z = (float(feats[col]) - mean) / std
        z_bands[col] = _z_band(z)
        key_factors.append(
            {
                "feature": col,
                "z": round(z, 2),
                "direction": "high" if z >= 0 else "low",
            }
        )
    key_factors.sort(key=lambda f: abs(f["z"]), reverse=True)
    key_factors = key_factors[:3]

    # 4. Categorical signals
    cat_signals = {
        col: _categorical_signal(col, str(feats[col])) for col in CATEGORICAL
    }

    # 5. Crisis rule + prompt selection
    crisis = _check_crisis(feats)

    return {
        "proba": proba,
        "decision": decision,
        "tier": tier,
        "z_bands": z_bands,
        "key_factors": key_factors,
        "categorical_signals": cat_signals,
        "crisis": crisis,
        "prompt_type": "crisis" if crisis else "normal",
    }


# ---------------------------------------------------------------- printing
def print_header() -> None:
    hr()
    print(f"{C.BOLD}Student Risk Predictor — Model Showcase{C.RESET}")
    print(f"{C.DIM}Trained Random Forest, illustrative profiles{C.RESET}")
    hr()
    print()
    print(f"{C.BOLD}Model configuration:{C.RESET}")
    print(f"  Features       : {len(FEATURES)}  "
          f"({len(NUMERIC)} numeric, {len(CATEGORICAL)} categorical)")
    print(f"  Decision bound : {threshold:.2f}  "
          f"(tuned for At-Risk recall)")
    print(f"  Risk tiers     : "
          + ", ".join(t["label"] for t in RISK_TIERS))
    print(f"  Crisis rule    : "
          + "; ".join(r["name"] for r in CRISIS_RULES))
    print(f"  Categorical    : " + ", ".join(CATEGORICAL))
    print()


def print_profile(
    index: int, total: int, profile: Dict[str, Any], result: Dict[str, Any]
) -> None:
    hr()
    print(f"{C.BOLD}Test {index}/{total}  ·  {profile['name']}{C.RESET}")
    print(f"{C.DIM}{profile['description']}{C.RESET}")
    hr("-")

    print(f"{C.BOLD}Input:{C.RESET}")
    for k, v in profile["features"].items():
        print(f"  {k:<30s} = {v}")
    print()

    tier_color = TIER_COLOR.get(result["tier"], C.RESET)
    print(f"{C.BOLD}Prediction:{C.RESET}")
    print(f"  Risk probability : {result['proba'] * 100:5.1f}%  "
          f"{render_bar(result['proba'])}")
    print(f"  Risk tier        : {tier_color}{C.BOLD}{result['tier']}{C.RESET}")
    print(f"  Decision         : {result['decision']}  "
          f"(threshold = {threshold:.2f})")
    crisis_txt = (
        f"{C.RED}YES — crisis prompt selected{C.RESET}"
        if result["crisis"]
        else "no"
    )
    print(f"  Crisis rule      : {crisis_txt}")
    print()

    print(f"{C.BOLD}Top contributing factors:{C.RESET}")
    for f in result["key_factors"]:
        arrow = "▲" if f["z"] > 0 else "▼"
        print(f"  {f['feature']:<30s} "
              f"{f['direction']:<5s}  z = {f['z']:+.2f}  {arrow}")
    print()

    print(f"{C.BOLD}Categorical signals:{C.RESET}")
    for k, v in result["categorical_signals"].items():
        print(f"  {k:<30s} = {profile['features'][k]:<5s} -> {v}")
    print()

    print(f"{C.BOLD}Z-score bands:{C.RESET}")
    for k, v in result["z_bands"].items():
        print(f"  {k:<30s} {v}")


def print_summary(results: List[Dict[str, Any]]) -> None:
    hr()
    print(f"{C.BOLD}Summary across {len(results)} profiles{C.RESET}")
    hr("-")
    print(f"  {'#':<3} {'Profile':<22} {'Proba':>7}  "
          f"{'Tier':<12} {'Crisis':<8} {'Prompt':<8}")
    for i, (profile, result) in enumerate(results, 1):
        print(f"  {i:<3} {profile['name'][:22]:<22} "
              f"{result['proba'] * 100:6.1f}%  "
              f"{result['tier']:<12} "
              f"{'YES' if result['crisis'] else '-':<8} "
              f"{result['prompt_type']:<8}")
    print()

    tiers = Counter(r["tier"] for _, r in results)
    crisis_count = sum(1 for _, r in results if r["crisis"])

    print(f"{C.BOLD}Risk tier distribution:{C.RESET}")
    for tier_info in RISK_TIERS:
        count = tiers.get(tier_info["label"], 0)
        color = TIER_COLOR.get(tier_info["label"], C.RESET)
        bar = "█" * count
        print(f"  {color}{tier_info['label']:<10}{C.RESET} {count:>2}  {bar}")
    print(f"  {'Crisis':<10} {crisis_count:>2}  "
          f"{C.RED}{'█' * crisis_count}{C.RESET}")


def print_sample_prompt(profile: Dict[str, Any], result: Dict[str, Any]) -> None:
    hr()
    print(f"{C.BOLD}Sample prompt the LLM would receive{C.RESET}")
    print(f"{C.DIM}Profile: {profile['name']}{C.RESET}")
    hr("-")

    template = (
        CRISIS_PROMPT_TEMPLATE if result["crisis"] else NORMAL_PROMPT_TEMPLATE
    )
    prompt = template.format(
        risk_tier=result["tier"],
        risk_score=result["proba"],
        z_bands=result["z_bands"],
        categorical_signals=result["categorical_signals"],
        categorical_values={
            col: profile["features"][col] for col in CATEGORICAL
        },
        key_factors=[
            f"{f['feature']} ({f['direction']} z={f['z']})"
            for f in result["key_factors"]
        ],
    )
    print(prompt)


# ---------------------------------------------------------------- main
def main() -> int:
    print_header()

    results: List[Dict[str, Any]] = []
    for i, profile in enumerate(PROFILES, 1):
        result = run_profile(profile)
        print_profile(i, len(PROFILES), profile, result)
        results.append((profile, result))

    print_summary(results)

    # Show what the crisis case actually sends to the LLM.
    crisis_pair = next(
        ((p, r) for p, r in results if r["crisis"]), None
    )
    if crisis_pair:
        print()
        print_sample_prompt(*crisis_pair)

    hr()
    print(f"{C.BOLD}What this demonstrates:{C.RESET}")
    print("  · Trained RF classifies the full risk spectrum, from Very Low to High")
    print("  · Z-score bands and categorical signals come from training statistics")
    print("  · Crisis rule fires on the extreme profile and selects the crisis prompt")
    print("  · No LLM call — results are deterministic and reproducible offline")
    hr()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(130)