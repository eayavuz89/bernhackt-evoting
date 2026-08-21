import { useNavigate, Link } from "react-router-dom";
import { useA11y, Profile } from "../AccessibilityContext";
import Screen from "../components/Screen";

const CARDS: { p: Profile; icon: string }[] = [
  { p: "standard", icon: "🙂" },
  { p: "blind", icon: "👁️" },
  { p: "motor", icon: "✋" },
  { p: "cognitive", icon: "🧩" },
  { p: "senior", icon: "🔍" },
];

export default function ProfileSelect() {
  const a = useA11y();
  const nav = useNavigate();

  return (
    <Screen title={a.tr("chooseProfile")} help={a.tr("chooseProfileHelp")}>
      <p className="tagline">{a.tr("tagline")}</p>

      <ul className="profile-grid" role="list">
        {CARDS.map(({ p, icon }) => (
          <li key={p}>
            <button
              type="button"
              className={"profile-card" + (a.profile === p ? " selected" : "")}
              aria-pressed={a.profile === p}
              onClick={() => a.setProfile(p)}
            >
              <span className="profile-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="profile-name">{a.tr("profile." + p)}</span>
              <span className="profile-desc">{a.tr("profile." + p + ".desc")}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => nav("/login")}>
          {a.tr("start")} →
        </button>
        <Link className="btn btn-ghost" to="/card">
          {a.tr("openCard")}
        </Link>
      </div>
    </Screen>
  );
}
