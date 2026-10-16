"""
train_model.py — Student Performance Predictor (8 features).

Features (8):
  Lifestyle numeric : Study_Hours_Per_Day, Sleep_Hours_Per_Day,
                      Stress_Level, Attendance_Rate, Age
  Situational cat   : Extracurricular_Activities, Exam_Proximity,
                      Part_Time_Job

Target: Grade -> binary
  A/B = Stable (0)
  C/D/F = At Risk (1)

Main proposal requirements covered here:
  - 80/20 stratified train/test split
  - class distribution check
  - standard RF vs class-weighted RF comparison via CV
  - At-Risk recall target >= 85%
  - accuracy target >= 70%
  - precision, recall, F1, confusion matrix
  - saved artifacts for downstream pipeline:
      risk tiers, peer stats, feature ranges, crisis rule,
      normal/crisis prompt templates, fallback messages
"""

import numpy as np
import pandas as pd
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import (
    GridSearchCV,
    StratifiedKFold,
    cross_val_predict,
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# ============================================================ CONFIG
DATA_PATH = "student_performance.csv"
MODEL_PATH = "student_risk_model.joblib"

NUMERIC = [
    "Study_Hours_Per_Day",
    "Sleep_Hours_Per_Day",
    "Stress_Level",
    "Attendance_Rate",
    "Age",
]

CATEGORICAL = [
    "Extracurricular_Activities",
    "Exam_Proximity",
    "Part_Time_Job",
]

FEATURES = NUMERIC + CATEGORICAL

TARGET_MAP = {
    "A": 0,
    "B": 0,  # Stable
    "C": 1,
    "D": 1,
    "F": 1,  # At Risk
}

ACCURACY_TARGET = 0.70
RECALL_TARGET = 0.85

RISK_TIERS = [
    {"label": "Very Low", "min": 0.00, "max": 0.30},
    {"label": "Low", "min": 0.30, "max": 0.50},
    {"label": "Moderate", "min": 0.50, "max": 0.75},
    {"label": "High", "min": 0.75, "max": 1.00},
]

CRISIS_RULES = [
    {
        "name": "extreme_stress_low_sleep",
        "conditions": {
            "Stress_Level": {"min": 9},
            "Sleep_Hours_Per_Day": {"max": 3},
        },
    }
]

NORMAL_PROMPT_TEMPLATE = """
You are an informational academic coaching assistant.
Use only the structured risk summary below.
Do not give medical, diagnostic, or counselling advice.
Do not mention CEDARS.

Categorical values (raw selections — this is the ground truth):
{categorical_values}

Categorical signals (interpretation of how each selection correlates with risk):
{categorical_signals}

Numeric z-score bands: {z_bands}
Key factors: {key_factors}
Risk tier: {risk_tier}
Risk probability: {risk_score:.2f}

Rules:
- If a categorical value is "No", the student does NOT have that attribute.
  Do not advise them as if they have it, and do not suggest reducing it.
  You may briefly suggest considering it if evidence indicates it would help.
- Only address study habits, sleep, stress, attendance, extracurriculars,
  exam preparation, or part-time work if relevant to the values above.
- Keep the advice supportive, concise, and action-oriented.
"""

CRISIS_PROMPT_TEMPLATE = """
You are an informational academic coaching assistant.
The structured inputs triggered a crisis-support rule.
Do not diagnose or provide medical advice.
Include a supportive recommendation to contact university support such as CEDARS.

Categorical values (raw selections — this is the ground truth):
{categorical_values}

Categorical signals (interpretation of how each selection correlates with risk):
{categorical_signals}

Numeric z-score bands: {z_bands}
Key factors: {key_factors}
Risk tier: {risk_tier}
Risk probability: {risk_score:.2f}

Rules:
- If a categorical value is "No", the student does NOT have that attribute.
  Do not advise them as if they have it.
- Encourage the student to reach out to CEDARS or campus support.
- If there is immediate danger, advise contacting emergency services.
- Keep the message supportive and concise.
"""

FALLBACK_NORMAL = (
    "Based on your structured inputs, consider improving sleep consistency, "
    "building a regular study timetable, and reducing stress through short "
    "breaks and campus support services. This is informational coaching only."
)

FALLBACK_CRISIS = (
    "Your inputs suggest a high-stress pattern. Please contact CEDARS or your "
    "campus support service for confidential help. If you are in immediate "
    "danger, contact emergency services."
)

# ============================================================ 1. LOAD
df = pd.read_csv(DATA_PATH)
print(f"Loaded {len(df)} rows")

required_cols = FEATURES + ["Grade"]
missing = [c for c in required_cols if c not in df.columns]
if missing:
    raise ValueError(f"Dataset is missing required columns: {missing}")

df = df[required_cols].copy()
print("Kept only 8 proposal features + Grade. Dropped PII/leaky/unused columns.")

# ============================================================ 2. TARGET
print("\nOriginal Grade distribution:")
print(df["Grade"].value_counts().sort_index())

df["target"] = df["Grade"].map(TARGET_MAP)

if df["target"].isna().any():
    bad = df.loc[df["target"].isna(), "Grade"].unique().tolist()
    raise ValueError(f"Unmapped Grade values found: {bad}")

print(f"\nAt-risk rate: {df['target'].mean():.2%}")
print(f"Stable: {(df['target'] == 0).sum()}")
print(f"At Risk: {(df['target'] == 1).sum()}")

# ============================================================ 3. SPLIT
X = df[FEATURES]
y = df["target"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

print(f"\nTrain: {len(X_train)}   Test: {len(X_test)}")
print(f"Train At-Risk rate: {y_train.mean():.2%}")
print(f"Test At-Risk rate:  {y_test.mean():.2%}")

# ============================================================ 4. PREPROCESS
pre = ColumnTransformer(
    [
        ("num", StandardScaler(), NUMERIC),
        (
            "cat",
            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            CATEGORICAL,
        ),
    ]
)

pipeline = Pipeline(
    [
        ("pre", pre),
        (
            "clf",
            RandomForestClassifier(
                random_state=42,
                n_jobs=-1,
            ),
        ),
    ]
)

# ============================================================ 5. TRAIN RF
param_grid = {
    "clf__n_estimators": [300, 500, 800],
    "clf__max_depth": [6, 8, 12, None],
    "clf__min_samples_leaf": [1, 2, 4],
    "clf__class_weight": [None, "balanced"],
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

print("\nRunning GridSearchCV (5-fold, scoring=At-Risk recall)...")
search = GridSearchCV(
    pipeline,
    param_grid,
    cv=cv,
    scoring="recall",
    n_jobs=-1,
    verbose=1,
)

search.fit(X_train, y_train)

best = search.best_estimator_

print(f"\nBest params: {search.best_params_}")
print(f"Best CV At-Risk recall: {search.best_score_:.4f}")

# ============================================================ 6. THRESHOLD TUNING
print("\nTuning threshold using Out-Of-Fold CV predictions...")
y_train_proba = cross_val_predict(
    best,
    X_train,
    y_train,
    cv=cv,
    method="predict_proba",
    n_jobs=-1,
)[:, 1]

thresholds = np.arange(0.05, 0.96, 0.01)
candidates = []

for t in thresholds:
    pred = (y_train_proba >= t).astype(int)
    rec = recall_score(y_train, pred, pos_label=1, zero_division=0)
    prec = precision_score(y_train, pred, pos_label=1, zero_division=0)
    f1 = f1_score(y_train, pred, pos_label=1, zero_division=0)
    acc = accuracy_score(y_train, pred)
    candidates.append((float(t), rec, prec, f1, acc))

eligible = [c for c in candidates if c[1] >= RECALL_TARGET]

if eligible:
    best_c = max(eligible, key=lambda c: (c[2], c[3], c[4]))
    reason = f"met Recall >= {RECALL_TARGET:.2f}"
else:
    best_c = max(candidates, key=lambda c: (c[1], c[2], c[3]))
    reason = f"could not meet Recall >= {RECALL_TARGET:.2f}; chose highest recall"

best_t = round(best_c[0], 2)
best_oof_recall = best_c[1]
best_oof_precision = best_c[2]
best_oof_f1 = best_c[3]
best_oof_acc = best_c[4]

print(f"Best threshold: {best_t}  ({reason})")
print(f"OOF Train Accuracy:     {best_oof_acc:.4f}")
print(f"OOF Train At-Risk Rec:  {best_oof_recall:.4f}")
print(f"OOF Train At-Risk Prec: {best_oof_precision:.4f}")
print(f"OOF Train At-Risk F1:   {best_oof_f1:.4f}")

# ============================================================ 7. EVALUATE
y_proba = best.predict_proba(X_test)[:, 1]
y_pred = (y_proba >= best_t).astype(int)

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred, pos_label=1, zero_division=0)
rec = recall_score(y_test, y_pred, pos_label=1, zero_division=0)
f1 = f1_score(y_test, y_pred, pos_label=1, zero_division=0)

print("\n===== Test set =====")
print(
    f"Accuracy:          {acc:.4f} "
    f"{'PASS' if acc >= ACCURACY_TARGET else 'FAIL'} "
    f"(target >= {ACCURACY_TARGET:.2f})"
)
print(
    f"At-Risk recall:    {rec:.4f} "
    f"{'PASS' if rec >= RECALL_TARGET else 'FAIL'} "
    f"(target >= {RECALL_TARGET:.2f})"
)
print(f"At-Risk precision: {prec:.4f}")
print(f"At-Risk F1:        {f1:.4f}")

print("\nClassification report:")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=["Stable", "At Risk"],
        zero_division=0,
    )
)

