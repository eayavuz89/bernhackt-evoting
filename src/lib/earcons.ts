// Earcons — short synthesized audio cues (Web Audio API, no files, no backend).
// Blind-first: each visual state change (step, choice, success, error) also gets
// an audible signal, so a user who can't see the screen still gets feedback.
// A global mute lets anyone who doesn't want sound silence them.

export type EarconName = "step" | "select" | "success" | "error" | "open" | "close";

let ctx: AudioContext | null = null;
let muted = false;

export function setEarconsMuted(m: boolean): void {
  muted = m;
}

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  // Browsers start the context "suspended" until a user gesture — resume on use.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// One tone with a soft attack + exponential release (no clicks).
function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  gain = 0.12,
  type: OscillatorType = "sine"
): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

// Distinct, recognisable patterns per cue (rising = good, falling = wrong).
const PATTERNS: Record<EarconName, (c: AudioContext) => void> = {
  step: (c) => tone(c, 620, 0, 0.14),
  select: (c) => {
    tone(c, 540, 0, 0.09);
    tone(c, 760, 0.08, 0.11);
  },
  success: (c) => {
    tone(c, 523.25, 0, 0.12); // C5
    tone(c, 659.25, 0.1, 0.12); // E5
    tone(c, 783.99, 0.2, 0.2); // G5
  },
  error: (c) => {
    tone(c, 300, 0, 0.18, 0.13, "triangle");
    tone(c, 216, 0.13, 0.26, 0.13, "triangle");
  },
  open: (c) => {
    tone(c, 440, 0, 0.1);
    tone(c, 660, 0.08, 0.14);
  },
  close: (c) => {
    tone(c, 520, 0, 0.1);
    tone(c, 360, 0.08, 0.14);
  },
};

export function playEarcon(name: EarconName): void {
  if (muted) return;
  const c = audioCtx();
  if (!c) return;
  try {
    PATTERNS[name](c);
  } catch {
    /* audio not available — non-fatal */
  }
}
