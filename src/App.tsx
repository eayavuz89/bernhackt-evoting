import { useState, useEffect, useRef } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Toolbar from "./components/Toolbar";
import VoiceAgent from "./components/VoiceAgent";
import OnboardingTour from "./components/OnboardingTour";
import { useA11y, Profile } from "./context/AccessibilityContext";
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

// Smooth-scroll the ballot page to a proposal card. Delayed a tick so it also
// works right after a navigate() while the ballot is still mounting.
function scrollToProposal(n: number) {
  setTimeout(() => {
    document
      .querySelector(`[data-proposal="${n}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 200);
}

export default function App() {
  const a = useA11y();
  const location = useLocation();
  const navigate = useNavigate();
  // Demo: proposal 3 arrives pre-answered — Vera announces she skips it for
  // time and only walks through proposals 1 and 2.
  const [answers, setAnswers] = useState<Record<string, Answer>>({ [PROPOSALS[2].id]: "yes" });
  // Visual tour no longer auto-opens: on first visit Vera greets directly
  // (below). Still re-openable from the a11y menu.
  const [tourOpen, setTourOpen] = useState(false);

  // First visit: no page TTS, no welcome card — start a live Vera session in
  // welcome mode. She asks "blind, or which impairment?" by voice, applies the
  // answer via set_profile and routes onward to the login step. If the mic/audio
  // is declined the person simply lands on the profile-select home page.
  useEffect(() => {
    if (a.onboardingSeen || location.pathname === "/card") return;
    a.setOnboardingSeen(true);
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("vera:start", { detail: { welcome: true } }));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refs so voice-agent tool calls always read the latest state.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  // When the login page was entered — used to guarantee it stays visible a
  // minimum time even if Vera's go_to("ballot") tool call arrives early (the
  // Realtime API emits tool calls faster than the audio actually plays).
  const loginAtRef = useRef(0);
  useEffect(() => {
    if (location.pathname === "/login") loginAtRef.current = Date.now();
  }, [location.pathname]);

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
      // Vera's welcome question ("are you blind, or …?") lands here: apply the
      // matching accessibility profile and dismiss the visual tour — the voice
      // conversation replaces it.
      setProfile: (profile) => {
        const valid = ["standard", "blind", "motor", "cognitive", "senior"];
        if (!valid.includes(profile)) return { error: "bad_profile", profile };
        a.setProfile(profile as Profile);
        a.setOnboardingSeen(true);
        setTourOpen(false);
        return { ok: true, profile };
      },
      setAnswer: (proposal, choice) => {
        const p = PROPOSALS[proposal - 1];
        if (!p) return { error: "no_such_proposal", proposal };
        if (!["yes", "no", "blank"].includes(choice)) return { error: "bad_choice", choice };
        setAnswers((prev) => ({ ...prev, [p.id]: choice }));
        if (pathRef.current !== "/ballot") navigate("/ballot");
        scrollToProposal(proposal);
        return { ok: true, proposal, choice, title: p.title[a.lang] };
      },
      // Vera calls this right before reading a proposal aloud, so the page
      // scrolls along with her voice.
      focusProposal: (proposal) => {
        if (!PROPOSALS[proposal - 1]) return { error: "no_such_proposal", proposal };
        if (pathRef.current !== "/ballot") navigate("/ballot");
        scrollToProposal(proposal);
        return { ok: true, proposal };
      },
      goTo: (to) => {
        const cur = STEP_ORDER.indexOf(pathRef.current);
        let target = to;
        if (to === "next") target = STEP_ORDER[Math.min(STEP_ORDER.length - 1, (cur < 0 ? 0 : cur) + 1)].slice(1);
        if (to === "back") target = STEP_ORDER[Math.max(0, (cur < 0 ? 0 : cur) - 1)].slice(1);
        const valid = ["login", "ballot", "verify", "confirm", "done"];
        if (!valid.includes(target)) return { error: "bad_target", to };
        // Demo pacing: keep the login page on screen ≥5s so viewers see it —
        // Vera keeps talking meanwhile, the page follows when the time is up.
        if (target === "ballot" && pathRef.current === "/login") {
          const wait = Math.max(0, 5000 - (Date.now() - loginAtRef.current));
          if (wait > 0) {
            setTimeout(() => navigate("/ballot"), wait);
            return { ok: true, step: target, note: "login_shown_5s_then_ballot" };
          }
        }
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
      {!isCard && <Toolbar onOpenTutorial={() => setTourOpen(true)} />}
      <main
        id="main"
        className={isCard ? "main main-card" : location.pathname === "/" ? "main main-home" : "main"}
        tabIndex={-1}
      >
        <Routes>
          <Route path="/" element={<ProfileSelect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/ballot" element={<Ballot session={session} />} />
          <Route path="/verify" element={<Verify session={session} />} />
          <Route path="/confirm" element={<Confirm session={session} />} />
          <Route path="/done" element={<Done />} />
          <Route path="/card" element={<VotingCard />} />
        </Routes>
      </main>
      {!isCard && tourOpen && (
        <OnboardingTour
          firstRun={!a.onboardingSeen}
          onClose={() => {
            setTourOpen(false);
            a.setOnboardingSeen(true);
            a.stopSpeak();
          }}
          onChooseProfile={() => {
            // "Otherwise choose your profile": close the tour and move focus to the
            // profile cards on the home screen so the user picks their mode there.
            setTourOpen(false);
            a.setOnboardingSeen(true);
            a.stopSpeak();
            requestAnimationFrame(() =>
              document.querySelector<HTMLElement>(".profile-card")?.focus()
            );
          }}
        />
      )}
      {!isCard && <VoiceAgent />}
    </>
  );
}
