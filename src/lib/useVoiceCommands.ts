import { useEffect, useRef } from "react";
import type { Lang } from "./i18n";

// Hands-free voice control via the browser's SpeechRecognition (no backend/key).
// Blind-first: a user who can't see the screen speaks "weiter / zurück /
// wiederholen" instead of finding a button. Grammar is per-language; matching is
// loose (substring) because recognition transcripts vary.

type Command = "next" | "back" | "repeat" | "close" | "yes" | "no" | "blank";

const GRAMMAR: Record<Lang, Record<Command, string[]>> = {
  de: {
    next: ["weiter", "vor", "nächste", "nächster"],
    back: ["zurück", "zurueck"],
    repeat: ["wiederholen", "nochmal", "noch mal", "wiederhole"],
    close: ["schliessen", "schließen", "beenden", "überspringen", "stopp"],
    yes: ["ja"],
    no: ["nein"],
    blank: ["leer", "leer einlegen"],
  },
  en: {
    next: ["next", "continue", "forward"],
    back: ["back", "previous"],
    repeat: ["repeat", "again"],
    close: ["close", "skip", "exit", "stop"],
    yes: ["yes"],
    no: ["no"],
    blank: ["blank", "empty"],
  },
  fr: {
    next: ["suivant", "continuer"],
    back: ["retour", "précédent", "precedent"],
    repeat: ["répéter", "repeter", "encore"],
    close: ["fermer", "passer", "arrêter", "arreter"],
    yes: ["oui"],
    no: ["non"],
    blank: ["blanc", "vide"],
  },
  it: {
    next: ["avanti", "continua"],
    back: ["indietro"],
    repeat: ["ripeti", "ancora"],
    close: ["chiudi", "salta", "ferma"],
    yes: ["sì", "si"],
    no: ["no"],
    blank: ["bianco", "vuoto"],
  },
};

const SR_LANG: Record<Lang, string> = { de: "de-CH", fr: "fr-CH", it: "it-CH", en: "en-GB" };

export interface VoiceCommandHandlers {
  onNext?: () => void;
  onBack?: () => void;
  onRepeat?: () => void;
  onClose?: () => void;
  onChoice?: (choice: "yes" | "no" | "blank") => void;
}

// Minimal shape of the Web Speech API we use (not in lib.dom).
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

export function useVoiceCommands(enabled: boolean, lang: Lang, handlers: VoiceCommandHandlers): void {
  const hRef = useRef(handlers);
  hRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = SR_LANG[lang] ?? "de-CH";
    rec.continuous = true;
    rec.interimResults = false;

    const g = GRAMMAR[lang] ?? GRAMMAR.de;
    const has = (t: string, list: string[]) => list.some((w2) => t.includes(w2));

    rec.onresult = (e) => {
      const results = e.results;
      const last = results[results.length - 1];
      const transcript = (last?.[0]?.transcript || "").toLowerCase().trim();
      if (!transcript) return;
      const h = hRef.current;
      if (has(transcript, g.next)) h.onNext?.();
      else if (has(transcript, g.back)) h.onBack?.();
      else if (has(transcript, g.repeat)) h.onRepeat?.();
      else if (has(transcript, g.yes)) h.onChoice?.("yes");
      else if (has(transcript, g.no)) h.onChoice?.("no");
      else if (has(transcript, g.blank)) h.onChoice?.("blank");
      else if (has(transcript, g.close)) h.onClose?.();
    };
    // Some browsers auto-stop after silence — restart to keep listening.
    rec.onend = () => {
      try {
        rec.start();
      } catch {
        /* already started / not allowed */
      }
    };
    rec.onerror = () => {};

    try {
      rec.start();
    } catch {
      /* mic blocked or unsupported — silently disabled */
    }

    return () => {
      rec.onend = null; // prevent auto-restart after teardown
      rec.onresult = null;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
  }, [enabled, lang]);
}
