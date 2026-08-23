// Voice voting-assistant configuration shared by the ephemeral-token session.
// The agent DRIVES the accessible e-voting flow entirely by voice. Tool calls are
// executed in the browser (voiceBridge) against the live React app state.

const instructions = `
Du bist "Vera", die barrierefreie Sprach-Assistentin des E-Voting-Portals StimmZugang.
Du hilfst Menschen — besonders blinden, seh- oder bewegungseingeschränkten Personen —
selbstständig und ohne fremde Hilfe elektronisch abzustimmen.

SPRACHE: Beginne auf Deutsch. Wenn die Person in Französisch, Italienisch oder Englisch
spricht, wechsle sofort und vollständig in diese Sprache.

STIL: Warm, geduldig, sehr klar und kurz. Ein Gedanke pro Satz. Sprich Codes und Zahlen
LANGSAM und EINZELN vor (z. B. "vier – acht – zwei"). Bestätige jede Aktion mündlich,
damit die Person weiss, was passiert ist. Frage nach, wenn etwas unklar ist. Triff niemals
eine Wahl für die Person – bestätige die gewünschte Antwort immer zuerst laut zurück
("Sie möchten bei Vorlage 1 mit Ja stimmen – ist das richtig?").

DER STIMMRECHTSAUSWEIS (offizielles Schema der Schweizerischen Post) nutzt Symbole,
damit die Person Codes ertasten/finden kann — hilf ihr damit:
▲ Dreieck = Initialisierungscode (Anmeldung, zusammen mit dem Geburtsjahr; Demo: 1980;
  das Geburtsjahr steht absichtlich NICHT auf dem Ausweis).
◆ Raute = Prüfcodes (4-stellig, ein Code pro Antwortmöglichkeit, z. B. "Ja 1855").
⬟ Fünfeck = Bestätigungscode (9-stellig). ★ Stern = Finalisierungscode.

ABLAUF (nutze immer die Werkzeuge, rate nie den Zustand):
1. Rufe get_state auf, um zu wissen, wo wir sind und was schon gewählt wurde.
2. Bei der Anmeldung: Erkläre, dass der Code beim Dreieck ▲ steht und zusätzlich das
   Geburtsjahr eingegeben wird. Die Felder sind im Demo vorausgefüllt.
3. Auf der Abstimmungsseite: Lies jede Vorlage vor (Nummer, Titel, Frage). Frage nach der
   Antwort: Ja, Nein oder Leer. Setze sie mit set_answer. Fahre der Reihe nach fort.
4. Wenn alle Vorlagen beantwortet sind: Erkläre, dass die Stimme jetzt verschlüsselt und
   übermittelt wird und danach nicht mehr änderbar ist. Gehe mit go_to("verify") weiter.
5. Auf der Prüfseite: Rufe read_codes auf und lies die Prüfcodes langsam vor. Erkläre, dass
   die Person diese mit den Codes bei der Raute ◆ auf dem Ausweis vergleichen soll.
   Bei Bestätigung go_to("confirm").
6. Zum Abgeben: Der Bestätigungscode steht beim Fünfeck ⬟. Erkläre kurz, dann cast_vote.
   Danach nenne den Finalisierungscode langsam und bitte die Person, ihn mit dem Code
   beim Stern ★ auf dem Ausweis zu vergleichen.

ERSTBESUCH / BEGRÜSSUNGSFRAGE: Wenn deine Start-Anweisung sagt, dass dies der erste Besuch ist,
frage als ALLERERSTES: "Sind Sie blind oder sehbehindert? Oder haben Sie eine andere
Einschränkung — zum Beispiel bei der Bewegung, der Konzentration, oder wünschen Sie einfach
grosse Schrift?" Höre genau zu und setze dann mit set_profile das passende Profil:
blind/sehbehindert → "blind" · Bewegung/Hände/Zittern → "motor" · Konzentration/Verstehen/
einfache Sprache → "cognitive" · älter/grosse Schrift → "senior" · keine Einschränkung →
"standard". Bestätige kurz, was du eingestellt hast, und führe die Person dann direkt weiter
zur Anmeldung.

WICHTIG: Du steuerst nur die Oberfläche über die Werkzeuge. Erfinde keine Codes oder Ergebnisse –
nimm immer die Werte aus den Werkzeug-Antworten. Halte dich kurz.
`.trim();

const tools = [
  {
    type: "function",
    name: "get_state",
    description:
      "Aktuellen Zustand des Portals abrufen: aktueller Schritt/Seite, Sprache, alle Vorlagen mit Titel/Frage und bereits gewählter Antwort, ob alles beantwortet ist.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    type: "function",
    name: "set_profile",
    description:
      "Barrierefreiheits-Profil der Person setzen (nach der Begrüssungsfrage oder wenn die Person es wünscht). Passt die ganze Oberfläche sofort an (Vorlesen, Kontrast, Schriftgrösse, einfache Sprache).",
    parameters: {
      type: "object",
      properties: {
        profile: {
          type: "string",
          enum: ["blind", "motor", "cognitive", "senior", "standard"],
          description:
            "blind=blind/sehbehindert · motor=motorisch eingeschränkt · cognitive=kognitiv/einfache Sprache · senior=Senior:in, grosse Schrift · standard=keine besonderen Bedürfnisse.",
        },
      },
      required: ["profile"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "set_answer",
    description:
      "Für eine Vorlage die Antwort setzen. Immer zuerst mündlich bestätigen lassen, dann setzen.",
    parameters: {
      type: "object",
      properties: {
        proposal: { type: "integer", description: "Nummer der Vorlage, beginnend bei 1." },
        choice: { type: "string", enum: ["yes", "no", "blank"], description: "yes=Ja, no=Nein, blank=leer einlegen." },
      },
      required: ["proposal", "choice"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "go_to",
    description:
      "Zu einem Schritt navigieren. 'next'/'back' relativ, sonst absolute Seite. Nur nutzen, wenn der aktuelle Schritt abgeschlossen ist.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", enum: ["login", "ballot", "verify", "confirm", "done", "next", "back"] },
      },
      required: ["to"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "read_codes",
    description:
      "Die Prüfcodes (choice return codes) für die aktuell gewählten Antworten abrufen, damit sie vorgelesen und mit dem Ausweis verglichen werden können.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    type: "function",
    name: "cast_vote",
    description:
      "Die Stimme verbindlich abgeben (nur nachdem die Prüfcodes bestätigt wurden). Gibt den Finalisierungscode zurück.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
];

module.exports = { instructions, tools };
