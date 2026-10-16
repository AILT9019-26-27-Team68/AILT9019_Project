"""
inference_service.py — FastAPI inference for the trained RF model.

Loads student_risk_model.joblib, exposes:
    GET  /schema    -> input validation schema, risk tiers, targets
    POST /predict   -> risk score, tier, z-bands, categorical signals,
                       key factors, crisis flag, and the selected prompt.

This file is the only place that knows about the RF model, z-score bands,
categorical signal rules, and the crisis rule. Node just forwards.
"""

import os
from pathlib import Path
from typing import Any, Dict, List

import joblib
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------- env
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT / ".env")

_raw_bundle = os.getenv("MODEL_BUNDLE", "student_risk_model.joblib")
_bundle_path = Path(_raw_bundle)
if not _bundle_path.is_absolute():
    _bundle_path = ROOT / _bundle_path
_bundle_path = _bundle_path.resolve()
BUNDLE_PATH = str(_bundle_path)

if not _bundle_path.exists():
    raise RuntimeError(
        f"Model bundle not found at {BUNDLE_PATH}. Run train_model.py first."
    )

bundle = joblib.load(BUNDLE_PATH)

model = bundle["model"]
threshold = float(bundle["threshold"])
NUMERIC: List[str] = bundle["numeric"]
CATEGORICAL: List[str] = bundle["categorical"]
FEATURES: List[str] = bundle["features"]
RISK_TIERS: List[Dict[str, Any]] = bundle["risk_tiers"]
PEER_STATS: Dict[str, Any] = bundle["peer_stats"]
FEATURE_RANGES: Dict[str, Any] = bundle["feature_ranges"]
CRISIS_RULES: List[Dict[str, Any]] = bundle["crisis_rules"]
NORMAL_PROMPT_TEMPLATE: str = bundle["normal_prompt_template"]
CRISIS_PROMPT_TEMPLATE: str = bundle["crisis_prompt_template"]
FALLBACK_NORMAL: str = bundle["fallback_normal"]
FALLBACK_CRISIS: str = bundle["fallback_crisis"]

# ---------------------------------------------------------------- config
# Realistic UI ranges and defaults for a university student.
# `default` is what the form pre-fills — chosen to be typical, not the midpoint.
UI_RANGES = {
    "Study_Hours_Per_Day": {"min": 0, "max": 24,  "default": 4},
    "Sleep_Hours_Per_Day": {"min": 0, "max": 24,  "default": 7},
    "Stress_Level":        {"min": 0, "max": 10,  "default": 5},
    "Attendance_Rate":     {"min": 0, "max": 100, "default": 85},
    "Age":                 {"min": 15, "max": 100, "default": 20},
}

INTEGER_FIELDS = {"Age"}

# ---------------------------------------------------------------- app
app = FastAPI(title="Student Risk Inference", version="1.2.0")

@app.exception_handler(RequestValidationError)
async def _clean_validation_errors(request, exc):
    """Return a compact {field: message} list instead of Pydantic's verbose default."""
    errors = []
    for e in exc.errors():
        loc = [str(x) for x in e["loc"] if x != "body"]
        errors.append({
            "field": ".".join(loc) if loc else "body",
            "message": e["msg"],
        })
    return JSONResponse(status_code=422, content={"errors": errors})


# ---------------------------------------------------------------- schema
class StudentInput(BaseModel):
    Study_Hours_Per_Day: float = Field(..., ge=0, le=24)
    Sleep_Hours_Per_Day: float = Field(..., ge=0, le=24)
    Stress_Level: float = Field(..., ge=0, le=10)
    Attendance_Rate: float = Field(..., ge=0, le=100)
    Age: float = Field(..., ge=15, le=100)
    Extracurricular_Activities: str
    Exam_Proximity: str
    Part_Time_Job: str

    @field_validator("Extracurricular_Activities")
    @classmethod
    def _v_extracurricular(cls, v: str) -> str:
        allowed = FEATURE_RANGES.get("Extracurricular_Activities", {}).get("allowed", [])
        if allowed and v not in allowed:
            raise ValueError(f"must be one of {allowed}")
        return v

    @field_validator("Exam_Proximity")
    @classmethod
    def _v_exam(cls, v: str) -> str:
        allowed = FEATURE_RANGES.get("Exam_Proximity", {}).get("allowed", [])
        if allowed and v not in allowed:
            raise ValueError(f"must be one of {allowed}")
        return v

    @field_validator("Part_Time_Job")
    @classmethod
    def _v_job(cls, v: str) -> str:
        allowed = FEATURE_RANGES.get("Part_Time_Job", {}).get("allowed", [])
        if allowed and v not in allowed:
            raise ValueError(f"must be one of {allowed}")
        return v


