/**
 * pageContract.js — the system message wrapped around the existing prompt.
 *
 * The proposal's prompt templates live inside student_risk_model.joblib and are
 * NOT touched here. This file only adds structure on top of them, and restates
 * their invariants so a template edit can never silently drop a rule:
 *   - no medical / diagnostic / counselling language        (§2 Result)
 *   - no CEDARS mention unless the crisis rule fired        (§2 Result, §6 #5/#6)
 *   - advice stays under the 300-word line in §3.2
 *
 * Headings are exact strings. The client splits on them, so changing one here
 * without changing deckCopy.js headings breaks the deck into single-page mode.
 */

export const PAGE_HEADINGS = {
  en: {
    means: "What that means",
    read: "The read",
    moves: "Three moves",
    week: "Your week",
  },
  "zh-Hant": {
    means: "這代表什麼",
    read: "初步解讀",
    moves: "三個行動",
    week: "你的一週",
  },
  "zh-Hans": {
    means: "这代表什么",
    read: "初步解读",
    moves: "三个行动",
    week: "你的一周",
  },
};

const LANGUAGE_NAME = {
  en: "English",
  "zh-Hant": "Traditional Chinese (Hong Kong)",
  "zh-Hans": "Simplified Chinese",
};

/* ---------------------------------------------------------------- archetype
 * The pattern is picked here, not in the browser, because the single LLM call
 * happens in this process. One pick feeds both the prompt and the response, so
 * the name the student sees can never disagree with the name the model was
 * given. Names are mirrored in client/src/components/deckCopy.js for the case
 * where a response arrives without one (older payloads, fallback paths).
 */

const ARCHETYPE_NAMES = {
  night_shift: { en: "The Night Shift", "zh-Hant": "夜戰型", "zh-Hans": "夜战型" },
  pressure: { en: "The Pressure Pattern", "zh-Hant": "高壓型", "zh-Hans": "高压型" },
  drift: { en: "The Drifting Pattern", "zh-Hant": "漂移型", "zh-Hans": "漂移型" },
  double_shift: { en: "The Double Shift", "zh-Hant": "雙班型", "zh-Hans": "双班型" },
  sprint: { en: "The Sprint Pattern", "zh-Hant": "衝刺型", "zh-Hans": "冲刺型" },
  grind: { en: "The Long Run", "zh-Hant": "長跑型", "zh-Hans": "长跑型" },
  recovery: { en: "The Recovery Pattern", "zh-Hant": "回復型", "zh-Hans": "回复型" },
  balanced: { en: "The Balanced Load", "zh-Hant": "平衡型", "zh-Hans": "平衡型" },
  routine: { en: "The Routine Keeper", "zh-Hant": "規律型", "zh-Hans": "规律型" },
  open: { en: "The Open Chapter", "zh-Hant": "未完待續", "zh-Hans": "未完待续" },
};

/** English driver phrases — prompt text only, never shown to the student */
const ARCHETYPE_DRIVERS = {
  night_shift: ["sleep sits below average", "study time sits above average"],
  pressure: ["stress sits above average", "sleep sits below average"],
  drift: ["attendance sits below average", "sleep sits below average"],
  double_shift: ["a part-time job carries a strong signal", "study time sits above average"],
  sprint: ["an exam is near", "stress sits above average"],
  grind: ["study time sits well above average", "stress sits around average or lower"],
  recovery: ["sleep sits above average", "stress sits below average"],
  balanced: ["extracurriculars read as protective", "study time sits around average"],
  routine: ["attendance sits above average", "stress sits around average"],
  open: ["no dominant signal in the summary"],
};

const BAND_SIGNED = {
  "<  -1.0": -2,
  "< -1.0": -2,
  "-1.0 to -0.5": -1,
  "-0.5 to 0.5": 0,
  "0.5 to 1.0": 1,
  "> 1.0": 2,
};

function bandSigned(bands, feature) {
  const value = bands && bands[feature];
  if (value === undefined) return 0;
  return Object.prototype.hasOwnProperty.call(BAND_SIGNED, value)
    ? BAND_SIGNED[value]
    : 0;
}

function signalScore(signal) {
  const s = String(signal || "").toLowerCase();
  if (s.includes("protective")) return -1;
  if (s.includes("strong")) return 3;
  if (s.includes("moderate")) return 2;
  if (s.includes("mild")) return 1;
  return 0;
}

