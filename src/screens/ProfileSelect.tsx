import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useA11y, Profile } from "../context/AccessibilityContext";
import Screen from "../components/Screen";
import { PROFILE_ICONS } from "../components/ProfileIcons";
import PracticeMode from "../components/PracticeMode";

const CARDS: Profile[] = ["standard", "blind", "motor", "cognitive", "senior"];

export default function ProfileSelect() {
  const a = useA11y();
  const nav = useNavigate();
  const [practiceOpen, setPracticeOpen] = useState(false);

  return (
    <>
      {/* Decorative Swiss-landscape wash — home screen only, purely decorative. */}
      <div className="home-bg" aria-hidden="true" />
      <Screen title={a.tr("chooseProfile")} help={a.tr("chooseProfileHelp")} eyebrow={a.tr("appName")}>
        <p className="tagline">{a.tr("tagline")}</p>

        <ul className="profile-grid" role="list">
        {CARDS.map((p) => (
          <li key={p}>
            <button
              type="button"
              className={"profile-card" + (a.profile === p ? " selected" : "")}
              aria-pressed={a.profile === p}
              onClick={() => a.setProfile(p)}
            >
              <span className="profile-icon" aria-hidden="true">
                {PROFILE_ICONS[p]}
              </span>
              <span className="profile-name">{a.tr("profile." + p)}</span>
              <span className="profile-desc">{a.tr("profile." + p + ".desc")}</span>
            </button>
          </li>
        ))}
      </ul>

        <div className="actions actions-cta">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => nav("/login")}>
            {a.tr("start")} →
          </button>
          <Link className="btn btn-ghost btn-lg" to="/card">
            {a.tr("openCard")}
          </Link>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => setPracticeOpen(true)}>
            <span aria-hidden="true">🎯</span> {a.tr("practice.open")}
          </button>
        </div>
      </Screen>
      {practiceOpen && <PracticeMode onClose={() => setPracticeOpen(false)} />}
    </>
  );
}
