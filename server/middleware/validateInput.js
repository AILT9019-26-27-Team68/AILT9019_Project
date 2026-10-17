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

    // TODO: Loop through schema.numeric.
    // Check if missing (400 "missing field"), if not a number (400 "must be numeric"),
    // and if out of [min, max] range (400 "out of range").
    // Assign valid numbers to `out[field.name]`.

    // TODO: Loop through schema.categorical.
    // Check if not a string (400 "must be a string"),
    // and if not in field.allowed (400 "must be one of").
    // Assign valid strings to `out[field.name]`.

    req.cleanInput = out;
    
    // TODO: Set req.language to `language` if it is in SUPPORTED_LANGS, otherwise "en".
    
    next();
  } catch (err) {
    next(err);
  }
}
