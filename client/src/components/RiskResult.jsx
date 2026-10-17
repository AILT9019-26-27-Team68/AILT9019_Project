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
  
  // TODO: Destructure risk_score, risk_tier, crisis, advice, key_factors, and z_bands from result.
  
  // TODO: Create a `tierLabel` variable that uses TIER_KEY to get the translated string from `t`.
  
  // TODO: Create a helper function `featureLabel(name)` that returns t.fields[name] or replaces underscores.

  return (
    <section className="result">
      {/* TODO: If crisis is true, render a div with className="crisis-banner" showing t.crisisBanner. */}

      {/* TODO: Render a div with className based on TIER_CLASS[risk_tier].
                  Inside, render the tierLabel and the risk_score percentage using t.probability. */}

      <div className="factors">
        {/* TODO: Render a <h3> with t.keyFactors. */}
        {/* TODO: Render a <ul> mapping over key_factors, showing featureLabel, direction, and z. */}
      </div>

      <div className="bands">
        {/* TODO: Render a <h3> with t.zBands. */}
        {/* TODO: Render a <ul> mapping over Object.entries(z_bands), showing featureLabel and the band. */}
      </div>

      <div className="advice">
        {/* TODO: Render a <h3> with t.advice. */}
        {/* TODO: Render a <p> with style={{ whiteSpace: "pre-wrap" }} containing the advice string. */}
      </div>

      {/* TODO: If result.used_fallback is true, render a div with className="fallback-note" showing t.fallbackNote. */}
    </section>
  );
}
