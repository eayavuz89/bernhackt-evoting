import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useA11y } from "../context/AccessibilityContext";
import Screen from "../components/Screen";
import { CARD } from "../lib/data";

const EXPECTED = CARD.confirmCode.replace(/\s/g, ""); // "649130"

export default function Confirm({ session }: { session: { answers: Record<string, string> } }) {
  const a = useA11y();
  const nav = useNavigate();
  // Empty by default; the "Ausfüllen" button fills the demo code on demand.
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.replace(/\s/g, "") === EXPECTED) {
      setError("");
      nav("/done");
    } else {
      setError(a.tr("wrongConfirm"));
    }
  };

  return (
    <Screen title={a.tr("confirmTitle")} help={a.tr("confirmHelp")} step={4} totalSteps={4} easySym="🔒">
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="confirmCode">
            <span className="sym" aria-hidden="true">⬟</span> {a.tr("confirmCode")}
          </label>
          <div className="input-with-action">
            <input
              id="confirmCode"
              className="input input-code"
              inputMode="numeric"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-describedby="confirmHint confirmError"
              aria-invalid={!!error}
            />
            <button
              type="button"
              className="btn-autofill"
              onClick={() => setCode(CARD.confirmCode)}
              aria-controls="confirmCode"
            >
              <span className="sym" aria-hidden="true">✎</span> {a.tr("autofill")}
            </button>
          </div>
          <p id="confirmHint" className="hint">
            {a.tr("confirmCodeHint")} <span className="demo-hint">{a.tr("demoHint")}</span>
          </p>
          {error ? (
            <p id="confirmError" className="error" role="alert">
              ⚠️ {error}
            </p>
          ) : null}
        </div>

        <div className="actions">
          <button type="submit" className="btn btn-primary btn-lg btn-cast">
            ✓ {a.tr("castVote")}
          </button>
          <Link className="btn btn-ghost" to="/verify">
            ← {a.tr("back")}
          </Link>
        </div>
      </form>
    </Screen>
  );
}
