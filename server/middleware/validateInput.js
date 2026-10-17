/**
 * Strict input validation. No free text fields allowed.
 * Enforces numeric ranges + categorical allow-lists from /schema.
 * Accepts three output languages: en, zh-Hant, zh-Hans.
 */
import { getSchema } from "../services/pythonBridge.js";

const SUPPORTED_LANGS = ["en", "zh-Hant", "zh-Hans"];

export async function validateInput(req, res, next) {
  try {
    const { features, language } = req.body || {};

    if (!features || typeof features !== "object" || Array.isArray(features)) {
      return res.status(400).json({ error: "features must be an object" });
    }

    const schema = await getSchema();

    const out = {};

    // --- Numeric
    for (const field of schema.numeric) {
      const raw = features[field.name];
      if (raw === undefined || raw === null || raw === "") {
        return res.status(400).json({ error: `missing field: ${field.name}` });
      }
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: `${field.name} must be numeric` });
      }
      if (n < field.min || n > field.max) {
        return res.status(400).json({
          error: `${field.name} out of range [${field.min}, ${field.max}]`,
        });
      }
      out[field.name] = n;
    }

    // --- Categorical
    for (const field of schema.categorical) {
      const raw = features[field.name];
      if (typeof raw !== "string") {
        return res.status(400).json({ error: `${field.name} must be a string` });
      }
      if (!field.allowed.includes(raw)) {
        return res.status(400).json({
          error: `${field.name} must be one of ${field.allowed.join(", ")}`,
        });
      }
      out[field.name] = raw;
    }

    req.cleanInput = out;
    req.language = SUPPORTED_LANGS.includes(language) ? language : "en";
    next();
  } catch (err) {
    next(err);
  }
}
