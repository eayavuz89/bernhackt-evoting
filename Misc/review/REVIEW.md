# Multi-Rollen-Review — StimmZugang

_Review des tatsächlichen Codes (nicht des Marketings). Fünf Rollen, je Stärken + ehrliche Lücken.
Stand: Prototyp-Abgabe BärnHäckt 2026._

Legende: ✅ solide · ⚠️ Risiko/offen · 💡 Empfehlung

---

## 1. Product Owner — Anforderungen & Nutzen

- ✅ Beide Liefergegenstände vorhanden: **Portal-UI (D1)** und **Musterausweis (D2)**.
- ✅ Barrierefreiheit ist echter Kern, nicht Beiwerk: 5 Profile, Vorlesen, Kontrast, Textgrösse,
  Sprach-Assistentin — deckt ein breites Behinderungsspektrum ab.
- ✅ Ehrlicher Scope: Codes sind erklärt gemockt (Challenge erlaubt das), Grenzen dokumentiert.
- ⚠️ **Proporz-/Majorz-Wahlen** und **Stop-and-Resume** fehlen — für „echtes" E-Voting relevant.
- 💡 Anforderungs-Abdeckung (`../../Documentation/challenger/`) gegen den **wörtlichen** Challenge-
  Brief gegenprüfen (liegt uns nicht vollständig vor).

## 2. Software-Architect — Struktur & Betrieb

- ✅ Klare Trennung: statische SPA + **minimaler** Token-Broker. Backend hat genau eine Aufgabe.
- ✅ Identische Sicherheits-Header über **beide** Deploy-Pfade (Vercel & nginx) — kein Drift.
- ✅ Theming zentral über `data-profile`/`data-contrast` + CSS-Custom-Properties — ein Ort,
  vorhersehbar, gut testbar.
- ⚠️ **Voice-Tool-Ausführung** (`voiceBridge`) läuft gegen den Live-UI-Zustand — clever, aber
  koppelt Vera an die UI-Struktur; Änderungen an Screens können Tool-Calls stillschweigend brechen.
- ⚠️ **Keine automatisierten Tests** (Unit/E2E) — bei einem geführten Flow mit vielen Zuständen ein Risiko.
- 💡 Kritische Flow-Pfade (Login-Validierung, Ballot→Verify→Confirm, Voice-Tool-Kontrakte) mit
  ein paar Vitest/Playwright-Tests absichern.

## 3. Senior Frontend

- ✅ TypeScript strict, **schlanke Dependencies**, self-hosted Fonts (kein CDN), CSS-only
  Animationen mit `prefers-reduced-motion`.
- ✅ Starke A11y-Praxis: Fokus-Traps in Modals, `aria-current`/`aria-live`, Skip-Link, sichtbarer
  Fokus, programmatischer Heading-Fokus.
- ✅ `--font-scale` **gedeckelt (1.3×)** + `.main`-Breite auf Viewport begrenzt → grosse Schrift
  bricht das Layout nicht mehr (verifiziert: kein horizontales Overflow, Primär-Aktion erreichbar).
- ⚠️ `src/styles/global.css` ist gross (~2.5k Zeilen) — wächst schwer wartbar; Modularisierung erwägen.
- ⚠️ Emoji-als-Icon an mehreren Stellen — okay, aber `aria-hidden` muss konsequent bleiben, damit
  Screen-Reader nicht „Wahlurne-Emoji" vorlesen.
- 💡 Ein paar Snapshot-/A11y-Checks (axe) in CI.

## 4. Senior Backend

- ✅ Server macht genau eine Sache; **echter Key bleibt server-seitig**; kurze Token-TTL.
- ✅ **Eingabe-Whitelisting** der Sprache vor Prompt-Interpolation (Prompt-Injection-Schutz).
- ✅ Sinnvolle Schutzlimits (3/min, 12/h, 300/Tag), JSON-Limit 16 kB, Proxy-Timeout 30 s, Health-Endpoint.
- ⚠️ Rate-Limiter ist **in-memory** → reset bei Neustart, nicht über Instanzen geteilt. Für die
  Demo ok, für Skalierung nicht.
- 💡 Bei mehr als einer Instanz: shared Store (Redis/Upstash) + strukturiertes Logging/Metriken.

## 5. Security

- ✅ **Vollständige Header-Suite** (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy `microphone=(self)`, HSTS) — in `vercel.json` **und** `nginx.conf`.
- ✅ Key-Isolation via Ephemeral-Token; kein `dangerouslySetInnerHTML`; `script-src 'self'`.
- ✅ Prompt-Injection-Whitelist der UI-Sprache.
- ⚠️ CSP nutzt `style-src 'unsafe-inline'` (für inline/scoped Styles nötig) — vertretbar, aber bekannt.
- ⚠️ Token-Endpoint hat **keinen Same-Origin-/CSRF-Check** — Risiko gering (stateless Mint +
  Rate-Limit, hinter Same-Origin-Proxy), aber ein `Origin`/`Referer`-Check wäre günstig.
- 💡 Vor „echt": Zertifikats-/Fingerprint-Verifikation des Portals funktional umsetzen (heute nur
  auf dem Ausweis dokumentiert).

---

### Gesamturteil

Für einen Hackathon-Prototyp **überdurchschnittlich sauber**: klare Architektur, ernstgemeinte
Sicherheit und eine echte, tiefe Barrierefreiheit inkl. freihändiger Sprachbedienung. Grösste
offene Hebel: **Tests**, **geteiltes Rate-Limiting** und die fachlichen Lücken (Wahlen,
Stop-and-Resume) — alle bewusst und dokumentiert.
