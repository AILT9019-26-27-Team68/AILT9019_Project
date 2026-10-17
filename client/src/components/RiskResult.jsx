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
            {t.probability} {(risk_score * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="factors">
        <h3>{t.keyFactors}</h3>
        <ul>
          {key_factors.map((f) => (
            <li key={f.feature}>
              <strong>{featureLabel(f.feature)}</strong>: {f.direction} (z ={" "}
              {f.z})
            </li>
          ))}
        </ul>
      </div>

      <div className="bands">
        <h3>{t.zBands}</h3>
        <ul>
          {Object.entries(z_bands).map(([k, v]) => (
            <li key={k}>
              <strong>{featureLabel(k)}</strong>: {v}
            </li>
          ))}
        </ul>
      </div>

      <div className="advice">
        <h3>{t.advice}</h3>
        <p style={{ whiteSpace: "pre-wrap" }}>{advice}</p>
      </div>

      {result.used_fallback && (
        <div className="fallback-note">{t.fallbackNote}</div>
      )}
    </section>
  );
}
