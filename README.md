# Student Risk Predictor

Informational academic coaching from structured lifestyle inputs.
Eight structured features → Random Forest risk probability → risk tier and
z-score bands → crisis rule → LLM advice, presented in a trilingual dark-mode
web UI.

This project is **not** a diagnostic or clinical tool.

**Public project page:** https://ailt9019-26-27-team68.github.io/AILT9019_Project/

---

## Architecture

    React (client/)  ->  Express (server/)  ->  FastAPI (python/)  ->  RF model
                                  |
                                  +-- Alibaba Cloud Bailian
                                      (OpenAI-compatible API,
                                       default deepseek-v4.1-flash)

    FastMCP (python/mcp_server.py) -> wraps the same FastAPI + Express logic
                                      for AI-agent clients (e.g. Claude Desktop)

- `python/inference_service.py` — the only place that knows the Random Forest
  model, z-score bands, categorical signal rules, crisis rule, prompt templates
  and fallback text. Exposes `GET /schema` and `POST /predict`.
- `server/` — Express API: strict input validation, calls the Python service,
  calls the LLM, applies the safe fallback, and handles CORS/errors.
  Exposes `GET /health`, `GET /api/schema` and `POST /api/predict`.
- `client/` — React + Vite UI: dark "night sticker" theme with the HKU crest,
  schema-driven form with field help, English / 繁體中文 / 简体中文 interface,
  loading toast, scroll-snap result deck, and a right-edge tab that
  reopens the last advice. The Vite dev proxy forwards `/api` to Express on
  port 5000.
- `train_model.py` — trains and evaluates the Random Forest; writes
  `student_risk_model.joblib`.
- `python/mcp_server.py` — FastMCP server exposing `predict_risk` and
  `get_advice`.
- `python/test_model.py` — offline showcase of five illustrative profiles.
- `python/test_fixed_set.py` — fixed evaluation set plus input-validation tests.
- `python/test_mcp.py` — MCP smoke test that spawns the server over stdio.

No database. No persistence. No personal data stored.

---

## 1. Prerequisites

- Python **3.11+** — scikit-learn 1.9 requires 3.11 or newer. The current
  environment was tested with Python 3.12.10.
- Node.js **18+** — the current environment was tested with Node 24.13.0 and
  npm 11.6.2.
- An Alibaba Cloud Bailian API key for live advice. This is **optional**: with
  no key the app still runs and shows the bundled safe fallback advice.
- All commands below run from the repository root unless a section says
  otherwise.

Current tested stack: Python 3.12.10, scikit-learn 1.9.0, FastAPI 0.160.0,
React 18.3.1, Vite 5.4, Node 24.13.

---

## 2. Quick start (TA demo)

The repository already contains the trained `student_risk_model.joblib` and the
dataset `student_performance.csv`. You do **not** need to retrain to use the app.

    git clone <repo-url>
    cd AILT9019_Project

    cp .env.example .env
    # Windows PowerShell: Copy-Item .env.example .env
    # edit .env and set BAILIAN_API_KEY

    python -m venv .venv
    # activate the venv — pick the ONE line for your shell (universal):
    #   Windows cmd:         .venv\Scripts\activate.bat
    #   Windows PowerShell:  Set-ExecutionPolicy -Scope Process Bypass; .venv\Scripts\Activate.ps1
    #   macOS / Linux bash:  source .venv/bin/activate

    pip install -r python/requirements.txt    # or: npm run py:install

    npm run install:all
    npm run dev

Then open http://localhost:5173.

All three services start with one command:

- PY  -> FastAPI inference on http://127.0.0.1:8000
- API -> Express backend    on http://127.0.0.1:5000
- WEB -> Vite dev server    on http://localhost:5173

Individual services can be started with `npm run dev:py`, `npm run dev:server`
and `npm run dev:client` if you need to debug one layer at a time.

To build the client for production, run `npm --prefix client run build`; the
static bundle is written to `client/dist/`.

Keep the virtual environment active in the terminal that runs `npm run dev`:
the PY process launches `uvicorn` from that environment.

Notes:

- If `BAILIAN_API_KEY` is empty, the UI still works; the advice section shows
  the safe fallback from the model bundle instead of live LLM text.
- The MCP server is **not** part of `npm run dev`. Run it separately only if
  you want to demo the AI-agent integration (see section 7).
