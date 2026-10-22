import { useEffect, useMemo, useRef, useState } from "react";
import { fetchSchema, predict } from "./api.js";
import { getTranslations } from "./i18n.js";
import InputForm from "./components/InputForm.jsx";
import RiskResult from "./components/RiskResult.jsx";
import Disclaimer from "./components/Disclaimer.jsx";
import LanguageToggle from "./components/LanguageToggle.jsx";
import hkuCrest from "./assets/hku-crest.png";

/* Page-level styling only: full-width layout, Times typography to match the
   form, a slim grid top bar, chunky language buttons, and layering so the
   liquid canvas shows behind everything. Dark "night sticker" theme: near-black
   green base, cream sticker borders, coral/sunshine accents. Everything else
   still comes from styles.css (untouched). */
const APP_CSS = `
  .app {
    position: relative;
    z-index: 1;
    max-width: none;
    margin: 0;
    padding: 0 0 48px;
    font-family: "Times New Roman", Times, Georgia, serif;
    color: #f2ecdd;
  }
  /* dark base on the page itself — never depends on the canvas painting
     (lifted one step lighter than pure black-green, per user preference) */
  html, body {
    background: linear-gradient(180deg, #182720, #0e1712) fixed;
    color: #f2ecdd;
    color-scheme: dark;
  }
  .liquid-bg {
    position: fixed;
    inset: 0;
    /* behind EVERYTHING inside .app — static header text was painting under
       the canvas when this was 0 (crest survived only via its transform) */
    z-index: -1;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  /* professional header: official crest left, centered title, toggle right.
     Sans-serif stack just for the header — reads institutional, not playful. */
  header {
    --header-sans: "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    column-gap: 18px;
    row-gap: 2px;
    padding: 18px 32px 14px;
  }
  .app-crest {
    grid-column: 1;
    grid-row: 1 / span 2;
    display: inline-flex;
    align-self: center;
    background: #f5f1e4;
    border: 2.5px solid #e9e1ca;
    border-radius: 12px;
    padding: 7px 10px;
    box-shadow: 3px 3px 0 #050907;
  }
  .app-crest img { display: block; }
  header h1 {
    grid-column: 2;
    grid-row: 1;
    font-family: var(--header-sans);
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1.2;
    margin: 0;
    text-align: center;
    color: #f2ecdd;
    justify-self: center;
  }
  header .sub {
    grid-column: 2;
    grid-row: 2;
    margin: 0;
    font-family: var(--header-sans);
    font-style: normal;
    font-size: 13.5px;
    letter-spacing: 0.04em;
    text-align: center;
    color: #a3b3a8;
    justify-self: center;
  }
  header .lang-toggle { grid-column: 3; grid-row: 1 / span 2; margin: 0; }
  .lang-toggle button {
    font-family: inherit;
    font-weight: 700;
    border: 2px solid #e9e1ca;
    background: #1a2822;
    color: #f2ecdd;
    padding: 6px 14px;
    border-radius: 10px;
    box-shadow: 3px 3px 0 #050907;
    cursor: pointer;
    transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 160ms ease-out;
  }
  .lang-toggle button:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #050907; }
  .lang-toggle button:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 #050907; }
  .lang-toggle button.active { background: #ff6b4a; color: #20100a; border-color: #050907; }
  /* stub components render empty boxes — hide them until teammates fill them.
     The Disclaimer stub renders only a <br />, so :empty never matches —
     :has(> br:only-child) targets exactly that stub and stops matching
     the moment real content is added. */
  .disclaimer:empty,
  .disclaimer:has(> br:only-child) { display: none; }
  footer:empty { display: none; }
  .app > .error {
    margin: 10px 32px 0;
    max-width: 640px;
    background: rgba(255, 107, 74, 0.12);
    border: 2px solid #ff8a75;
    color: #ffb4a6;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 14px;
  }
  /* reduced motion: keep the dark base (drawn statically by the canvas),
     only the animation is skipped in JS */
  @media (prefers-reduced-motion: reduce) {
    .hku-rv, .hku-pop { animation: none !important; }
  }

  /* ---- result modal: full-screen sticker card with a spring pop-in ---- */
  .result-overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(5, 9, 7, 0.66);
    backdrop-filter: blur(7px);
    -webkit-backdrop-filter: blur(7px);
    animation: overlay-in 220ms ease-out;
    font-family: "Times New Roman", Times, Georgia, serif;
  }
  @keyframes overlay-in { from { opacity: 0; } }
  .result-card {
    position: relative;
    width: min(680px, 100%);
    max-height: min(86vh, 820px);
    overflow-y: auto;
    background: linear-gradient(180deg, #17241d, #101a14);
    border: 2.5px solid #e9e1ca;
    border-radius: 20px;
    box-shadow: 8px 10px 0 rgba(5, 9, 7, 0.9);
    padding: 34px 34px 28px;
    animation: card-pop 480ms cubic-bezier(0.2, 1.45, 0.4, 1) both;
  }
  @keyframes card-pop {
    0% { transform: scale(0.7) rotate(-4deg); opacity: 0; }
    62% { transform: scale(1.045) rotate(0.8deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); }
  }
  .result-card::-webkit-scrollbar { width: 10px; }
  .result-card::-webkit-scrollbar-thumb { background: #2a3b31; border-radius: 8px; }
  .result-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 38px;
    height: 38px;
    border: 2.5px solid #050907;
    border-radius: 12px;
    background: #ff6b4a;
    color: #20100a;
    font-family: inherit;
    font-size: 17px;
    font-weight: 800;
    line-height: 1;
    cursor: pointer;
    box-shadow: 3px 3px 0 #050907;
    transform: rotate(3deg);
    transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 160ms ease-out;
  }
  .result-close:hover { transform: rotate(0deg) translate(-1px, -1px); box-shadow: 4px 4px 0 #050907; }
  .result-close:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 #050907; }

  /* reformat RiskResult content inside the modal (beats styles.css) */
  .result-overlay .result { margin: 0; padding: 0; background: none; border: 0; }
  .result-overlay .crisis-banner {
    background: rgba(255, 107, 74, 0.16);
    border: 2px dashed #ff8a75;
    color: #ffb4a6;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 14.5px;
    margin: 0 0 18px;
  }
  .result-overlay .tier {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 2.5px solid #050907;
    border-radius: 16px;
    padding: 18px 22px;
    margin: 0 0 20px;
    box-shadow: 4px 4px 0 rgba(5, 9, 7, 0.9);
    color: #0e1712;
  }
  .result-overlay .tier-label { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
  .result-overlay .tier-score { color: rgba(14, 23, 18, 0.75); font-size: 15px; font-weight: 700; }
  .result-overlay .tier.very-low { background: #57d9a3; }
  .result-overlay .tier.low { background: #a9e8c9; }
  .result-overlay .tier.moderate { background: #ffd23f; }
  .result-overlay .tier.high { background: #ff6b4a; }
  .result-overlay .factors,
  .result-overlay .bands { margin: 0 0 18px; }
  .result-overlay .factors h3,
  .result-overlay .bands h3,
  .result-overlay .advice h3 {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #ffd23f;
  }
  .result-overlay .factors ul,
  .result-overlay .bands ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .result-overlay .factors li,
  .result-overlay .bands li {
    background: #1a2822;
    border: 2px solid #2a3b31;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 14.5px;
    color: #d9dfc9;
  }
  .result-overlay .factors li strong,
  .result-overlay .bands li strong { color: #f2ecdd; }
  .result-overlay .advice {
    background: rgba(255, 210, 63, 0.08);
    border-left: 4px solid #ffd23f;
    border-radius: 0 12px 12px 0;
    padding: 14px 18px;
    margin: 0 0 14px;
  }
  .result-overlay .advice p { margin: 0; font-size: 15px; line-height: 1.65; color: #efe9d6; }
  .result-overlay .fallback-note {
    font-size: 12.5px;
    font-style: italic;
    color: #a3b3a8;
  }
  @media (prefers-reduced-motion: reduce) {
    .result-overlay, .result-card { animation: none !important; }
  }
`;

