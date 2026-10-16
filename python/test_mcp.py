"""
test_mcp.py — Smoke-test the MCP server.

Spawns mcp_server.py over stdio, lists its tools, then calls each one with a
sample profile and prints the result. No external MCP client required.

Prerequisites:
    - FastAPI inference service running (PYTHON_SERVICE_URL, default 8000)
    - Express backend running (NODE_API_URL, default 5000)
    Both are started by `npm run dev` in the project root.

Run from the project root (either works):
    python python/test_mcp.py
    npm run test:mcp

Exit code:
    0 = all checks passed
    1 = one or more checks failed
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastmcp import Client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT / ".env")

MCP_SCRIPT = Path(__file__).resolve().parent / "mcp_server.py"

NORMAL_PROFILE = {
    "Study_Hours_Per_Day": 4,
    "Sleep_Hours_Per_Day": 7,
    "Stress_Level": 4,
    "Attendance_Rate": 90,
    "Age": 20,
    "Extracurricular_Activities": "Yes",
    "Exam_Proximity": "No",
    "Part_Time_Job": "No",
}

CRISIS_PROFILE = {
    "Study_Hours_Per_Day": 1,
    "Sleep_Hours_Per_Day": 2,
    "Stress_Level": 10,
    "Attendance_Rate": 50,
    "Age": 22,
    "Extracurricular_Activities": "No",
    "Exam_Proximity": "Yes",
    "Part_Time_Job": "Yes",
}


def section(title: str) -> None:
    print("\n" + "=" * 64)
    print(f"  {title}")
    print("=" * 64)


def extract(result: Any) -> Any:
    """
    Pull the payload out of a FastMCP CallToolResult.
    - Dict-returning tools: parsed from the first text content block
    - String-returning tools: the raw text
    """
    data = getattr(result, "data", None)
    if data is not None:
        return data

    for block in getattr(result, "content", []) or []:
        text = getattr(block, "text", None)
        if text is None:
            continue
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text
    return None


def check_services() -> bool:
    section("0. Check upstream services")
    py_url = os.getenv("PYTHON_SERVICE_URL", "http://127.0.0.1:8000")
    node_url = os.getenv("NODE_API_URL", "http://127.0.0.1:5000")
    ok = True
    for name, url in [
        ("FastAPI", f"{py_url}/schema"),
        ("Express", f"{node_url}/health"),
    ]:
        try:
            r = httpx.get(url, timeout=3)
            print(f"  {name:8s} HTTP {r.status_code}   {url}")
        except Exception as e:
            print(f"  {name:8s} UNREACHABLE      {url}")
            print(f"           -> {e}")
            ok = False
    if not ok:
        print("\n  Start `npm run dev` in another terminal first.")
    return ok


async def run_checks() -> bool:
    ok = True

    async with Client(MCP_SCRIPT) as client:
        # -------------------------------------------------- 1. list tools
        section("1. List MCP tools")
        tools = await client.list_tools()
        names = [t.name for t in tools]
        print(f"  Available: {names}")
        for required in ("predict_risk", "get_advice"):
            if required not in names:
                print(f"  MISSING: {required}")
                ok = False

        # -------------------------------------------------- 2. predict_risk (normal)
        section("2. predict_risk — normal profile")
        try:
            r = await client.call_tool("predict_risk", {"features": NORMAL_PROFILE})
            data = extract(r)
            print(json.dumps(data, indent=2, default=str)[:900])
            if isinstance(data, dict):
                if data.get("crisis") is True:
                    print("  UNEXPECTED: normal profile was flagged as crisis")
                    ok = False
                elif "risk_tier" not in data or "risk_score" not in data:
                    print("  UNEXPECTED: response missing risk_tier / risk_score")
                    ok = False
        except Exception as e:
            print(f"  ERROR: {e}")
            ok = False

        # -------------------------------------------------- 3. predict_risk (crisis)
        section("3. predict_risk — crisis profile")
        try:
            r = await client.call_tool("predict_risk", {"features": CRISIS_PROFILE})
            data = extract(r)
            print(json.dumps(data, indent=2, default=str)[:900])
            if isinstance(data, dict):
                if not data.get("crisis"):
                    print("  UNEXPECTED: crisis profile was NOT flagged")
                    ok = False
        except Exception as e:
            print(f"  ERROR: {e}")
            ok = False

        # -------------------------------------------------- 4. get_advice (crisis)
        section("4. get_advice — crisis profile (English)")
        try:
            r = await client.call_tool(
                "get_advice",
                {"features": CRISIS_PROFILE, "language": "en"},
            )
            text = extract(r)
            if not isinstance(text, str):
                text = json.dumps(text, default=str)
            print(text[:900])
            if "cedars" not in text.lower():
                print("  UNEXPECTED: crisis advice did not mention CEDARS")
                ok = False
        except Exception as e:
            print(f"  ERROR: {e}")
            ok = False

    return ok


async def main() -> int:
    if not check_services():
        return 1
    ok = await run_checks()

    section("RESULT")
    print("  PASS — both MCP tools responded correctly"
          if ok else
          "  FAIL — see errors above")
    return 0 if ok else 1


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(130)
