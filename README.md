# StimmZugang — Barrierefreies E-Voting (BärnHäckt 2026)

Prototyp für die Challenge der Schweizerischen Post *«Barrier-free e-voting experience»*:
ein barrierefreies Abstimmungsportal + ein druckbarer Stimmrechtsausweis. Die Codes sind
statisch/gemockt (die Challenge erlaubt das); ein kleiner Server dient ausschliesslich dem
Ausstellen kurzlebiger Tokens für die Sprach-Assistentin.

## Idee
Eine einzige adaptive Oberfläche mit **Barrierefreiheits-Profilen** (blind / motorisch
eingeschränkt / kognitiv / Senior:in / Standard). Der Ablauf folgt dem offiziellen
*Two-Rounds-Return-Codes*-Schema der Post (*cast-as-intended*-Verifikation):
**Anmeldung mit Initialisierungscode ▲ + Geburtsjahr → Abstimmen → Prüfcodes ◆ mit dem
Ausweis vergleichen → Bestätigungscode ⬟ → Finalisierungscode ★.**

## Barrierefreiheit
- Ausrichtung an WCAG 2.2 AA; im Geist von eCH-0059 / «Zugang für alle»
- Semantisches HTML, ARIA, vollständige Tastatur- & Switch-Bedienung, sichtbarer Fokus
- Vorlesefunktion (Web Speech), Hochkontrast-Modus, Textskalierung, `reduced-motion`
- Leichte Sprache (Deutsch)
- Sprachen: DE / FR / IT / EN
- **Sprach-Assistentin «Vera»** (OpenAI Realtime, WebRTC): führt blinde und motorisch
  eingeschränkte Personen komplett freihändig durch die Stimmabgabe — mit Live-Transkript
  und Unterbrechen jederzeit möglich (Barge-in)
- Stimmrechtsausweis: hoher Kontrast, grosser QR-Code zur Anmeldung, taktile/Braille-Markierung,
  formcodierte Code-Zonen (▲ ◆ ⬟ ★ — auch bei Farbfehlsichtigkeit unterscheidbar), Drucklayout

## Starten
```bash
npm install && npm run dev          # lokale Entwicklung
docker compose up -d --build        # Web auf 127.0.0.1:18140, Voice-API auf 127.0.0.1:18142
```

Für die Sprach-Assistentin: `.env.example` nach `.env` kopieren und einen OpenAI-API-Key
eintragen (der Key verlässt den Server nie — der Browser erhält nur kurzlebige Tokens).

Live: https://evoting.eayavuz.com  ·  Muster-Stimmrechtsausweis: /card
