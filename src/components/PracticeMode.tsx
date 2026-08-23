import { useEffect, useRef, useState } from "react";
import { useA11y } from "../context/AccessibilityContext";
import { playEarcon } from "../lib/earcons";
import { useVoiceCommands } from "../lib/useVoiceCommands";
import type { Answer } from "../lib/data";

const OPTIONS: Answer[] = ["yes", "no", "blank"];

// Pictogram per answer, shown only in Leichte Sprache (cognitive profile) —
// mirrors the real ballot so practice builds the same recognition.
const CHOICE_SYM: Record<Answer, string> = { yes: "✓", no: "✗", blank: "☐" };

// Risk-free practice: a mock proposal where choosing Ja/Nein/Leer gives instant
// earcon + spoken feedback, but nothing is submitted. Lowers the fear of the
// real vote — the highest-impact comprehension aid (challenge feature #2).
export default function PracticeMode({ onClose }: { onClose: () => void }) {
  const a = useA11y();
  const [choice, setChoice] = useState<Answer | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pick = (opt: Answer) => {
    setChoice(opt);
    playEarcon("success");
    if (a.readAloud) a.speak(`${a.tr(opt)}. ${a.tr("practice.feedbackSpoken")}`);
  };

  // Open earcon, focus the heading, narrate the intro, close on Escape.
  useEffect(() => {
    playEarcon("open");
    headingRef.current?.focus();
    if (a.readAloud) {
      const id = setTimeout(
        () => a.speak(`${a.tr("practice.title")}. ${a.tr("practice.intro")} ${a.tr("practice.question")}`),
        250
      );
      // cleared below via stopSpeak on unmount
      void id;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      a.stopSpeak();
      playEarcon("close");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hands-free: speak "ja / nein / leer" to choose, "wiederholen" to re-hear.
  useVoiceCommands(a.voiceControl && !a.voiceSession, a.lang, {
    onChoice: (c) => pick(c),
    onRepeat: () => a.speak(a.tr("practice.question")),
    onClose: () => onCloseRef.current(),
  });

  return (
    <div className="dialog-backdrop" role="presentation" onClick={() => onClose()}>
      <div
        className="dialog practice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practiceTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="practiceTitle" ref={headingRef} tabIndex={-1} className="dialog-title">
          <span aria-hidden="true">🎯</span> {a.tr("practice.title")}
        </h2>
        <p className="dialog-body practice-intro">{a.tr("practice.intro")}</p>

        <fieldset className="proposal practice-q">
          <legend className="proposal-legend">
            <span>{a.tr("practice.question")}</span>
          </legend>
          <div className="choice-row" role="radiogroup" aria-label={a.tr("practice.question")}>
            {OPTIONS.map((opt) => (
              <label key={opt} className={"choice" + (choice === opt ? " chosen" : "")}>
                <input
                  type="radio"
                  name="practice"
                  value={opt}
                  checked={choice === opt}
                  onChange={() => pick(opt)}
                />
                <span className="choice-mark" aria-hidden="true" />
                {a.easy && (
                  <span className={"choice-sym sym-" + opt} aria-hidden="true">
                    {CHOICE_SYM[opt]}
                  </span>
                )}
                <span className="choice-label">{a.tr(opt)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {choice && (
          <p className="practice-feedback" role="status">
            <span aria-hidden="true">✓</span> {a.tr(choice)} — {a.tr("practice.feedback")}
          </p>
        )}

        <div className="dialog-actions">
          {choice && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setChoice(null);
                playEarcon("step");
              }}
            >
              {a.tr("practice.again")}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => onClose()}>
            {a.tr("practice.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
