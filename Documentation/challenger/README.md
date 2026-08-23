# Dokument für den Challenger — Schweizerische Post

_Challenge: „Barrier-Free E-Voting Experience" · BärnHäckt 2026._

> Technische Tiefe: siehe [`../technical-jury/`](../technical-jury/). Rollen-Review &
> Anforderungs-Herleitung: siehe [`../../Misc/review/`](../../Misc/review/).

## 1. Die Challenge, wie wir sie verstanden haben

Zwei Liefergegenstände mit einem übergeordneten Ziel — **digitales Abstimmen für alle einfacher
zugänglich machen**:

- **D1 — Portal-UI:** das Abstimmungsportal, das eine stimmberechtigte Person durch den offiziellen
  Ablauf führt (Anmeldung → Abstimmen → Verifizieren → Bestätigen), **barrierefrei**.
- **D2 — Stimmrechtsausweis-Layout:** der druckbare Ausweis mit den Codes, an dem sich die Person
  im Portal orientiert — ebenfalls barrierefrei gedacht (Kontrast, Tastbarkeit, QR-Anmeldung).

Leitgedanke unserer Lösung **StimmZugang**: **eine adaptive Oberfläche für alle** statt einer
separaten „Behinderten-Version". Barrierefreiheit ist kein Zusatzmodus, sondern der Standard.

## 2. Anforderungsabdeckung

| Anforderung | Status | Umsetzung |
|---|---|---|
| **Portal-UI (D1)** — geführter Abstimmungs-Flow | **erfüllt** | Login → Ballot → Verify → Confirm → Done, mit Schritt-Zeitstrahl |
| **Stimmrechtsausweis (D2)** — Layout + Codes | **erfüllt** | druckbarer Musterausweis unter `/card`: hoher Kontrast, grosser QR, formcodierte Zonen ▲◆⬟★, Braille-Markierung |
| **Two-Round-Return-Codes-Verfahren** | **erfüllt** (UI-seitig) | Init-Code ▲ + Geburtsjahr → Prüfcodes ◆ (cast-as-intended) → Bestätigungscode ⬟ → Finalisierungscode ★ |
| **Barrierefreiheit** (Kern der Challenge) | **erfüllt / darüber hinaus** | 5 Profile, Vorlesen, hoher Kontrast, 3-stufige Textgrösse, reduced-motion, volle Tastatur-/Switch-Bedienung, **Sprach-Assistentin Vera** |
| Mehrsprachigkeit | **erfüllt** | DE / FR / IT / EN |
| Echter Krypto-/Storage-Stack | **offen (bewusst)** | Codes sind Demo-Werte — laut Challenge erlaubt; Fokus auf Erlebnis/Barrierefreiheit |
| Proporz-/Majorz-Wahlen | **offen** | nur Sach-Abstimmungen (Ja/Nein/Leer) |
| Stop-and-Resume | **offen** | nicht implementiert |

## 3. Was wir zusätzlich gemacht haben

- **Sprach-Assistentin „Vera"** (OpenAI Realtime, WebRTC): führt blinde und motorisch
  eingeschränkte Personen **komplett freihändig** durch die Abstimmung — liest Vorlagen und Codes
  langsam/einzeln vor, bestätigt jede Wahl mündlich, unterbrechbar jederzeit (Barge-in).
- **Vier Sprachen** (DE/FR/IT/EN) inkl. **Leichter Sprache** (Deutsch).
- **Sicherheit ernst genommen** trotz Prototyp: CSP + volle Security-Header, Ephemeral-Token-
  Architektur (echter Key nie im Client), Rate-Limiting, Eingabe-Whitelisting.
- **QR-Anmeldung** auf dem Ausweis (Deep-Link `?init=…`) — Ein-Tipp-Login für motorisch
  eingeschränkte Personen.

## 4. Offene Punkte / Ehrliche Grenzen

- **Kein echter Krypto-Stack / keine Vote-Storage / kein Audit-Trail** — die Codes sind Demo-Werte.
- **Stop-and-Resume** (Abstimmung unterbrechen und später fortsetzen) fehlt.
- **Proporz-/Majorz-Wahlen** (Listen, Kandidat:innen, Kumulieren/Panaschieren) sind nicht abgebildet.
- Empfohlene Sicherheitschecks beim realen Portalzugang (Zertifikats-/Fingerprint-Prüfung) sind
  auf dem Ausweis dokumentiert, aber nicht funktional verifiziert.

## 5. Demo & Screenshots

- **Live:** https://evoting.eayavuz.com · **Musterausweis:** https://evoting.eayavuz.com/card
- **Demo-Anmeldung:** Initialisierungscode ist im Demo vorausgefüllt bzw. per „Ausfüllen"-Button
  ladbar; Geburtsjahr **1980**.
- **Screenshots:** siehe [`../../Misc/assets/`](../../Misc/assets/) (Portal-Flow, Profile,
  hoher Kontrast, Vera, Musterausweis).
- `TODO` — BärnHäckt-Abgabelink / QR-Code für die Jury (Joker liefert).
