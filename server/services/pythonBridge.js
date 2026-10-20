/**
 * pythonBridge.js — the only module that talks to the Python inference service.
 *
 * Node knows nothing about the RF model, z-bands, crisis rules, or prompt
 * templates; it forwards validated features and relays the result. If the
 * Python service moves or changes ports, this file is the only one to edit.
 */
import axios from "axios";

function baseUrl() {
  return process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";
}

function client() {
  return axios.create({ baseURL: baseUrl(), timeout: 20000 });
}

/**
 * A connection-level failure (service down, wrong port) surfaces as
 * "connect ECONNREFUSED", which says nothing useful. Translate it into an
 * actionable message. Real HTTP errors are returned untouched so that
 * errorHandler can still read err.response.status and .data.detail.
 */
function unreachable(err, action) {
  if (err.response) return err;
  return new Error(
    `${action} failed: cannot reach the Python service at ${baseUrl()} ` +
      `(${err.code || err.message}). Is it running? Try: npm run dev:py`
  );
}

// The schema is static for the life of the process, so it is fetched once.
// `inflight` de-dupes concurrent first calls instead of firing N requests.
let cachedSchema = null;
let inflight = null;

export async function getSchema() {
  if (cachedSchema) return cachedSchema;

  if (!inflight) {
    inflight = client()
      .get("/schema")
      .then((res) => {
        cachedSchema = res.data;
        inflight = null;
        return cachedSchema;
      })
      .catch((err) => {
        // Do not poison the cache: if the service was still booting, the
        // next call should be allowed to retry.
        inflight = null;
        throw unreachable(err, "GET /schema");
      });
  }

  return inflight;
}

export async function predictRisk(features) {
  let data;
  try {
    ({ data } = await client().post("/predict", features));
  } catch (err) {
    throw unreachable(err, "POST /predict");
  }

  // Guard the contract: predict.js builds the LLM prompt from these fields, so
  // a malformed payload here would otherwise fail far away and confusingly.
  if (!data || typeof data.risk_score !== "number" || !data.prompt) {
    throw new Error("Python service returned an unexpected /predict payload");
  }

  return data;
}
