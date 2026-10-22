import Markdown from "./Markdown.jsx";

const TIER_CLASS = {
  "Very Low": "tier very-low",
  Low: "tier low",
  Moderate: "tier moderate",
  High: "tier high",
};

const TIER_KEY = {
  "Very Low": "tierVeryLow",
  Low: "tierLow",
  Moderate: "tierModerate",
  High: "tierHigh",
};

export default function RiskResult({ result, t }) {
  if (!result) return null;
  const { risk_score, risk_tier, crisis, advice, key_factors, z_bands } = result;

  const tierLabel = t[TIER_KEY[risk_tier]] || `${risk_tier} risk`;
  const score = Number(risk_score);
  const factors = Array.isArray(key_factors) ? key_factors : [];
  const bands = z_bands && typeof z_bands === "object" ? Object.entries(z_bands) : [];

  function featureLabel(name) {
    return t.fields[name] || name.replaceAll("_", " ");
  }

  return (
    <section className="result">
      {crisis && <div className="crisis-banner">{t.crisisBanner}</div>}

      <div className={TIER_CLASS[risk_tier] || "tier"}>
        <div>
          <div className="tier-label">{tierLabel}</div>
          <div className="tier-score">
            {t.probability} {Number.isFinite(score) ? `${(score * 100).toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      {factors.length > 0 && (
        <div className="factors">
          <h3>{t.keyFactors}</h3>
          <ul>
            {factors.map((f) => (
              <li key={f.feature}>
                <strong>{featureLabel(f.feature)}</strong>: {f.direction} (z ={" "}
                {f.z})
              </li>
            ))}
          </ul>
        </div>
      )}

      {bands.length > 0 && (
        <div className="bands">
          <h3>{t.zBands}</h3>
          <ul>
            {bands.map(([k, v]) => (
              <li key={k}>
                <strong>{featureLabel(k)}</strong>: {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {advice && (
        <div className="advice">
          <h3>{t.advice}</h3>
          <Markdown text={advice} className="advice-md" />
        </div>
      )}

      {result.used_fallback && (
        <div className="fallback-note">{t.fallbackNote}</div>
      )}
    </section>
  );
}
