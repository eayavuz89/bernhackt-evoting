import { useState, useEffect, useRef } from "react";
import { useA11y, Profile } from "../AccessibilityContext";
import { LANGS, Lang } from "../i18n";
import Dropdown from "./Dropdown";

const PROFILES: Profile[] = ["standard", "blind", "motor", "cognitive", "senior"];

// Clean header (brand + one labelled trigger) that opens the accessibility
// controls as a disclosure menu. Semantics: a button with aria-expanded/-controls
// toggling a role="group" panel (NOT role="menu" — the panel holds form controls,
// not command menuitems). Escape + outside-click close; focus moves into the
// panel on open and returns to the trigger on Escape.
export default function Toolbar() {
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
          <span className="brand-mark" aria-hidden="true" />
          {a.tr("appName")}
        </span>

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
              <span className="ctl-label">{a.tr("textSize")}</span>
              <div className="btn-row">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => a.setFontScale(Math.max(0.9, +(a.fontScale - 0.1).toFixed(2)))}
                  aria-label={a.tr("smaller")}
                >
                  A−
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => a.setFontScale(Math.min(2.0, +(a.fontScale + 0.1).toFixed(2)))}
                  aria-label={a.tr("bigger")}
                >
                  A+
                </button>
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
          </div>
        </div>
      </div>
    </header>
  );
}
