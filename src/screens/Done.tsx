import { useEffect, useRef, useState } from "react";
import { useA11y } from "../context/AccessibilityContext";
import Screen from "../components/Screen";
import { CARD } from "../lib/data";

export default function Done() {
  const a = useA11y();
  // Once the finalisation code is shown the vote is final: restarting — and thus
  // voting a second time — is no longer allowed. The "restart" button now explains
  // this in an alert dialog instead of resetting the session.
  const [blocked, setBlocked] = useState(false);
  const restartBtnRef = useRef<HTMLButtonElement | null>(null);
  const okBtnRef = useRef<HTMLButtonElement | null>(null);

  // While the dialog is open: pull focus into it, close on Escape (keyboard + SR).
  useEffect(() => {
    if (!blocked) return;
    okBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBlocked();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  function closeBlocked() {
    setBlocked(false);
    // Return focus to the trigger so keyboard users aren't dropped at the top.
    restartBtnRef.current?.focus();
  }

  return (
    <Screen title={a.tr("doneTitle")} help={a.tr("doneHelp")} speakExtra={`${a.tr("finalizeCode")}: ${CARD.finalizeCode}`} easySym="🎉">
      <div className="done-badge" role="status">
        <span className="done-check" aria-hidden="true">
          ✓
        </span>
      </div>

      <div className="finalize">
        <span className="verify-code-label">
          <span className="sym" aria-hidden="true">★</span> {a.tr("finalizeCode")}
        </span>
        <span className="code-badge code-badge-lg">{CARD.finalizeCode}</span>
      </div>

      <p className="finish-text">{a.tr("finishText")}</p>

      <div className="actions">
        <button
          ref={restartBtnRef}
          type="button"
          className="btn btn-ghost"
          onClick={() => setBlocked(true)}
        >
          ↺ {a.tr("restart")}
        </button>
      </div>

      {blocked && (
        <div className="alert-backdrop" onClick={closeBlocked}>
          <div
            className="alert-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="already-voted-title"
            aria-describedby="already-voted-body"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="alert-icon" aria-hidden="true">✓</div>
            <h2 id="already-voted-title" className="alert-title">
              {a.tr("alreadyVotedTitle")}
            </h2>
            <p id="already-voted-body" className="alert-body">
              {a.tr("alreadyVotedBody")}
            </p>
            <div className="alert-actions">
              <button ref={okBtnRef} type="button" className="btn btn-primary" onClick={closeBlocked}>
                {a.tr("understood")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
