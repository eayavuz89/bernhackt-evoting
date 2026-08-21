import { Lang } from "./i18n";

// Mock ballot data. No backend — the challenge explicitly allows static/random codes.
export interface Proposal {
  id: string;
  title: Record<Lang, string>;
  text: Record<Lang, string>;
  // Verification ("choice return") codes shown after voting, per possible answer.
  codes: { yes: string; no: string; blank: string };
}

export const PROPOSALS: Proposal[] = [
  {
    id: "p1",
    title: {
      de: "Eidgenössische Volksinitiative «Für sichere digitale Teilhabe»",
      fr: "Initiative populaire « Pour une participation numérique sûre »",
      it: "Iniziativa popolare «Per una partecipazione digitale sicura»",
      en: "Federal popular initiative «For secure digital participation»",
    },
    text: {
      de: "Wollen Sie die Initiative annehmen?",
      fr: "Acceptez-vous l'initiative ?",
      it: "Volete accettare l'iniziativa?",
      en: "Do you want to accept the initiative?",
    },
    codes: { yes: "72 41", no: "18 06", blank: "55 90" },
  },
  {
    id: "p2",
    title: {
      de: "Änderung des Bundesgesetzes über die politischen Rechte",
      fr: "Modification de la loi fédérale sur les droits politiques",
      it: "Modifica della legge federale sui diritti politici",
      en: "Amendment to the Federal Act on Political Rights",
    },
    text: {
      de: "Wollen Sie die Gesetzesänderung annehmen?",
      fr: "Acceptez-vous la modification de loi ?",
      it: "Volete accettare la modifica di legge?",
      en: "Do you want to accept the legal amendment?",
    },
    codes: { yes: "34 88", no: "90 12", blank: "61 47" },
  },
  {
    id: "p3",
    title: {
      de: "Kantonale Vorlage: Ausbau des barrierefreien öffentlichen Verkehrs",
      fr: "Objet cantonal : développement des transports publics accessibles",
      it: "Oggetto cantonale: sviluppo del trasporto pubblico accessibile",
      en: "Cantonal proposal: expansion of accessible public transport",
    },
    text: {
      de: "Wollen Sie die Vorlage annehmen?",
      fr: "Acceptez-vous l'objet ?",
      it: "Volete accettare l'oggetto?",
      en: "Do you want to accept the proposal?",
    },
    codes: { yes: "07 63", no: "42 29", blank: "88 15" },
  },
];

// Codes printed on the sample voting card (Stimmrechtsausweis).
export const CARD = {
  name: "Muster, Maria",
  municipality: "Bern",
  voteDate: "28.09.2026",
  initCode: "482 917 305",
  confirmCode: "649 130",
  finalizeCode: "TIGER-2027",
};

export type Answer = "yes" | "no" | "blank";
