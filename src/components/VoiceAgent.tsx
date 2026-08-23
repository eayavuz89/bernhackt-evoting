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
  const [greeting, setGreeting] = useState(false); // demo: TTS welcome after tapping the orb

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const greetTimerRef = useRef<number | null>(null);
  const partial = useRef<{ user: string; assistant: string }>({ user: "", assistant: "" });

  useEffect(
    () => () => {
      hangup();
      if (greetTimerRef.current) clearTimeout(greetTimerRef.current);
    },
    []
  ); // cleanup on unmount

  // Tap the orb → after a ~1s beat the assistant greets by voice (browser TTS).
  // Deterministic demo greeting; a live OpenAI realtime conversation still needs
  // the backend token + key (that path lives in start(), untouched here).
  function greet() {
    if (greetTimerRef.current) clearTimeout(greetTimerRef.current);
    a.stopSpeak();
    setError("");
    setGreeting(true);
    greetTimerRef.current = window.setTimeout(() => {
      a.speak(a.tr("voiceGreeting"), () => setGreeting(false));
    }, 1000);
  }

  // Closing the panel stops the greeting (pending timer + any speech).
  useEffect(() => {
    if (open) return;
    if (greetTimerRef.current) clearTimeout(greetTimerRef.current);
    a.stopSpeak();
    setGreeting(false);
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
      case "error":
        console.error("[voice] realtime error", evt.error);
        break;
      default:
        break;
    }
  }

  function executeTool(name: string, callId: string, argsJson: string) {
    let args: any = {};
    try {
      args = argsJson ? JSON.parse(argsJson) : {};
    } catch {
      /* ignore */
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

    setError("");
    setLines([]);
    setStatus("connecting");
    setOpen(true);
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
          () => setNeedsUnlock(true) // browser blocked autoplay → show "enable sound"
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
        // greet + kick off the flow
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Begrüsse die Person kurz und warm auf Deutsch als Sprach-Assistentin Vera. " +
                "Sag, dass du beim Abstimmen hilfst. Rufe dann get_state auf und leite die Person durch den nächsten Schritt.",
            },
          })
        );
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
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.getSenders()?.forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    setNeedsUnlock(false);
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
        className={"voice-fab" + (live ? " live" : "")}
        aria-expanded={open}
        aria-label={a.tr("voiceAssistant")}
        onClick={() => setOpen((o) => !o)}
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
            <span className={"voice-dot " + (greeting ? "live" : status)} aria-hidden="true" />
            <strong>
              {connecting
                ? a.tr("voiceConnecting")
                : live || greeting
                ? a.tr("voiceListening")
                : a.tr("voiceAssistant")}
            </strong>
            <button type="button" className="voice-x" onClick={() => setOpen(false)} aria-label={a.tr("close")}>
              ✕
            </button>
          </div>

          {/* AI-input animation ("Listening & Thinking") — tap to have the
              assistant greet you by voice. The video is decorative (the button
              carries the label); under reduced motion it stays on the still poster
              frame instead of auto-playing. */}
          <button
            type="button"
            className={"voice-orb-video " + (greeting ? "live" : status)}
            onClick={greet}
            aria-label={a.tr("voiceTapToStart")}
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
              {greeting ? a.tr("voiceGreeting") : live ? a.tr("voiceSpeakNow") : a.tr("voiceIntro")}
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
