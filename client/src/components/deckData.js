/**
 * deckData.js — turns one /api/predict response into the deck's page model.
 *
 * Everything here is deterministic: no model call, no storage, no network.
 * The pattern name is picked server-side and arrives in the response, so the
 * deck never has to guess what the LLM was told.
 */

/* ---------------------------------------------------------------- bands */

/** z-band string -> 0..4, matching the wording ladder in deckCopy.bands */
const BAND_INDEX = {
  "< -1.0": 0,
  "-1.0 to -0.5": 1,
  "-0.5 to 0.5": 2,
  "0.5 to 1.0": 3,
  "> 1.0": 4,
};

const BAND_WORD = ["farBelow", "below", "onPar", "above", "farAbove"];

/** where the marker sits on the rail, in % — a band drawn as a position */
const BAND_POSITION = [12, 31, 50, 69, 88];

export function bandIndex(band) {
  return Object.prototype.hasOwnProperty.call(BAND_INDEX, band)
    ? BAND_INDEX[band]
    : 2;
}

/* ------------------------------------------------------------- signals */

function signalWord(signal) {
  const s = String(signal || "").toLowerCase();
  if (s.includes("protective")) return "protective";
  if (s.includes("strong")) return "strong";
  if (s.includes("moderate")) return "moderate";
  if (s.includes("mild")) return "mild";
  return "neutral";
}

/* ------------------------------------------------------------ archetype */

/**
 * The pattern is chosen server-side (server/services/pageContract.js), inside the
 * same request that calls the LLM — so the name on screen and the name in the
 * prompt cannot drift apart. This file only dresses it in local copy.
 */
function readArchetype(result, copy) {
  if (result.crisis) return null;

  const picked = result.archetype;
  if (!picked || !picked.id) return null;

  const local = copy.archetypes[picked.id] || {};
  return {
    id: picked.id,
    name: picked.name || local.name || "",
    oneLine: local.oneLine || "",
    drivers: picked.drivers || local.drivers || [],
  };
}

