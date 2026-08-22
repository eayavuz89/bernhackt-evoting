import { useState, useEffect, useRef } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Toolbar from "./components/Toolbar";
import VoiceAgent from "./components/VoiceAgent";
import { useA11y } from "./context/AccessibilityContext";
import ProfileSelect from "./screens/ProfileSelect";
import Login from "./screens/Login";
import Ballot from "./screens/Ballot";
import Verify from "./screens/Verify";
import Confirm from "./screens/Confirm";
import Done from "./screens/Done";
import VotingCard from "./screens/VotingCard";
import { Answer, PROPOSALS, CARD } from "./lib/data";
import { voiceBridge } from "./lib/voiceBridge";
import type { Session } from "./lib/types";

const STEP_ORDER = ["/login", "/ballot", "/verify", "/confirm", "/done"];

export default function App() {
  const a = useA11y();
  const location = useLocation();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  // Refs so voice-agent tool calls always read the latest state.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  const session: Session = {
    answers,
    setAnswer: (id, ans) => setAnswers((prev) => ({ ...prev, [id]: ans })),
    reset: () => setAnswers({}),
  };

  // Register the bridge the voice agent uses to drive the UI by voice.
  useEffect(() => {
    const stepName = (p: string) => p.replace("/", "") || "start";
    voiceBridge.register({
      getState: () => ({
        step: stepName(pathRef.current),
        lang: a.lang,
        proposals: PROPOSALS.map((p, i) => ({
          n: i + 1,
          title: p.title[a.lang],
          question: p.text[a.lang],
          answer: answersRef.current[p.id] || null,
        })),
        allAnswered: PROPOSALS.every((p) => answersRef.current[p.id]),
      }),
      setAnswer: (proposal, choice) => {
        const p = PROPOSALS[proposal - 1];
        if (!p) return { error: "no_such_proposal", proposal };
        if (!["yes", "no", "blank"].includes(choice)) return { error: "bad_choice", choice };
        setAnswers((prev) => ({ ...prev, [p.id]: choice }));
        if (pathRef.current !== "/ballot") navigate("/ballot");
        return { ok: true, proposal, choice, title: p.title[a.lang] };
      },
      goTo: (to) => {
        const cur = STEP_ORDER.indexOf(pathRef.current);
        let target = to;
        if (to === "next") target = STEP_ORDER[Math.min(STEP_ORDER.length - 1, (cur < 0 ? 0 : cur) + 1)].slice(1);
        if (to === "back") target = STEP_ORDER[Math.max(0, (cur < 0 ? 0 : cur) - 1)].slice(1);
        const valid = ["login", "ballot", "verify", "confirm", "done"];
        if (!valid.includes(target)) return { error: "bad_target", to };
        navigate("/" + target);
        return { ok: true, step: target };
      },
      readCodes: () => ({
        codes: PROPOSALS.map((p, i) => {
          const ans = answersRef.current[p.id];
          return { n: i + 1, title: p.title[a.lang], answer: ans || null, code: ans ? p.codes[ans] : null };
        }),
        hint: "Vergleiche jeden Code mit dem Stimmrechtsausweis.",
      }),
      castVote: () => {
        if (!PROPOSALS.every((p) => answersRef.current[p.id]))
          return { error: "not_all_answered" };
        navigate("/done");
        return { ok: true, finalizeCode: CARD.finalizeCode };
      },
    });
  }, [a.lang, navigate]);

  const isCard = location.pathname === "/card";

  return (
    <>
      <a className="skip-link" href="#main">
        {a.tr("skipToMain")}
      </a>
      {!isCard && <Toolbar />}
      <main id="main" className={isCard ? "main main-card" : "main"} tabIndex={-1}>
        <Routes>
          <Route path="/" element={<ProfileSelect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/ballot" element={<Ballot session={session} />} />
          <Route path="/verify" element={<Verify session={session} />} />
          <Route path="/confirm" element={<Confirm session={session} />} />
          <Route path="/done" element={<Done session={session} />} />
          <Route path="/card" element={<VotingCard />} />
        </Routes>
      </main>
      {!isCard && <VoiceAgent />}
    </>
  );
}
