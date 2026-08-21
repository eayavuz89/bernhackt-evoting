import { useA11y, Profile } from "../AccessibilityContext";
import { LANGS, Lang } from "../i18n";

const PROFILES: Profile[] = ["standard", "blind", "motor", "cognitive", "senior"];

export default function Toolbar() {
  const a = useA11y();

  return (
    <header className="toolbar" role="banner">
      <div className="toolbar-inner">
        <span className="brand" aria-hidden="true">
          🗳️ {a.tr("appName")}
        </span>

        <div className="toolbar-controls" role="group" aria-label={a.tr("a11ySettings")}>
          <label className="ctl">
            <span className="ctl-label">{a.tr("profile")}</span>
            <select
              value={a.profile}
              onChange={(e) => a.setProfile(e.target.value as Profile)}
              aria-label={a.tr("profile")}
            >
              {PROFILES.map((p) => (
                <option key={p} value={p}>
                  {a.tr("profile." + p)}
                </option>
              ))}
            </select>
          </label>

          <label className="ctl">
            <span className="ctl-label">{a.tr("language")}</span>
            <select
              value={a.lang}
              onChange={(e) => a.setLang(e.target.value as Lang)}
              aria-label={a.tr("language")}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

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
            🔊 {a.readAloud ? a.tr("readAloudOn") : a.tr("readAloudOff")}
          </button>
        </div>
      </div>
    </header>
  );
}
