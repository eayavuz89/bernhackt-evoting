import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useA11y } from "../AccessibilityContext";
import Screen from "../components/Screen";
import { PROPOSALS } from "../data";
import type { Session } from "../App";

export default function Verify({ session }: { session: Session }) {
  const a = useA11y();
  const nav = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  // Guard: if arrived without answers, go back.
  useEffect(() => {
    if (Object.keys(session.answers).length === 0) nav("/ballot", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen title={a.tr("verifyTitle")} help={a.tr("verifyHelp")} step={3} totalSteps={4}>
      <ul className="verify-list" role="list">
        {PROPOSALS.map((p, idx) => {
          const ans = session.answers[p.id];
          const code = ans ? p.codes[ans] : "—";
          return (
            <li className="verify-item" key={p.id}>
              <div className="verify-info">
                <span className="proposal-num" aria-hidden="true">
                  {idx + 1}
                </span>
                <div>
                  <p className="verify-q">{p.title[a.lang]}</p>
                  <p className="verify-a">
                    {a.tr("yourChoice")}: <strong>{ans ? a.tr(ans) : a.tr("notChosen")}</strong>
                  </p>
                </div>
              </div>
              <div className="verify-code">
                <span className="verify-code-label">{a.tr("returnCode")}</span>
                <span className="code-badge" aria-label={`${a.tr("returnCode")}: ${code.split("").join(" ")}`}>
                  {code}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <label className="confirm-check">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <span>{a.tr("codesMatch")}</span>
      </label>
      {!confirmed ? <p className="hint">{a.tr("codesMatchHelp")}</p> : null}

      <div className="actions">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={!confirmed}
          onClick={() => nav("/confirm")}
        >
          {a.tr("next")} →
        </button>
        <Link className="btn btn-ghost" to="/ballot">
          ← {a.tr("back")}
        </Link>
      </div>
    </Screen>
  );
}
