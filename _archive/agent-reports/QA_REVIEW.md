# QA Review — Nintendo: The Next Blue Ocean

**Snapshot:** 2026-10-21 22:46–22:48 PT. The newest `blue-ocean-game/src` edit was 22:45:18; no source change was observed during this review. This is a point-in-time review, not a git diff (the folder is not a git repository). I read `PARALLEL_TASKS.md`, `CLAUDE.md`, `GAME_DESIGN.md`, `TECHNICAL_SPEC.md`, `24_HOUR_BUILD_PLAN.md`, `ASSET_PIPELINE.md`, the `game-qa` skill and its reference files, all of `blue-ocean-game/src`, `tests`, `package.json`, Vite config, and `scripts/visual-walkthrough.mjs`.

## 1. Verification performed

- `npm --prefix C:\Users\robwa\Desktop\Nintendo\blue-ocean-game test -- --reporter=verbose` — **exit 0**. 3 test files, **30/30 tests passed** (735 ms): story, prototype-spec, state/checkpoint.
- `npm --prefix C:\Users\robwa\Desktop\Nintendo\blue-ocean-game run typecheck` — **exit 0** (`tsc --noEmit`).
- Not run: dev server, browser flow, `npm run build`, `npm run preview`, or `npm run test:e2e`. Review-only constraints prohibit starting a server or writing `dist`; Playwright cannot currently run as a suite (see below).
- Existing artifacts `qa-screens/01-title.png` … `15-archive.png` are from 22:42–22:44, **before** the latest 22:45 edits. They show only one branch and were captured with `reducedMotion: "reduce"` (`scripts/visual-walkthrough.mjs:15`), so they do not exercise factory animation or verify current source. Screenshot 07 already says “ASSEMBLY COMPLETE” at the point labelled “factory-running”; the walkthrough's later `S` key is effectively redundant.
- Static inspection found no runtime `fetch`, CDN, external font, or asset request in `src`; the only external links are the citations in the archive. A true offline/built-page check remains unperformed.

## 2. Prioritized reproducible tests

Use a fresh browser context and clear `sessionStorage` unless a test seeds a checkpoint. For fast narrative tests set `reducedMotion: "reduce"`; this makes dialogue instant and auto-finishes the factory, so do **not** use it for the factory-animation tests. Useful state probes are `window.__GAME_STATE__` (phase, chapterIndex, choices, factoryProgress), `window.__GAME_READY__`, and `window.__GAME__.scene.getDebugInfo()`.

**P0.1 — Canonical four-vote story, with sealed archive and one factory per chapter.**
1. Goto `http://127.0.0.1:5173/`; wait for `window.__GAME_READY__`; click `[data-action="start"]`.
2. Drain each dialogue phase by pressing `Space` until `window.__GAME_STATE__.phase` changes; wait at least 170 ms between presses because `ui.ts:770` ignores advances within 140 ms.
3. Click `[data-action="begin-chapter"]`; at `voting`, record D1=B (`[data-choice="B"]`, `[data-action="commit-choice"]`).
4. Wait for `phase === "factory"` and `factoryProgress === "done"`; assert the visible label contains `SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT`; click `[data-action="leave-factory"]`.
5. Repeat with D2=B, then D3=C. After committing D3, assert `phase === "voting"`, `choices.d3 === "C"`, `choices.d4` is undefined, and no factory UI is visible. Commit D4=B and assert exactly one Chapter-3 factory entry.
6. At each chapter transition click `[data-action="transition-next"]` (the Chapter-3 button reads “Open the sealed archive”); at the finale intro click `[data-action="open-archive"]` (“Break the seal”).
7. Assert the phase order contains `opening, briefing, advisors, voting, factory, feedback, boss, transition` for chapters 1 and 2 and the equivalent for chapter 3, then `finale`; exactly three factory entries; archive shows Wii / Wii U / Original Nintendo Switch with 101.63 / 13.56 / 156.59 million and “As of June 30, 2026”; no console/page errors.

