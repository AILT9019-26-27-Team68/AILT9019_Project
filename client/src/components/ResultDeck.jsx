import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDeckCopy } from "./deckCopy.js";
import { buildDeck, TIER_ORDER, TIER_SPAN } from "./deckData.js";
import "./css/ResultDeck.css";

const TIER_KEY = {
  "Very Low": "tierVeryLow",
  Low: "tierLow",
  Moderate: "tierModerate",
  High: "tierHigh",
};

const TIER_TONE = {
  "Very Low": "very-low",
  Low: "low",
  Moderate: "moderate",
  High: "high",
};

const ACCENT = {
  p01: "sun",
  p02: "tier",
  p03: "mint",
  p04: "coral",
  p05: "coral",
  p06: "dusk",
  p07: "tier",
  p08: "cream",
};

/**
 * ResultDeck — the page-by-page, scroll-snapped result surface.
 *
 * One overlay, one scroll container, full-height sections. Pages exist as
 * data (`model.pages`), so the dots, the counter, the keyboard and the Next
 * button can never disagree with what is actually rendered.
 *
 * Read-only: nothing is stored, nothing is sent anywhere from here.
 */

/* opening beat: word-reveal, then lift. Skipped under reduced motion and on a
   result the student has already seen once, so re-opening never re-plays it. */
const INTRO_HOLD = 2150;
const INTRO_OUT = 520;
const seen = new WeakSet();

function shouldPlayIntro(result) {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return !(result && typeof result === "object" && seen.has(result));
}

