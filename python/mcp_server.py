"""
mcp_server.py — Exposes two MCP tools:
    - predict_risk(features: dict) -> dict
    - get_advice(features: dict, language: str) -> str

Backed by the FastAPI inference service and the Node LLM proxy.

Run standalone for an MCP client (e.g. Claude Desktop):
    fastmcp run mcp_server.py

Or use test_mcp.py to verify both tools without an external client.
"""

import os
from pathlib import Path
from typing import Any, Dict

import httpx
from dotenv import load_dotenv
from fastmcp import FastMCP

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT / ".env")

PYTHON_SERVICE_URL = os.getenv("PYTHON_SERVICE_URL", "http://127.0.0.1:8000")
NODE_API_URL = os.getenv("NODE_API_URL", "http://127.0.0.1:5000")

mcp = FastMCP("student-risk")


@mcp.tool()
async def predict_risk(features: Dict[str, Any]) -> Dict[str, Any]:
    """Return risk score, tier, z-bands, categorical signals, crisis flag."""
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{PYTHON_SERVICE_URL}/predict", json=features)
        r.raise_for_status()
        return r.json()


@mcp.tool()
async def get_advice(features: Dict[str, Any], language: str = "en") -> str:
    """Return LLM advice for the given structured inputs."""
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            f"{NODE_API_URL}/api/predict",
            json={"features": features, "language": language},
        )
        r.raise_for_status()
        return r.json().get("advice", "")


if __name__ == "__main__":
    mcp.run()
