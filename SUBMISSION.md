# StimmZugang — BärnHäckt 2026 Submission

Barrierefreies E-Voting — Challenge der Schweizerischen Post: **„Barrier-Free E-Voting Experience"**.

Dieses Repository ist in die vier Liefergegenstände der Challenge gegliedert:

| Kategorie | Ort | Inhalt |
|---|---|---|
| **Code** | Repository-Wurzel (`src/`, `server/`, `Dockerfile`, …) | Die lauffähige Anwendung. Siehe [`README.md`](./README.md). |
| **Documentation** | [`Documentation/`](./Documentation/) | Technische Doku für die **Jury** + Dokument für den **Challenger** (Schweizerische Post). |
| **Presentation** | [`Presentation/`](./Presentation/) | Pitch-Deck & Speaker-Notes. |
| **Misc** | [`Misc/`](./Misc/) | Links, Assets, Notizen, Review-Artefakte. |

> „Code" ist bewusst die Repo-Wurzel (die App selbst); die drei anderen Kategorien sind
> Geschwister-Ordner daneben, damit Build/Deploy-Pfade (Docker, Vercel, nginx) unverändert bleiben.

## Quick start (Code)

```bash
npm install && npm run dev   # → http://localhost:5173
```

Voice-Backend (Sprach-Assistentin „Vera"): siehe [`server/`](./server/) + [`.env.example`](./.env.example).

## Checkliste

- [x] **Code** — lauffähig, siehe `README.md`
- [ ] **Documentation / technical-jury** — Gerüst angelegt, Inhalt offen
- [ ] **Documentation / challenger** — Gerüst angelegt, Inhalt offen
- [ ] **Presentation** — Gerüst angelegt, Deck offen
- [ ] **Misc** — Links/Assets/Review offen