- Optional: verify the model before starting anything else. On Windows
  consoles that are not UTF-8 (for example cp950), see the
  `PYTHONIOENCODING` note in Troubleshooting first.

      source .venv/bin/activate
      python python/test_model.py

---

## 3. Retraining (developer only)

Only needed if you change the model, feature set, risk tiers, prompts or
fallback text.

The dataset is included at `student_performance.csv`; no manual download is
needed.

- Source: https://www.kaggle.com/datasets/lightningxyz/student-performance-dataset
- License: CC0 Public Domain

The CSV contains extra demographic and score columns. `train_model.py` keeps
only the eight model features plus the target and drops everything else:

    Study_Hours_Per_Day, Sleep_Hours_Per_Day, Stress_Level, Attendance_Rate,
    Age, Extracurricular_Activities, Exam_Proximity, Part_Time_Job, Grade

If a required column is missing, rename the CSV column or update
`NUMERIC` / `CATEGORICAL` / `TARGET_MAP` in `train_model.py`.

Then:

    python train_model.py          # regenerates student_risk_model.joblib

The shipped model was trained on scikit-learn **1.9.0**, which requires
Python 3.11+. `python/requirements.txt` pins 1.9.0 on Python < 3.15 and 1.9.1
on Python 3.15+. Do not upgrade scikit-learn without retraining, or loading the
bundle may emit `InconsistentVersionWarning`. If you are on Python 3.15+ and see
that warning, retrain with the installed 1.9.1 version.

---

## 4. Environment variables

See `.env.example`. The real `.env` lives at the project root, is loaded by both
the Python service and the Node server, and is gitignored.

| Variable | Purpose |
|---|---|
| `PORT` | Express port (default `5000`) |
| `CLIENT_ORIGIN` | Allowed CORS origin (default `http://localhost:5173`) |
| `PYTHON_SERVICE_URL` | FastAPI URL used by Express (default `http://127.0.0.1:8000`) |
| `NODE_API_URL` | Express URL used by the MCP server and test scripts (default `http://127.0.0.1:5000`) |
| `MODEL_BUNDLE` | Path to the joblib model bundle (default `./student_risk_model.joblib`; relative paths resolve from the project root) |
| `BAILIAN_API_KEY` | Alibaba Cloud Bailian API key. Leave empty to use fallback advice |
| `BAILIAN_BASE_URL` | OpenAI-compatible Bailian endpoint (default `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`) |
| `BAILIAN_MODEL` | Bailian model ID (default `deepseek-v4.1-flash`) |

If you change the Express port, also update the Vite proxy in
`client/vite.config.js` (`/api` currently targets `http://127.0.0.1:5000`).

---

## 5. Model and evaluation

### RF model

`train_model.py` builds a scikit-learn pipeline:

- `StandardScaler` for the five numeric features
- `OneHotEncoder(handle_unknown="ignore")` for the three categorical features
- `RandomForestClassifier` as the estimator

Training details:

- 80/20 stratified train/test split (`random_state=42`)
- 5-fold `StratifiedKFold` `GridSearchCV` over `n_estimators`,
  `max_depth`, `min_samples_leaf` and `class_weight`, scored on At-Risk recall
- Decision threshold tuned on out-of-fold predictions to reach an At-Risk
  recall target of **0.85**; the shipped bundle uses a tuned threshold of
  **0.51**
- Accuracy target: **0.70**
- Prints class distribution, accuracy, At-Risk precision / recall / F1,
  confusion matrix (TP / TN / FP / FN) and the test-set risk-tier distribution

Risk tiers stored in the bundle:

| Tier | Probability range |
|---|---|
| Very Low | 0.00 – 0.30 |
| Low | 0.30 – 0.50 |
| Moderate | 0.50 – 0.75 |
| High | 0.75 – 1.00 |

The crisis rule is also stored in the bundle:

    Stress_Level >= 9 AND Sleep_Hours_Per_Day <= 3

`POST /predict` returns the RF probability, tier, decision, threshold,
z-score bands for all five numeric features, the top three key factors by
absolute z-score, categorical signals, the crisis flag, the selected prompt and
the fallback text. The model bundle contains aggregate training statistics
(peer means/stds, categorical at-risk rates, feature ranges), not data rows.

### Showcase (test_model.py)

    source .venv/bin/activate
    python python/test_model.py
    # or: npm run test:model

