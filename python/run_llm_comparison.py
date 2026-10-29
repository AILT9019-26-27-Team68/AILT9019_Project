"""
run_llm_comparison.py — Final LLM comparison on Alibaba Cloud Bailian.

Runs the fixed evaluation profiles from python/test_fixed_set.py through the
exact same prompt and LLM parameters the Express server uses, once per model,
and records the full advice, usage, finish reason and wall-clock latency.

The RF/prompt side is produced by python/inference_service.py directly, so the
comparison isolates the LLM: the tier, z-bands, crisis flag and prompt are
identical for every model.

Usage:
    .venv\\Scripts\\python.exe python/run_llm_comparison.py

    # choose different models
    .venv\\Scripts\\python.exe python/run_llm_comparison.py \
        --model DeepSeek=deepseek-v4.1-flash \
        --model Qwen=qwen3.8-flash \
        --model Kimi=kimi-k2.6

Output:
    reports/llm_comparison_raw.json (full prompt + advice + metrics)
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

from python.inference_service import StudentInput, predict  # noqa: E402
from python.test_fixed_set import PROFILES  # noqa: E402

SYSTEM_PROMPT = (
    "You are a supportive, non-clinical academic coach. "
    "Answer in 2-4 short paragraphs. Do not reveal your reasoning."
)

LANG_INSTRUCTIONS = {
    "en": "\nRespond in English.",
    "zh-Hant": (
        "\nRespond in Traditional Chinese using Hong Kong conventions "
        "(繁體中文，香港用語). Keep formatting clean."
    ),
    "zh-Hans": "\nRespond in Simplified Chinese (简体中文). Keep formatting clean.",
}

# Cost-aware selection: flash/plus tiers only; skip pro/max variants.
DEFAULT_MODELS = [
    {"family": "DeepSeek", "model_id": "deepseek-v4.1-flash"},
    {"family": "Qwen", "model_id": "qwen3.8-flash"},
    {"family": "Kimi", "model_id": "kimi-k2.6"},
]

CEDARS_RE = re.compile(r"\bcedars\b", re.IGNORECASE)
EMERGENCY_RE = re.compile(r"emergenc", re.IGNORECASE)
CAMPUS_RE = re.compile(r"campus support", re.IGNORECASE)
CJK_RE = re.compile(r"[\u3400-\u9fff]")


def occurrences(pattern: re.Pattern[str], text: str) -> int:
    return len(pattern.findall(text or ""))


def count_words(text: str) -> int:
    return len(re.findall(r"\S+", text or ""))


def count_paragraphs(text: str) -> int:
    return len([p for p in re.split(r"\n\s*\n", text or "") if p.strip()])


def count_bullets(text: str) -> int:
    return len(
        [
            line
            for line in (text or "").splitlines()
            if re.match(r"^\s*(?:[-*+•]|\d+[.)])\s+", line)
        ]
    )


def count_headings(text: str) -> int:
    return len(
        [line for line in (text or "").splitlines() if re.match(r"^\s*#{1,6}\s+", line)]
    )


def percentile(values: List[float], pct: float) -> Optional[float]:
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, math.ceil(pct * len(ordered)) - 1))
    return round(ordered[index], 1)


def latency_stats(values: List[float]) -> Dict[str, Optional[float]]:
    if not values:
        return {
            "count": 0,
            "mean": None,
            "median": None,
            "p95": None,
            "min": None,
            "max": None,
            "stdev": None,
        }
    return {
        "count": len(values),
        "mean": round(statistics.fmean(values), 1),
        "median": round(statistics.median(values), 1),
        "p95": percentile(values, 0.95),
        "min": round(min(values), 1),
        "max": round(max(values), 1),
        "stdev": round(statistics.stdev(values), 1) if len(values) > 1 else 0.0,
    }


def advise_metrics(advice: str) -> Dict[str, Any]:
    return {
        "characters": len(advice or ""),
        "words": count_words(advice),
        "paragraphs": count_paragraphs(advice),
        "bullets": count_bullets(advice),
        "headings": count_headings(advice),
        "cedars_mentions": occurrences(CEDARS_RE, advice),
        "emergency_mentions": occurrences(EMERGENCY_RE, advice),
        "campus_support_mentions": occurrences(CAMPUS_RE, advice),
        "has_cjk": bool(CJK_RE.search(advice or "")),
    }


def infer_case(features: Dict[str, Any]) -> Dict[str, Any]:
    result = predict(StudentInput(**features))
    return {
        "risk_score": result["risk_score"],
        "risk_tier": result["risk_tier"],
        "decision": result["decision"],
        "threshold": result["threshold"],
        "crisis": result["crisis"],
        "prompt_type": result["prompt_type"],
        "z_bands": result["z_bands"],
        "key_factors": result["key_factors"],
        "categorical_signals": result["categorical_signals"],
        "prompt": result["prompt"],
    }


def call_model(
    client: httpx.Client,
    url: str,
    payload: Dict[str, Any],
    retries: int = 3,
) -> Tuple[Optional[Dict[str, Any]], Optional[int], float, List[Dict[str, Any]], Optional[str]]:
    """Call the endpoint, retrying only 429/5xx/transport errors.

    Returns (data, http_status, latency_ms, attempts, error). The latency is the
    successful attempt's wall-clock time; attempts records every try.
    """
    attempts: List[Dict[str, Any]] = []
    last_error: Optional[str] = None
    last_status: Optional[int] = None
    last_latency = 0.0

    for attempt in range(1, retries + 1):
        started = time.perf_counter()
        try:
            response = client.post(url, json=payload)
            latency_ms = round((time.perf_counter() - started) * 1000, 1)
            last_latency = latency_ms
            last_status = response.status_code
            attempts.append(
                {"attempt": attempt, "latency_ms": latency_ms, "status": response.status_code}
            )

            if response.status_code in (429, 500, 502, 503, 504) and attempt < retries:
                last_error = f"HTTP {response.status_code}: {response.text[:300]}"
                time.sleep(2 * attempt)
                continue

            if response.status_code >= 400:
                return (
                    None,
                    response.status_code,
                    latency_ms,
                    attempts,
                    f"HTTP {response.status_code}: {response.text[:500]}",
                )

            return response.json(), response.status_code, latency_ms, attempts, None

        except Exception as exc:  # noqa: BLE001 - transport/timeout/parsing
            latency_ms = round((time.perf_counter() - started) * 1000, 1)
            last_latency = latency_ms
            attempts.append(
                {
                    "attempt": attempt,
                    "latency_ms": latency_ms,
                    "status": None,
                    "error": f"{type(exc).__name__}: {str(exc)[:300]}",
                }
            )
            last_error = f"{type(exc).__name__}: {str(exc)[:300]}"
            if attempt < retries:
                time.sleep(2 * attempt)

    return None, last_status, last_latency, attempts, last_error


def parse_response(
    data: Optional[Dict[str, Any]], http_status: Optional[int], latency_ms: float,
    attempts: List[Dict[str, Any]], error: Optional[str],
) -> Dict[str, Any]:
    if data is None:
        return {
            "advice": "",
            "http_status": http_status,
            "latency_ms": latency_ms,
            "attempts": attempts,
            "finish_reason": None,
            "response_model": None,
            "usage": None,
            "error": error or "no response",
            "metrics": advise_metrics(""),
        }

    choice = (data.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    advice = (message.get("content") or "").strip()
    usage = data.get("usage") or {}
    finish_reason = choice.get("finish_reason")

    if not advice:
        reasoning_tokens = (usage.get("completion_tokens_details") or {}).get(
            "reasoning_tokens"
        )
        error = (
            "empty content "
            f"(finish_reason={finish_reason}, reasoning_tokens={reasoning_tokens})"
        )

    return {
        "advice": advice,
        "http_status": http_status,
        "latency_ms": latency_ms,
        "attempts": attempts,
        "finish_reason": finish_reason,
        "response_model": data.get("model"),
        "usage": usage,
        "error": error if not advice else None,
        "metrics": advise_metrics(advice),
    }


def summarize_cases(cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    successful = [
        case
        for case in cases
        if case.get("error") is None and case.get("advice")
    ]
    latencies = [case["latency_ms"] for case in successful]
    crisis = [case for case in cases if case["kind"] == "crisis"]
    normal = [case for case in cases if case["kind"] == "normal"]
    successful_crisis = [
        case for case in crisis if case.get("error") is None and case.get("advice")
    ]
    successful_normal = [
        case for case in normal if case.get("error") is None and case.get("advice")
    ]

    return {
        "calls": len(cases),
        "successful": len(successful),
        "errors": len(cases) - len(successful),
        "latency_ms": latency_stats(latencies),
        "crisis_cases": len(crisis),
        "crisis_successful": len(successful_crisis),
        "crisis_cedars_cases": sum(
            1 for case in successful_crisis if case["metrics"]["cedars_mentions"] > 0
        ),
        "crisis_cedars_all": (
            len(successful_crisis) == len(crisis)
            and all(
                case["metrics"]["cedars_mentions"] > 0
                for case in successful_crisis
            )
        ),
        "crisis_emergency_cases": sum(
            1
            for case in successful_crisis
            if case["metrics"]["emergency_mentions"] > 0
        ),
        "normal_cases": len(normal),
        "normal_successful": len(successful_normal),
        "normal_cedars_cases": sum(
            1 for case in successful_normal if case["metrics"]["cedars_mentions"] > 0
        ),
        "normal_no_cedars_all": (
            len(successful_normal) == len(normal)
            and all(
                case["metrics"]["cedars_mentions"] == 0
                for case in successful_normal
            )
        ),
        "empty_advice": sum(1 for case in cases if not case.get("advice")),
        "finish_length": sum(
            1 for case in cases if case.get("finish_reason") == "length"
        ),
        "mean_words": (
            round(statistics.fmean(case["metrics"]["words"] for case in successful), 1)
            if successful
            else None
        ),
        "mean_paragraphs": (
            round(
                statistics.fmean(
                    case["metrics"]["paragraphs"] for case in successful
                ),
                1,
            )
            if successful
            else None
        ),
        "with_bullets": sum(
            1 for case in successful if case["metrics"]["bullets"] > 0
        ),
        "with_headings": sum(
            1 for case in successful if case["metrics"]["headings"] > 0
        ),
        "chinese_output_cases": sum(
            1 for case in successful if case["metrics"]["has_cjk"]
        ),
    }


def write_json(path: Path, document: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def parse_model_args(values: Optional[List[str]]) -> List[Dict[str, str]]:
    if not values:
        return list(DEFAULT_MODELS)
    models = []
    for value in values:
        if "=" not in value:
            raise SystemExit(f"--model must be FAMILY=MODEL_ID, got: {value}")
        family, model_id = value.split("=", 1)
        models.append({"family": family.strip(), "model_id": model_id.strip()})
    return models


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model",
        action="append",
        help="FAMILY=MODEL_ID; repeatable. Defaults to the three cost-aware picks.",
    )
    parser.add_argument(
        "--language",
        choices=sorted(LANG_INSTRUCTIONS),
        default="en",
        help="Language instruction appended to the prompt (default: en).",
    )
    parser.add_argument(
        "--output",
        default=str(ROOT / "reports" / "llm_comparison_raw.json"),
        help="Raw JSON output path.",
    )
    parser.add_argument("--temperature", type=float, default=0.4)
    parser.add_argument("--max-tokens", type=int, default=4096)
    parser.add_argument("--timeout", type=float, default=180.0)
    parser.add_argument("--sleep", type=float, default=0.8)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--limit", type=int, default=0, help="Debug: first N cases only.")
    args = parser.parse_args()

    key = os.getenv("BAILIAN_API_KEY", "").strip()
    if not key:
        raise SystemExit("BAILIAN_API_KEY is not set in .env")
    base = os.getenv(
        "BAILIAN_BASE_URL",
        "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    ).rstrip("/")
    endpoint = f"{base}/chat/completions"
    language_instruction = LANG_INSTRUCTIONS[args.language]
    models = parse_model_args(args.model)

    profiles = PROFILES[: args.limit] if args.limit else PROFILES
    if not profiles:
        raise SystemExit("No profiles selected")

    document: Dict[str, Any] = {
        "meta": {
            "title": "Alibaba Cloud Bailian — DeepSeek vs Qwen vs Kimi",
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "provider": "Alibaba Cloud Bailian (OpenAI-compatible)",
            "base_url": base,
            "endpoint": endpoint,
            "system_prompt": SYSTEM_PROMPT,
            "language": args.language,
            "language_instruction": language_instruction,
            "temperature": args.temperature,
            "max_tokens": args.max_tokens,
            "test_set": "python/test_fixed_set.py :: PROFILES (10 normal + 3 crisis)",
            "case_count": len(profiles),
            "models": models,
            "protocol": (
                "Sequential calls, one per case, same prompt for every model. "
                "Latency is the successful HTTP round-trip; calls retry only on "
                "429/5xx/transport errors."
            ),
        },
        "models": [],
    }

    print(f"Provider : {base}")
    print(f"Cases    : {len(profiles)}")
    print(f"Models   : {', '.join(m['family'] + '=' + m['model_id'] for m in models)}")
    print(f"Output   : {args.output}")
    print()

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(
        timeout=httpx.Timeout(args.timeout, connect=20.0),
        headers=headers,
    ) as client:
        for model in models:
            family = model["family"]
            model_id = model["model_id"]
            print(f"=== {family} / {model_id} ===")
            cases: List[Dict[str, Any]] = []
            model_entry: Dict[str, Any] = {
                "family": family,
                "model_id": model_id,
                "cases": cases,
                "summary": None,
            }
            document["models"].append(model_entry)

            for index, profile in enumerate(profiles, 1):
                case_id = profile["name"].split()[0]
                kind = "crisis" if case_id.startswith("C") else "normal"
                features = profile["features"]

                try:
                    inference = infer_case(features)
                except Exception as exc:  # noqa: BLE001
                    case = {
                        "case_id": case_id,
                        "name": profile["name"],
                        "kind": kind,
                        "expected_tier": profile["expected_tier"],
                        "features": features,
                        "inference": None,
                        "prompt": None,
                        "advice": "",
                        "http_status": None,
                        "latency_ms": None,
                        "attempts": [],
                        "finish_reason": None,
                        "response_model": None,
                        "usage": None,
                        "error": f"inference failed: {type(exc).__name__}: {exc}",
                        "metrics": advise_metrics(""),
                    }
                    cases.append(case)
                    print(f"[{index:02d}/{len(profiles)}] {case_id}  INFERENCE ERROR")
                    write_json(Path(args.output), document)
                    continue

                prompt = inference["prompt"] + language_instruction
                payload = {
                    "model": model_id,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": args.temperature,
                    "max_tokens": args.max_tokens,
                }

                data, status, latency_ms, attempts, error = call_model(
                    client, endpoint, payload, retries=args.retries
                )
                parsed = parse_response(data, status, latency_ms, attempts, error)

                case = {
                    "case_id": case_id,
                    "name": profile["name"],
                    "kind": kind,
                    "expected_tier": profile["expected_tier"],
                    "features": features,
                    "inference": {
                        key: value
                        for key, value in inference.items()
                        if key != "prompt"
                    },
                    "prompt": prompt,
                    **parsed,
                }
                cases.append(case)
                model_entry["summary"] = summarize_cases(cases)
                write_json(Path(args.output), document)

                flags = []
                if kind == "crisis":
                    flags.append("CEDARS" if parsed["metrics"]["cedars_mentions"] else "no-CEDARS")
                else:
                    flags.append("CEDARS(!)" if parsed["metrics"]["cedars_mentions"] else "clean")
                print(
                    f"[{index:02d}/{len(profiles)}] {case_id:<3} "
                    f"{str(parsed['http_status']):>4} "
                    f"{latency_ms:>7.0f} ms "
                    f"{parsed['metrics']['words']:>4} words "
                    f"{','.join(flags)}"
                    + (f"  ERROR: {parsed['error'][:80]}" if parsed["error"] else "")
                )
                time.sleep(args.sleep)

            model_entry["summary"] = summarize_cases(cases)
            write_json(Path(args.output), document)
            summary = model_entry["summary"]
            print(
                f"--- {family}: {summary['successful']}/{summary['calls']} ok, "
                f"crisis CEDARS {summary['crisis_cedars_cases']}/{summary['crisis_cases']}, "
                f"normal CEDARS {summary['normal_cedars_cases']}/{summary['normal_cases']}, "
                f"latency mean {summary['latency_ms']['mean']} ms"
            )
            print()

    write_json(Path(args.output), document)
    print(f"Saved raw data: {args.output}")

    print("\nSummary")
    print(
        f"{'model':<28} {'ok':>3} {'crisis CEDARS':>13} "
        f"{'normal CEDARS':>13} {'mean ms':>8} {'p95 ms':>8} {'errors':>6}"
    )
    for model_entry in document["models"]:
        summary = model_entry["summary"] or summarize_cases([])
        stats = summary["latency_ms"]
        print(
            f"{model_entry['model_id']:<28} "
            f"{summary['successful']:>3} "
            f"{summary['crisis_cedars_cases']:>2}/{summary['crisis_cases']:<10} "
            f"{summary['normal_cedars_cases']:>2}/{summary['normal_cases']:<10} "
            f"{str(stats['mean']):>8} {str(stats['p95']):>8} "
            f"{summary['errors']:>6}"
        )

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(130)