export default function ResultDeck({ result, language, t, onClose }) {
  const copy = useMemo(() => getDeckCopy(language), [language]);
  const model = useMemo(() => buildDeck({ result, copy }), [result, copy]);

  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const introTimer = useRef(null);
  const [index, setIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [intro, setIntro] = useState(() => shouldPlayIntro(result));
  const [introOut, setIntroOut] = useState(false);

  const total = model ? model.pages.length : 0;

  const goTo = useCallback(
    (i) => {
      const el = trackRef.current;
      if (!el) return;
      const next = Math.max(0, Math.min((model?.pages.length || 1) - 1, i));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({
        top: next * el.clientHeight,
        behavior: reduced ? "auto" : "smooth",
      });
    },
    [model]
  );

  const skipIntro = useCallback(() => {
    if (!intro || introOut) return;
    setIntroOut(true);
    introTimer.current = window.setTimeout(() => setIntro(false), INTRO_OUT);
  }, [intro, introOut]);

  /* focus the deck so the arrow keys land here, not in the form behind it */
  useEffect(() => {
    if (rootRef.current) rootRef.current.focus({ preventScroll: true });
  }, []);

  /* keep focus inside the deck; Escape closes it */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = Array.from(
        root.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  /* the opening beat, and its own teardown */
  useEffect(() => {
    if (!intro) return undefined;
    if (result && typeof result === "object") seen.add(result);
    const toOut = window.setTimeout(() => setIntroOut(true), INTRO_HOLD);
    const toEnd = window.setTimeout(() => setIntro(false), INTRO_HOLD + INTRO_OUT);
    return () => {
      window.clearTimeout(toOut);
      window.clearTimeout(toEnd);
    };
  }, [intro, result]);

  useEffect(() => () => window.clearTimeout(introTimer.current), []);

  /* reveal-on-entry: pages fade in on arrival and fade back out as they leave,
     so flipping reads as a dissolve rather than a hard cut */
  useEffect(() => {
    if (intro && !introOut) return undefined;
    const el = trackRef.current;
    if (!el) return undefined;
    const pages = Array.from(el.querySelectorAll(".deck-page"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const on = entry.isIntersecting && entry.intersectionRatio > 0.5;
          entry.target.dataset.visible = on ? "true" : "false";
        });
      },
      { root: el, threshold: [0.55] }
    );
    pages.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [model, intro, introOut]);

  /* keep the landing point exact when the viewport changes */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onResize = () => el.scrollTo({ top: index * el.clientHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index]);

  /* arrow keys / space / home / end — any key skips the opening beat first */
  useEffect(() => {
    function onKey(e) {
      if (intro && !introOut) {
        skipIntro();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(total - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index, total, intro, introOut, skipIntro]);

  if (!model) return null;

  const tierLabel = t?.[TIER_KEY[model.tier]] || model.tier;
  const pct = model.score === null ? null : Math.round(model.score * 100);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const h = el.clientHeight || 1;
    setIndex(Math.max(0, Math.min(total - 1, Math.round(el.scrollTop / h))));
    if (!scrolled) setScrolled(true);
  }

  function page(id) {
    const key = `view-${id}`;
    const kicker = (text) => (
      <p className="deck-kicker" key={`${key}-k`}>
        <span className="kicker-dot" aria-hidden="true" />
        {text}
      </p>
    );

    if (id === "p01") {
      return (
        <>
          {model.crisis && (
            <div className="deck-crisis" role="note">
              <strong>{copy.crisis.bannerTitle}</strong>
              <p>{copy.crisis.bannerBody}</p>
            </div>
          )}
          {kicker(copy.pages.p01.kicker)}
          <h2 className="deck-h2">{copy.pages.p01.title}</h2>
          <p className="deck-lede">{copy.pages.p01.lede}</p>

          <ul className="rails">
            {model.rails.map((r) => (
              <li className="rail" key={r.key} data-band={r.idx}>
                <span className="rail-key">{r.label}</span>
                <span className="rail-track" aria-hidden="true">
                  <span className="rail-centre" />
                  <span className="rail-mark" style={{ left: `${r.pos}%` }} />
                </span>
                <span className="rail-word">{r.word}</span>
              </li>
            ))}
          </ul>

          <ul className="chips">
            {model.chips.map((c) => (
              <li className="chip" key={c.key} data-tone={c.tone}>
                <span className="chip-key">{c.label}</span>
                <span className="chip-dot" aria-hidden="true" />
                <span className="chip-word">{c.word}</span>
              </li>
            ))}
          </ul>

          {/* the tier, drawn to scale: segment widths are the model's cut-offs */}
          <div className="tier-scale">
            <p className="tier-scale-title">{copy.pages.p01.scaleTitle}</p>
            <div
              className="tier-track"
              role="img"
              aria-label={`${tierLabel}${pct !== null ? ` ${pct}%` : ""}`}
            >
              <div className="tier-segs">
                {TIER_ORDER.map((tr, i) => (
                  <span
                    key={tr}
                    className={`tier-seg${i === model.tierIndex ? " is-on" : ""}`}
                    data-tone={TIER_TONE[tr]}
                    style={{ flexGrow: TIER_SPAN[i] }}
                  />
                ))}
              </div>

              {model.threshold !== null && (
                <span
                  className="tier-line"
                  style={{ left: `${model.threshold * 100}%` }}
                  aria-hidden="true"
                />
              )}

              {pct !== null && (
                <span className="tier-pin" style={{ left: `${pct}%` }} aria-hidden="true">
                  <b>{pct}%</b>
                </span>
              )}
            </div>
            <div className="tier-ends" aria-hidden="true">
              <span>{copy.pages.p01.scaleLow}</span>
              <span>{copy.pages.p01.scaleHigh}</span>
            </div>
          </div>

          <p className="tier-meaning">
            {model.crisis ? copy.crisis.tierNote : copy.tiers[model.tier]}
          </p>

          {model.threshold !== null && (
            <p className="deck-fine">
              {copy.pages.p01.scaleCaption(Math.round(model.threshold * 100))}
            </p>
          )}
          {!model.crisis && (
            <p className="deck-fine deck-fine--rail">{copy.pages.p01.railNote}</p>
          )}
        </>
      );
    }

    if (id === "p02") {
      return (
        <>
          {kicker(copy.pages.p02.kicker)}
          <h2 className="archetype" data-tone={TIER_TONE[model.tier] || "moderate"}>
            {model.archetype.name}
          </h2>
          <p className="archetype-line">{model.archetype.oneLine}</p>
          <p className="deck-caption">{copy.pages.p02.caption}</p>
        </>
      );
    }

    if (id === "p03") {
      return (
        <>
          {kicker(copy.pages.p03.kicker)}
          <h2 className="deck-h3">{copy.pages.p03.fallbackTitle}</h2>
          <div className="deck-prose">
            {splitParas(model.sections.means).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </>
      );
    }

    if (id === "p04") {
      const single = !model.sections;
      return (
        <>
          {kicker(copy.pages.p04.kicker)}
          <h2 className="deck-h3">{copy.pages.p04.fallbackTitle}</h2>
          {single ? (
            <>
              <p className={`deck-note ${model.usedFallback ? "" : "is-muted"}`}>
                {model.usedFallback
                  ? copy.fallback.unavailable
                  : model.advice
                    ? copy.fallback.full
                    : copy.fallback.empty}
              </p>
              {model.advice ? (
                <div className="deck-prose deck-prose--tight">
                  {splitParas(model.advice).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="deck-prose">
              {splitParas(model.sections.read).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </>
      );
    }

    if (id === "p05") {
      return (
        <>
          {kicker(copy.pages.p05.kicker)}
          <h2 className="deck-h3">{copy.pages.p05.fallbackTitle}</h2>
          <ol className="moves">
            {model.sections.moves.slice(0, 3).map((m, i) => (
              <li className="move" key={i} style={{ "--i": i }}>
                <span className="move-num" aria-hidden="true">
                  {i + 1}
                </span>
                <p className="move-text">{m}</p>
              </li>
            ))}
          </ol>
        </>
      );
    }

    if (id === "p06") {
      return (
        <>
          <div className="week-frame">
            {kicker(copy.pages.p06.kicker)}
            <p className="week-text">{model.sections.week}</p>
          </div>
        </>
      );
    }

    /* p07 — the technical page: the z positions, drawn as positions */
    if (id === "p07") {
      return (
        <>
          {kicker(copy.pages.p07.kicker)}
          <h2 className="deck-h3">{copy.pages.p07.title}</h2>
          <p className="deck-lede">{copy.pages.p07.lede}</p>

          <div className="zaxis" aria-hidden="true">
            <span />
            <span className="zaxis-rail">
              <i>{copy.pages.p07.axisLow}</i>
              <i>{copy.pages.p07.axisMid}</i>
              <i>{copy.pages.p07.axisHigh}</i>
            </span>
            <span />
          </div>

          <ul className="zlist">
            {model.factors.map((f) => (
              <li className="zrow" key={f.key}>
                <span className="zname">{f.label}</span>
                <span className="ztrack" aria-hidden="true">
                  <span className="ztick" />
                  <span className="zmark" style={{ left: `${f.pos}%` }} />
                </span>
                <span className="zval">
                  <b>{f.zText}</b>
                  <span>{f.word}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="deck-fine">{copy.pages.p07.note}</p>
        </>
      );
    }

    /* p08 — the closing page, palette inverted on purpose */
    return (
      <div className="fineprint">
        <p className="fineprint-kicker">{copy.pages.p08.kicker}</p>
        <h2 className="fineprint-title">{copy.pages.p08.title}</h2>

        <div className="fineprint-cols">
          <section className="fineprint-col">
            <h3>{copy.pages.p08.isTitle}</h3>
            <ul>
              {copy.pages.p08.is.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
          <section className="fineprint-col fineprint-col--not">
            <h3>{copy.pages.p08.isNotTitle}</h3>
            <ul>
              {copy.pages.p08.isNot.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        </div>

        <aside className={`support ${model.crisis ? "is-urgent" : ""}`}>
          <h3>{copy.pages.p08.supportTitle}</h3>
          <p>{copy.pages.p08.supportBody}</p>
          <a
            className="support-link"
            href="https://www.cedars.hku.hk/"
            target="_blank"
            rel="noreferrer"
          >
            cedars.hku.hk
          </a>
        </aside>

        <div className="fineprint-actions">
          <button type="button" className="deck-btn deck-btn--solid" onClick={onClose}>
            {copy.pages.p08.again}
          </button>
          <button type="button" className="deck-btn" onClick={onClose}>
            {copy.pages.p08.close}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="deck-root"
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t?.resultTitle || "Result"}
      data-lang={language}
    >
      <header className="deck-chrome">
        <span className="deck-count" aria-hidden="true">
          {copy.chrome.pageOf(index + 1, total)}
        </span>

        <span className={`deck-chip tier-${TIER_TONE[model.tier] || "moderate"}`}>
          {tierLabel}
          {pct !== null && <b>{pct}%</b>}
        </span>

        <button
          type="button"
          className="deck-close"
          onClick={onClose}
          aria-label={copy.chrome.close}
        >
          ✕
        </button>
      </header>

      <div className="deck-track" ref={trackRef} onScroll={onScroll}>
        {model.pages.map((id, i) => (
          <section
            key={id}
            className="deck-page"
            data-page={id}
            data-num={String(i + 1).padStart(2, "0")}
            data-accent={ACCENT[id]}
            data-visible="false"
            aria-roledescription="slide"
            aria-label={copy.chrome.pageLabel(i + 1, total)}
          >
            <div className="deck-inner">{page(id)}</div>
          </section>
        ))}
      </div>

      {intro && (
        <div
          className={`deck-intro ${introOut ? "is-out" : ""}`}
          onClick={skipIntro}
          role="presentation"
          aria-hidden="true"
        >
          <span className="intro-ring" />
          <div className="intro-inner">
            <p className="intro-kicker">{copy.intro.kicker}</p>
            <h2 className="intro-title">
              {copy.intro.words.map((word, i) => (
                <span className="intro-word" key={`${word}-${i}`}>
                  <span className="intro-word-in" style={{ "--i": i }}>
                    {word}
                  </span>
                </span>
              ))}
            </h2>
            <span className="intro-rule" />
            <p className="intro-sub">{copy.intro.sub}</p>
          </div>
          <span className="intro-skip">{copy.intro.skip}</span>
        </div>
      )}

      <nav className="deck-dots" aria-label={copy.chrome.pageLabel(index + 1, total)}>
        {model.pages.map((id, i) => (
          <button
            key={id}
            type="button"
            className={`deck-dot ${i === index ? "is-on" : ""}`}
            onClick={() => goTo(i)}
            aria-label={copy.chrome.pageLabel(i + 1, total)}
            aria-current={i === index ? "true" : undefined}
          />
        ))}
      </nav>

      {!intro && index < total - 1 && (
        <button
          type="button"
          className="deck-next"
          onClick={() => goTo(index + 1)}
          aria-label={copy.chrome.next}
        >
          <span>{copy.chrome.nextShort}</span>
          <span className="deck-next-arrow" aria-hidden="true">
            →
          </span>
        </button>
      )}

      <footer className="deck-rail">
        <span className="rail-note">{copy.chrome.infoOnly}</span>
        <span className="rail-sep" aria-hidden="true">
          ·
        </span>
        <a className="rail-cedars" href="https://www.cedars.hku.hk/" target="_blank" rel="noreferrer">
          {copy.chrome.cedars}
        </a>
        <button
          type="button"
          className="rail-more"
          onClick={() => goTo(model.pages.indexOf("p08"))}
        >
          {copy.chrome.fullDisclaimer}
        </button>
      </footer>

      {!scrolled && total > 1 && (
        <p className="deck-hint" aria-hidden="true">
          {copy.chrome.swipe}
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        {copy.chrome.pageLabel(index + 1, total)}
      </p>
    </div>
  );
}

function splitParas(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