Runs five illustrative profiles through the trained pipeline:

    RF probability  ->  risk tier  ->  z-bands  ->  categorical signals
                    ->  crisis rule  ->  prompt selection

The profiles are Healthy student, Busy but stable, Exam crunch, At-risk
pattern, and CRISIS pattern. No FastAPI, no Express and no LLM call — fully
offline and deterministic. Useful for verifying the model before starting the
rest of the stack, or for a presentation.

On Windows consoles that use a non-UTF-8 code page (for example cp950), set
`PYTHONIOENCODING=utf-8` before running the showcase; otherwise the
block-character progress bars can raise `UnicodeEncodeError`.

### Fixed test set (proposal §3.2)

    # with `npm run dev` already running in another terminal
    source .venv/bin/activate
    python python/test_fixed_set.py

    # or from the project root:
    npm run test:fixed

    # fast mode — call FastAPI directly and skip the LLM/CEDARS check
    python python/test_fixed_set.py --no-llm

    # only run the input-validation tests
    python python/test_fixed_set.py --validate-only

The script covers 13 profiles through the full stack:

- 10 normal profiles spanning all four risk tiers (Very Low, Low, Moderate,
  High)
- 3 structured crisis profiles (`Stress_Level >= 9` and
  `Sleep_Hours_Per_Day <= 3`)

It also runs 8 input-validation tests: empty form, missing entry, type
mismatch, out-of-range high and low values, invalid categorical value, and a
SQL-injection attempt.

Pass rules:

- At least 8 / 10 normal cases match the expected tier
- All 3 crisis cases fire and the advice mentions CEDARS
- All 8 validation tests are rejected with a clean 4xx error

`--no-llm` sends the profile payloads to FastAPI directly, so it checks the
model and crisis flag but skips the CEDARS advice check. The validation tests
always go through Express. Exit code 0 = pass, 1 = fail.

### LLM comparison (proposal §3.3)

The current app targets one provider: **Alibaba Cloud Bailian**, through its
OpenAI-compatible chat-completions endpoint. A model comparison is therefore
run by switching `BAILIAN_MODEL` rather than by swapping provider SDKs.

To compare models, change `BAILIAN_MODEL` in `.env`, restart the API, and rerun:

    python python/test_fixed_set.py

The script prints the normal-case pass count and the crisis-case results; the
advice text itself must be inspected for tone and quality. The risk tier, the
crisis flag and all numeric outputs come from the Random Forest, so they are
identical across providers. Only the generated advice can differ, which means
this comparison measures prompt-following and advice quality, not model
accuracy.

---

## 6. Ethics and Data

- No free-text inputs; the form only accepts eight structured fields.
- No database and no persistence. Nothing from user input is written to disk.
- The client keeps the last advice in React state so the right-edge tab can
  reopen it. It is not written to `localStorage`, cookies or session storage,
  and a page reload clears it.
- The LLM receives only the derived structured summary: risk tier, probability,
  z-score bands, key factors, and the categorical values/signals. No names,
  student IDs or contact details are collected. Age is one of the eight inputs;
  it is used for the current prediction only and is not stored.
- The dataset is CC0 Public Domain. `train_model.py` drops the extra
  demographic, major, living-area and score columns before training.
- The model bundle contains aggregate training statistics, not individual
  records.
- The crisis rule routes the user toward CEDARS or campus support, and advises
  contacting emergency services if there is immediate danger. The tool is
  non-clinical and must not be used as a diagnostic or counselling system.
- The web UI shows the disclaimer once, in the footer, and repeats the privacy
  and support information in the form's side rail.

---

## 7. MCP Server

The MCP server exposes two tools — `predict_risk(features)` and
`get_advice(features, language)` — so that AI agents (Claude Desktop, Cursor,
or a custom MCP client) can call the same core logic the web UI uses.

### Run standalone (for an MCP client)

In a separate terminal, with the venv activated and `npm run dev` already
running:

    cd python
    fastmcp run mcp_server.py

Then point your MCP client at the URL the server prints. From the project root,
`python python/mcp_server.py` also works because the module calls `mcp.run()`
when executed directly.

### Smoke test (no MCP client required)

    # in another terminal, with `npm run dev` already running
    cd python
    python test_mcp.py

    # or from the project root:
    npm run test:mcp

The script:

