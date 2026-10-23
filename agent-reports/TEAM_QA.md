# TEAM QA — Independent verification

**Owner:** qa teammate  
**Verification window:** 2026-10-21 23:01–23:50 PT  
**Frozen source snapshot:** latest `src` edit 23:25:53 (`src/scene/scene-director.ts`); no source edits were made by QA. Build produced 23:47.  
**Environment:** Windows 10, Chromium (Playwright 1.64.1), headless with `--use-angle=swiftshader --enable-unsafe-swiftshader`, viewport **1920×1080**, dev server `http://127.0.0.1:5173`, production preview `http://127.0.0.1:4173`.

QA was adapted to a presenter-led narrative: oracles are phase/state transitions, sealed-history text, exact concept titles, one factory per chapter, checkpoint recovery, and branch-specific UI — not combat, score, or failure states.

## New files (exclusive ownership)

- `blue-ocean-game/tests/team-canonical-flow.spec.ts` — canonical 4-vote/3-factory flow, sealed-history scan, archive facts, 1080p overflow, page/console error collection.
- `blue-ocean-game/tests/team-presenter-resilience.spec.ts` — presenter jump back/ahead, "Not voted" disclosure, reload draft/committed/finale checkpoints, confirmed reset.
- `blue-ocean-game/tests/team-factory-fallback.spec.ts` — normal-motion skip/replay, reduced-motion replay, mid-animation reload, WebGL-off story path.
- `blue-ocean-game/tests/team-branches.spec.ts` — every D1 (3), D2 (3), and D3×D4 (9) browser branch.
- `blue-ocean-game/qa-screens/team-*.png` and `team-preview-*.png` — evidence screenshots.

No existing test, runtime file, config, CSS, or package file was edited.

> **Discovery caveat (handoff action):** the repo config sets `testDir: './tests/e2e'`, so `tests/team-*.spec.ts` are **not** discovered by `npm run test:e2e`. I ran them with an external config at `C:\Users\robwa\.claude\jobs\e3566973\tmp\playwright.team.config.cjs` (`testDir` = project `tests`, `testMatch` = `team-*.spec.ts`, no webServer; reuses dev 5173). To keep these tests in the repo, the lead should widen `testDir`/`testMatch` or move them under `tests/e2e/`.

## Commands and real results

| # | Command | Result |
|---|---|---|
| 1 | `npm test -- --reporter=dot` | **PASS** — 4 files, **58/58 tests**, 805 ms |
| 2 | `npm run typecheck` | **PASS** — `tsc --noEmit`, exit 0 |
| 3 | `npm run test:e2e` (repo config, dev server) | **PASS** — **8/8 tests**, 3.4 min |
| 4 | `npx playwright test --config=<external> tests/team-branches.spec.ts` | **PASS** — **15/15**, 5.8 min |
| 5 | `npx playwright test --config=<external> tests/team-presenter-resilience.spec.ts` | **PASS** — **4/4**, 2.6 min |
| 6 | `npx playwright test --config=<external> tests/team-factory-fallback.spec.ts` | **PASS** — **3/3**, 1.2 min (mid-animation reload test added and run separately: **PASS**, 50.8 s) |
| 7 | `npx playwright test --config=<external> tests/team-canonical-flow.spec.ts` | **PASS** — **1/1**, 40.5 s |
| 8 | `npm run build` | **PASS** — exit 0, 29 modules, `dist/assets/index-CRDbDPKC.js` 861.15 kB (235.19 kB gzip) + source map; Vite warns chunk >500 kB |
| 9 | `npx playwright test --config=playwright.preview.config.mjs --grep "completes all three chapters"` (fresh build on 4173) | **PASS** — **1/1**, 21.8 s |

Totals actually executed on the frozen source: **58 unit + 8 repo e2e + 24 team browser tests + 1 preview-built e2e = 91 passing checks**, plus the build. The 24 team specs were run per-file (15 + 4 + 3 + 1 + 1); no single combined team-suite run is claimed.

## Confirmed behavior (on frozen source, current build)

