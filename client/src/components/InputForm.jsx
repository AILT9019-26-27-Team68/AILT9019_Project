import { useEffect, useMemo, useState } from "react";

/* One stylesheet for the whole form; .hku- prefix keeps it isolated. */
import "./css/InputForm.css";

/* ---------------------------------------------------------------------------
 * InputForm — "HKU registrar's ledger" edition.
 *
 * Hierarchy:
 *   components/InputForm.jsx        this file — logic + markup only
 *   components/css/InputForm.css    the form's single stylesheet
 *   assets/hku-logo.svg             HKU shield mark (used by App.jsx header)
 *
 * Contract with App.jsx is unchanged:
 *   props : { schema, onSubmit, loading, t }
 *   submit: onSubmit({ <field>: number|string, ... }) — numeric fields are
 *   coerced client-side, categoricals stay "Yes"/"No" strings.
 * ------------------------------------------------------------------------ */

/**
 * Plain-language explanation per field, shown by the "i" button.
 * Keys match schema field names exactly. English-only for now — the i18n
 * dictionary has no description keys; move these there when teammates
 * add one (e.g. t.info[name]).
 */
const FIELD_INFO = {
  Study_Hours_Per_Day:
    "Hours you spend studying on a typical day. Example: 3 means about three hours of revision daily.",
  Sleep_Hours_Per_Day:
    "Hours of sleep on a typical night. 7–9 is the usual healthy range for students.",
  Stress_Level:
    "How stressed you feel day to day, from 0 (fully calm) to 10 (overwhelmed).",
  Attendance_Rate:
    "Percentage of classes you actually attend. 85 means you miss roughly 1 in 7.",
  Age: "Your age in years.",
  Extracurricular_Activities:
    "Are you in any clubs, sports teams, or societies outside class?",
  Exam_Proximity:
    "Is an important exam coming up soon (within the next few weeks)?",
  Part_Time_Job: "Do you currently work a part-time job alongside your studies?",
};

/** Schema-driven default: prefer the model's curated default, midpoint as safety net. */
function defaultFor(field) {
  const raw =
    field.default !== undefined && field.default !== null
      ? field.default
      : (field.min + field.max) / 2;
  return field.integer ? Math.round(raw) : raw;
}