/**
 * Ordered rules, first match wins. Reads bands and qualitative signals only —
 * no raw input, no precise z.
 * @param {{crisis:boolean, z_bands:object, categorical_signals:object}} inference
 * @returns {{id:string, name:string, drivers:string[]}|null}
 */
export function pickArchetype(inference, language = "en") {
  if (!inference || inference.crisis) return null;

  const bands = inference.z_bands || {};
  const sig = inference.categorical_signals || {};

  const sleep = bandSigned(bands, "Sleep_Hours_Per_Day");
  const study = bandSigned(bands, "Study_Hours_Per_Day");
  const stress = bandSigned(bands, "Stress_Level");
  const attend = bandSigned(bands, "Attendance_Rate");
  const job = signalScore(sig.Part_Time_Job);
  const exam = signalScore(sig.Exam_Proximity);
  const extra = signalScore(sig.Extracurricular_Activities);

  let id = "open";
  if (sleep <= -1 && study >= 1) id = "night_shift";
  else if (stress >= 1 && sleep <= -1) id = "pressure";
  else if (attend <= -1 && sleep <= -1) id = "drift";
  else if (job >= 2 && study >= 1) id = "double_shift";
  else if (exam >= 2 && stress >= 1) id = "sprint";
  else if (study >= 2 && stress <= 0) id = "grind";
  else if (sleep >= 1 && stress <= -1) id = "recovery";
  else if (extra === -1 && Math.abs(study) <= 1) id = "balanced";
  else if (attend >= 1 && Math.abs(stress) <= 1) id = "routine";

  const names = ARCHETYPE_NAMES[id];
  return {
    id,
    name: names[language] || names.en,
    drivers: ARCHETYPE_DRIVERS[id],
  };
}

/**
 * @param {"en"|"zh-Hant"|"zh-Hans"} language
 * @param {boolean} crisis  true when the structured crisis rule fired
 * @returns {string} system message for the single chat completion
 */
export function buildPageContext(language = "en", crisis = false, archetype = null) {
  const h = PAGE_HEADINGS[language] || PAGE_HEADINGS.en;
  const lang = LANGUAGE_NAME[language] || LANGUAGE_NAME.en;

  const patternLine = archetype
    ? `The pattern is "${archetype.name}". Its drivers: ${archetype.drivers.join("; ")}.`
    : "No single pattern was strong enough to name; keep the copy general.";

  const cedarsRule = crisis
    ? "- Include one supportive sentence recommending HKU CEDARS, and one line saying that immediate danger means contacting emergency services."
    : "- Do not mention CEDARS, helplines, or emergency services.";

  const weekSection = crisis
    ? null
    : [
        `## ${h.week}`,
        'Three sentences at most, present tense, conditional ("if this holds, the week looks like…"). No invented days, times, places, events or people.',
      ];

  const closing = crisis
    ? "Keep the tone calm and non-clinical. Do not triage, diagnose, or ask questions."
    : "Keep the tone calm and non-judgemental.";

  return [
    "You are an informational academic coaching assistant for a university student.",
    "The user message already contains the structured risk summary. Use only that.",
    patternLine,
    "",
    "Hard rules — these override everything below:",
    "- Do not give medical, diagnostic, or counselling advice. Do not assess mental health.",
    cedarsRule,
    "- Do not invent or restate personal values; work only from the tier, score, bands, signals and pattern given.",
    "- No numerals in the copy. No predictions about grades or outcomes.",
    "- Write the way a thoughtful person speaks to a tired friend: plain everyday words, short sentences, warm and concrete. Never clinical, never a label for the person, never a lecture.",
    "- Each section must carry the previous one forward. Do not repeat an idea, a sentence or a phrase you have already used.",
    "- Stay under 260 words in total.",
    "",
    `Write in ${lang}.`,
    "",
    "Reply with exactly these Markdown headings, in this order, and nothing else — no preamble, no closing line:",
    `## ${h.means}`,
    "Two or three short sentences that make the pattern name obvious to someone who has never heard it — the way you would explain it to a friend over coffee. Say what it looks like in a normal week. No jargon, no numbers, no diagnosis.",
    `## ${h.read}`,
    "Two or three sentences on what this pattern usually feels like from the inside, and what it quietly costs. Still plain, still kind. No numbers.",
    `## ${h.moves}`,
    "Exactly three bullet points, each a small concrete action doable within seven days, each tied to a signal above. Start each with a verb a person could actually do tomorrow morning.",
    ...(weekSection || []),
    "",
    closing,
  ].join("\n");
}