/* --------------------------------------------------------- advice split */

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[*_`:#•·—–-]/g, " ")
    .replace(/[.,!?;:。，！？；：、]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function matchHeading(raw, table) {
  const n = norm(raw);
  if (!n) return null;
  for (const [key, value] of Object.entries(table)) {
    if (n === value) return key;
    if (n.startsWith(value) || n.includes(value)) return key;
  }
  return null;
}

function stripMd(text) {
  return String(text || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|\s)\*(?!\s)(.+?)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>{1,}\s?/gm, "")
    .trim();
}

function toParagraphs(lines) {
  return stripMd(lines.join("\n"))
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

function parseMoves(block) {
  const text = String(block || "");
  const bullets = text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/))
    .filter(Boolean)
    .map((m) => stripMd(m[1]).replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 2);

  if (bullets.length >= 1) return bullets.slice(0, 3);

  // no bullets: fall back to sentences, never invent
  return stripMd(text)
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
    .slice(0, 3);
}

/**
 * Split one LLM reply into the four page sections.
 * Returns null when fewer than two headings survive — the caller then switches
 * to single-page mode instead of guessing at paragraph boundaries.
 */
export function splitAdvice(advice, headings) {
  if (!advice || !String(advice).trim()) return null;

  const table = {
    means: norm(headings.means),
    read: norm(headings.read),
    moves: norm(headings.moves),
    week: norm(headings.week),
  };

  const buckets = {};
  let current = null;
  let found = 0;

  for (const line of String(advice).split(/\r?\n/)) {
    const hash = line.match(/^\s*#{1,6}\s*(.+?)\s*#*\s*$/);
    const bold = line.match(/^\s*\*\*(.+?)\*\*\s*[:：]?\s*$/);
    const heading = hash ? hash[1] : bold ? bold[1] : null;

    if (heading !== null) {
      const key = matchHeading(heading, table);
      if (key && !buckets[key]) {
        buckets[key] = [];
        current = key;
        found += 1;
      } else {
        current = "__skip";
      }
      continue;
    }

    if (current && current !== "__skip") buckets[current].push(line);
  }

  if (found < 2) return null;

  const means = buckets.means ? toParagraphs(buckets.means) : "";
  const read = buckets.read ? toParagraphs(buckets.read) : "";
  const week = buckets.week ? toParagraphs(buckets.week) : "";
  const moves = buckets.moves ? parseMoves(buckets.moves.join("\n")) : [];

  return { means, read, moves, week };
}

/* --------------------------------------------------------------- model */

const RAIL_ORDER = [
  "Study_Hours_Per_Day",
  "Sleep_Hours_Per_Day",
  "Stress_Level",
  "Attendance_Rate",
  "Age",
];

const CHIP_ORDER = [
  "Extracurricular_Activities",
  "Exam_Proximity",
  "Part_Time_Job",
];

/* ------------------------------------------------------------------ tiers */

export const TIER_ORDER = ["Very Low", "Low", "Moderate", "High"];

/** segment widths, in % of the axis — the model's own cut-offs, drawn to scale */
export const TIER_SPAN = [30, 20, 25, 25];

export function tierIndexOf(tier) {
  const i = TIER_ORDER.indexOf(tier);
  return i < 0 ? 2 : i;
}

/* --------------------------------------------------------------- z-scores */

/**
 * The three inputs furthest from the peer average. The API sends them ranked
 * with their signed z; nothing is recomputed here, so the page can never show
 * a number the model did not produce.
 */
function readFactors(result, copy) {
  const list = Array.isArray(result.key_factors) ? result.key_factors : [];
  return list
    .filter((f) => f && Number.isFinite(Number(f.z)))
    .map((f) => {
      const z = Number(f.z);
      const band = (result.z_bands || {})[f.feature];
      return {
        key: f.feature,
        label: copy.labels[f.feature] || f.feature,
        z,
        zText: `${z < 0 ? "\u2212" : "+"}${Math.abs(z).toFixed(2)}`,
        word: band ? copy.bands[BAND_WORD[bandIndex(band)]] : copy.bands.onPar,
        pos: Math.max(2, Math.min(98, ((z + 3) / 6) * 100)),
      };
    })
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}

/**
 * Build the whole deck model from one response.
 * `pages` is the only source of truth for how many pages exist and what they
 * are, so dots, counters and keyboard nav can never disagree with the content.
 */
export function buildDeck({ result, copy }) {
  if (!result) return null;

  const bands = result.z_bands || {};
  const signals = result.categorical_signals || {};
  const crisis = result.crisis === true;
  const score = Number(result.risk_score);

  const rails = RAIL_ORDER.filter((key) => bands[key]).map((key) => {
    const idx = bandIndex(bands[key]);
    return {
      key,
      label: copy.labels[key] || key,
      word: copy.bands[BAND_WORD[idx]],
      pos: BAND_POSITION[idx],
      idx,
    };
  });

  const chips = CHIP_ORDER.map((key) => {
    const word = signalWord(signals[key]);
    return {
      key,
      label: copy.labels[key] || key,
      word: copy.signals[word],
      tone: word,
    };
  });

  const archetype = readArchetype(result, copy);

  const sections = splitAdvice(result.advice, copy.headings);
  const advice = String(result.advice || "").trim();

  const pages = ["p01"];
  if (!crisis && archetype) pages.push("p02");

  if (sections) {
    if (sections.means) pages.push("p03");
    if (sections.read) pages.push("p04");
    if (sections.moves.length) pages.push("p05");
    if (sections.week && !crisis) pages.push("p06");
  } else if (advice) {
    // single-page mode: the whole reply, no invented section boundaries
    pages.push("p04");
  }

  const factors = readFactors(result, copy);
  if (factors.length) pages.push("p07");

  pages.push("p08");

  const threshold = Number(result.threshold);

  return {
    crisis,
    score: Number.isFinite(score) ? score : null,
    threshold: Number.isFinite(threshold) ? threshold : null,
    tier: result.risk_tier || "",
    tierIndex: tierIndexOf(result.risk_tier),
    decision: result.decision || "",
    rails,
    chips,
    factors,
    archetype,
    sections,
    advice,
    usedFallback: Boolean(result.used_fallback),
    pages,
  };
}