export default function InputForm({ schema, onSubmit, loading, t }) {
  const initial = useMemo(() => {
    const o = {};
    for (const f of schema?.numeric || []) o[f.name] = defaultFor(f);
    for (const f of schema?.categorical || []) o[f.name] = f.allowed[0];
    return o;
  }, [schema]);

  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [openInfo, setOpenInfo] = useState(null); // which field's "i" is open

  useEffect(() => {
    setValues(initial);
    setTouched({});
    setAttempted(false);
  }, [initial]);

  if (!schema) return null;

  /* ---- client-side validation (messages are English-only for now; the
     i18n dictionary has no error keys yet — add e.g. t.errors later) ---- */
  function validate(field, raw) {
    const s = String(raw).trim();
    if (s === "") return "This field is required.";
    const n = Number(s);
    if (!Number.isFinite(n)) return "Please enter a number.";
    if (n < field.min || n > field.max)
      return `Please enter a value between ${field.min} and ${field.max}.`;
    if (field.integer && !Number.isInteger(n)) return "Please enter a whole number.";
    return "";
  }

  const numericErrors = {};
  for (const f of schema.numeric) {
    const err = validate(f, values[f.name]);
    if (err) numericErrors[f.name] = err;
  }
  const errorCount = Object.keys(numericErrors).length;
  const showError = (name) => (attempted || touched[name]) && numericErrors[name];

  function set(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function toggleInfo(name) {
    setOpenInfo((cur) => (cur === name ? null : name));
  }

  /** The little "i" button + tooltip for one field. */
  function InfoToggle({ name }) {
    const open = openInfo === name;
    return (
      <>
        <button
          type="button"
          className="hku-info-btn"
          aria-expanded={open}
          aria-label={`About: ${label(name)}`}
          onClick={() => toggleInfo(name)}
        >
          i
        </button>
        {open && (
          <p className="hku-pop" id={`hku-info-${name}`}>
            {FIELD_INFO[name] || label(name)}
          </p>
        )}
      </>
    );
  }

  function submit(e) {
    e.preventDefault();
    if (loading) return;
    setAttempted(true);
    setOpenInfo(null);
    if (errorCount > 0) {
      // move focus to the first offending input for keyboard users
      const first = e.currentTarget.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    // Contract: same flat shape as before, but numeric fields arrive as
    // real numbers (already validated), so the backend's Number() pass
    // is a no-op and the payload is machine-parseable as-is.
    const payload = {};
    for (const f of schema.numeric) {
      payload[f.name] = f.integer
        ? Math.round(Number(values[f.name]))
        : Number(values[f.name]);
    }
    for (const f of schema.categorical) payload[f.name] = values[f.name];
    onSubmit(payload);
  }

  function label(fieldName) {
    return t.fields?.[fieldName] || fieldName.replaceAll("_", " ");
  }

  // Categorical values arrive as "Yes" / "No"; i18n may override them later
  // with a t.options map, otherwise the raw value is shown.
  function optionLabel(v) {
    return t.options?.[v] || v;
  }

  // Alternating wide/narrow spans give the numeric grid an editorial rhythm
  // (3-3 / 2-2-2) instead of a uniform card row.
  const spanClass = (i) => (i < 2 ? "hku-field" : "hku-field hku-field--narrow");

  return (
    <section className="hku-shell" aria-busy={loading}>
      {/* ---- intro rail: what this is, how it works, privacy ---- */}
      <div className="hku-rail hku-rv hku-rv-1">
        <p className="hku-kicker">The University of Hong Kong</p>
        <h2 className="hku-rail-heading">Start your check-in</h2>

        <ol className="hku-steps">
          <li>
            <span className="hku-step-no">1</span>
            <span>Fill in the form on the right — it takes under a minute.</span>
          </li>
          <li>
            <span className="hku-step-no">2</span>
            <span>Our model reads your numbers and checks them instantly.</span>
          </li>
          <li>
            <span className="hku-step-no">3</span>
            <span>You get simple, friendly coaching advice based on the result.</span>
          </li>
        </ol>

        <hr className="hku-rail-divider" />

        <p className="hku-rail-label">Private by design</p>
        <p className="hku-rail-note">{t.disclaimerBody}</p>

        <p className="hku-rail-label">Need support?</p>
        <p className="hku-rail-note">
          {t.disclaimerCrisis} <strong>{t.disclaimerCedars}</strong>{" "}
          {t.disclaimerEmergency}
        </p>

        <p className="hku-rail-foot">HKU · CEDARS · Student Wellbeing</p>
      </div>

      {/* ---- the ledger ---- */}
      <form className="hku-ledger" onSubmit={submit} noValidate>
        {/* 01 — lifestyle numerics */}
        <fieldset className="hku-group hku-rv hku-rv-2">
          <div className="hku-group-head">
            <span className="hku-group-no">01</span>
            <hr className="hku-group-rule" />
          </div>
          <div className="hku-fields">
            {schema.numeric.map((f, i) => {
              const err = showError(f.name);
              return (
                <div key={f.name} className={spanClass(i)}>
                  <div className="hku-labelrow">
                    <label className="hku-label" htmlFor={`hku-${f.name}`}>
                      {label(f.name)}
                    </label>
                    <InfoToggle name={f.name} />
                  </div>
                  <input
                    id={`hku-${f.name}`}
                    className="hku-input"
                    type="number"
                    inputMode="decimal"
                    min={f.min}
                    max={f.max}
                    step={f.integer ? 1 : 0.5}
                    value={values[f.name]}
                    onChange={(e) => set(f.name, e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, [f.name]: true }))}
                    disabled={loading}
                    required
                    aria-invalid={err ? "true" : "false"}
                    aria-describedby={
                      err
                        ? `hku-err-${f.name}`
                        : openInfo === f.name
                          ? `hku-info-${f.name}`
                          : undefined
                    }
                  />
                  {err ? (
                    <span className="hku-err" id={`hku-err-${f.name}`} role="alert">
                      {err}
                    </span>
                  ) : (
                    <small className="hku-hint">
                      {t.range} {f.min}–{f.max}
                    </small>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        {/* 02 — circumstances */}
        <fieldset className="hku-group hku-rv hku-rv-3">
          <div className="hku-group-head">
            <span className="hku-group-no">02</span>
            <hr className="hku-group-rule" />
          </div>
          <div className="hku-fields">
            {schema.categorical.map((f) => (
              <div key={f.name} className="hku-field">
                <div className="hku-labelrow">
                  <span className="hku-label">{label(f.name)}</span>
                  <InfoToggle name={f.name} />
                </div>
                <div className="hku-seg" role="radiogroup" aria-label={label(f.name)}>
                  {f.allowed.map((v) => (
                    <label
                      key={v}
                      className={
                        "hku-seg-opt" + (values[f.name] === v ? " is-on" : "")
                      }
                    >
                      <input
                        className="hku-seg-input"
                        type="radio"
                        name={f.name}
                        value={v}
                        checked={values[f.name] === v}
                        onChange={() => set(f.name, v)}
                        disabled={loading}
                      />
                      {optionLabel(v)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        {/* error summary — only after a blocked submit attempt */}
        {attempted && errorCount > 0 && (
          <p className="hku-summary" role="alert">
            {errorCount} field{errorCount > 1 ? "s" : ""} need
            {errorCount > 1 ? "" : "s"} attention before the analysis can run.
          </p>
        )}

        <button type="submit" className="hku-submit hku-rv hku-rv-4" disabled={loading}>
          {loading ? t.submitLoading : t.submit}
        </button>
      </form>
    </section>
  );
}