**P0.2 — Presenter jump after a vote (currently expected to FAIL).**
1. Complete a D1 vote and reach the 2005 factory.
2. Press `P`, click `[data-action="presenter-mode"]`, click `[data-action="jump-chapter"][data-index="0"]`, close the drawer.
3. Click `[data-action="begin-chapter"]` and drain the four advisor lines.
4. Expected: `.voting-screen` and `[data-choice="A"]` appear. Current snapshot: `phase` becomes `voting` but the view is blank (`renderVoting()` returns `""` when `getActiveDecision()` is null). The same dead end occurs when jumping back to any chapter whose vote already exists. This is a confirmed release-blocker; add it as a state regression test as well: `JUMP_CHAPTER` followed by dialogue completion must either clear the target chapter's votes or support re-voting.

**P0.3 — No historical leak before the finale.**
At title, opening, every briefing/voting/factory/feedback/boss/transition screen, assert `body.innerText` does not contain `Wii U`, `Wii`, `Nintendo Switch`, `Joy-Con`, `GamePad`, `101.63`, `13.56`, `156.59`, `2006`, `2012`, or `2017`. Assert `#seal-indicator` reads `HISTORICAL RECORD SEALED` and `.archive-screen` is absent. After opening the archive, assert all names, years, figures, and the Nintendo IR link are present. This tests UI leakage in addition to the existing data-only story test.

**P0.4 — Refresh/checkpoint/reset.**
- Reach Chapter 2 voting with D1 committed and select D2=B **without** committing; call `page.reload()`; wait for ready. Expected: phase `voting`, chapterIndex 1, `choices.d1` preserved, `selectedChoice === "B"`, and `[data-choice="B"]` has `.is-selected`. Check `sessionStorage["nintendo-next-blue-ocean:session:v2"]` if useful.
- Reload while the factory is running (normal motion, roughly 250 ms after entry). Expected: the saved state normalizes to `factoryProgress: "idle"` (`checkpoint.ts:121-127`), the UI restarts the factory, and it reaches `done` without duplicate prototypes or page errors.
- Open Presenter, register `page.on("dialog", d => d.accept())`, click `[data-action="reset-demo"]`. Expected: title screen, `choices === {}`, `started === false`; mute preference survives. Note `clearSession()` is followed by `saveSession()`, so the session key is rewritten with title state, not left absent.
- Reload on the finale: archive-open is intentionally transient (`ui.ts:242-249`), so the safe restored screen is the sealed finale intro, not the archive. Add this as an explicit expectation to avoid a false bug report.

**P0.5 — Interactive factory skip and replay.**
Use `reducedMotion: "no-preference"` and mute only if needed.
- From commit to factory, wait for `factoryProgress === "running"`; press `S` at about 250 ms. Assert `done` quickly (measure: under 1.5 s), the reveal card is visible, and `[data-action="leave-factory"]` continues the story.
- After done, click `[data-action="replay-factory"]`. Desired oracle: replay is either explicitly represented by `factoryProgress` moving back to `running` with a skip control, or it is non-blocking and clearly labelled. Current snapshot fails the first part: the store remains `done`, the card still says “ASSEMBLY COMPLETE”, and the Skip button is absent while the scene rebuilds (`ui.ts:965-969`; `scene-director.ts:194-197`).
- Accessibility variant: in a `reducedMotion: "reduce"` context the initial factory completes instantly, but `Factory.replay()` calls `play(spec, null)` without the reduced-motion flag (`factory.ts:510-514`), so replay runs the full timeline. Desired: replay obeys reduced motion. This is confirmed by code inspection and needs a test accessor or DOM timing assertion.
- Double-click replay twice; assert only one prototype root/current model exists and no page errors (“kill all prior timelines” should prevent overlap).

**P1.1 — All decisions and all nine Chapter-3 combinations.**
Existing unit tests prove nine distinct specs and distinct titles, but not that the runtime builds nine valid Three.js groups. Add browser checks for D1 A/B/C and D2 A/B/C with fresh contexts, and all nine D3×D4 combinations (fresh context or a test-only session seed at Chapter 3 voting). Assert one factory entry, the correct `.factory-card h2`, the simulated label, no page errors, and a visible difference (screenshot pair or a small debug-exposed prototype key). A `getDebugInfo()` currently exposes only camera/renderer data, so this is a testing gap.

