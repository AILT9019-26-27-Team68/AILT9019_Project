"""
test_fixed_set.py — Fixed evaluation set for proposal §3.2 and §3.3.

Covers both parts of proposal §3.2:
  A. Input validation (empty form, missing entries, type mismatch,
     out-of-range values, SQL injection) — must be cleanly rejected.
  B. Fixed profile set: 10 normal + 3 crisis profiles.
     Pass rule: at least 8/10 normal match expected tier,
     AND all 3 crisis cases fire + mention CEDARS.

For §3.3 LLM comparison: run this script once per LLM_PROVIDER setting.

Usage:
    # ensure `npm run dev` is running in another terminal
    source .venv/bin/activate
    python python/test_fixed_set.py

    # skip the LLM call for profiles (faster, model + crisis check only)
    python python/test_fixed_set.py --no-llm

    # skip the profile tests, run only validation tests
    python python/test_fixed_set.py --validate-only

Exit code 0 = pass, 1 = fail.
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT / ".env")

NODE_API_URL = os.getenv("NODE_API_URL", "http://127.0.0.1:5000")
PY_URL = os.getenv("PYTHON_SERVICE_URL", "http://127.0.0.1:8000")
TIMEOUT = 120
VALIDATE_TIMEOUT = 10

# ---------------------------------------------------------------- profiles
PROFILES: List[Dict[str, Any]] = [
    # ---------------- Normal: Very Low ----------------
    {
        "name": "N1  Balanced and rested",
        "expected_tier": "Very Low",
        "features": {
            "Study_Hours_Per_Day": 5, "Sleep_Hours_Per_Day": 8,
            "Stress_Level": 3, "Attendance_Rate": 95, "Age": 20,
            "Extracurricular_Activities": "Yes",
            "Exam_Proximity": "No", "Part_Time_Job": "No",
        },
    },
    {
        "name": "N2  Well-slept and consistent",
        "expected_tier": "Very Low",
        "features": {
            "Study_Hours_Per_Day": 6, "Sleep_Hours_Per_Day": 8,
            "Stress_Level": 3, "Attendance_Rate": 92, "Age": 21,
            "Extracurricular_Activities": "Yes",
            "Exam_Proximity": "No", "Part_Time_Job": "No",
        },
    },
    {
        "name": "N3  Engaged and low stress",
        "expected_tier": "Very Low",
        "features": {
            "Study_Hours_Per_Day": 5, "Sleep_Hours_Per_Day": 7.5,
            "Stress_Level": 4, "Attendance_Rate": 90, "Age": 20,
            "Extracurricular_Activities": "Yes",
            "Exam_Proximity": "No", "Part_Time_Job": "No",
        },
    },
    # ---------------- Normal: Low ----------------
    {
        "name": "N4  Mild concerns",
        "expected_tier": "Low",
        "features": {
            "Study_Hours_Per_Day": 4, "Sleep_Hours_Per_Day": 7,
            "Stress_Level": 5, "Attendance_Rate": 85, "Age": 20,
            "Extracurricular_Activities": "No",
            "Exam_Proximity": "No", "Part_Time_Job": "No",
        },
    },
    {
        "name": "N5  Slightly stressed, works part-time",
        "expected_tier": "Low",
        "features": {
            "Study_Hours_Per_Day": 4, "Sleep_Hours_Per_Day": 6.5,
            "Stress_Level": 6, "Attendance_Rate": 80, "Age": 21,
            "Extracurricular_Activities": "Yes",
            "Exam_Proximity": "No", "Part_Time_Job": "Yes",
        },
    },
    {
        "name": "N6  Committed worker",
        "expected_tier": "Low",
        "features": {
            "Study_Hours_Per_Day": 3, "Sleep_Hours_Per_Day": 7,
            "Stress_Level": 5, "Attendance_Rate": 82, "Age": 22,
            "Extracurricular_Activities": "No",
            "Exam_Proximity": "No", "Part_Time_Job": "Yes",
        },
    },
    # ---------------- Normal: Moderate ----------------
    {
        "name": "N7  Exam pressure building",
        "expected_tier": "Moderate",
        "features": {
            "Study_Hours_Per_Day": 4, "Sleep_Hours_Per_Day": 6,
            "Stress_Level": 7, "Attendance_Rate": 75, "Age": 21,
            "Extracurricular_Activities": "Yes",
            "Exam_Proximity": "Yes", "Part_Time_Job": "No",
        },
    },
    {
        "name": "N8  Multiple competing demands",
        "expected_tier": "Moderate",
        "features": {
            "Study_Hours_Per_Day": 3, "Sleep_Hours_Per_Day": 6,
            "Stress_Level": 6, "Attendance_Rate": 70, "Age": 22,
            "Extracurricular_Activities": "No",
            "Exam_Proximity": "Yes", "Part_Time_Job": "Yes",
        },
    },
    # ---------------- Normal: High ----------------
    {
        "name": "N9  Struggling student",
        "expected_tier": "High",
        "features": {
            "Study_Hours_Per_Day": 2, "Sleep_Hours_Per_Day": 5,
            "Stress_Level": 8, "Attendance_Rate": 60, "Age": 21,
            "Extracurricular_Activities": "No",
            "Exam_Proximity": "Yes", "Part_Time_Job": "Yes",
        },
    },
    {
        "name": "N10 High stress, low sleep, exam soon",
        "expected_tier": "High",
        "features": {
            "Study_Hours_Per_Day": 2, "Sleep_Hours_Per_Day": 4.5,
            "Stress_Level": 8, "Attendance_Rate": 55, "Age": 22,
            "Extracurricular_Activities": "No",
            "Exam_Proximity": "Yes", "Part_Time_Job": "Yes",
        },
    },
    # ---------------- Crisis (stress>=9 AND sleep<=3) ----------------
    {
        "name": "C1  Extreme stress + minimal sleep",
        "expected_tier": "High",
        "features": {
            "Study_Hours_Per_Day": 1, "Sleep_Hours_Per_Day": 2,
            "Stress_Level": 10, "Attendance_Rate": 50, "Age": 21,
            "Extracurricular_Activities": "No",
            "Exam_Proximity": "Yes", "Part_Time_Job": "Yes",
        },
    },
    {
        "name": "C2  High stress + sleep at threshold",
        "expected_tier": "High",
        "features": {
            "Study_Hours_Per_Day": 2, "Sleep_Hours_Per_Day": 3,
            "Stress_Level": 9, "Attendance_Rate": 70, "Age": 20,
            "Extracurricular_Activities": "Yes",
            "Exam_Proximity": "Yes", "Part_Time_Job": "No",
        },
    },
    {
        "name": "C3  Severe neglect pattern",
        "expected_tier": "High",
        "features": {
            "Study_Hours_Per_Day": 0, "Sleep_Hours_Per_Day": 1,
            "Stress_Level": 10, "Attendance_Rate": 40, "Age": 23,
            "Extracurricular_Activities": "No",
            "Exam_Proximity": "Yes", "Part_Time_Job": "Yes",
        },
    },
]

# ---------------------------------------------------------------- validation
# A valid baseline used as the starting point for tampering in each test.
BASE_VALID_PROFILE: Dict[str, Any] = {
    "Study_Hours_Per_Day": 4,
    "Sleep_Hours_Per_Day": 7,
    "Stress_Level": 5,
    "Attendance_Rate": 85,
    "Age": 20,
    "Extracurricular_Activities": "Yes",
    "Exam_Proximity": "No",
    "Part_Time_Job": "No",
}

# Each test sends a tampered payload to the Express entry point and asserts
# it is rejected with a 4xx status AND a message containing the expected text.
VALIDATION_TESTS: List[Dict[str, Any]] = [
    {
        "name": "V1  Empty form (no features key)",
        "payload": {},
        "expect_error_contains": "features must be an object",
    },
    {
        "name": "V2  Empty features object",
        "payload": {"features": {}},
        "expect_error_contains": "missing field",
    },
    {
        "name": "V3  Missing entry (Age omitted)",
        "payload": {
            "features": {k: v for k, v in BASE_VALID_PROFILE.items() if k != "Age"}
        },
        "expect_error_contains": "Age",
    },
    {
        "name": "V4  Type mismatch (string in numeric field)",
        "payload": {
            "features": {**BASE_VALID_PROFILE, "Study_Hours_Per_Day": "hello"}
        },
        "expect_error_contains": "numeric",
    },
    {
        "name": "V5  Out-of-range (Sleep = 999)",
        "payload": {
            "features": {**BASE_VALID_PROFILE, "Sleep_Hours_Per_Day": 999}
        },
        "expect_error_contains": "out of range",
    },
    {
        "name": "V6  Negative value (Study = -5)",
        "payload": {
            "features": {**BASE_VALID_PROFILE, "Study_Hours_Per_Day": -5}
        },
        "expect_error_contains": "out of range",
    },
    {
        "name": "V7  Invalid categorical value",
        "payload": {
            "features": {
                **BASE_VALID_PROFILE,
                "Extracurricular_Activities": "Maybe",
            }
        },
        "expect_error_contains": "must be one of",
    },
    {
        "name": "V8  SQL injection in categorical field",
        "payload": {
            "features": {
                **BASE_VALID_PROFILE,
                "Part_Time_Job": "'; DROP TABLE users--",
            }
        },
        "expect_error_contains": "must be one of",
    },
]

# ---------------------------------------------------------------- helpers
def call_api(features: Dict[str, Any], use_llm: bool) -> Dict[str, Any]:
    if use_llm:
        r = httpx.post(
            f"{NODE_API_URL}/api/predict",
            json={"features": features, "language": "en"},
            timeout=TIMEOUT,
        )
    else:
        r = httpx.post(f"{PY_URL}/predict", json=features, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def extract_advice(payload: Dict[str, Any]) -> str:
    return (payload.get("advice") or "").strip()


def check_normal(profile: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
    actual_tier = result.get("risk_tier")
    tier_match = actual_tier == profile["expected_tier"]
    not_crisis = result.get("crisis") is False
    return {
        "tier_expected": profile["expected_tier"],
        "tier_actual": actual_tier,
        "tier_match": tier_match,
        "crisis_expected": False,
        "crisis_actual": result.get("crisis"),
        "crisis_ok": not_crisis,
        "pass": tier_match and not_crisis,
    }


def check_crisis(
    profile: Dict[str, Any], result: Dict[str, Any], advice: str, use_llm: bool
) -> Dict[str, Any]:
    crisis_fired = result.get("crisis") is True
    cedars_ok = True if not use_llm else ("cedars" in advice.lower())
    return {
        "tier_expected": profile["expected_tier"],
        "tier_actual": result.get("risk_tier"),
        "tier_match": result.get("risk_tier") == profile["expected_tier"],
        "crisis_expected": True,
        "crisis_actual": result.get("crisis"),
        "crisis_ok": crisis_fired,
        "cedars_ok": cedars_ok,
        "pass": crisis_fired and cedars_ok,
    }


def hr(char: str = "=", width: int = 78) -> None:
    print(char * width)


def section(title: str) -> None:
    print()
    hr()
    print(f"  {title}")
    hr()


# ---------------------------------------------------------------- runners
def run_profile_tests(use_llm: bool) -> List[Dict[str, Any]]:
    results = []
    for i, profile in enumerate(PROFILES, 1):
        print(f"\n[{i:02d}/{len(PROFILES)}] {profile['name']}")
        try:
            result = call_api(profile["features"], use_llm)
        except Exception as e:
            print(f"  ERROR: {e}")
            results.append((profile, None, None))
            continue

        advice = extract_advice(result)

        if profile["name"].startswith("C"):
            check = check_crisis(profile, result, advice, use_llm)
        else:
            check = check_normal(profile, result)

        status = "PASS" if check["pass"] else "FAIL"
        print(f"  Expected tier : {check['tier_expected']}")
        print(f"  Actual tier   : {check['tier_actual']}  "
              f"{'[ok]' if check.get('tier_match') else '[MISMATCH]'}")
        print(f"  Crisis flag   : {check['crisis_actual']}  "
              f"(expected {check['crisis_expected']})")
        if use_llm and check.get("cedars_ok") is not None:
            print(f"  Mentions CEDARS: {check['cedars_ok']}")
        print(f"  {status}")

        results.append((profile, result, check))
    return results


def run_validation_tests() -> List[Dict[str, Any]]:
    results = []
    for i, test in enumerate(VALIDATION_TESTS, 1):
        print(f"\n[{i:02d}/{len(VALIDATION_TESTS)}] {test['name']}")
        try:
            r = httpx.post(
                f"{NODE_API_URL}/api/predict",
                json=test["payload"],
                timeout=VALIDATE_TIMEOUT,
            )
        except Exception as e:
            print(f"  ERROR: request failed: {e}")
            results.append({"name": test["name"], "pass": False})
            continue

        status = r.status_code
        body = r.text

        status_ok = 400 <= status < 500
        expected = test.get("expect_error_contains", "")
        text_ok = expected.lower() in body.lower() if expected else True

        # Show just the error message, not the whole response body.
        try:
            parsed = r.json()
            shown = parsed.get("error") or parsed.get("detail") or parsed
        except Exception:
            shown = body[:120]

        print(f"  HTTP status    : {status}  "
              f"{'[ok, 4xx]' if status_ok else '[UNEXPECTED]'}")
        print(f"  Expected error : contains \"{expected}\"")
        print(f"  Response       : {str(shown)[:140]}")

        test_pass = status_ok and text_ok
        print(f"  {'PASS' if test_pass else 'FAIL'}")
        results.append({
            "name": test["name"],
            "status": status,
            "pass": test_pass,
        })
    return results


# ---------------------------------------------------------------- main
def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-llm", action="store_true",
                        help="Call FastAPI directly; skip the LLM advice check.")
    parser.add_argument("--validate-only", action="store_true",
                        help="Run only the input validation tests.")
    args = parser.parse_args()

    use_llm = not args.no_llm
    provider = os.getenv("LLM_PROVIDER", "nvidia")

    # -------------------------------------------------- profile tests (§3.2 A)
    profile_results: List[Any] = []
    if not args.validate_only:
        section(f"Fixed Profile Set  ·  LLM_PROVIDER = {provider}  ·  "
                f"{'with LLM' if use_llm else 'no LLM (fast)'}")
        profile_results = run_profile_tests(use_llm)

    # -------------------------------------------------- validation tests (§3.2 B)
    section("Input Validation (§3.2)")
    validation_results = run_validation_tests()

    # -------------------------------------------------- summary
    section("Summary")

    normal_pass = crisis_pass = normal_total = crisis_total = 0
    if profile_results:
        normal_rows = [
            (p, r, c) for p, r, c in profile_results
            if not p["name"].startswith("C")
        ]
        crisis_rows = [
            (p, r, c) for p, r, c in profile_results
            if p["name"].startswith("C")
        ]
        normal_pass = sum(1 for _, _, c in normal_rows if c and c["pass"])
        crisis_pass = sum(1 for _, _, c in crisis_rows if c and c["pass"])
        normal_total = len(normal_rows)
        crisis_total = len(crisis_rows)

        print(f"  {'#':<4} {'Profile':<36} {'Expected':<10} "
              f"{'Actual':<10} {'Crisis':<7} {'Result'}")
        hr("-")
        for p, r, c in profile_results:
            if c is None:
                print(f"  {'??':<4} {p['name'][:36]:<36} {'-':<10} "
                      f"{'-':<10} {'-':<7} ERROR")
                continue
            print(f"  {p['name'][:3]:<4} {p['name'][3:].strip()[:36]:<36} "
                  f"{c['tier_expected']:<10} {str(c['tier_actual']):<10} "
                  f"{str(c['crisis_actual']):<7} "
                  f"{'PASS' if c['pass'] else 'FAIL'}")
        print()
        print(f"  Normal cases: {normal_pass}/{normal_total} matched "
              f"(need >= 8)")
        print(f"  Crisis cases: {crisis_pass}/{crisis_total} passed "
              f"(need all {crisis_total})")

    validation_pass = sum(1 for v in validation_results if v["pass"])
    validation_total = len(validation_results)
    print()
    print(f"  Validation cases: {validation_pass}/{validation_total} passed "
          f"(need all {validation_total})")

    # -------------------------------------------------- overall
    profile_ok = True
    if profile_results:
        profile_ok = (normal_pass >= 8) and (crisis_pass == crisis_total)
    validation_ok = (validation_pass == validation_total)
    overall_pass = profile_ok and validation_ok

    print()
    print(f"  OVERALL: {'PASS' if overall_pass else 'FAIL'}")

    return 0 if overall_pass else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(130)