1. Checks that FastAPI (`/schema`) and Express (`/health`) are reachable.
2. Spawns `mcp_server.py` over stdio (no separate terminal needed).
3. Lists the available tools and asserts both are present.
4. Runs a normal profile through `predict_risk` and asserts it is not a crisis.
5. Runs a crisis profile through `predict_risk` and asserts it is a crisis.
6. Calls `get_advice` on the crisis profile and asserts CEDARS is mentioned.

Exit code 0 = pass, 1 = fail.

---

## 8. Fallback behavior

If the LLM call fails, times out, returns empty content, or no
`BAILIAN_API_KEY` is configured, `server/routes/predict.js` returns the fixed
fallback template saved in the model bundle:

- a normal fallback for typical cases
- a crisis fallback mentioning CEDARS and emergency services when the crisis
  rule fires

The response carries `used_fallback: true` and an `llm_error` diagnostic, and
the client shows a short "live LLM advice was unavailable" note. The bundled
fallback templates are in English; the rest of the UI remains in the selected
language.

The fallback only covers LLM failures. If the Python inference service is down,
the request fails with a 500 and the client shows the error banner; the Express
layer does not have a second risk model.

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `uvicorn` not found when running `npm run dev` (or `fastmcp` not found for the MCP server) | The venv is not active in that terminal; activate it first (`.venv\Scripts\Activate.ps1` on Windows, `source .venv/bin/activate` on macOS/Linux) |
| `InconsistentVersionWarning` at load time | Install the pinned scikit-learn version from `python/requirements.txt`; if you deliberately upgraded it, retrain the model |
| `RuntimeError: Model bundle not found at ...` | Run from the project root or set `MODEL_BUNDLE`; regenerate with `python train_model.py` |
| `UnicodeEncodeError: 'cp950' codec ...` when running `test_model.py` | The console is not UTF-8; set `$env:PYTHONIOENCODING='utf-8'` in PowerShell (or `set PYTHONIOENCODING=utf-8` in cmd, or use Windows Terminal) and rerun |
| `Failed to load schema` or `Request failed (HTTP 500)` | The FastAPI service is not running; check the PY process and `http://127.0.0.1:8000/schema` |
| Always fallback advice | `BAILIAN_API_KEY` is missing or invalid; set it in `.env` and restart the API (`server/env.js` loads `.env` at startup) |
| `BAILIAN_API_KEY not set` in the API logs | Add the key to `.env`; the app can still run on fallback while you fix it |
| `llm_error` / API logs show 401 or 403 from Bailian | API key invalid, expired or not authorised for the model; regenerate it. The browser still gets the fallback advice |
| `llm_error` / API logs show 404 from Bailian | `BAILIAN_MODEL` is retired or unavailable; pick a current model ID |
| `llm_error` / API logs show 429 from Bailian | Rate limit hit; wait and retry |
| `llm_error` shows empty content / `finish_reason=length` | The model is a reasoning model and reasoning tokens count against `max_tokens`; the server already uses 4096, so check the model quota or try another model |
| Responses very slow | Reasoning model; 10–25 seconds per request is expected. The UI tells the user this may take up to 30 seconds; the LLM request timeout is 60 seconds |
| `ECONNREFUSED 127.0.0.1:5000` | Express crashed; check the API process and logs |
| CORS error in the browser | Set `CLIENT_ORIGIN` to the exact Vite origin (default `http://localhost:5173`) |
| Port 5173 already in use | Stop the other process, or change the Vite port and keep `CLIENT_ORIGIN`/proxy settings consistent |
| `test_mcp.py` reports `UNREACHABLE` | `npm run dev` is not running, or the PY/API ports in `.env` do not match |
| `test_fixed_set.py` reports `UNREACHABLE` | Same as above; start the full stack first |
| `test_fixed_set.py` normal cases below 8/10 | Adjust the `expected_tier` of the mismatched profiles, or move their inputs clearly into the intended tier |
| `test_fixed_set.py` crisis case fails | Confirm `Stress_Level >= 9` and `Sleep_Hours_Per_Day <= 3`; with the LLM enabled, confirm the advice actually mentions CEDARS |
| `test_fixed_set.py --validate-only` fails to reach the API | Express and FastAPI must both be running even for validation-only mode, because validation calls `/api/predict` and Express needs the schema from FastAPI |
| The UI shows no form and an error banner on first load | The schema request failed; check the FastAPI/Express logs and the browser network tab |
