import { useEffect, useRef, useState } from "react";
import { useA11y } from "../context/AccessibilityContext";
import { voiceBridge } from "../lib/voiceBridge";

type Status = "idle" | "connecting" | "live" | "error";
const SESSION_MAX_MS = 600_000; // 10 min hard cap (cost control)
const CALLS_URL = "https://api.openai.com/v1/realtime/calls";

interface Line {
  role: "user" | "assistant";
  text: string;
}

export default function VoiceAgent() {
  const a = useA11y();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [needsUnlock, setNeedsUnlock] = useState(false); // autoplay blocked → user must tap

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const partial = useRef<{ user: string; assistant: string }>({ user: "", assistant: "" });

  // True when this session was opened from the first-visit welcome card: Vera
  // then asks the "are you blind / which impairment?" question and sets the
  // profile herself (set_profile tool) instead of the visual card doing it.
  const welcomeRef = useRef(false);
  // Set when Vera calls end_call: we wait for her goodbye audio to finish
  // playing (output_audio_buffer.stopped) before hanging up, with a timer as
  // safety net in case that event never arrives.
  const endPendingRef = useRef<number | null>(null);
  // Guards the race where a previous utterance's audio "stopped" event arrives
  // before the farewell even started: only close once farewell audio was heard.
  const farewellStartedRef = useRef(false);

  useEffect(() => () => hangup(), []); // cleanup on unmount

  // Imperative start from other components (welcome card). The event is
  // dispatched synchronously inside a click handler, so the browser still
  // treats mic + audio as user-gesture-initiated.
  const startRef = useRef<() => void>(() => {});
  startRef.current = start;
  useEffect(() => {
    const onStart = (e: Event) => {
      welcomeRef.current = !!(e as CustomEvent).detail?.welcome;
      if (!pcRef.current) startRef.current();
    };
    window.addEventListener("vera:start", onStart);
    return () => window.removeEventListener("vera:start", onStart);
  }, []);

  // Closing the panel no longer ends the session — the glowing FAB is the
  // on/off control and running indicator; the modal is just an optional view
  // (unlock button, transcript).
  useEffect(() => {
    if (!open) a.stopSpeak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close the centered modal with Escape (focus/keyboard users).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function pushFinal(role: "user" | "assistant", text: string) {
    const t = text.trim();
    if (!t) return;
    setLines((prev) => [...prev.slice(-8), { role, text: t }]);
  }

  function handleEvent(evt: any) {
    switch (evt.type) {
      // live captions (deltas) — accessibility for deaf/hard-of-hearing users
      case "response.output_audio_transcript.delta":
        if (endPendingRef.current !== null) farewellStartedRef.current = true;
        partial.current.assistant += evt.delta || "";
        break;
      case "response.output_audio_transcript.done":
        pushFinal("assistant", evt.transcript || partial.current.assistant);
        partial.current.assistant = "";
        break;
      case "conversation.item.input_audio_transcription.delta":
        partial.current.user += evt.delta || "";
        break;
      case "conversation.item.input_audio_transcription.completed":
        pushFinal("user", evt.transcript || partial.current.user);
        partial.current.user = "";
        break;
      // tool calls
      case "response.function_call_arguments.done":
        executeTool(evt.name, evt.call_id, evt.arguments);
        break;
      // Vera said goodbye and asked to end: close once her audio finished playing.
      case "output_audio_buffer.stopped":
        if (endPendingRef.current !== null && farewellStartedRef.current) endNow();
        break;
      case "error":
        console.error("[voice] realtime error", evt.error);
        break;
      default:
        break;
    }
  }

  function endNow() {
    if (endPendingRef.current !== null) {
      clearTimeout(endPendingRef.current);
      endPendingRef.current = null;
    }
    hangup();
    setOpen(false);
  }

  function executeTool(name: string, callId: string, argsJson: string) {
    let args: any = {};
    try {
      args = argsJson ? JSON.parse(argsJson) : {};
    } catch {
      /* ignore */
    }

    // end_call is handled here, not by the app bridge. Models often emit the
    // tool call without having spoken the goodbye yet — so we explicitly
    // request one final farewell response, wait for its audio to finish
    // (output_audio_buffer.stopped) and only then hang up. 15s timer covers
    // browsers that never emit the stopped event.
    if (name === "end_call") {
      const dc0 = dcRef.current;
      if (dc0 && dc0.readyState === "open") {
        dc0.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: { type: "function_call_output", call_id: callId, output: JSON.stringify({ ok: true }) },
          })
        );
        dc0.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Sprich JETZT deine kurze Verabschiedung passend zur Situation (falls die Stimmabgabe abgeschlossen ist: dass sie erfolgreich abgeschlossen ist, einen schönen Tag, alles Gute für die Schweiz; sonst ein kurzer Abschiedsgruss mit Hinweis auf das Mikrofon unten rechts). Rufe KEINE Werkzeuge mehr auf.",
            },
          })
        );
      }
      endPendingRef.current = window.setTimeout(endNow, 15_000);
      return;
    }

    const result = voiceBridge.run(name, args);
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) },
      })
    );
    dc.send(JSON.stringify({ type: "response.create" }));
  }

  async function start() {
    // Unlock audio output WHILE we still have the tap's user-gesture (critical on
    // mobile Chrome): resume an AudioContext and nudge the <audio> element now,
    // before any network await drops the gesture context.
    try {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        audioCtxRef.current = audioCtxRef.current || new AC();
        audioCtxRef.current.resume().catch(() => {});
      }
      audioRef.current?.play?.().catch(() => {});
    } catch {
      /* ignore */
    }

    // Vera takes over all audio: cut any running page read-aloud and suspend
    // TTS + browser voice commands for the whole session (see AccessibilityContext).
    a.stopSpeak();
    a.setVoiceSession(true);

    setError("");
    setLines([]);
    setStatus("connecting");
    // NOTE: the modal is deliberately NOT opened — Vera runs "invisibly", the
    // glowing FAB is the running indicator. The modal (transcript, unlock,
    // errors) still exists and auto-opens only when sound must be unlocked.
    try {
      // 1) ephemeral token from our backend
      const tr = await fetch("/api/realtime/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: a.lang }),
      });
      if (!tr.ok) {
        const j = await tr.json().catch(() => ({}));
        throw new Error(tr.status === 429 ? a.tr("voiceBusy") : j.error || "token_error");
      }
      const { value: ephemeral } = await tr.json();
      if (!ephemeral) throw new Error("no_token");

      // 2) mic
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;

      // 3) peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Remote model audio arrives here — attach to the <audio> and force playback.
      // Autoplay of audible media can be blocked; if so we surface an unlock button.
      const remote = new MediaStream();
      pc.ontrack = (e) => {
        (e.streams[0] ? e.streams[0].getTracks() : [e.track]).forEach((t) => remote.addTrack(t));
        const el = audioRef.current;
        if (!el) return;
        el.srcObject = remote;
        el.muted = false;
        el.volume = 1;
        el.play().then(
          () => setNeedsUnlock(false),
          () => {
            // Browser blocked autoplay: this is the one case where the modal
            // must appear — the unlock button lives there.
            setNeedsUnlock(true);
            setOpen(true);
          }
        );
      };
      // addTrack creates a sendrecv transceiver → we both send mic and receive model audio.
      mic.getTracks().forEach((tr2) => pc.addTrack(tr2, mic));

      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === "failed" || st === "disconnected") {
          setError(a.tr("voiceError"));
        }
      };

      // 4) data channel for events + tool calls
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try {
          handleEvent(JSON.parse(e.data));
        } catch {
          /* ignore */
        }
      };
      dc.onopen = () => {
        // greet + kick off the flow (first visit: Vera asks the profile question
        // herself and applies the answer via set_profile)
        const welcome = welcomeRef.current
          ? "Dies ist der ERSTE BESUCH dieser Person. Begrüsse sie kurz und warm auf Deutsch als Sprach-Assistentin Vera und stelle sofort die Begrüssungsfrage: Ist die Person blind oder sehbehindert, oder hat sie eine andere Einschränkung (Bewegung, Konzentration, Wunsch nach grosser Schrift)? Setze die Antwort mit set_profile um, bestätige kurz und führe dann zur Anmeldung."
          : "Begrüsse die Person kurz und warm auf Deutsch als Sprach-Assistentin Vera. " +
            "Sag, dass du beim Abstimmen hilfst. Rufe dann get_state auf und leite die Person durch den nächsten Schritt.";
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: { instructions: welcome },
          })
        );
        welcomeRef.current = false;
      };

      // 5) SDP offer -> OpenAI, apply answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch(CALLS_URL, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${ephemeral}`, "Content-Type": "application/sdp" },
      });
      if (!sdpRes.ok) throw new Error("webrtc_setup");
      const answer = { type: "answer" as const, sdp: await sdpRes.text() };
      await pc.setRemoteDescription(answer);

      setStatus("live");
      timerRef.current = window.setTimeout(() => hangup(true), SESSION_MAX_MS);
    } catch (e: any) {
      console.error("[voice] start failed", e);
      const msg =
        e?.name === "NotAllowedError"
          ? a.tr("voiceMicDenied")
          : e?.message === a.tr("voiceBusy")
          ? a.tr("voiceBusy")
          : a.tr("voiceError");
      setError(msg);
      setStatus("error");
      cleanup();
    }
  }

  function cleanup() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (endPendingRef.current !== null) {
      clearTimeout(endPendingRef.current);
      endPendingRef.current = null;
    }
    farewellStartedRef.current = false;
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.getSenders()?.forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    setNeedsUnlock(false);
    a.setVoiceSession(false); // hand audio back to read-aloud / voice commands
  }

  function hangup(capped = false) {
    cleanup();
    setStatus("idle");
    if (capped) setError(a.tr("voiceCapped"));
  }

  const live = status === "live";
  const connecting = status === "connecting";

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline />

      {/* Floating launcher */}
      <button
        type="button"
        className={"voice-fab" + (live ? " live" : connecting ? " connecting" : "")}
        aria-pressed={live || connecting}
        aria-label={a.tr("voiceAssistant")}
        // One tap starts the conversation (inside the tap's user gesture —
        // required for mic + audio autoplay); the FAB glows while Vera runs.
        // Tapping again hangs up. No popup by default.
        onClick={() => (live || connecting ? (setOpen(false), hangup()) : start())}
      >
        {/* Clean line-art mic (matches the orb glyph) instead of the emoji */}
        <svg
          className="voice-fab-mic"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="9" y="2.5" width="6" height="11" rx="3" />
          <path d="M6.5 11a5.5 5.5 0 0 0 11 0" />
          <line x1="12" y1="16.5" x2="12" y2="20.5" />
        </svg>
      </button>

      {open && (
        <div className="voice-backdrop" onClick={() => setOpen(false)}>
        <div
          className="voice-modal"
          role="dialog"
          aria-modal="true"
          aria-label={a.tr("voiceAssistant")}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="voice-panel-head">
            <span className={"voice-dot " + status} aria-hidden="true" />
            <strong>
              {connecting
                ? a.tr("voiceConnecting")
                : live
                ? a.tr("voiceListening")
                : a.tr("voiceAssistant")}
            </strong>
            <button type="button" className="voice-x" onClick={() => setOpen(false)} aria-label={a.tr("close")}>
              ✕
            </button>
          </div>

          {/* AI-input animation ("Listening & Thinking") — tap to start the live
              Realtime conversation with Vera (tap again to hang up). The video is
              decorative (the button carries the label); under reduced motion it
              stays on the still poster frame instead of auto-playing. */}
          <button
            type="button"
            className={"voice-orb-video " + status}
            onClick={() => (live || connecting ? hangup() : start())}
            aria-label={live || connecting ? a.tr("close") : a.tr("voiceTapToStart")}
          >
            <video
              className="voice-video"
              src="/voice-assistant.mp4"
              poster="/voice-assistant.webp"
              autoPlay={!a.reducedMotion}
              loop
              muted
              playsInline
              aria-hidden="true"
            />
          </button>

          {error ? (
            <p className="voice-error" role="alert">
              ⚠️ {error}
            </p>
          ) : (
            <p className="voice-hint">
              {live ? a.tr("voiceSpeakNow") : a.tr("voiceIntro")}
            </p>
          )}

          {needsUnlock && (
            <button
              type="button"
              className="btn btn-primary voice-unlock"
              onClick={() =>
                audioRef.current
                  ?.play()
                  .then(() => setNeedsUnlock(false))
                  .catch(() => {})
              }
            >
              🔊 {a.tr("voiceEnableSound")}
            </button>
          )}

          {/* Live captions kept for deaf / hard-of-hearing users, but only while
              there is speech — no empty box, so it feels like talking to the robot.
              Screen readers still get it via aria-live. */}
          {lines.length > 0 && (
            <div className="voice-captions" aria-live="polite" aria-label={a.tr("voiceTranscript")}>
              {lines.map((l, i) => (
                <p key={i} className={"vt-line vt-" + l.role}>
                  <span className="vt-who">{l.role === "user" ? "🗣️" : "🤖"}</span> {l.text}
                </p>
              ))}
            </div>
          )}

        </div>
        </div>
      )}
    </>
  );
}