1. **Canonical flow** — title → opening → 3 chapters → 4 votes (D1 B, D2 B, D3 C, D4 B) → exactly **3 factory entries**; no factory between D3 and D4; transition → sealed finale → archive. Passed in dev and in the built preview.
2. **Sealed history** — at title, every briefing/voting/factory/transition/finale intro: body text contains no `Wii`, `Wii U`, `Nintendo Switch`, `Joy-Con`, `GamePad`, `101.63`, `13.56`, `156.59`, `June 30, 2026`, `2006`, `2012`, or `2017`; `#seal-indicator` reads `HISTORICAL RECORD SEALED`; no `.archive-screen`.
3. **Archive** — after "Break the seal": correct three products, years, `101.63 / 13.56 / 156.59 million`, `As of June 30, 2026`, "not unique players", "No pass/fail", D3 `C · Hybrid`, D4 `B · Shared Play`, and Nintendo IR source link. Archive status becomes `HISTORICAL RECORD OPEN`.
4. **Presenter jump back** — previously a release blocker. Now jumping to a voted chapter clears that chapter/later votes, shows a real `.voting-screen` with 3 cards, allows a new vote, and reaches the factory (`d1 = 'A'`). Fixture: `team-presenter-jump-revoted-1920.png`.
5. **Presenter jump ahead** — no invented votes (`choices = {}`); archive shows **4 "Not voted" path chips** and no fabricated option label.
6. **Checkpoints** — uncommitted draft choice survives reload; committed D1 survives reload; reload during a **running** factory restores idle and rebuilds exactly once (`d1` preserved); reload on the finale returns to the **sealed intro**, not the open archive.
7. **Reset** — presenter Reset (confirmed dialog) returns to title with `choices = {}`, `started = false`, and preserves the mute preference.
8. **All branches** — 3/3 D1, 3/3 D2, 9/9 D3×D4 reach their specific DOM heading and `.factory-source` labels, stamp the exact `SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT`, render the factory scene (`getDebugInfo().mode === 'factory'`, draw calls > 0), and produce no page errors. Distinctness verified at state/title level; 9 pixel-level 3D comparisons were not performed.
9. **Factory controls** — normal motion reaches `running`; Skip moves to `done` and reveals Leave/Replay; Replay re-enters `running` with Skip present, can be skipped again, leaves exactly one `.factory-screen`/`.factory-card`, and continues to feedback once. Reduced-motion replay trace is `['idle','running','done']` with an in-page build span < 1.5 s.
10. **WebGL disabled** — `scene === null`, `#fallback-note` visible, `html.no-webgl`; factory resolves to `done`, label/Leave present; finale + archive remain reachable and factually complete; no page errors.
11. **1080p layout** — at 1920×1080 there is no horizontal document overflow at title, voting, factory, or archive; primary actions reachable.
12. **Existing e2e** — all 8 pre-existing browser specs pass on current source.

## Findings / risks

- **No confirmed product defect remains in the tested scope.** The presenter re-entry dead end and placeholder-vote archive issue are fixed and regression-tested.
- **[Process — action needed] Team specs are invisible to `npm run test:e2e`** because of `testDir`. Widen the config or relocate the files, otherwise the suite is not durable after this job's temp config disappears.
- **[Test-environment limitation, not app defect]** 1920×1080 screenshots under SwiftShader take tens of seconds; a WebGL-disabled screenshot once hung past 90 s, and Playwright's "stable" check on a scrolled archive button timed out under very low frame rates. Final specs avoid screenshots during timed checks and avoid that scroll-click. Real-GPU presenter latency and FPS were not measured.
- **[Transient, not reproducible on frozen source]** During the character-adapter integration, one canonical run logged two `3D preview unavailable … ReferenceError: AnimalAvatar is not defined` console errors across HMR reloads (23:10 PT). The frozen 23:25 source passed canonical with zero page errors and zero unexpected console errors; treat the earlier log as an integration-time HMR artifact, not a current defect.
- **[Minor UX observation]** The jump/placeholder toast overlays the lower part of vote card B for ~3.2 s at 1080p (`team-presenter-jump-revoted-1920.png`). Transient, not a story blocker.
- **[Observation]** Skip was measured at ~4.7 s wall-clock under software WebGL after a screenshot, but state reaches `done` and exposes the reveal; this is harness/render cost, not a claim about real-GPU latency.
- **[Not verified]** Offline/disconnected-Wi-Fi load of the built artifact, target-laptop FPS/draw-call budget, real projector readability at 3–4 m, presenter-drawer focus trap, missing/invalid-GLB fallback specifically, and 1366×768/1024×768 layouts. The existing dev-server test confirms all runtime requests stay on origin, and the build emits only local assets, but a dedicated request/offline audit of the built preview was not run.

## Screenshot evidence (fresh, post-freeze where noted)

- `qa-screens/team-preview-vote-1920.png`, `team-preview-factory-1920.png`, `team-preview-archive-1920.png` — 23:49, captured from the **production build** on preview; archive shows chosen path B/B/C/B.
- `qa-screens/team-presenter-jump-revoted-1920.png` — 23:20, re-votable screen after a presenter jump.
- `qa-screens/team-factory-running-1920.png`, `team-factory-revealed-1920.png` — 23:31, normal-motion build/reveal.
- `qa-screens/team-reload-factory-checkpoint-1920.png` — 23:22, factory after reload.
- `qa-screens/team-branch-d1-B-1920.png`, `team-branch-d2-C-1920.png`, `team-branch-d3C-d4B-1920.png` — 23:15–23:20, branch-specific concepts.
- `qa-screens/team-canonical-01-title-1920.png` (23:35) and `team-canonical-07-archive-1920.png` (23:42) — post-freeze; 02–06 are pre-character-integration (23:11) and superseded by the preview screenshots above.

## Release view

**Cleared for classroom rehearsal on the verified scope:** story/pacing flow, branch integrity, historical sealing/reveal, presenter jump recovery, factory skip/replay, reload/reset, WebGL fallback, and 1080p layout all pass on the current source and build. Remaining items are handoff/config work, real-projector/FPS checks, and the explicitly unverified cases above — not reproducible code defects.
