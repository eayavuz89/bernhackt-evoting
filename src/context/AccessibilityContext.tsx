import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Lang, t } from "../lib/i18n";
import { setEarconsMuted } from "../lib/earcons";

export type Profile = "standard" | "blind" | "motor" | "cognitive" | "senior";

interface A11yState {
  profile: Profile;
  lang: Lang;
  easy: boolean; // Leichte Sprache
  fontScale: number; // 1.0 = 100%
  contrast: "normal" | "high";
  reducedMotion: boolean;
  readAloud: boolean;
  soundCues: boolean; // earcons — audible feedback for each state change
  voiceControl: boolean; // hands-free speech commands (weiter/zurück/…)
  onboardingSeen: boolean;
  setProfile: (p: Profile) => void;
  setLang: (l: Lang) => void;
  setEasy: (b: boolean) => void;
  setFontScale: (n: number) => void;
  setContrast: (c: "normal" | "high") => void;
  setReadAloud: (b: boolean) => void;
  setSoundCues: (b: boolean) => void;
  setVoiceControl: (b: boolean) => void;
  setOnboardingSeen: (b: boolean) => void;
  tr: (key: string) => string;
  speak: (text: string) => void;
  stopSpeak: () => void;
}

const Ctx = createContext<A11yState | null>(null);

// Sensible defaults each profile applies when selected.
const PROFILE_DEFAULTS: Record<Profile, Partial<A11yState>> = {
  standard: { fontScale: 1.0, contrast: "normal", easy: false, readAloud: false, soundCues: false, voiceControl: false },
  blind: { fontScale: 1.15, contrast: "high", easy: false, readAloud: true, soundCues: true, voiceControl: true },
  motor: { fontScale: 1.25, contrast: "normal", easy: false, readAloud: false, soundCues: true, voiceControl: false },
  cognitive: { fontScale: 1.2, contrast: "normal", easy: true, readAloud: true, soundCues: true, voiceControl: false },
  senior: { fontScale: 1.4, contrast: "high", easy: false, readAloud: false, soundCues: false, voiceControl: false },
};

const LANG_VOICE: Record<Lang, string> = { de: "de-CH", fr: "fr-CH", it: "it-CH", en: "en-GB" };

// Persisted accessibility preferences — restored on reload / direct link so a
// user who needs high contrast or large text never loses it. reducedMotion is
// intentionally NOT stored (it always follows the live OS setting).
const STORAGE_KEY = "stimmzugang:a11y";

interface PersistedA11y {
  profile: Profile;
  lang: Lang;
  easy: boolean;
  fontScale: number;
  contrast: "normal" | "high";
  readAloud: boolean;
  soundCues: boolean;
  voiceControl: boolean;
  onboardingSeen: boolean;
}

function loadPersisted(): Partial<PersistedA11y> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedA11y>) : {};
  } catch {
    return {}; // corrupt value or storage blocked (private mode) — fall back to defaults
  }
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const prefersReduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Restore saved preferences once (falls back to defaults when nothing stored).
  const saved = useMemo(loadPersisted, []);

  const [profile, setProfileRaw] = useState<Profile>(saved.profile ?? "standard");
  const [lang, setLang] = useState<Lang>(saved.lang ?? "de");
  const [easy, setEasy] = useState(saved.easy ?? false);
  const [fontScale, setFontScale] = useState(saved.fontScale ?? 1.0);
  const [contrast, setContrast] = useState<"normal" | "high">(saved.contrast ?? "normal");
  const [reducedMotion] = useState<boolean>(prefersReduced);
  const [readAloud, setReadAloud] = useState(saved.readAloud ?? false);
  const [soundCues, setSoundCues] = useState(saved.soundCues ?? false);
  const [voiceControl, setVoiceControl] = useState(saved.voiceControl ?? false);
  // First-open onboarding flag — once the welcome tour is dismissed it never
  // auto-opens again (users re-open it from the accessibility menu).
  const [onboardingSeen, setOnboardingSeen] = useState(saved.onboardingSeen ?? false);

  const setProfile = useCallback((p: Profile) => {
    setProfileRaw(p);
    const d = PROFILE_DEFAULTS[p];
    if (d.fontScale !== undefined) setFontScale(d.fontScale);
    if (d.contrast !== undefined) setContrast(d.contrast);
    if (d.easy !== undefined) setEasy(d.easy);
    if (d.readAloud !== undefined) setReadAloud(d.readAloud);
    if (d.soundCues !== undefined) setSoundCues(d.soundCues);
    if (d.voiceControl !== undefined) setVoiceControl(d.voiceControl);
  }, []);

  // Keep the earcon module's mute flag in sync with the soundCues preference.
  useEffect(() => {
    setEarconsMuted(!soundCues);
  }, [soundCues]);

  // Reflect state onto <html> so CSS can respond. Runs on mount too, so
  // restored contrast / profile / text-size apply immediately on load.
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-profile", profile);
    el.setAttribute("data-contrast", contrast);
    el.setAttribute("data-reduced-motion", String(reducedMotion));
    el.setAttribute("lang", lang);
    el.style.setProperty("--font-scale", String(fontScale));
  }, [profile, contrast, reducedMotion, lang, fontScale]);

  // Persist preferences whenever they change (reducedMotion excluded — OS-driven).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ profile, lang, easy, fontScale, contrast, readAloud, soundCues, voiceControl, onboardingSeen })
      );
    } catch {
      /* storage full or blocked — non-fatal, preferences just won't persist */
    }
  }, [profile, lang, easy, fontScale, contrast, readAloud, soundCues, voiceControl, onboardingSeen]);

  const tr = useCallback((key: string) => t(key, lang, easy), [lang, easy]);

  const stopSpeak = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LANG_VOICE[lang];
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    },
    [lang]
  );

  const value = useMemo<A11yState>(
    () => ({
      profile,
      lang,
      easy,
      fontScale,
      contrast,
      reducedMotion,
      readAloud,
      soundCues,
      voiceControl,
      onboardingSeen,
      setProfile,
      setLang,
      setEasy,
      setFontScale,
      setContrast,
      setReadAloud,
      setSoundCues,
      setVoiceControl,
      setOnboardingSeen,
      tr,
      speak,
      stopSpeak,
    }),
    [profile, lang, easy, fontScale, contrast, reducedMotion, readAloud, soundCues, voiceControl, onboardingSeen, setProfile, tr, speak, stopSpeak]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useA11y() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useA11y must be used within AccessibilityProvider");
  return c;
}
