# StimmZugang — Barrier-free E-Voting (BärnHäckt 2026)

Prototype for the Swiss Post challenge *"Barrier-free e-voting experience"*: an accessible
voting portal UI + a printable voting card (Stimmrechtsausweis) layout. Platform-independent,
front-end only (no backend — codes are static/mock, as the challenge allows).

## Idea
One adaptive interface with **accessibility profiles** (blind / motor / cognitive / senior /
standard). The core flow mirrors Swiss Post's real *cast-as-intended* verification:
**sign in with card code → vote → compare verification (return) codes with the card → confirm → finalise.**

## Accessibility
- WCAG 2.2 AA oriented; targets Swiss eCH-0059 / "Zugang für alle" spirit
- Semantic HTML, ARIA, full keyboard & switch navigation, visible focus
- Read-aloud (Web Speech), high-contrast theme, text scaling, reduced-motion aware
- Leichte Sprache (easy German) overlay
- Languages: DE / FR / IT / EN
- Voting card: high contrast, large QR sign-in, tactile/Braille marker, clear code zones, print layout

## Run
```bash
npm install && npm run dev          # local dev
docker compose up -d --build        # container on 127.0.0.1:18140
```

Live: https://evoting.eayavuz.com  ·  Sample card: /card