cm = confusion_matrix(y_test, y_pred)
print("Confusion matrix (rows=true, cols=pred):")
print(cm)

tn, fp, fn, tp = cm.ravel()
print(f"TN={tn}  FP={fp}  FN={fn}  TP={tp}")

def risk_tier(p: float) -> str:
    if p < 0.30:
        return "Very Low"
    if p < 0.50:
        return "Low"
    if p < 0.75:
        return "Moderate"
    return "High"

test_tiers = pd.Series([risk_tier(p) for p in y_proba]).value_counts()
print("\nTest risk tier distribution:")
print(test_tiers)

# ============================================================ 8. RUNTIME ARTIFACTS
train_df = df.loc[X_train.index].copy()

peer_stats = {}

for col in NUMERIC:
    peer_stats[col] = {
        "mean": float(train_df[col].mean()),
        "std": float(train_df[col].std(ddof=0)),
        "min": float(train_df[col].min()),
        "max": float(train_df[col].max()),
    }

for col in CATEGORICAL:
    base = train_df[col].value_counts(normalize=True, dropna=False)
    risk = train_df.groupby(col)["target"].mean()
    peer_stats[col] = {
        "base_rates": {str(k): float(v) for k, v in base.items()},
        "at_risk_rates": {str(k): float(v) for k, v in risk.items()},
    }

peer_stats["_overall_at_risk_rate"] = float(train_df["target"].mean())

feature_ranges = {}

for col in NUMERIC:
    feature_ranges[col] = {
        "min": float(train_df[col].min()),
        "max": float(train_df[col].max()),
    }

for col in CATEGORICAL:
    feature_ranges[col] = {
        "allowed": sorted(train_df[col].dropna().astype(str).unique().tolist())
    }

# ============================================================ 9. SAVE
joblib.dump(
    {
        "model": best,
        "threshold": best_t,
        "risk_tiers": RISK_TIERS,
        "recall_target": RECALL_TARGET,
        "accuracy_target": ACCURACY_TARGET,

        "numeric": NUMERIC,
        "categorical": CATEGORICAL,
        "features": FEATURES,

        "peer_stats": peer_stats,
        "feature_ranges": feature_ranges,

        "crisis_rules": CRISIS_RULES,
        "normal_prompt_template": NORMAL_PROMPT_TEMPLATE,
        "crisis_prompt_template": CRISIS_PROMPT_TEMPLATE,

        "fallback_normal": FALLBACK_NORMAL,
        "fallback_crisis": FALLBACK_CRISIS,
    },
    MODEL_PATH,
)

print(f"\nSaved -> {MODEL_PATH}")
