import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Lang, t } from "./i18n";

export type Profile = "standard" | "blind" | "motor" | "cognitive" | "senior";

interface A11yState {
  profile: Profile;
  lang: Lang;
  easy: boolean; // Leichte Sprache
  fontScale: number; // 1.0 = 100%
  contrast: "normal" | "high";
  reducedMotion: boolean;
  readAloud: boolean;
  setProfile: (p: Profile) => void;
  setLang: (l: Lang) => void;
  setEasy: (b: boolean) => void;
  setFontScale: (n: number) => void;
  setContrast: (c: "normal" | "high") => void;
  setReadAloud: (b: boolean) => void;
  tr: (key: string) => string;
  speak: (text: string) => void;
  stopSpeak: () => void;
}

const Ctx = createContext<A11yState | null>(null);

// Sensible defaults each profile applies when selected.
const PROFILE_DEFAULTS: Record<Profile, Partial<A11yState>> = {
  standard: { fontScale: 1.0, contrast: "normal", easy: false, readAloud: false },
  blind: { fontScale: 1.15, contrast: "high", easy: false, readAloud: true },
  motor: { fontScale: 1.25, contrast: "normal", easy: false, readAloud: false },
  cognitive: { fontScale: 1.2, contrast: "normal", easy: true, readAloud: true },
  senior: { fontScale: 1.4, contrast: "high", easy: false, readAloud: false },
};

const LANG_VOICE: Record<Lang, string> = { de: "de-CH", fr: "fr-CH", it: "it-CH", en: "en-GB" };

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const prefersReduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [profile, setProfileRaw] = useState<Profile>("standard");
  const [lang, setLang] = useState<Lang>("de");
  const [easy, setEasy] = useState(false);
  const [fontScale, setFontScale] = useState(1.0);
  const [contrast, setContrast] = useState<"normal" | "high">("normal");
  const [reducedMotion] = useState<boolean>(prefersReduced);
  const [readAloud, setReadAloud] = useState(false);

  const setProfile = useCallback((p: Profile) => {
    setProfileRaw(p);
    const d = PROFILE_DEFAULTS[p];
    if (d.fontScale !== undefined) setFontScale(d.fontScale);
    if (d.contrast !== undefined) setContrast(d.contrast);
    if (d.easy !== undefined) setEasy(d.easy);
    if (d.readAloud !== undefined) setReadAloud(d.readAloud);
  }, []);

  // Reflect state onto <html> so CSS can respond.
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-profile", profile);
    el.setAttribute("data-contrast", contrast);
    el.setAttribute("data-reduced-motion", String(reducedMotion));
    el.setAttribute("lang", lang);
    el.style.setProperty("--font-scale", String(fontScale));
  }, [profile, contrast, reducedMotion, lang, fontScale]);

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
      setProfile,
      setLang,
      setEasy,
      setFontScale,
      setContrast,
      setReadAloud,
      tr,
      speak,
      stopSpeak,
    }),
    [profile, lang, easy, fontScale, contrast, reducedMotion, readAloud, setProfile, tr, speak, stopSpeak]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useA11y() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useA11y must be used within AccessibilityProvider");
  return c;
}
