import { useEffect, useRef } from "react";
import { useA11y } from "../context/AccessibilityContext";

interface Props {
  title: string;
  help?: string;
  step?: number;
  totalSteps?: number;
  children: React.ReactNode;
  /** Small uppercase-tracked label rendered above the heading. */
  eyebrow?: string;
  /** Extra text appended to the spoken read-aloud summary. */
  speakExtra?: string;
}

// Shared screen scaffold: focuses the heading on mount (screen-reader announce),
// shows a step indicator, and reads the page aloud when read-aloud is enabled.
export default function Screen({ title, help, step, totalSteps, children, eyebrow, speakExtra }: Props) {
  const a = useA11y();
  const h1Ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    h1Ref.current?.focus();
    if (a.readAloud) {
      const parts = [title, help, speakExtra].filter(Boolean).join(". ");
      const t = setTimeout(() => a.speak(parts), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, help, a.readAloud, a.lang]);

  return (
    <div className="screen">
      {step && totalSteps ? (
        <nav className="steps" aria-label={`${a.tr("step")} ${step} ${a.tr("of")} ${totalSteps}`}>
          <ol className="steps-list">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <li
                key={i}
                className={"step-dot" + (i + 1 === step ? " current" : i + 1 < step ? " done" : "")}
                aria-current={i + 1 === step ? "step" : undefined}
              >
                <span className="step-num">{i + 1}</span>
              </li>
            ))}
          </ol>
          <p className="step-text">
            {a.tr("step")} {step} {a.tr("of")} {totalSteps}
          </p>
        </nav>
      ) : null}

      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 tabIndex={-1} ref={h1Ref} className="screen-title">
        {title}
      </h1>
      {help ? <p className="screen-help">{help}</p> : null}
      {children}
    </div>
  );
}
