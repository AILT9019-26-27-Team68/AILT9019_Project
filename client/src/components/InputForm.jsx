import { useEffect, useMemo, useState } from "react";

function defaultFor(field) {
  // TODO: If field.default is defined, return it (round if field.integer).
  // TODO: Otherwise, return the midpoint between field.min and field.max.
  return 0;
}

export default function InputForm({ schema, onSubmit, loading, t }) {
  const initial = useMemo(() => {
    const o = {};
    // TODO: Loop through schema.numeric and set o[f.name] = defaultFor(f).
    // TODO: Loop through schema.categorical and set o[f.name] = f.allowed[0].
    return o;
  }, [schema]);

  const [values, setValues] = useState(initial);

  useEffect(() => {
    // TODO: Reset `values` state to `initial` whenever `initial` changes.
  }, [initial]);

  function set(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function submit(e) {
    e.preventDefault();
    onSubmit(values);
  }

  function label(fieldName) {
    // TODO: Return t.fields[fieldName] if it exists, otherwise replace underscores with spaces.
    return fieldName;
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="grid">
        {/* TODO: Map over schema.numeric. Render a <label> containing:
                    - A <span> with label(f.name)
                    - An <input type="number"> with step, min, max, value, and onChange.
                    - A <small> tag showing `{t.range} {f.min}–{f.max}`.
        */}
        
        {/* TODO: Map over schema.categorical. Render a <label> containing:
                    - A <span> with label(f.name)
                    - A <select> with options from f.allowed, value, and onChange.
        */}
      </div>
      <button type="submit" disabled={loading}>
        {/* TODO: Render t.submitLoading if loading is true, otherwise render t.submit. */}
      </button>
    </form>
  );
}
