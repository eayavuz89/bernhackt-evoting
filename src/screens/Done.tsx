import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useA11y } from "../AccessibilityContext";
import Screen from "../components/Screen";
import { CARD } from "../data";
import type { Session } from "../App";

export default function Done({ session }: { session: Session }) {
  const a = useA11y();
  const nav = useNavigate();

  useEffect(() => {
    // Success announcement for screen readers is handled by Screen focus + read-aloud.
    return () => {};
  }, []);

  const restart = () => {
    session.reset();
    nav("/");
  };

  return (
    <Screen title={a.tr("doneTitle")} help={a.tr("doneHelp")} speakExtra={`${a.tr("finalizeCode")}: ${CARD.finalizeCode}`}>
      <div className="done-badge" role="status">
        <span className="done-check" aria-hidden="true">
          ✓
        </span>
      </div>

      <div className="finalize">
        <span className="verify-code-label">{a.tr("finalizeCode")}</span>
        <span className="code-badge code-badge-lg">{CARD.finalizeCode}</span>
      </div>

      <p className="finish-text">{a.tr("finishText")}</p>

      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={restart}>
          ↺ {a.tr("restart")}
        </button>
      </div>
    </Screen>
  );
}
