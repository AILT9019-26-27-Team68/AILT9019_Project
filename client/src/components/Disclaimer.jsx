export default function Disclaimer({ t }) {
  return (
    <div className="disclaimer">
      <strong>{t.disclaimerTitle}</strong> {t.disclaimerBody}
      <br />
      {t.disclaimerCrisis} <strong>{t.disclaimerCedars}</strong>{" "}
      {t.disclaimerEmergency}
    </div>
  );
}