**P1.2 — Projection readability and aspect ratios.**
Test 1920×1080, 1366×768, 1280×720, 1024×768 (4:3), and 2560×1080. For each, reach voting, factory-done, dialogue, and archive states (seed `sessionStorage` for speed after one real flow). Assert: no horizontal `documentElement` overflow; all primary actions (`commit`, `skip`, `leave`, `transition-next`, `open-archive`) are reachable; `.choice-card` count is 3; text is not clipped; the screen remains keyboard-scrollable where intended.
At 1920×1080, record computed sizes: `.dialogue-text` is 20–27 px, `.choice-title` 24–32 px, but `.choice-detail` is 13.5–16 px, `.choice-tradeoff` 11.5–13.5 px, `.factory-lede` 13 px, `.factory-source` 10 px, and archive body copy 10.5–12 px (`style.css:1042,1059,1198-1204,1280-1284,1895,1926`). The technical spec's 24 px minimum is not met by supporting text; verify from 3–4 m on the actual projector before accepting the layout.

**P1.3 — 3D fallback.**
Before navigation, stub `HTMLCanvasElement.prototype.getContext` so WebGL requests return `null`. Expected: `.no-webgl` is added, `#fallback-note` is visible, the title/opening/votes/finale still play, and the factory completes without a scene. Current `main.ts:36-41` and `ui.ts:143-146,890-897` implement this path; it is not exercised by any existing test.

**P1.4 — GLB/asset-loading fallback — BLOCKED.**
There is no character loader or GLTF import in `src` (grep for `GLTF|GLB|GLBLoader|assets/` returned no matches). `animals.ts:15` exports a concrete `AnimalAvatar`; `boardroom.ts:44` constructs it synchronously. The `ASSET_PIPELINE.md:42-49` contract (`createAdvisor`, absent/invalid model fallback, normalization, clips) is not implemented, so a missing-GLB test cannot currently run. Current fallback is only “all characters are procedural”; that is safe for the story but the future test must load an invalid/missing `public/assets/characters/...` model and assert the same story and procedural advisor remain.

**P2.1 — Performance and built-page offline test.**
On the target laptop, measure rAF FPS over 5 s in both boardroom and factory and record `getDebugInfo().drawCalls/triangles`; require >=30 fps per `TECHNICAL_SPEC.md:146`. The scene uses many individual meshes, a 1536 shadow map, antialiasing, and pixel ratio up to 2 (`scene-director.ts:62,67,84`), so this is an unknown, not a proven defect. Separately, after a future `npm run build`, serve `dist` (dev server does not prove offline), block all external requests, reload, and verify the complete story plus citations; test the `GITHUB_PAGES=true`/`VITE_BASE` subpath as well.

## 3. Confirmed defects and code-grounded risks

