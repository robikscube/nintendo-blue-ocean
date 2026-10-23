# Nintendo: The Next Blue Ocean

[![CI](https://github.com/robikscube/nintendo-blue-ocean/actions/workflows/ci.yml/badge.svg)](https://github.com/robikscube/nintendo-blue-ocean/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/robikscube/nintendo-blue-ocean/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/robikscube/nintendo-blue-ocean/actions/workflows/deploy-pages.yml)

A presenter-operated, audience-directed classroom case about Nintendo's strategic choices from 2005 to 2016. Three chapters, four hands-up votes, three fictional prototype reveals, and one sealed historical archive.

**This is a teaching exhibit, not a simulation of Nintendo's real board meetings.** The audience's choices create explicitly labelled `SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT` prototypes. Real product names, launch years, and official lifetime figures appear only in the final archive. The historical timeline never branches. This project is not affiliated with, endorsed by, or sponsored by Nintendo.

## What the class does

1. **2005 — one vote.** Enter the boardroom, hear the advisors, vote, and watch one fictional prototype take shape.
2. **2011 — one vote.** A new chapter, the same reusable boardroom and factory staging.
3. **2016 — two votes, one factory.** Decide where play happens and what the design prioritises; the single reveal combines both choices.
4. **The sealed archive.** After all four votes, reveal Wii (2006), Wii U (2012), and the original Nintendo Switch (2017), with official lifetime figures and source links beside the class's choices. There is no score, grade, or correct-answer card.

The presenter counts hands and records the majority. The experience is designed for a 10–15 minute classroom slot.

## Quick start

Requirements: **Node.js 20.19+** (Node 22 recommended) and npm.

```powershell
git clone https://github.com/robikscube/nintendo-blue-ocean.git
cd nintendo-blue-ocean/blue-ocean-game
npm ci
npm run dev
```

Open <http://127.0.0.1:5173/>.

For a production build:

```powershell
npm run build
npm run preview
```

Open <http://127.0.0.1:4173/>. Do **not** open `dist/index.html` through `file://`; this is a module-based Vite app and needs a local HTTP server.

## Presenter controls

| Key | Action |
|---|---|
| `Space` / `Enter` | Complete the line if it is still typing; advance once complete |
| `1` `2` `3` | Select option A / B / C |
| `V` | Record the selected vote |
| `S` | Skip the factory animation |
| `P` | Open the presenter drawer |
| `R` / `Shift+R` | Restart the current scene / reset the entire demo |
| `M` / `F` | Mute / toggle fullscreen |

Directions `←` `→`, rewind, volume, finale-only, and Reset are in the presenter drawer. The full control reference is in [`blue-ocean-game/README.md`](blue-ocean-game/README.md).

## Technology

- **Vite 8** + **TypeScript** (strict)
- **Three.js 0.186** for the boardroom, factory, and procedural prototypes
- **GSAP** for camera and factory animation
- **Web Audio API** for original, sample-free character babble and licensed music routing
- **CSS/DOM** dialogue, choices, presenter drawer, and archive overlay
- **Vitest** unit tests and **Playwright** classroom-flow tests

The app is a static single-page web application. It has no backend, database, login, live polling, runtime AI, or CDN dependency. After the build it runs offline from a local static server.

## Repository layout

| Path | Contents |
|---|---|
| `blue-ocean-game/` | The application (source, tests, public assets) |
| `blue-ocean-game/src/core/` | Story data, typed state transitions, checkpoint, store |
| `blue-ocean-game/src/ui/` | Dialogue, choices, factory card, presenter drawer, archive |
| `blue-ocean-game/src/scene/` | Three.js boardroom, factory, prototypes, optional GLB adapter |
| `blue-ocean-game/src/audio/` | Procedural babble, cues, and licensed-music routing |
| `blue-ocean-game/tests/` | Vitest unit tests and Playwright specs |
| `blue-ocean-game/dist-pages/` | Prebuilt GitHub Pages artifact |
| `.github/workflows/` | CI and GitHub Pages deployment |

## Documentation

| Document | Purpose |
|---|---|
| [`GAME_DESIGN.md`](GAME_DESIGN.md) | Creative intent, chapter dialogue, exact decisions, historical boundaries |
| [`TECHNICAL_SPEC.md`](TECHNICAL_SPEC.md) | Architecture and interface contracts |
| [`ASSET_PIPELINE.md`](ASSET_PIPELINE.md) | Optional Tripo3D character pipeline and drop-in GLB rules |
| [`blue-ocean-game/README.md`](blue-ocean-game/README.md) | Full run, controls, historical sources, and implementation notes |
| [`blue-ocean-game/CHARACTER_PERSONAS.md`](blue-ocean-game/CHARACTER_PERSONAS.md) | The five advisors' voices and personalities |

## Testing

```powershell
cd blue-ocean-game
npm run typecheck
npm test
npm run build
```

CI runs those checks plus `npm audit --audit-level=high` on every push and pull request. The full Playwright classroom suite is intentionally not in the default CI job because it takes roughly 15–20 minutes under software WebGL:

```powershell
npm run test:e2e
```

## GitHub Pages

The repository includes a Pages workflow and a prebuilt `dist-pages/` artifact. After the first push, enable **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow rebuilds the app with the repository-name base path and deploys it to:

<https://robikscube.github.io/nintendo-blue-ocean/>

For classroom use, the local production build remains the primary delivery method; the hosted copy is a backup. See [`blue-ocean-game/README.md`](blue-ocean-game/README.md) for run instructions and presentation controls.

## Historical accuracy

- Official lifetime hardware figures (as of June 30, 2026): Wii **101.63 million**, Wii U **13.56 million**, original Nintendo Switch **156.59 million**. Source: [Nintendo Investor Relations](https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html).
- Figures are worldwide cumulative hardware shipments, not unique players, customers, revenue, or proof of causation.
- All audience-created prototypes are labelled as simulated concepts. The project does not compute or imply sales, demand, profit, market share, or success probability.
- Full citations and interpretive sources appear in the in-app archive.

## Licensing and attribution

- **Code:** [MIT](LICENSE).
- **Original content:** story, dialogue, characters, art direction, documentation, and screenshots are [CC BY 4.0](CONTENT_LICENSE.md).
- **Music:** five tracks by Towball from *Towball's Crossing*, used under CC BY 4.0. Full details are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and [`blue-ocean-game/MUSIC_LICENSE.md`](blue-ocean-game/MUSIC_LICENSE.md).
- **Runtime libraries:** Three.js is MIT; GSAP uses its own standard no-charge licence, not MIT. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
- **Trademarks:** Nintendo, Wii, Wii U, and Nintendo Switch are trademarks of Nintendo. They are used here for identification and historical commentary only. No Nintendo-owned assets are included.
