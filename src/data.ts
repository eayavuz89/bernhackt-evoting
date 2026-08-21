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
    codes: { yes: "1855", no: "0196", blank: "7064" },
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
    codes: { yes: "8393", no: "2938", blank: "2033" },
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
    codes: { yes: "9697", no: "9131", blank: "7973" },
  },
];

// Codes printed on the sample voting card (Stimmrechtsausweis).
// Formats follow the official Swiss Post scheme (challenge briefing):
// alphanumeric init code in 6 blocks, 9-digit confirmation, 8-digit finalization,
// 4-digit choice return codes. The birth year is the Extended Authentication
// Factor — deliberately NOT printed on the card (something you know).
export const CARD = {
  name: "Muster, Maria",
  municipality: "Bern",
  voteDate: "28.09.2026",
  votePeriod: "Montag, 31.08.2026, 17:00 bis Sonntag, 28.09.2026, 12:00 (MEZ)",
  portalUrl: "https://evoting.eayavuz.com",
  fingerprint:
    "AC 03 03 58 89 E9 19 18 75 9C 60 6B 0D 42 A0 AD 61 E2 73 F3 81 A9 74 15 E4 62 9D 28 54 DA 69 13",
  birthYear: "1980",
  initCode: "2r61 3gfn dfgq gy7j q4q6 aqq8",
  confirmCode: "4419 7199 7",
  finalizeCode: "4137 6763",
  support: "evoting.eayavuz.com · support@post.ch",
};

export type Answer = "yes" | "no" | "blank";
