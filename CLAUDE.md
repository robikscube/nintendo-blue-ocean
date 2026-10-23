# Nintendo: The Next Blue Ocean — Claude Code Project Instructions

## Mission
Maintain a presenter-operated, audience-directed, 10–15-minute teaching exhibit about Nintendo's strategic choices from the Wii era through the original Switch. It is a decision-driven narrative exhibit, not a physics/combat game, and it must be reliable in a classroom.

Before making changes, read:
1. `GAME_DESIGN.md` — narrative, exact decisions, and historical boundaries.
2. `TECHNICAL_SPEC.md` — architecture and interface contracts.
3. `ASSET_PIPELINE.md` — optional final-character GLB workflow.
4. `blue-ocean-game/README.md` — current run, controls, and test instructions.

The actual code and tests in `blue-ocean-game/` are the source of truth for the implemented game. Prioritize factual accuracy, end-to-end playability, accessibility, then visual polish.

## Safety and working rules
- Work inside this repository and avoid destructive operations. Do not overwrite original case-study materials or approved artwork.
- Do not deploy, publish, push, spend money, or use a paid or unlicensed external asset/service without an explicit request.
- Preserve all music, artwork, and third-party attributions in the public licensing documents.
- Do not introduce runtime CDNs, sign-in, paid APIs, ads, or server requirements.
- Avoid uncontrolled parallel edits. If using multiple Claude Code agents, give each exclusive file ownership, check live sessions first, and integrate sequentially.
- Keep task reports, intermediate verification evidence, recovery records, and archived experiments in the locally ignored `agent-reports/` or `_archive/` directories. Do not commit those directories or root-level `UI_*.md` / recovery notes.
- Record exact commands/results, and do not claim a build or browser test passed unless it actually ran.

## Game invariants
- Chapters: 2005, 2011, 2016; four hands-up votes in order 1, 1, 2; at most three options per vote.
- The historical timeline never branches. Fictional prototypes depend on the votes, and must display the exact label: `SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT`.
- Do not reveal historical product sales figures before the sealed final archive; do not invent numbers, causal sales predictions, or a win/lose score.
- Reuse the boardroom and factory scenes. Keep skip/replay, reload/checkpoint, reset, presenter hotkeys, and keyboard accessibility working.
- Procedural character speech must respect mute and the first-user-gesture restriction. Keep licensed music local and credited.
- Maintain local/offline static hosting compatibility, including the GitHub Pages repository subpath.

## Engineering
The app is under `blue-ocean-game/` and uses Vite, TypeScript, Three.js, GSAP, Vitest, and Playwright.

For changes, run applicable checks from that directory:
```powershell
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Do not run multiple Playwright sessions with a shared output directory. Verify the 1920×1080 and 1366×768 projector layouts; ensure the 1024×768 fallback has no horizontal overflow. Preserve accessibility, honest historical citations, and the licensed-asset provenance.
