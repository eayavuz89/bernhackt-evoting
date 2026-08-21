import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useA11y } from "../AccessibilityContext";
import Screen from "../components/Screen";
import { CARD } from "../data";

// Official scheme: init code is alphanumeric, case-insensitive; the Extended
// Authentication Factor (year of birth) is deliberately not on the card.
const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();

export default function Login() {
  const a = useA11y();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  // Pre-filled for the demo so judges can proceed instantly; the card's QR
  // deep-links here with ?init=<code> (one-tap sign-in for motor-impaired users).
  const [code, setCode] = useState(sp.get("init") || CARD.initCode);
  const [year, setYear] = useState(CARD.birthYear);
  const [legal1, setLegal1] = useState(false);
  const [legal2, setLegal2] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legal1 || !legal2) {
      setError(a.tr("mustAcceptLegal"));
      return;
    }
    if (norm(code) !== norm(CARD.initCode)) {
      setError(a.tr("invalidCode"));
      return;
    }
    if (year.trim() !== CARD.birthYear) {
      setError(a.tr("wrongBirthYear"));
      return;
    }
    setError("");
    nav("/ballot");
  };

  return (
    <Screen title={a.tr("loginTitle")} help={a.tr("loginHelp")} step={1} totalSteps={4}>
      <form className="form" onSubmit={submit} noValidate>
        {/* Legal acknowledgement (official step 1: Gesetzliche Bestimmungen) */}
        <label className="confirm-check legal-check">
          <input type="checkbox" checked={legal1} onChange={(e) => setLegal1(e.target.checked)} />
          <span>{a.tr("legal1")}</span>
        </label>
        <label className="confirm-check legal-check">
          <input type="checkbox" checked={legal2} onChange={(e) => setLegal2(e.target.checked)} />
          <span>{a.tr("legal2")}</span>
        </label>

        <div className="field">
          <label htmlFor="cardCode">
            <span className="sym" aria-hidden="true">▲</span> {a.tr("cardCode")}
          </label>
          <input
            id="cardCode"
            className="input input-code"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-describedby="cardCodeHint cardError"
            aria-invalid={!!error}
          />
          <p id="cardCodeHint" className="hint">
            {a.tr("cardCodeHint")} <span className="demo-hint">{a.tr("demoHint")}</span>
          </p>
        </div>

        <div className="field">
          <label htmlFor="birthYear">{a.tr("birthYear")}</label>
          <input
            id="birthYear"
            className="input input-code input-year"
            inputMode="numeric"
            autoComplete="off"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-describedby="birthYearHint cardError"
            aria-invalid={!!error}
          />
          <p id="birthYearHint" className="hint">
            {a.tr("birthYearHint")}
          </p>
        </div>

        {error ? (
          <p id="cardError" className="error" role="alert">
            ⚠️ {error}
          </p>
        ) : null}

        <div className="actions">
          <button type="submit" className="btn btn-primary btn-lg">
            {a.tr("login")} →
          </button>
          <Link className="btn btn-ghost" to="/">
            ← {a.tr("back")}
          </Link>
        </div>

        <p className="scan-note">📷 {a.tr("scanCardHelp")}</p>
      </form>
    </Screen>
  );
}
