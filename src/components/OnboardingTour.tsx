import { useEffect, useId, useRef, useState } from "react";
import { useA11y } from "../context/AccessibilityContext";
import { playEarcon } from "../lib/earcons";
import { useVoiceCommands } from "../lib/useVoiceCommands";

// Five-step welcome tour shown on first open (and re-openable from the
// accessibility menu). Blind-first: it is a focus-trapped role="dialog" whose
// heading is focused on every step so screen readers announce it, and — when
// read-aloud is on — it narrates each step via the offline browser TTS
// (useA11y().speak, no backend/key). Step 1 offers a one-tap "blind mode".
const STEPS = [
  { title: "tutorial.s1.title", body: "tutorial.s1.body", icon: "🗳️" },
  { title: "tutorial.s2.title", body: "tutorial.s2.body", icon: "☰" },
  { title: "tutorial.s3.title", body: "tutorial.s3.body", icon: "👁️" },
  { title: "tutorial.s4.title", body: "tutorial.s4.body", icon: "🧭" },
  { title: "tutorial.s5.title", body: "tutorial.s5.body", icon: "🔊" },
  { title: "tutorial.s6.title", body: "tutorial.s6.body", icon: "🔒" },
];

// Backdrop elements hidden from AT / interaction while the tour is open.
const BG_SELECTORS = ["#main", "header.toolbar", ".voice-fab"];

export default function OnboardingTour({
  onClose,
  firstRun = false,
}: {
  onClose: () => void;
  firstRun?: boolean;
}) {
  const a = useA11y();
  const [step, setStep] = useState(0);
  // Smart suggestion: if the OS signals a high-contrast preference and we're not
  // already there, offer it on the welcome step (zero-config access).
  const [suggestContrast, setSuggestContrast] = useState(
    () =>
      typeof window !== "undefined" &&
      a.contrast === "normal" &&
      (window.matchMedia("(prefers-contrast: more)").matches ||
        window.matchMedia("(forced-colors: active)").matches)
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const baseId = useId();
  const titleId = `${baseId}-title`;
  const bodyId = `${baseId}-body`;
  const isLast = step === STEPS.length - 1;
  const narration =
    `${a.tr(STEPS[step].title)}. ${a.tr(STEPS[step].body)}` +
    (a.voiceControl ? `. ${a.tr("tutorial.voiceHint")}` : "");

  // Focus trap (Tab wrap) + Escape to skip + restore focus to the opener.
  // Runs once; reads the latest onClose via a ref so it isn't re-registered.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => !el.hasAttribute("disabled"));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
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

    // Isolate the background from screen readers and pointer/keyboard.
    const bg = BG_SELECTORS.flatMap((s) => Array.from(document.querySelectorAll<HTMLElement>(s)));
    bg.forEach((el) => {
      el.setAttribute("aria-hidden", "true");
      (el as HTMLElement & { inert: boolean }).inert = true;
    });

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      bg.forEach((el) => {
        el.removeAttribute("aria-hidden");
        (el as HTMLElement & { inert: boolean }).inert = false;
      });
      a.stopSpeak();
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  // On each step: focus the heading (screen-reader announces it) and, when
  // read-aloud is on, narrate — same gating as Screen.tsx so we never talk
  // over a screen reader the user didn't ask to double up with.
  useEffect(() => {
    headingRef.current?.focus();
    if (!a.readAloud) return;
    const id = setTimeout(() => a.speak(narration), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, a.readAloud, a.lang]);

  // Earcon on every step transition (audible progress cue).
  useEffect(() => {
    playEarcon("step");
  }, [step]);

  // Hands-free navigation: speak "weiter / zurück / wiederholen" to move around.
  useVoiceCommands(a.voiceControl, a.lang, {
    onNext: () => (isLast ? onClose() : setStep((s) => Math.min(STEPS.length - 1, s + 1))),
    onBack: () => setStep((s) => Math.max(0, s - 1)),
    onRepeat: () => a.speak(narration),
    onClose: () => onClose(),
  });

  return (
    <div
      className={"tour-backdrop" + (firstRun ? " firstrun" : "")}
      role="presentation"
      onClick={() => {
        if (!firstRun) onClose(); // on first open, require an explicit choice
      }}
    >
      <div
        ref={dialogRef}
        className="tour"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tour-head">
          <span className="tour-eyebrow">{a.tr("tutorial.label")}</span>
          <button
            type="button"
            className="a11y-close"
            onClick={() => onClose()}
            aria-label={a.tr("tutorial.skip")}
          >
            ✕
          </button>
        </div>

        <nav className="steps" aria-label={`${a.tr("step")} ${step + 1} ${a.tr("of")} ${STEPS.length}`}>
          <ol className="steps-list">
            {STEPS.map((_, i) => (
              <li
                key={i}
                className={"step-dot" + (i === step ? " current" : i < step ? " done" : "")}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="step-num">{i + 1}</span>
              </li>
            ))}
          </ol>
          <p className="step-text">
            {a.tr("step")} {step + 1} {a.tr("of")} {STEPS.length}
          </p>
        </nav>

        <div className="tour-body">
          <span className="tour-icon" aria-hidden="true">
            {STEPS[step].icon}
          </span>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="tour-title">
            {a.tr(STEPS[step].title)}
          </h2>
          <p id={bodyId} className="tour-text">
            {a.tr(STEPS[step].body)}
          </p>
          {a.voiceControl && (
            <p className="tour-voicehint">
              <span aria-hidden="true">🎙️</span> {a.tr("tutorial.voiceHint")}
            </p>
          )}
        </div>

        {step === 0 ? (
          <div className="tour-actions tour-actions-welcome">
            {suggestContrast && (
              <div className="tour-suggest">
                <span>{a.tr("tutorial.suggestContrast")}</span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    a.setContrast("high");
                    setSuggestContrast(false);
                  }}
                >
                  {a.tr("tutorial.suggestContrastBtn")}
                </button>
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary tour-blind"
              onClick={() => {
                a.setProfile("blind");
                setStep(1);
              }}
            >
              <span aria-hidden="true">🔊</span> {a.tr("tutorial.blindMode")}
            </button>
            <span className="tour-hint">{a.tr("tutorial.blindModeHint")}</span>
            <div className="tour-actions-row">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                <span aria-hidden="true">▶</span> {a.tr("tutorial.start")}
              </button>
              <button type="button" className="btn btn-ghost tour-skip" onClick={() => onClose()}>
                {a.tr("tutorial.skip")}
              </button>
            </div>
          </div>
        ) : (
          <div className="tour-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <span aria-hidden="true">←</span> {a.tr("back")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => a.speak(narration)}>
              <span aria-hidden="true">🔊</span> {a.tr("tutorial.repeat")}
            </button>
            {isLast ? (
              <button type="button" className="btn btn-primary" onClick={() => onClose()}>
                {a.tr("tutorial.finish")}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              >
                {a.tr("next")} <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        )}

        <p className="tour-kbd">
          <span aria-hidden="true">⌨</span> {a.tr("tutorial.keyboard")}
        </p>
      </div>
    </div>
  );
}
