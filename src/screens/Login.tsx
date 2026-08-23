import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useA11y } from "../context/AccessibilityContext";
import Screen from "../components/Screen";
import QrScanner from "../components/QrScanner";
import { CARD } from "../lib/data";

// Official scheme: init code is alphanumeric, case-insensitive; the Extended
// Authentication Factor (year of birth) is deliberately not on the card.
const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();

export default function Login() {
  const a = useA11y();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  // Empty by default; the "Ausfüllen" button next to the field fills the demo
  // code on demand. The card's QR still deep-links here with ?init=<code>
  // (one-tap sign-in for motor-impaired users), which pre-fills the field.
  const [code, setCode] = useState(sp.get("init") || "");
  const [year, setYear] = useState(CARD.birthYear);
  const [legal1, setLegal1] = useState(false);
  const [legal2, setLegal2] = useState(false);
  const [error, setError] = useState("");
  // Which field the current warning refers to, so only that field's border
  // turns red — not every input on the screen.
  const [errorField, setErrorField] = useState<"" | "legal" | "code" | "year">("");
  // Legal-provisions reader dialog, opened from the info icon in the second
  // acknowledgement row.
  const [legalOpen, setLegalOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanned, setScanned] = useState(false); // brief "code taken over" confirmation
  const legalInfoBtnRef = useRef<HTMLButtonElement | null>(null);
  const legalCloseRef = useRef<HTMLButtonElement | null>(null);

  // While open: pull focus into the dialog, close on Escape, and return focus to
  // the info icon on close (keyboard + screen-reader users).
  useEffect(() => {
    if (!legalOpen) return;
    legalCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLegal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legalOpen]);

  function closeLegal() {
    setLegalOpen(false);
    legalInfoBtnRef.current?.focus();
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legal1 || !legal2) {
      setError(a.tr("mustAcceptLegal"));
      setErrorField("legal");
      return;
    }
    if (norm(code) !== norm(CARD.initCode)) {
      setError(a.tr("invalidCode"));
      setErrorField("code");
      return;
    }
    if (year.trim() !== CARD.birthYear) {
      setError(a.tr("wrongBirthYear"));
      setErrorField("year");
      return;
    }
    setError("");
    setErrorField("");
    nav("/ballot");
  };

  return (
    <Screen title={a.tr("loginTitle")} help={a.tr("loginHelp")} step={1} totalSteps={4} easySym="🪪">
      <form className="form" onSubmit={submit} noValidate>
        {/* Legal acknowledgement (official step 1: Gesetzliche Bestimmungen).
            When the "confirm both" warning fires, only the boxes still unchecked
            turn red. */}
        <label
          className={"confirm-check legal-check" + (errorField === "legal" && !legal1 ? " invalid" : "")}
        >
          <input
            type="checkbox"
            checked={legal1}
            onChange={(e) => setLegal1(e.target.checked)}
            aria-invalid={errorField === "legal" && !legal1}
            aria-describedby="cardError"
          />
          <span>{a.tr("legal1")}</span>
        </label>
        <label
          className={"confirm-check legal-check" + (errorField === "legal" && !legal2 ? " invalid" : "")}
        >
          <input
            type="checkbox"
            checked={legal2}
            onChange={(e) => setLegal2(e.target.checked)}
            aria-invalid={errorField === "legal" && !legal2}
            aria-describedby="cardError"
          />
          <span>{a.tr("legal2")}</span>
          {/* Read the provisions before acknowledging. A button nested in a label
              does not toggle the checkbox (interactive-descendant rule). */}
          <button
            type="button"
            className="legal-info-btn"
            ref={legalInfoBtnRef}
            aria-haspopup="dialog"
            aria-label={a.tr("legalInfoAria")}
            onClick={(e) => {
              e.stopPropagation();
              setLegalOpen(true);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="11" x2="12" y2="16" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        </label>

        <div className="field">
          <label htmlFor="cardCode">
            <span className="sym" aria-hidden="true">▲</span> {a.tr("cardCode")}
          </label>
          <div className="input-with-action">
            <input
              id="cardCode"
              className="input input-code"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-describedby="cardCodeHint cardError"
              aria-invalid={errorField === "code"}
            />
            <button
              type="button"
              className="btn-autofill"
              onClick={() => setCode(CARD.initCode)}
              aria-controls="cardCode"
            >
              <span className="sym" aria-hidden="true">✎</span> {a.tr("autofill")}
            </button>
          </div>
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
            aria-invalid={errorField === "year"}
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

        {/* Camera QR sign-in: the card's QR deep-links to /login?init=<code>; we
            accept both that URL and a raw code payload. */}
        <button type="button" className="btn btn-ghost scan-btn" onClick={() => setScanOpen(true)}>
          📷 {a.tr("scanQrBtn")}
        </button>
        {scanned && (
          <p className="hint scan-ok" role="status">
            ✅ {a.tr("scanQrSuccess")}
          </p>
        )}
      </form>

      {scanOpen && (
        <QrScanner
          onClose={() => setScanOpen(false)}
          onResult={(text) => {
            let init = text.trim();
            try {
              const u = new URL(text);
              init = u.searchParams.get("init") || init;
            } catch {
              /* raw code, not a URL */
            }
            setCode(init);
            setScanOpen(false);
            setScanned(true);
            if (errorField === "code") {
              setError("");
              setErrorField("");
            }
          }}
        />
      )}

      {legalOpen && (
        <div className="dialog-backdrop" role="presentation" onClick={closeLegal}>
          <div
            className="dialog dialog-legal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legalTitle"
            aria-describedby="legalNote"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="legalTitle" className="dialog-title">
              {a.tr("legalModalTitle")}
            </h2>
            <p id="legalNote" className="dialog-note">
              {a.tr("legalModalNote")}
            </p>
            <div className="dialog-body legal-body">
              <p className="legal-intro">{a.tr("legalModalIntro")}</p>
              <ul className="legal-list">
                {a.tr("legalModalItems")
                  .split("\n")
                  .map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
              </ul>
            </div>
            <div className="dialog-actions">
              <button ref={legalCloseRef} type="button" className="btn btn-primary" onClick={closeLegal}>
                {a.tr("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
