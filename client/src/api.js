/**
 * api.js — the client's only door to the backend.
 *
 * Components never build URLs themselves; everything goes through here.
 * Paths are relative and rely on the Vite dev proxy (/api -> :5000). For a
 * real deploy, change API_BASE to the server origin and nothing else.
 */

const API_BASE = "/api";

/**
 * Turn a failed response into a readable message.
 *
 * Three error shapes reach us and each needs different handling:
 *   400 { error }            -> Node's validateInput rejections
 *   400 { detail }           -> FastAPI HTTPException
 *   422 { errors: [...] }    -> FastAPI's compact validation handler
 * Anything else (a proxy error page, an HTML 502) is not JSON at all, so the
 * body parse must not be allowed to throw a confusing SyntaxError.
 */ 
async function messageFor(res) {
  let text = "";
  try {
    const data = await res.json();
    if (Array.isArray(data.errors)) {
      text = data.errors
        .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
        .join("; ");
    } else {
      text = data.detail || data.error || "";
    }
  } catch {
    // Non-JSON body; fall through to the status-based message.
  }
  return text || `Request failed (HTTP ${res.status})`;
}

export async function fetchSchema() {
  const res = await fetch(`${API_BASE}/schema`);
  if (!res.ok) throw new Error(await messageFor(res));
  return res.json();
}

export async function predict(features, language = "en") {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features, language }),
  });
  if (!res.ok) throw new Error(await messageFor(res));
  return res.json();
}
