import { useState, useEffect, useRef } from "react";
import { useA11y, Profile, A11Y_STORAGE_KEY } from "../context/AccessibilityContext";
import { LANGS, Lang } from "../lib/i18n";
import Dropdown from "./Dropdown";

const PROFILES: Profile[] = ["standard", "blind", "motor", "cognitive", "senior"];

// Text size is a 3-step control (not an open-ended A−/A+ stepper). The top step
// is deliberately capped at 1.3 so enlarging the text can never grow so much
// that primary actions get pushed off a non-scrolling layout — the issue a
// tester hit when the old stepper allowed up to 2.0×. The rising "A" glyph size
// signals each step visually. Values mirror the profile presets' ceiling.
const TEXT_STEPS = [
  { scale: 1.0, labelKey: "textNormal", glyph: "1rem" },
  { scale: 1.15, labelKey: "textLarge", glyph: "1.25rem" },
  { scale: 1.3, labelKey: "textXLarge", glyph: "1.55rem" },
] as const;

// Highlight the step nearest the active font scale, so a profile whose preset
// sits between steps (e.g. motor 1.25) still shows one step as selected.
const nearestTextScale = (fs: number) =>
  TEXT_STEPS.reduce(
    (best, s) => (Math.abs(s.scale - fs) < Math.abs(best - fs) ? s.scale : best),
    TEXT_STEPS[0].scale
  );

// Clean header (brand + one labelled trigger) that opens the accessibility
// controls as a disclosure menu. Semantics: a button with aria-expanded/-controls
// toggling a role="group" panel (NOT role="menu" — the panel holds form controls,
// not command menuitems). Escape + outside-click close; focus moves into the
// panel on open and returns to the trigger on Escape.
export default function Toolbar({ onOpenTutorial }: { onOpenTutorial: () => void }) {
  const a = useA11y();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    btnRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Move focus into the panel (first setting) for keyboard & switch users.
    menuRef.current?.querySelector<HTMLElement>(".dd-trigger")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="toolbar" role="banner">
      <div className="toolbar-inner">
        <span className="brand">
          <img className="brand-logo" src="/logo.png" alt={a.tr("appName")} />
        </span>

        {/* Full restart: wipe the persisted preferences and hard-reload to "/",
            so the first-visit questions (profile onboarding) run again and any
            in-memory vote state is gone — a shared/demo device starts pristine. */}
        <button
          type="button"
          className="restart-btn"
          onClick={() => {
            try {
              window.localStorage.removeItem(A11Y_STORAGE_KEY);
            } catch {
              /* storage blocked — reload still resets the in-memory state */
            }
            window.location.href = "/";
          }}
        >
          <span aria-hidden="true">↺</span> {a.tr("startOver")}
        </button>

        <div className="a11y-wrap" ref={wrapRef}>
          <button
            type="button"
            ref={btnRef}
            className={"a11y-trigger" + (open ? " open" : "")}
            aria-haspopup="true"
            aria-expanded={open}
            aria-controls="a11y-menu"
            aria-label={a.tr("a11ySettings")}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="a11y-trigger-icon" aria-hidden="true">☰</span>
            <span className="a11y-trigger-text">{a.tr("a11ySettings")}</span>
            <span className="a11y-caret" aria-hidden="true" />
          </button>

          <div
            id="a11y-menu"
            ref={menuRef}
            className="a11y-menu"
            role="group"
            aria-label={a.tr("a11ySettings")}
            hidden={!open}
          >
            <div className="a11y-menu-head">
              <span>{a.tr("a11ySettings")}</span>
              <button
                type="button"
                className="a11y-close"
                onClick={close}
                aria-label={a.tr("close")}
              >
                ✕
              </button>
            </div>

            <div className="ctl">
              <span className="ctl-label" id="ctl-profile">
                {a.tr("profile")}
              </span>
              <Dropdown
                value={a.profile}
                onChange={(v) => a.setProfile(v as Profile)}
                labelId="ctl-profile"
                autoFocus
                options={PROFILES.map((p) => ({ value: p, label: a.tr("profile." + p) }))}
              />
            </div>

            <div className="ctl">
              <span className="ctl-label" id="ctl-language">
                {a.tr("language")}
              </span>
              <Dropdown
                value={a.lang}
                onChange={(v) => a.setLang(v as Lang)}
                labelId="ctl-language"
                options={LANGS.map((l) => ({ value: l.code, label: l.label }))}
              />
            </div>

            <div className="ctl">
              <span className="ctl-label" id="ctl-textsize">{a.tr("textSize")}</span>
              <div className="text-size-steps" role="group" aria-labelledby="ctl-textsize">
                {TEXT_STEPS.map((step) => {
                  const active = nearestTextScale(a.fontScale) === step.scale;
                  return (
                    <button
                      key={step.scale}
                      type="button"
                      className={"text-size-step" + (active ? " is-active" : "")}
                      aria-pressed={active}
                      aria-label={a.tr(step.labelKey)}
                      onClick={() => a.setFontScale(step.scale)}
                    >
                      <span aria-hidden="true" style={{ fontSize: step.glyph }}>A</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="a11y-menu-sep" />

            <button
              type="button"
              className="toggle"
              aria-pressed={a.contrast === "high"}
              onClick={() => a.setContrast(a.contrast === "high" ? "normal" : "high")}
            >
              {a.tr("contrast")}: {a.contrast === "high" ? a.tr("on") : a.tr("off")}
            </button>

            <button
              type="button"
              className="toggle"
              aria-pressed={a.easy}
              onClick={() => a.setEasy(!a.easy)}
              disabled={a.lang !== "de"}
              title={a.lang !== "de" ? "Nur Deutsch / German only" : undefined}
            >
              {a.tr("easyLanguage")}: {a.easy ? a.tr("on") : a.tr("off")}
            </button>

            <button
              type="button"
              className="toggle"
              aria-pressed={a.readAloud}
              onClick={() => {
                const next = !a.readAloud;
                a.setReadAloud(next);
                if (!next) a.stopSpeak();
              }}
            >
              <span aria-hidden="true">🔊</span> {a.readAloud ? a.tr("readAloudOn") : a.tr("readAloudOff")}
            </button>

            <button
              type="button"
              className="toggle"
              aria-pressed={a.soundCues}
              onClick={() => a.setSoundCues(!a.soundCues)}
            >
              <span aria-hidden="true">🎵</span> {a.soundCues ? a.tr("soundCuesOn") : a.tr("soundCuesOff")}
            </button>

            <button
              type="button"
              className="toggle"
              aria-pressed={a.voiceControl}
              onClick={() => a.setVoiceControl(!a.voiceControl)}
            >
              <span aria-hidden="true">🎙️</span> {a.voiceControl ? a.tr("voiceControlOn") : a.tr("voiceControlOff")}
            </button>

            <hr className="a11y-menu-sep" />

            <button
              type="button"
              className="toggle"
              onClick={() => {
                onOpenTutorial();
                close();
              }}
            >
              <span aria-hidden="true">▶</span> {a.tr("tutorial.reopen")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
