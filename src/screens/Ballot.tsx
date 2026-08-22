import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useA11y } from "../context/AccessibilityContext";
import Screen from "../components/Screen";
import { PROPOSALS, Answer } from "../lib/data";
import type { Session } from "../lib/types";

const OPTIONS: Answer[] = ["yes", "no", "blank"];

export default function Ballot({ session }: { session: Session }) {
  const a = useA11y();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [showEncrypt, setShowEncrypt] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const proceed = () => {
    const unanswered = PROPOSALS.filter((p) => !session.answers[p.id]);
    if (unanswered.length) {
      setError(a.tr("mustAnswerAll"));
      return;
    }
    setError("");
    // Official flow: explicit "encrypt and submit" consent before return codes.
    setShowEncrypt(true);
    if (a.readAloud) a.speak(`${a.tr("encryptTitle")} ${a.tr("encryptBody")}`);
  };

  // Modal a11y: trap Tab inside the encrypt dialog, close on Escape, and restore
  // focus to the trigger on close (WCAG 2.1.2 no keyboard trap / 2.4.3 focus order).
  useEffect(() => {
    if (!showEncrypt) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => !el.hasAttribute("disabled"));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowEncrypt(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Restore focus only if the trigger is still mounted (not when navigating away).
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [showEncrypt]);

  return (
    <Screen title={a.tr("ballotTitle")} help={a.tr("ballotHelp")} step={2} totalSteps={4}>
      {PROPOSALS.map((p, idx) => {
        const chosen = session.answers[p.id];
        return (
          <fieldset className="proposal" key={p.id}>
            <legend className="proposal-legend">
              <span className="proposal-num" aria-hidden="true">
                {idx + 1}
              </span>
              <span>{p.title[a.lang]}</span>
            </legend>
            <p className="proposal-text">{p.text[a.lang]}</p>

            <div className="choice-row" role="radiogroup" aria-label={p.title[a.lang]}>
              {OPTIONS.map((opt) => {
                const id = `${p.id}-${opt}`;
                return (
                  <label key={opt} htmlFor={id} className={"choice" + (chosen === opt ? " chosen" : "")}>
                    <input
                      type="radio"
                      id={id}
                      name={p.id}
                      value={opt}
                      checked={chosen === opt}
                      onChange={() => {
                        session.setAnswer(p.id, opt);
                        if (error) setError("");
                        if (a.readAloud) a.speak(`${p.title[a.lang]}. ${a.tr(opt)}`);
                      }}
                    />
                    <span className="choice-mark" aria-hidden="true" />
                    <span className="choice-label">{a.tr(opt)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {error ? (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      ) : null}

      <div className="actions">
        <button type="button" ref={triggerRef} className="btn btn-primary btn-lg" onClick={proceed}>
          {a.tr("reviewVotes")} →
        </button>
        <Link className="btn btn-ghost" to="/login">
          ← {a.tr("back")}
        </Link>
      </div>

      {showEncrypt && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setShowEncrypt(false)}>
          <div
            ref={dialogRef}
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="encTitle"
            aria-describedby="encBody"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="encTitle" className="dialog-title">
              🔒 {a.tr("encryptTitle")}
            </h2>
            <p id="encBody" className="dialog-body">
              {a.tr("encryptBody")}
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowEncrypt(false)}>
                {a.tr("encryptCancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                autoFocus
                onClick={() => {
                  setShowEncrypt(false);
                  nav("/verify");
                }}
              >
                🔒 {a.tr("encryptOk")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
