# Universal Round 1 UI — Independent QA (Workstream D)

**STATUS: IN PROGRESS — baseline audit complete; waiting for integrated B/C screens before running the browser matrix.**
Started 2026-10-22. Owner: Workstream D (read-only QA). This file is the authoritative QA record.

## Scope and rules

- Read-only for `src/**`, `public/**`, existing tests/config. QA writes only this report, `blue-ocean-game/tests/e2e/universal-ui.spec.ts`, `blue-ocean-game/scripts/universal-ui-qa.mjs`, and `agent-reports/universal-ui/screens/**`.
- Narrative QA evaluates decisions, history sealing, accessibility and classroom operability — not combat, score or failure states.
- QA runs on a dedicated port (Vite 5188; production preview 4188) and its own Playwright output dirs, so it cannot collide with the lead's 5173 server or another suite.

## Baseline audit (actually run)

| Check | Result |
|---|---|
| SHA-256 audit of `PROTECTED_BASELINE.sha256` (33 files: approved badge, bubble, five `towball-*.mp3`, music licence, `src/core/**`, `src/audio/**`, `src/scene/**`, package/config) | **33/33 byte-identical, 0 mismatches, 0 missing** (2026-10-22, before integration) |
| `tests/e2e/universal-ui.spec.ts` exists before QA | No — created new (verified absent) |
| `scripts/universal-ui-qa.mjs` exists before QA | No — created new (verified absent) |
| Port 5173 at QA start | Occupied by integration dev server; QA will not use it |
| Port 5188 / 4188 | Free at QA start |

The hash audit is re-run in the automated suite (test 1) and in `scripts/universal-ui-qa.mjs` against the final integrated tree.

## Deliverables built

- `blue-ocean-game/tests/e2e/universal-ui.spec.ts` — self-contained acceptance suite using the new exact labels (`Start`, `Confirm`, `Continue`) and current story constants. Six tests: frozen hashes; welcome at 1920/1366/1024; animated canonical journey (dialogue, mute, four votes, three factories, transitions, sealed finale, archive); responsive journeys at 1366/1024 with different choices; presenter drawer at 1366; static-preview smoke.
- `blue-ocean-game/scripts/universal-ui-qa.mjs` — hash audit, `npm run typecheck`, `npm test`, `npm run build`, Vite 5188 dev run, `vite preview` 4188 production smoke. Logs and screenshots are written under `agent-reports/universal-ui/screens/`.

## Planned matrix (from `agent-reports/UNIVERSAL_UI_TASKS.md` §D)

1. Frozen assets/protected source hashes.
2. Welcome at 1920×1080, 1366×768, 1024×768: badge `naturalWidth>0` local, centered/high, one exact **Start**, live music credit, no old clutter, no overflow, HUD controls clickable.
3. Dialogue: all five speakers + narrator, approved bubble loads, name tag fills, no text overflow, continue works, mute stops babble, reduced motion, no HUD overlap.
4. Votes D1–D4: `BOARD VOTE · VOTE n OF m`, no `CHAPTER`, no context paragraph, no audience footer, exact **Confirm**, disabled until selection, records correct choice, keyboard 1/2/3 + V.
5. Both transitions: no sealed footnote, exact **Continue**, advances.
6. Factories D1/D2/D3×D4: no banner/card eyebrow/prototype number, `.factory-source` hidden but present with exact labels, one quiet exact simulated label, **Confirm** after build, distinct titles/geometry, Skip/Replay.
7. Finale/archive: sealed screen, 101.63 / 13.56 / 156.59 million, sources, cautions, discussion, no pre-finale leak, evidence jump.
8. Presenter: gear `aria-label="Presenter settings"`, drawer heading, focus trap, inert background, reset, 1366 reachability.
9. Runtime: no page errors, failed local requests, external requests or horizontal overflow at three sizes; audio initializes after first gesture; mute works.
10. Production build served locally; same core journey; assets local-only.

## Integration wait log

- 16:31 — A/B/C reports present, all IN PROGRESS.
- 16:37 — A (`WELCOME.md`) final, **PASS WITH NOTES**. B/C still IN PROGRESS; browser matrix not run against incomplete screens.
- QA will not fabricate results for unintegrated screens. Remaining checks will be appended with actual command output once B/C finalize or the lead signals proceed.

## Status: IN PROGRESS
