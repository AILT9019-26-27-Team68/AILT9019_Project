import { SUPPORTED_LOCALES, LOCALE_LABELS } from "../i18n.js";

export default function LanguageToggle({ value, onChange }) {
  return (
    <div className="lang-toggle">
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          // TODO: Set title attribute to LOCALE_LABELS[code].full
          // TODO: Set className to "active" if value === code.
          // TODO: Add onClick handler to call onChange(code).
        >
          {/* TODO: Render LOCALE_LABELS[code].short */}
        </button>
      ))}
    </div>
  );
}