# ---------------------------------------------------------------- helpers
def _z_band(z: float) -> str:
    if z <= -1.0:
        return "< -1.0"
    if z <= -0.5:
        return "-1.0 to -0.5"
    if z < 0.5:
        return "-0.5 to 0.5"
    if z < 1.0:
        return "0.5 to 1.0"
    return "> 1.0"


def _categorical_signal(feature: str, value: str) -> str:
    stats = PEER_STATS.get(feature, {})
    at_risk_rates = stats.get("at_risk_rates", {})
    overall = PEER_STATS.get("_overall_at_risk_rate", 0.5)
    rate = at_risk_rates.get(str(value))
    if rate is None or overall <= 0:
        return "neutral"

    ratio = rate / overall
    if ratio >= 1.5:
        strength = "strong"
    elif ratio >= 1.2:
        strength = "moderate"
    elif ratio >= 0.9:
        strength = "mild"
    else:
        return "protective"

    return f"{strength} risk signal"


def _check_crisis(payload: Dict[str, float]) -> bool:
    for rule in CRISIS_RULES:
        ok = True
        for feat, cond in rule["conditions"].items():
            if "min" in cond and payload.get(feat, 0) < cond["min"]:
                ok = False
                break
            if "max" in cond and payload.get(feat, 0) > cond["max"]:
                ok = False
                break
        if ok:
            return True
    return False


def _risk_tier(prob: float) -> str:
    for tier in RISK_TIERS:
        if tier["min"] <= prob < tier["max"]:
            return tier["label"]
    return RISK_TIERS[-1]["label"]


# ---------------------------------------------------------------- routes
@app.get("/schema")
def schema():
    return {
        "numeric": [
            {
                "name": col,
                "min": UI_RANGES[col]["min"],
                "max": UI_RANGES[col]["max"],
                "default": UI_RANGES[col]["default"],
                "mean": PEER_STATS[col]["mean"],
                "std": PEER_STATS[col]["std"],
                "integer": col in INTEGER_FIELDS,
            }
            for col in NUMERIC
        ],
        "categorical": [
            {"name": col, "allowed": FEATURE_RANGES[col]["allowed"]}
            for col in CATEGORICAL
        ],
        "risk_tiers": RISK_TIERS,
        "recall_target": bundle["recall_target"],
        "accuracy_target": bundle["accuracy_target"],
        "threshold": threshold,
    }

@app.post("/predict")
def predict(payload: StudentInput):
    row = payload.model_dump()

    # Strict range check against realistic UI bounds.
    for col in NUMERIC:
        lo = UI_RANGES[col]["min"]
        hi = UI_RANGES[col]["max"]
        val = float(row[col])
        if val < lo or val > hi:
            raise HTTPException(
                status_code=400,
                detail=f"{col} out of realistic range [{lo}, {hi}]",
            )

    # Age is int in training; round before building the DataFrame.
    for field in INTEGER_FIELDS:
        if field in row:
            row[field] = int(round(float(row[field])))

    # ---- 1. RF probability
    X = pd.DataFrame([row], columns=FEATURES)
    try:
        proba = float(model.predict_proba(X)[0, 1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {e}")

    # ---- 2. Decision + tier
    decision = "At Risk" if proba >= threshold else "Stable"
    tier = _risk_tier(proba)

    # ---- 3. Z-bands + key factors
    z_bands: Dict[str, str] = {}
    key_factors: List[Dict[str, Any]] = []
    for col in NUMERIC:
        mean = PEER_STATS[col]["mean"]
        std = PEER_STATS[col]["std"] or 1.0
        z = (float(row[col]) - mean) / std
        z_bands[col] = _z_band(z)
        key_factors.append(
            {
                "feature": col,
                "z": round(float(z), 2),
                "direction": "high" if z >= 0 else "low",
            }
        )
    key_factors.sort(key=lambda f: abs(f["z"]), reverse=True)
    key_factors = key_factors[:3]

    # ---- 4. Categorical signals
    categorical_signals = {
        col: _categorical_signal(col, str(row[col])) for col in CATEGORICAL
    }

    # ---- 5. Crisis rule
    crisis = _check_crisis(row)
    template = CRISIS_PROMPT_TEMPLATE if crisis else NORMAL_PROMPT_TEMPLATE
    fallback = FALLBACK_CRISIS if crisis else FALLBACK_NORMAL

    prompt = template.format(
        risk_tier=tier,
        risk_score=proba,
        z_bands=z_bands,
        categorical_signals=categorical_signals,
        categorical_values={col: row[col] for col in CATEGORICAL},
        key_factors=[f"{f['feature']} ({f['direction']} z={f['z']})" for f in key_factors],
    )

    return {
        "risk_score": round(proba, 4),
        "risk_tier": tier,
        "decision": decision,
        "threshold": threshold,
        "z_bands": z_bands,
        "categorical_signals": categorical_signals,
        "key_factors": key_factors,
        "crisis": crisis,
        "prompt_type": "crisis" if crisis else "normal",
        "prompt": prompt,
        "fallback": fallback,
    }