- **[HIGH — confirmed] Presenter jump/re-entry dead-ends after existing votes.** `getActiveDecision()` returns `null` if the target decision is already in `choices` (`state.ts:59-68`), `jumpChapter()` copies old choices without clearing them (`state.ts:167-180`), and `COMMIT_CHOICE` refuses to overwrite (`state.ts:204-208`). The voting renderer then returns an empty string (`ui.ts:452-455`). This breaks a documented presenter control and makes rehearsal jumps unreliable.
- **[MEDIUM — confirmed] Factory replay is not represented in game state.** The UI handler only calls `scene.replayFactory()` (`ui.ts:965-969`); it does not dispatch `FACTORY_STARTED`. The completion card and absent Skip button remain while the arms rebuild. The state/story still work, but the presenter cannot tell whether a build is in progress or completed.
- **[MEDIUM — confirmed accessibility] Reduced-motion replay ignores the preference.** `SceneDirector.startFactory()` honors `reducedMotion` (`scene-director.ts:183-187`), but `replayFactory()` calls `factory.replay()` (`scene-director.ts:194-197`), which calls `play(spec, null)` with the flag defaulting false (`factory.ts:510-514`). The primary path is fine; replay is not.
- **[MEDIUM — confirmed gap] No GLB adapter / per-character fallback implementation.** The asset pipeline calls for `createAdvisor` and graceful missing-model behavior; current source has neither a loader nor an adapter. All visual QA therefore tests only procedural assets. This blocks the planned Tripo3D integration but does not break the three-chapter story.
- **[MEDIUM — confirmed readability risk] Supporting text is well below the 24 px projection benchmark.** The primary dialogue and choice titles meet it, but benefit/trade-off, factory, and archive body text are 8–16 px at 1920×1080. The existing screenshots make this visible; confirm at classroom distance.
- **[MEDIUM — coverage/evidence] No runnable Playwright suite.** `package.json:14-16` declares `test:e2e`, but there is no `playwright.config.*` and no `tests/e2e` spec. `tests/*.test.ts` are Vitest files. The only browser artifact is the ad-hoc walkthrough, which has no assertions and merely logs `ERRORS` at line 137; console errors would not fail it. The suite cannot currently substantiate a release.
- **[LOW — likely accessibility] Presenter dialog has no focus trap.** The drawer is `role="dialog" aria-modal="true"` (`ui.ts:796-805`), but there is no `inert` background or Tab containment; only initial focus is moved (`ui.ts:1259-1262`). Keyboard focus can leave the modal. Not a story blocker.
- **[UNKNOWN/MONITOR] Performance and 4:3 behavior.** No FPS measurement exists; responsive CSS has a 850 px stack breakpoint and 800 px height adjustments, but there is no executed evidence at 1024×768/1366×768. Treat these as verification work, not confirmed defects.
- **[LOW — confirmed but benign] Restart at the transition screen changes no visible content.** `RESTART_SCENE` retains `phase: "transition"` (`state.ts:261-268`), so the toast reports a restart but the same screen remains. It does not corrupt the story; lower priority than the jump bug.

## 4. Coverage gaps and smallest high-value additions

Current Vitest coverage is solid for pure state, story copy, checkpoint normalization, and prototype metadata. It does not execute React-free UI input, the Three.js scene, browser storage, or layout.

1. Add `playwright.config.ts` (base URL `http://127.0.0.1:5173`, `webServer` using `npm run dev`, console/pageerror collection, two projects or explicit viewport tests). No source refactor is required.
2. Add one `tests/e2e/story.spec.ts`: P0.1 canonical flow, sealed-archive assertions, and one console-error collector. This is the highest-value missing test.
3. Add one `tests/e2e/resilience.spec.ts`: P0.2 presenter jump, P0.4 reload/reset, P0.5 skip/replay, P1.3 WebGL fallback.
4. Add a small state unit regression for the jump: advance to a completed vote, jump to that chapter, finish advisors, assert a voting decision is available and can be committed. This test is expected to fail at this snapshot and pinpoints the blocker.
5. For the factory, expose a minimal test-only/debug accessor for `factoryProgress` and the current prototype key (or use a stable `userData.key` query) so all nine runtime groups can be verified without pixel-only tests. This is testability work, not a gameplay change.
6. When the GLB adapter lands, add a missing/invalid-model browser test and a no-network test; until then record it as intentionally deferred rather than passing.

## 5. Release decision

**Release blockers**
1. Fix and regression-test the presenter jump/re-enter dead end (P0.2). It is a real runtime failure in a required presenter workflow.
2. Obtain a fresh browser run and production/offline verification against this current snapshot. The 30 unit tests and typecheck pass, but the existing walkthrough is stale, reduced-motion-only, and non-asserting; do not claim the classroom flow is verified yet.

**Should fix before classroom rehearsal**
- Factory replay state, skip affordance, and reduced-motion replay behavior.
- Projection typography and manual 1024×768/1366×768 checks.
- Modal focus containment in the presenter drawer.
- Add the GLB adapter/fallback before any Tripo3D asset is integrated.

**Monitor**
- FPS/draw calls on the target laptop, archive scrolling at 720p/4:3, and subpath/offline build behavior.
- Keep `qa-screens` clearly labelled as pre-22:45 artifacts; regenerate them after the next source freeze.