/**
 * LiquidBackground — a full-viewport canvas: a soft green-washed base, nine
 * drifting green/gold blobs that are pulled toward the pointer, and ripple
 * rings that expand from every click/tap. Decorative only: pointer-events
 * none, aria-hidden, disabled under reduced motion.
 */
function LiquidBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // reduced motion: paint ONE static frame instead of disappearing entirely
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = canvas.getContext("2d");
    let raf;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const pointer = { x: w / 2, y: h / 2 };
    const ripples = [];
    // glowing trio on the night base: coral / sunshine / mint, cycling
    const blobColors = ["255, 107, 74", "255, 210, 63", "64, 199, 148"];
    const blobs = Array.from({ length: 9 }, (_, i) => ({
      rgb: blobColors[i % 3],
      alpha: 0.2 + Math.random() * 0.12,
      r: 150 + Math.random() * 160,
      cx: Math.random() * w,
      cy: Math.random() * h,
      vx: 0,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.00025 + Math.random() * 0.0004,
    }));

    function onResize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function onMove(e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      // trail of small ripples while moving, throttled
      const now = performance.now();
      if (now - (onMove.last || 0) > 90) {
        onMove.last = now;
        ripples.push({ x: e.clientX, y: e.clientY, r: 6, alpha: 0.22 });
      }
    }
    function onDown(e) {
      ripples.push({ x: e.clientX, y: e.clientY, r: 10, alpha: 0.4 });
    }
    window.addEventListener("resize", onResize);
    if (!reduced) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerdown", onDown);
    }

    function paint(t) {
      // lifted night wash — replaces clearRect so it never looks flat
      const base = ctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, "#182720");
      base.addColorStop(1, "#0e1712");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      for (const b of blobs) {
        // slow ambient drift
        b.vx += Math.sin(t * b.speed + b.phase) * 0.02;
        b.vy += Math.cos(t * b.speed * 0.8 + b.phase) * 0.02;
        // liquid pull toward the pointer, then friction
        b.vx += (pointer.x - b.cx) * 0.00012;
        b.vy += (pointer.y - b.cy) * 0.00012;
        b.vx *= 0.965;
        b.vy *= 0.965;
        b.cx += b.vx;
        b.cy += b.vy;
        // soft-wrap at the edges so blobs never leave the page
        if (b.cx < -b.r) b.cx = w + b.r;
        if (b.cx > w + b.r) b.cx = -b.r;
        if (b.cy < -b.r) b.cy = h + b.r;
        if (b.cy > h + b.r) b.cy = -b.r;

        const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.r);
        g.addColorStop(0, `rgba(${b.rgb}, ${b.alpha})`);
        g.addColorStop(1, `rgba(${b.rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // expanding ripple rings
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += 3.2;
        rp.alpha *= 0.94;
        if (rp.alpha < 0.02) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(255, 107, 74, ${rp.alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.stroke();
      }

    }

    if (reduced) {
      // one static frame: dark base + blobs, no motion, no pointer listeners
      paint(0);
    } else {
      const loop = (t) => {
        paint(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (!reduced) {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
      }
    };
  }, []);

  return <canvas ref={ref} className="liquid-bg" aria-hidden="true" />;
}

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

  function closeResult() {
    setResult(null);
  }

  // while the result modal is open: Escape closes it, page scroll is locked
  useEffect(() => {
    if (!result) return;
    const onKey = (e) => {
      if (e.key === "Escape") setResult(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [result]);

  return (
    <div className="app">
      <style>{APP_CSS}</style>
      <LiquidBackground />

      <header>
        <span className="app-crest">
          <img src={hkuCrest} alt="The University of Hong Kong" width="60" height="44" />
        </span>
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
          {loading && (
            <div className="loading-box">
              <div className="spinner" />
              <p>{t.loadingTitle}</p>
              <small>{t.loadingSub}</small>
            </div>
          )}

          {/* DONE: If result exists, render <RiskResult> inside a full-screen
              sticker-card modal. ✕ button, backdrop click, or Escape closes. */}
          {result && (
            <div className="result-overlay" onClick={closeResult}>
              <div
                className="result-card"
                role="dialog"
                aria-modal="true"
                aria-label="Check-in result"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="result-close"
                  onClick={closeResult}
                  aria-label="Close result"
                >
                  ✕
                </button>
                <RiskResult result={result} t={t} />
              </div>
            </div>
          )}
        </>
      )}

      <footer>
        <Disclaimer t={t} />
      </footer>
    </div>
  );
}
