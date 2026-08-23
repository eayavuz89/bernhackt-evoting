import { useEffect, useId, useRef, useState } from "react";
import { useA11y } from "../context/AccessibilityContext";
import { playEarcon } from "../lib/earcons";
import { useVoiceCommands } from "../lib/useVoiceCommands";

// First-open welcome + tutorial, in two phases:
//   • "welcome" — asks the voting mode by voice (blind vs. not). Blind users get
//     one-tap blind mode (read-aloud + voice control) and skip the visual guide.
//   • "guide"   — a paginated, PDF-style walkthrough of the voting PROCESS, one
//     step per page, for sighted users (also re-openable from the a11y menu).
// Blind-first & keyboard-first throughout: focus-trapped role="dialog", the
// heading is focused on every page (screen readers announce it), each page is
// narrated when read-aloud is on, and hands-free voice commands move around.
// One icon per process step, matched to the action: sign in (card), answer the
// proposals (ballot), encrypt & verify (lock), confirm (check), done (celebrate).
const GUIDE = [
  { title: "guide.s1.title", body: "guide.s1.body", icon: "🪪" },
  { title: "guide.s2.title", body: "guide.s2.body", icon: "🗳️" },
  { title: "guide.s3.title", body: "guide.s3.body", icon: "🔒" },
  { title: "guide.s4.title", body: "guide.s4.body", icon: "✅" },
  { title: "guide.s5.title", body: "guide.s5.body", icon: "🎉" },
];

// Backdrop elements hidden from AT / interaction while the tour is open.
const BG_SELECTORS = ["#main", "header.toolbar", ".voice-fab"];

