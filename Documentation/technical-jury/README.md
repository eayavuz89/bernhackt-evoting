# Technische Dokumentation — StimmZugang

_Für die technische Jury · BärnHäckt 2026 · Swiss-Post-Challenge „Barrier-Free E-Voting Experience"._

Ergänzend in diesem Ordner: **[`two-round-return-codes.html`](./two-round-return-codes.html)** /
**[`.pdf`](./two-round-return-codes.pdf)** — visuelle Erklärung des Verifikationsverfahrens.

---

## 1. Überblick

**StimmZugang** ist ein barrierefreies E-Voting-Portal + ein druckbarer Stimmrechtsausweis.
Es bildet den offiziellen Abstimmungs-Flow der Schweizerischen Post (*Two-Round Return Codes*,
*cast-as-intended*-Verifikation) nach und macht ihn für **alle** selbstständig nutzbar — blinde,
seh-, motorisch und kognitiv eingeschränkte sowie ältere Personen.

Kernversprechen: **eine einzige adaptive Oberfläche** statt getrennter „Spezial"-Seiten. Über
Barrierefreiheits-Profile passt sich dieselbe App an den jeweiligen Bedarf an — inklusive einer
freihändigen Sprach-Assistentin („Vera"), die blinde und motorisch eingeschränkte Personen
komplett per Stimme durch die Abstimmung führt.

Die Codes sind statisch/gemockt — die Challenge erlaubt das ausdrücklich. Es gibt keinen echten
Krypto-/Storage-Stack; der Fokus liegt auf **Erlebnis, Flow und Barrierefreiheit**.

## 2. Architektur

```
Browser (React SPA)  ──/api/*──▶  Express-Token-Broker  ──▶  OpenAI Realtime
   │  UI + A11y-State                (server/, :8080)          (WebRTC-Voice)
   │  voiceBridge.ts  ◀── WebRTC-Audio + Tool-Calls ──────────────┘
   └── statisch ausgeliefert via nginx (Docker) oder Vercel (CDN)
```

- **Frontend:** React 18 + Vite 5 + TypeScript, Single-Page-App (`react-router-dom`). Kein
  globaler Store — Accessibility-Zustand liegt in einem React-Context (`AccessibilityContext`),
  Voten in einer leichten `Session`.
- **Backend (`server/`):** schlanker Express-Dienst mit **einer** Aufgabe — kurzlebige
  OpenAI-Realtime-*ephemeral tokens* ausstellen, damit der echte API-Key nie im Browser landet.
  Kein State, keine Datenbank.
- **Voice:** OpenAI Realtime über **WebRTC**, im Browser gesteuert via `src/lib/voiceBridge.ts`.
  Vera ruft Werkzeuge auf, die gegen den **Live-React-Zustand** ausgeführt werden.
- **Deploy:** Docker + nginx **oder** Vercel (siehe §8). In beiden Fällen wird `/api/*` an das
  Express-Backend weitergeleitet.

## 3. Tech-Stack & Entscheidungen

| Entscheidung | Begründung |
|---|---|
| React 18 + Vite + TS | schnelles DX, typsicher; SPA reicht für einen geführten Flow |
| **scoped CSS + CSS-Custom-Properties** statt Tailwind | volle Kontrolle über Kontrast/`--font-scale`; keine Utility-Soup; ein Theming-Layer (`data-profile`, `data-contrast`) |
| **self-hosted Fonts** (`@fontsource/inter`, `space-grotesk`) | kein Google-CDN → CSP `font-src 'self'`, keine Drittanbieter-Requests |
| **keine Animationsbibliothek** | nur CSS `transform`/`opacity` + `@keyframes`; alles unter `prefers-reduced-motion: reduce` abschaltbar |
| Icons als Inline-Emoji/SVG-Symbole (▲ ◆ ⬟ ★) | formcodiert → auch bei Farbfehlsichtigkeit unterscheidbar |
| Ephemeral-Token-Backend statt Key im Client | Sicherheits-Grundvoraussetzung für einen öffentlichen Demo-Endpunkt |

## 4. Barrierefreiheit (Kernstück)

Ausrichtung an **WCAG 2.2 AA**, im Geist von *eCH-0059* / *„Zugang für alle"*.

**Fünf Profile** (`AccessibilityContext.tsx`, jeweils sinnvolle Voreinstellungen):

| Profil | `--font-scale` | Kontrast | Leichte Sprache | Vorlesen | Sprachsteuerung |
|---|---|---|---|---|---|
| `standard` | 1.0 | normal | – | – | – |
| `blind` | 1.15 | hoch | – | ✓ | ✓ (Vera) |
| `motor` | 1.25 | normal | – | – | – (grosse Ziele) |
| `cognitive` | 1.20 | normal | ✓ | ✓ | – |
| `senior` | 1.30 | hoch | – | – | – |

Weitere Bausteine:
- **Textgrösse:** 3-Stufen-Regler (100 % / 115 % / 130 %), bewusst **bei 1.3× gedeckelt**, damit
  grosse Schrift die Bedienelemente nie aus einem nicht-scrollenden Layout drängt.
- **Hoher Kontrast** (`data-contrast="high"`): eigenes, WCAG-konformes Schwarz-/Gelb-Set.
- **Reduced-Motion:** folgt der OS-Einstellung; schaltet alle Animationen ab.
- **Vorlesen** (Web Speech `SpeechSynthesis`), sprachabhängige Stimme (de-CH/fr-CH/it-CH/en-GB).
- **Tastatur & Switch:** vollständige Bedienung, Fokus-Trap in Modals, Skip-Link, sichtbarer
  Fokusring, `aria-current`/`aria-live`, programmatischer Fokus auf Überschriften.
- **Formcodierte Codezonen** auf dem Ausweis (▲ ◆ ⬟ ★) — ertastbar/findbar, Braille-Markierung.
- **Vier Sprachen:** DE / FR / IT / EN (`src/lib/i18n.ts`).

## 5. Sicherheit

- **CSP + volle Header-Suite** — identisch in `vercel.json` (Vercel) und `nginx.conf` (Docker):
  `Content-Security-Policy` (u. a. `default-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'self'`, `connect-src 'self' https://api.openai.com`),
  `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: microphone=(self)` (Kamera/Geo/Payment aus), `Strict-Transport-Security`.
- **Ephemeral-Token-Architektur:** der echte OpenAI-Key bleibt auf dem Server; der Browser
  erhält nur ein ~60 s gültiges Client-Secret (`server/index.js`).
- **Rate-Limiting** (öffentlicher, kostenverursachender Endpunkt): pro IP 3/min, 12/h,
  global 300/Tag (in-memory).
- **Prompt-Injection-Schutz:** die UI-Sprache wird server-seitig gegen eine Whitelist
  (`de/fr/it/en`) geprüft, bevor sie in Veras System-Prompt interpoliert wird.
- **Kein `dangerouslySetInnerHTML`**, keine Inline-Skripte (CSP `script-src 'self'`).

## 6. Abstimmungs-Flow (Two-Round Return Codes)

Details + Diagramm: **[`two-round-return-codes.pdf`](./two-round-return-codes.pdf)**.

1. **Anmelden** — Initialisierungscode ▲ + Geburtsjahr (Extended Authentication Factor, steht
   bewusst **nicht** auf dem Ausweis).
2. **Vorlagen beantworten** — Ja / Nein / Leer pro Vorlage.
3. **Verschlüsseln & übermitteln** — expliziter Consent-Dialog; danach nicht mehr änderbar.
4. **Prüfcodes ◆ vergleichen** — pro Antwort ein 4-stelliger Rückgabecode (*cast-as-intended*).
5. **Bestätigen** — Bestätigungscode ⬟ (9-stellig).
6. **Fertig** — Finalisierungscode ★ zum Abgleich mit dem Ausweis.

## 7. Voice-Agent (Vera)

- **Definition:** `server/agent.js` — System-Instruktionen (warm, geduldig, **liest Codes einzeln
  und langsam**, bestätigt jede Wahl mündlich zurück, **erfindet nie Codes/Ergebnisse**) + Werkzeuge:
  `get_state`, `set_answer`, `go_to`, `read_codes`, `cast_vote`.
- **Ausführung:** die Tool-Calls werden im Browser (`voiceBridge.ts`) gegen den echten
  App-Zustand ausgeführt — Vera „sieht" und steuert exakt das, was auf dem Schirm ist.
- **Robustheit im Demo-Saal:** `server_vad` mit erhöhter Schwelle + `far_field`-Noise-Reduction
  gegen Hintergrundlärm; kurze Token-TTL; Session-Länge client-seitig gedeckelt.
- **Nutzen:** blinde/motorisch eingeschränkte Personen stimmen **komplett freihändig** ab, mit
  Live-Transkript und jederzeitigem Unterbrechen (Barge-in).

## 8. Build / Run / Deploy

```bash
npm install && npm run dev            # Frontend auf http://localhost:5173
                                      # (/api → Vite-Proxy auf localhost:8080)

docker compose up -d --build          # Web: 127.0.0.1:18140 · Voice-API: 127.0.0.1:18142
```

- **Vercel:** statischer Build + Header aus `vercel.json`; `/api` an das Voice-Backend.
- **Docker:** Multi-Stage-Build (`Dockerfile`) → nginx serviert `dist/`, proxyt `/api/` an den
  `api`-Container (`server/`). Security-Header in `nginx.conf`.
- **Voice-Setup:** `.env.example` → `.env`, `OPENAI_REALTIME_KEY` eintragen (der Key verlässt den
  Server nie). Ohne Key läuft die App normal; nur Vera ist deaktiviert.

## 9. Bekannte Grenzen (Prototyp)

- **Kein echter Krypto-Stack, keine Vote-Storage, kein Audit-Trail** — die Return-/Bestätigungs-/
  Finalisierungscodes sind **Demo-Werte** (`src/lib/data.ts`).
- **Kein Stop-and-Resume** (Abstimmung unterbrechen und später fortsetzen).
- **Nur Sach-Abstimmungen** (Ja/Nein/Leer) — **keine Proporz-/Majorz-Wahlen** (Listen,
  Kandidat:innen, Kumulieren/Panaschieren).
- Vorlesen nutzt die Browser-`SpeechSynthesis` — Stimmqualität variiert je nach OS/Browser.
- Rate-Limiting ist in-memory (pro Instanz) — für die Demo ausreichend, nicht für Skalierung.
