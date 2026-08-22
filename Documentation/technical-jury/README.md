# Technische Dokumentation — StimmZugang

_Für die technische Jury · BärnHäckt 2026 · Swiss-Post-Challenge „Barrier-Free E-Voting Experience"._

> **Gerüst.** Abschnitte mit `TODO` füllen. Stichworte sind Hinweise, keine fertigen Aussagen.

## 1. Überblick
`TODO` — Was ist StimmZugang in drei Sätzen? Zielgruppe, Kernversprechen (Barrierefreiheit).

## 2. Architektur
`TODO` — Architekturdiagramm einfügen.
- Frontend: React 18 + Vite 5 + TypeScript, SPA (react-router).
- Backend: schlanker Express-Token-Broker (`server/`) — mintet nur kurzlebige OpenAI-Realtime-Tokens.
- Voice: OpenAI Realtime über WebRTC, gesteuert via `src/lib/voiceBridge.ts`.
- Deploy: Docker + nginx **oder** Vercel.

## 3. Tech-Stack & Entscheidungen
`TODO` — Begründungen: React/Vite, self-hosted Fonts (`@fontsource`, kein CDN), scoped CSS +
CSS-Custom-Properties statt Tailwind, keine Animationsbibliothek (nur CSS `transform`/`opacity`).

## 4. Barrierefreiheit (Kernstück)
`TODO` — WCAG 2.2 AA. Fünf Profile (standard / blind / motor / cognitive / senior),
Vorlesen, Hoher Kontrast, Textgrösse (`--font-scale`), Reduced-Motion, Sprach-Assistentin „Vera",
Tastatur-/Fokus-Management, Skip-Link, sichtbarer Fokus.

## 5. Sicherheit
`TODO` — CSP + Sicherheits-Header (`vercel.json` / `nginx.conf`), Ephemeral-Token-Architektur
(echter API-Key nie im Client), Rate-Limiting, `Permissions-Policy: microphone=(self)`,
Eingabe-Whitelisting.

## 6. Abstimmungs-Flow (Two-Round Return Codes)
`TODO` — Login (Init-Code ▲ + Geburtsjahr) → Vorlagen wählen → „Verschlüsseln & übermitteln" →
Prüfcodes ◆ vergleichen → Bestätigungscode ⬟ → Finalisierungscode ★.

## 7. Voice-Agent (Vera)
`TODO` — Instructions/Tools (`server/agent.js`), Ausführung der Tool-Calls gegen den
App-Zustand (`voiceBridge`), Sprach-/Barrierefreiheits-Nutzen.

## 8. Build / Run / Deploy
`TODO` — `npm run dev` (Port 5173), Docker (`docker compose up`), Vercel; `/api`-Proxy-Verkabelung
(Vite-Proxy, nginx `location /api/`).

## 9. Bekannte Grenzen (Prototyp)
`TODO` — Kein echter Krypto-Stack / keine Vote-Storage / kein Audit-Trail; Codes sind Demo-Werte;
offen: Stop-and-Resume und Proporz-/Majorz-Wahlen.