export default function OnboardingTour({
  onClose,
  onChooseProfile,
  firstRun = false,
}: {
  onClose: () => void;
  onChooseProfile?: () => void;
  firstRun?: boolean;
}) {
  const a = useA11y();
  // First open starts at the welcome/branch screen; re-opening from the menu
  // jumps straight to the process guide (the blind-vs-not question is a
  // first-open concern only).
  const [phase, setPhase] = useState<"welcome" | "guide">(firstRun ? "welcome" : "guide");
  const [page, setPage] = useState(0);
  // "Read everything aloud" mode (open to everyone): narrates every guide step in
  // sequence, hands-free — no manual page turns. audioActiveRef guards the chain
  // so stopping/closing can't advance it after the speech is cancelled.
  const [audioMode, setAudioMode] = useState(false);
  const [audioIdx, setAudioIdx] = useState(0);
  const audioActiveRef = useRef(false);
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
  const blindBtnRef = useRef<HTMLButtonElement>(null);
  const audioStopRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const baseId = useId();
  const titleId = `${baseId}-title`;
  const bodyId = `${baseId}-body`;
  const isGuide = phase === "guide";
  const isLast = page === GUIDE.length - 1;

  const narration = isGuide
    ? `${a.tr(GUIDE[page].title)}. ${a.tr(GUIDE[page].body)}` +
      (a.voiceControl ? `. ${a.tr("tutorial.voiceHint")}` : "")
    : `${a.tr("tutorial.s1.title")}. ${a.tr("tutorial.s1.body")}`;

  const startGuide = () => {
    setPhase("guide");
    setPage(0);
  };
  const goBack = () => {
    if (page > 0) setPage((p) => p - 1);
    else if (firstRun) setPhase("welcome"); // first-open came from the welcome branch
    else onCloseRef.current();
  };
  const goNext = () => (isLast ? onCloseRef.current() : setPage((p) => Math.min(GUIDE.length - 1, p + 1)));

  // ---- "Read everything aloud" (Nur-Audio) ----
  const narrationFor = (i: number) => `${a.tr(GUIDE[i].title)}. ${a.tr(GUIDE[i].body)}`;
  const playAudio = (i: number) => {
    if (!audioActiveRef.current) return;
    if (i >= GUIDE.length) {
      stopAudio();
      return;
    }
    setAudioIdx(i);
    playEarcon("step");
    // onEnd chains to the next step; the guard blocks it after a stop/close.
    a.speak(narrationFor(i), () => {
      if (audioActiveRef.current) playAudio(i + 1);
    });
  };
  const startAudio = () => {
    // No separate stopSpeak() here: a.speak() already cancels any current speech.
    // A redundant cancel() right before speak() triggers a Chrome/Safari race that
    // drops the utterance ("Alles vorlesen" appeared to do nothing).
    audioActiveRef.current = true;
    setAudioMode(true);
    playAudio(0);
  };
  function stopAudio() {
    audioActiveRef.current = false;
    a.stopSpeak();
    setAudioMode(false);
    // Focus back onto the guide heading once it re-renders (keyboard users).
    requestAnimationFrame(() => headingRef.current?.focus());
  }

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
      audioActiveRef.current = false; // stop any in-flight "read all aloud" chain
      a.stopSpeak();
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  // On each page/phase change: focus the heading (screen-reader announces it)
  // and, when read-aloud is on, narrate — same gating as Screen.tsx so we never
  // talk over a screen reader the user didn't ask to double up with.
  useEffect(() => {
    if (audioMode) return; // audio mode drives its own speech + focus
    headingRef.current?.focus();
    if (!a.readAloud) return;
    const id = setTimeout(() => a.speak(narration), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, page, a.readAloud, a.lang]);

  // Entering audio mode: move focus to the Stop control (the page-turn buttons
  // are gone), so keyboard users can always halt playback.
  useEffect(() => {
    if (audioMode) audioStopRef.current?.focus();
  }, [audioMode]);

  // Earcon on every page/phase transition (audible progress cue).
  useEffect(() => {
    playEarcon("step");
  }, [phase, page]);

  // First run only: greet by voice the instant the screen opens and move focus to
  // the blind-mode button, so a blind user HEARS the question and confirms with
  // Enter — without hunting for a control they cannot see.
  useEffect(() => {
    if (!firstRun) return;
    let greeted = false;
    const greet = () => {
      if (greeted) return;
      greeted = true;
      a.speak(a.tr("tutorial.autoWelcome"));
    };
    const t = setTimeout(greet, 350); // most desktop browsers allow TTS on load
    // Autoplay guard: if speech was blocked on load, fire on the first input.
    const onGesture = () => greet();
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    blindBtnRef.current?.focus();
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstRun]);

  // Hands-free navigation: speak "weiter / zurück / wiederholen" to move around.
  useVoiceCommands(a.voiceControl && !a.voiceSession, a.lang, {
    onNext: () => (isGuide ? goNext() : startGuide()),
    onBack: () => (isGuide ? goBack() : undefined),
    onRepeat: () => a.speak(narration),
    onClose: () => onCloseRef.current(),
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
        className={"tour" + (isGuide ? " tour-guide" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Welcome phase only: brand logo centred on top of the first-open card. */}
        {!isGuide && !audioMode && (
          <img className="tour-logo" src="/logo.png" alt="" aria-hidden="true" />
        )}
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

        {audioMode ? (
          <div className="tour-body tour-audio">
            <span className="tour-audio-icon" aria-hidden="true">🔊</span>
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className="tour-title">
              {a.tr(GUIDE[audioIdx].title)}
            </h2>
            <p id={bodyId} className="tour-audio-status" aria-live="polite">
              {a.tr("tutorial.audioPlaying")} · {a.tr("step")} {audioIdx + 1} / {GUIDE.length}
            </p>
            <div className="tour-actions tour-actions-audio">
              <button ref={audioStopRef} type="button" className="btn btn-primary" onClick={stopAudio}>
                <span aria-hidden="true">⏹</span> {a.tr("tutorial.audioStop")}
              </button>
            </div>
          </div>
        ) : isGuide ? (
          <>
            {/* Slim progress bar = how far through the document you are */}
            <div
              className="tour-progress"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={GUIDE.length}
              aria-valuenow={page + 1}
              aria-label={`${a.tr("guide.page")} ${page + 1} / ${GUIDE.length}`}
            >
              <span
                className="tour-progress-bar"
                style={{ transform: `scaleX(${(page + 1) / GUIDE.length})` }}
              />
            </div>

            {/* key={page} remounts the page so the page-turn animation replays */}
            <div className="tour-body tour-page" key={page}>
              <span className="tour-icon" aria-hidden="true">
                {GUIDE[page].icon}
              </span>
              <h2 id={titleId} ref={headingRef} tabIndex={-1} className="tour-title">
                {a.tr(GUIDE[page].title)}
              </h2>
              <p id={bodyId} className="tour-text">
                {a.tr(GUIDE[page].body)}
              </p>
              {a.voiceControl && (
                <p className="tour-voicehint">
                  <span aria-hidden="true">🎙️</span> {a.tr("tutorial.voiceHint")}
                </p>
              )}
            </div>

            <p className="tour-pagenum">
              {a.tr("guide.page")} {page + 1} / {GUIDE.length}
            </p>

            {/* Everyone can play the whole guide as a hands-free audio walkthrough. */}
            <button type="button" className="btn btn-ghost tour-audio-all" onClick={startAudio}>
              <span aria-hidden="true">🔊</span> {a.tr("tutorial.audioAll")}
            </button>

            <div className="tour-actions">
              <button type="button" className="btn btn-ghost" onClick={goBack}>
                <span aria-hidden="true">‹</span> {a.tr("back")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => a.speak(narration)}>
                <span aria-hidden="true">🔊</span> {a.tr("tutorial.repeat")}
              </button>
              {isLast ? (
                <button type="button" className="btn btn-primary" onClick={() => onClose()}>
                  {a.tr("tutorial.finish")}
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={goNext}>
                  {a.tr("next")} <span aria-hidden="true">›</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="tour-body">
              <span className="tour-icon" aria-hidden="true">
                🗳️
              </span>
              <h2 id={titleId} ref={headingRef} tabIndex={-1} className="tour-title">
                {a.tr("tutorial.s1.title")}
              </h2>
              <p id={bodyId} className="tour-text">
                {a.tr("tutorial.s1.body")}
              </p>
              {a.voiceControl && (
                <p className="tour-voicehint">
                  <span aria-hidden="true">🎙️</span> {a.tr("tutorial.voiceHint")}
                </p>
              )}
            </div>

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
              {/* Blind path: one tap enables blind mode (read-aloud + voice
                  control) and closes the tour — the visual guide is for sighted
                  users, so blind users are not walked through pages they can't
                  see; the voice assistant and read-aloud carry them onward. */}
              <button
                type="button"
                ref={blindBtnRef}
                className="btn btn-primary tour-blind"
                onClick={() => {
                  a.setProfile("blind");
                  onClose();
                }}
              >
                <span aria-hidden="true">🔊</span> {a.tr("tutorial.blindMode")}
              </button>
              <span className="tour-hint">{a.tr("tutorial.blindModeHint")}</span>
              <div className="tour-actions-row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => (onChooseProfile ?? onClose)()}
                >
                  <span aria-hidden="true">☰</span> {a.tr("tutorial.chooseProfile")}
                </button>
                {/* Sighted path: open the paginated process guide */}
                <button type="button" className="btn btn-ghost" onClick={startGuide}>
                  <span aria-hidden="true">▶</span> {a.tr("tutorial.start")}
                </button>
              </div>
            </div>
          </>
        )}

        <p className="tour-kbd">
          <span aria-hidden="true">⌨</span> {a.tr("tutorial.keyboard")}
        </p>
      </div>
    </div>
  );
}
