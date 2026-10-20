import { useEffect, useMemo, useState } from "react";

/**
 * Resolve a numeric field's starting value.
 * The schema ships a `default` for every field (chosen to be typical, not the
 * midpoint), so the range midpoint is only a safety net.
 */
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

  useEffect(() => {
    setValues(initial);
  }, [initial]);

  if (!schema) return null;

  function set(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function submit(e) {
    e.preventDefault();
    if (loading) return;
    onSubmit(values);
  }

  function label(fieldName) {
    return t.fields?.[fieldName] || fieldName.replaceAll("_", " ");
  }

  // Categorical values arrive as "Yes" / "No"; i18n may override them later
  // with a t.options map, otherwise the raw value is shown.
  function optionLabel(v) {
    return t.options?.[v] || v;
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="grid">
        {schema.numeric.map((f) => (
          <label key={f.name}>
            <span>{label(f.name)}</span>
            <input
              type="number"
              inputMode="decimal"
              min={f.min}
              max={f.max}
              step={f.integer ? 1 : 0.5}
              value={values[f.name]}
              onChange={(e) => set(f.name, e.target.value)}
              disabled={loading}
              required
            />
            <small>
              {t.range} {f.min}–{f.max}
            </small>
          </label>
        ))}

        {schema.categorical.map((f) => (
          <label key={f.name}>
            <span>{label(f.name)}</span>
            <select
              value={values[f.name]}
              onChange={(e) => set(f.name, e.target.value)}
              disabled={loading}
            >
              {f.allowed.map((v) => (
                <option key={v} value={v}>
                  {optionLabel(v)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? t.submitLoading : t.submit}
      </button>
    </form>
  );
}
