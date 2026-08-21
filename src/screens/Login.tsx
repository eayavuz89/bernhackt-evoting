import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useA11y } from "../AccessibilityContext";
import Screen from "../components/Screen";
import { CARD } from "../data";

const EXPECTED = CARD.initCode.replace(/\s/g, ""); // "482917305"

export default function Login() {
  const a = useA11y();
  const nav = useNavigate();
  // Pre-fill for the demo so judges can proceed instantly.
  const [code, setCode] = useState(CARD.initCode);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\s/g, "");
    if (clean === EXPECTED) {
      setError("");
      nav("/ballot");
    } else {
      setError(a.tr("invalidCode"));
    }
  };

  return (
    <Screen title={a.tr("loginTitle")} help={a.tr("loginHelp")} step={1} totalSteps={4}>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="cardCode">{a.tr("cardCode")}</label>
          <input
            id="cardCode"
            className="input input-code"
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-describedby="cardCodeHint cardError"
            aria-invalid={!!error}
          />
          <p id="cardCodeHint" className="hint">
            {a.tr("cardCodeHint")} <span className="demo-hint">{a.tr("demoHint")}</span>
          </p>
          {error ? (
            <p id="cardError" className="error" role="alert">
              ⚠️ {error}
            </p>
          ) : null}
        </div>

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
