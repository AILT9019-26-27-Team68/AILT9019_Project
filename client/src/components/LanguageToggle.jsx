import { SUPPORTED_LOCALES, LOCALE_LABELS } from "../i18n.js";

export default function LanguageToggle({ value, onChange }) {
  return (
    <div className="lang-toggle">
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          title={LOCALE_LABELS[code].full}
          className={value === code ? "active" : ""}
          onClick={() => onChange(code)}
        >
          {LOCALE_LABELS[code].short}
        </button>
      ))}
    </div>
  );
}
