import { useEffect, useMemo, useState } from "react";
import { fetchSchema, predict } from "./api.js";
import { getTranslations } from "./i18n.js";
import InputForm from "./components/InputForm.jsx";
import RiskResult from "./components/RiskResult.jsx";
import Disclaimer from "./components/Disclaimer.jsx";
import LanguageToggle from "./components/LanguageToggle.jsx";

export default function App() {
  const [schema, setSchema] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");

  const t = useMemo(() => getTranslations(language), [language]);

  useEffect(() => {
    // TODO: Call fetchSchema(). On success, setSchema(). On catch, setError().
    fetchSchema()
      .then(setSchema)
      .catch((e) => setError(e.message));
  }, []);

  async function handleSubmit(features) {
    // TODO: setLoading(true), setError(""), setResult(null).
    // TODO: Call predict(features, language).
    // TODO: On success, setResult(data).
    // TODO: On catch, setError(e.message).
    // TODO: finally, setLoading(false).
    setLoading(true);
    setError("");
    try {
      const data = await predict(features, language);
      setResult(data);
      console.log("[predict]", data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>{t.title}</h1>
        <p className="sub">{t.subtitle}</p>
        <LanguageToggle value={language} onChange={setLanguage} />
      </header>

      <Disclaimer t={t} />

      {/* TODO: Display t.loadingForm if !schema and !error. */}
      {/* DONE: Display error banner if error is set. */}
      {error && <div className="error">{error}</div>}

      {schema && (
        <>
          {/* DONE: Render <InputForm> passing schema, handleSubmit, loading, and t. */}
          <InputForm
            schema={schema}
            onSubmit={handleSubmit}
            loading={loading}
            t={t}
          />

          {/* TODO: If loading is true, render a div with className="loading-box" containing a spinner div, t.loadingTitle, and t.loadingSub. */}

          {/* DONE: If result exists, render <RiskResult> passing result and t. */}
          {result && <RiskResult result={result} t={t} />}
        </>
      )}

      <footer>
        <Disclaimer t={t} />
      </footer>
    </div>
  );
}
