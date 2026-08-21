import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useA11y } from "../AccessibilityContext";
import Screen from "../components/Screen";
import { PROPOSALS, Answer } from "../data";
import type { Session } from "../App";

const OPTIONS: Answer[] = ["yes", "no", "blank"];

export default function Ballot({ session }: { session: Session }) {
  const a = useA11y();
  const nav = useNavigate();
  const [error, setError] = useState("");

  const proceed = () => {
    const unanswered = PROPOSALS.filter((p) => !session.answers[p.id]);
    if (unanswered.length) {
      setError(a.tr("mustAnswerAll"));
      return;
    }
    setError("");
    nav("/verify");
  };

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
        <button type="button" className="btn btn-primary btn-lg" onClick={proceed}>
          {a.tr("reviewVotes")} →
        </button>
        <Link className="btn btn-ghost" to="/login">
          ← {a.tr("back")}
        </Link>
      </div>
    </Screen>
  );
}
