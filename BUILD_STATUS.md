# BUILD STATUS — Nintendo: The Next Blue Ocean
**Status date:** 2026-10-22, ~12:55 PST (approved dialogue bubble integration; persona-driven rewrite and Round 1 fixes preserved below)
**Owner:** resumed lead session. Round 1 specialists: P1 dialogue engine, P2 dialogue visual, P3 character writer, P4 boardroom layout, P5 camera (reports `agent-reports/round1/P1.md`–`P5.md`).
**Verdict:** a complete, runnable 3-chapter / 4-vote presentation build with the Round 1 playtest fixes and the persona-driven dialogue rewrite. Final-source verification passed: **58/58 unit**, typecheck, production build, **34/34 full Playwright suite** (12.1 min), **8/8 production-preview suite** (2.7 min), focused dialogue/factory **4/4**, and a **14/14** 1920/1366 acceptance capture with zero page errors. Earlier verified: offline preview and GitHub Pages subpath audits. Round 1 residuals are camera-composition notes (some side-seat neighbours are prominent/clipped), Shelldon visible width 19.8% at 1366, and physical projector/GLB/FPS validation, not reproduced code defects.

**Cast:** Hootley (owl), Slyvester (fox), Damian (beaver), Pawson (bear), Shelldon (turtle). Internal ids and asset folders remain `mori`/`pip`/`bolt`/`grumble`/`shell` and `owl`/`fox`/`beaver`/`bear`/`tortoise` for save, test, and Tripo3D compatibility.

### Approved dialogue bubble integration — 2026-10-22 (afternoon)

The final approved image-backed dialogue bubble is now the single speaking component for every `DialogueLine` phase (opening/narrator, chapter advisors, consequence/feedback, and boss). Transition and finale are static narrative screens with no speaker lines; they hide the bubble and receive clicks normally.

- **Artwork:** `public/assets/ui/dialogue-bubble.png` is a byte-identical copy of the approved `dialogue-template-clean.png` (SHA-256 `7ba24e94…87b6`, 3872 × 1552, 274,232 bytes). The ivory tag edge, striped rim, silhouette, chevron, transparency, and dark alpha are untouched. The speaker fill is the preview's exact 5,762-character inline SVG path (`src/ui/dialogue-art.ts`), verified string-identical to the preview.
- **Layout:** screen-space bottom anchor with a 16–24 px safe gap. Measured gaps: **19.44 px @1920×1080**, **16 px @1366×768 and 1024×768**; panel 1000×401 / 751×301 / 748×300, exact artwork ratio.
- **Type and fit:** dialogue copy 31 px @1920, 25.95 px @1366, 24.06 px @1024. A browser sweep of **all 69 authored text strings** in `story.ts` found zero horizontal/vertical overflow or copy-region escape at all three sizes; the longest line (154 characters) and longest name (Slyvester) fit.
- **Names:** live HTML name text is white for every speaker. Speaker cue fills are Pip/Slyvester `#67aeca`, Mori/Hootley `#6aa87b`, Grumble/Pawson `#d27ba6`, Bolt/Damian `#c58b3f`, Shell/Shelldon `#9185b8`, narrator neutral slate `#6f7480`. These are CSS-only UI colours; `CharacterProfile` 3D/voice colours are unchanged.
- **Behaviour preserved:** live reveal + 160 ms advance guard, reduced motion, mute/babble stop, manual hold, keyboard and click advance, saved state, presenter drawer focus/inert handling, factory skip/replay, and accessible continue-button semantics. The old superellipse/nameplate/teardrop speech styling is gone.
- **Validation actually run:** `npm run typecheck` exit 0; `npm test` **58/58**; `npm run build` exit 0; new focused suite **5/5 dev + 5/5 production preview** (`tests/e2e/dialogue-bubble.spec.ts`), including a complete 3-chapter/4-vote flow, pointer choice selection, factory skip, feedback/boss, transitions, finale archive, mute, reload, reset, and presenter modal z-order; existing `interactions.spec.ts` + canonical flow **5/5**; offline preview audit zero external requests/local failures/page errors; GitHub Pages subpath build and dialogue asset audit passed with the PNG served successfully from `/nintendo-next-blue-ocean/assets/ui/dialogue-bubble.png`.
- Evidence and exact changed-file inventory: `agent-reports/dialogue-integration-20261022/IMPLEMENTATION.md`. Screenshots in `agent-reports/dialogue-integration-20261022/evidence/screens/`.

### Persona-driven dialogue rewrite — 2026-10-22
- `blue-ocean-game/CHARACTER_PERSONAS.md` defines the five villagers using Animal Crossing-style archetypes as design principles, not copied characters.
- `src/core/story.ts` now has **66 unique spoken strings** (5 opening, 22 advisor, 12 feedback, 12 boss, 9 coherence, 3 closings, 2 fallbacks, 1 synthesis), **1,322 words**, min 10 / median 21 / max 28. No duplicates, no banned AI-cliché words, no pre-finale history leaks.
- Added direct banter: Slyvester's poster vs. Pawson's invoice, the sandwich argument, the picnic budget, and Shelldon-style boss questions addressed to named characters. No runtime AI; all authored data.
- Skills applied: `no-ai-slop`, `character-sim`, `natural-dialogue-techniques`.
- Unit/typecheck/build completed; full browser-suite result is recorded in `agent-reports/CHARACTER_REWRITE.md`.

## Round 1 playtest fixes — 2026-10-22

Requirements: `PLAYTEST_FEEDBACK_ROUND1.md`. Integration report: `agent-reports/ROUND1_INTEGRATION.md`.

### Implemented
- **P1 — dialogue engine** (`src/ui/ui.ts`): rAF + `performance.now()` reveal at 215 chars/s, 260–1000 ms clamp, **950 ms hard deadline**; full text holds until deliberate click/Space/Enter; click while typing completes, 160 ms double-trigger guard; narrator/reduced-motion/hidden-tab immediate; no caret at completion; babble stops; 210 ms `is-leaving` exit hook. Ten-line measurements: **481–951 ms @1920**, **484–795 ms @1366**, all held, no blips during hold.
- **P2 — dialogue visual** (`src/style.css`): original asymmetric translucent superellipse bubble, 3 px light rim, floating character-colored oval name tag, rounded local sans (**34 px @1920 / 24.86 px @1366 / 24 px @1024**), amber teardrop marker that pulses only when complete, 46 px keyboard-focusable button, 210 ms entry/exit, no legacy rectangular HUD. Contrast: dialogue ≥7.25:1, tag ≥5.1:1.
- **P3 — character script** (`src/core/story.ts`): all **58** authored spoken strings rewritten into five distinct voices; 1,219 words, max 28 words; cross-character payoffs; zero pre-finale history leaks; chapters/decisions/archive facts unchanged.
- **P4 — boardroom** (`src/scene/boardroom.ts`): final open seat arc (Shelldon −0.30/−3.00, Hootley −3.40/−2.75, Slyvester 2.75/−3.15, Pawson −6.30/−1.85, Damian 5.85/−3.25), widened table/room/chairs/props, head chair for Shelldon; **0.52–0.64 body-width gaps** at 1920/1366 by the agreed vertex-projection method; all faces above the bubble; no intersections; adapter/GLB compatibility preserved; `getSeatLayout()` added.
- **P5 — camera** (`src/scene/scene-director.ts`): wide `[5,6.2,12.8]` / look `[-0.35,2.4,-1.1]` / fov 34.5; medium speaker shot solved from live anchors/bbox to **27.9–28.0% projected silhouette**, **0.707 s** move, same-speaker guard, wide return, factory presets untouched, reduced-motion instant, warm follow-spot + 0.68 non-speaker dim.

### Verification actually run (final source)

| Check | Command / evidence | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **exit 0** |
| Unit/story/state/adapter | `npm test` | **58/58 passed**, 4 files, 345 ms |
| Production build | `npm run build` | **exit 0**; `dist/assets/index-BfqS2-PE.js` 872.38 kB / gzip 238.73 kB; `index-B4ztitwS.css` 40.18 kB / gzip 10.09 kB |
| Focused dialogue/factory/resilience | `npx playwright test tests/e2e/interactions.spec.ts --config=playwright.config.ts` | **4/4 passed**, 1.6 min |
| Full browser suite | `npx playwright test --config=playwright.config.ts` | **34/34 passed**, 12.1 min, `EXIT:0`; log `agent-reports/round1/round1-full-e2e.log` |
| Production-preview suite | `npx playwright test tests/e2e/case.spec.ts tests/e2e/interactions.spec.ts --config=playwright.preview.config.mjs` | **8/8 passed**, 2.7 min, `EXIT:0`; log `agent-reports/round1/round1-preview-e2e.log` |
| Final acceptance capture | `node scripts/round1-acceptance.mjs http://127.0.0.1:4173/` | **14/14 screenshots**, 0 page errors, 0 horizontal overflow; `agent-reports/round1/lead-final-verification.json` |
| P1 ten-line timing | `agent-reports/round1/p1-dialogue-measure.json` | 10/10 lines @1920 and 1366, all <1 s, all hold, blips stopped |
| P4 layout projection | `agent-reports/round1/p4-measure-final.log` | gaps 0.52–0.64, 328 draw calls / 51,682 triangles |
| P5 behavior probe | `agent-reports/round1/P5.md` | move 0.707 s, same-speaker guard, reduced-motion exact, one headless wide-tween artifact |

The lead replaced the one legacy timing assertion in `tests/e2e/interactions.spec.ts` with a deterministic same-task skip + 1.2 s hold + deliberate-advance test; it passes in dev and production preview. Unit/story tests were not weakened.

### Screenshots
- Final: `blue-ocean-game/qa-screens/round1/{1920x1080,1366x768}-{01-narrator-wide,02-shell,03-mori,04-advisor-mori,05-advisor-pip,06-advisor-grumble,07-advisor-bolt}.png`.
- Specialist evidence: `agent-reports/round1/dialogue-*.png` (P2), `p4-*.png` (P4), `p5-*.png` / `subset-*.png` (P5).
- 1920/1366 acceptance measurements: dialogue panel **1380×211 / 1065×150**, type **34 / 24.86 px**, speaker visible width **19.8–25.1%**, marker pulsing on every completed line.

### Round 1 residual notes
1. P5 side-seat framing still lets one neighbour be prominent or clipped (Hootley/Pawson; Shelldon/Slyvester) on a five-seat arc; the speaker is centred, lit and 20–25% wide. No face/bubble overlap.
2. Shelldon visible width is **19.8%** at 1366 (20.2% at 1920), 0.2 points below the 20% guideline; other speakers are 21.8–25.1%.
3. P4's agreed vertex-projected gaps are 0.52–0.64; a conservative lead mesh-AABB check reports 0.42–0.55 because it includes tails/ears. No visible intersection.
4. Headless SwiftShader stretches GSAP moves to several wall-clock seconds; target-GPU timing needs a live check. Physical projector legibility, FPS, and real Tripo3D GLBs remain unmeasured.
5. No deploy, push, paid asset, runtime LLM/API, or external asset download.

---
### Prior final-source verification (2026-10-22, pre-Round 1)
Final-source verification passed: **58/58 unit**, typecheck, production build, an isolated **26/26** team browser suite (9.7 min), an offline preview audit, and a GitHub Pages subpath audit. The two earlier `browserContext.close: ENOENT` failures were diagnosed as concurrent Playwright output-directory collisions, **not app defects**; the three configs now use isolated artifact directories. Independent QA (`TEAM_QA_FINAL.md`) returned **PASS — no confirmed product defect**. Independent visual review passes the 16:9 classroom target with residual notes. Remaining limits are physical projector/FPS/GLB validation, not reproduced code defects.

## Run it

From `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game`:

```powershell
npm install          # already installed in this workspace
npm run dev          # http://127.0.0.1:5173/
```

Production build and local preview:

```powershell
npm run build
npm run preview      # http://127.0.0.1:4173/
```

Tests:

```powershell
npm test             # Vitest unit/story/state/checkpoint/adapter (58 tests)
npm run typecheck
npm run test:e2e     # all 34 Playwright specs (8 original + 26 team); slow
npm run test:e2e:team # 26-spec branch/presenter/factory/WebGL/layout sweep only
```

No backend, CDN, API key, network asset, or service worker is used at runtime. The app is static and offline-capable after dependencies/build are installed.

## What works (verified against actual commands)

### Story and historical contract
- Exactly three chapters: 2005, 2011, 2016. Votes per chapter: **1 / 1 / 2** (four total), exactly three options each.
- Chapter 3 holds the single factory reveal until both D3 and D4 are committed.
- Flow: title → opening → briefing → advisors → voting → factory → feedback → boss → transition → next chapter / sealed finale. One factory output per chapter; the 2016 factory composes D3 (chassis) × D4 (accessory).
- Real product names, launch years, and figures are confined to `ACTUAL_HISTORY` and the archive UI. Pre-finale leak tests cover story data and a browser body-text check.
- Archive facts match the design document and are visibly labelled **As of June 30, 2026**, with the Nintendo IR link and interpretive sources:
  - Wii (2006) — 101.63 million
  - Wii U (2012) — 13.56 million
  - Original Nintendo Switch (2017) — 156.59 million
- Every audience prototype displays **SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT**, plus `AUDIENCE CONCEPT · NOT HISTORICAL` on the factory frame. No numeric demand, profit, share, or success probability is computed.
- The historical timeline is a fixed constant; votes never branch it.

### Presenter controls and resilience
- Dialogue completes its fast automatic reveal in under a second and then holds; `Space`/`Enter` completes instantly if still typing, or advances once complete. `1/2/3` select; `V` commits; `S` skips the factory; `M` mutes; `F` fullscreen; `R` restarts scene (Shift+R resets all); `P` presenter drawer; arrow-key chapter jumps only when presenter mode is on.
- Persistent `sessionStorage` checkpoint; mute preference in `localStorage`. Refresh during a factory animation resumes safely at factory idle with committed votes intact.
- **Presenter jump fix:** jumping to a chapter clears that chapter's votes and every later vote, keeps earlier votes, and re-opens a real voting screen. No placeholder "A" votes are invented. Skipped chapters render **Not voted** in the archive.
- Factory **Replay build** now returns the state to idle/running, re-shows the Skip control, and honors reduced motion; it does not leave a stale "ASSEMBLY COMPLETE" card.
- Chapter 3 boss phase uses the six previously unused D3/D4 boss lines and no longer repeats the synthesis line from the feedback phase.
- Presenter drawer traps Tab focus and makes the background `inert`; Reset Demo clears that state.
- Defensive recovery: an already-complete voting screen offers a **Continue to the factory** action instead of rendering blank.

### Visual/projector fixes (from `visual` review, measured after edit)
- Vote detail / benefit / trade-off text now uses viewport-height clamps: **23.76 px / 21.5 px at 1920×1080**; **16.9 px / 15.36 px at 1366×768 and 1024×768**. Record button remains visible without scrolling at all three sizes.
- Truth labels: `.factory-label` **14.5 px @1920 / 10.5 px @1366–1024**; `.simulated-stamp` **14 px @1920 / 10.5 px @smaller**. The exact label remains present in build and reveal states.
- Factory card narrowed to `min(540px, 30vw)` (`min(420px, 30vw)` below 1100 px), with a single-column prototype readout below 1100 px. DOM card/readout overlap is **0 px** at 1920, 1366 and 1024. Independent mesh projection reports **1 px @1920, 28 px @1366 and 25 px @1024** of overlap on the gesture-wand base (6.5%/5.9% of the prototype bbox at the smaller sizes); the wand ball/shaft and console remain visible, so this is a **P2 cosmetic edge clip, not a blocker**. An aspect-aware factory camera look-shift protects the prototype in 4:3.
- Contrast/size lifts applied to title disclosure, factory supporting copy, archive unit notes, archive caution, class-path note, source dates and sources.
- Simulated split controllers recoloured lavender/gold, so the fictional prototype does not reuse the archive Switch silhouette's coral/mint pairing.
- **Post-freeze visual re-verification (`agent-reports/TEAM_VISUAL.md` §11):** P0s closed. Vote copy 23.76/21.5 px @1920 and 16.9/15.36 px @1366/1024; Record button bottom 931/675/709 and visible; truth labels 14.5/14 px @1920 and 10.5 px @smaller, visible in build and reveal; all previously failing contrast pairs now pass AA (source-date 5.88, path-note 6.55, fine-print 5.66, history-caution 6.00, lifetime span 6.70, class span 5.99, title-note 8.72). No page errors and no horizontal overflow at any measured size.
- Residual visual notes, accepted for this build: the archive caveat/sources start just below the first 1080 view (scroll and “Evidence & discussion ↓” jump exist); at 1024×768 the archive stacks to one column so the side-by-side comparison needs scrolling; the visual's mesh projection still finds a 25–28 px card/wand edge overlap at 1366/1024, though the decision-defining wand remains recognisable and visible. Speaker-focus cue, 4:3 boardroom body crop and presenter Reset below the fold remain P1 next steps.

### Character pipeline
- `src/scene/character-loader.ts` and `src/scene/character-adapter.ts` provide a synchronous procedural advisor slot with optional background GLB upgrade.
- Advisors expose a stable `root`, `headAnchor`, `setMood`, `setSpeaking`, `setEmotion`, `focus`, `update`, `resetPerformance`, `dispose`, and a non-rejecting `ready`.
- GLBs are loaded from `${import.meta.env.BASE_URL}assets/characters/<folder>/<file>.glb`, cached once per advisor, validated (mesh + skinned mesh + idle clip + sane bounds), cloned with `SkeletonUtils`, normalized at the feet, and stripped of lights/cameras. Invalid/absent/offline models leave the procedural avatar; the story never waits.
- **No GLB assets were added or downloaded.** With all five absent, the app starts immediately, the boardroom contains the five procedural advisors, the story is fully playable, and no console/page errors occur. Vite returns the SPA shell for the missing paths (no page error); the loader treats parse failure as a normal fallback.
- `Boardroom` now uses `createAdvisor`; `SceneDirector` disposes the advisors and refreshes static shadows when a GLB upgrade arrives.

## Tests actually run (not inferred)

| Command | Result |
|---|---|
| `npm test` | **58 / 58 passed**, 4 files (story, state/checkpoint, prototypes, character adapter), ~0.4–1.8 s |
| `npm run typecheck` | **exit 0**, no output |
| `npm run build` | **succeeded** (Vite 8.3.5; `dist/assets/index-CRDbDPKC.js` 861.15 kB / gzip 235.19 kB; CSS 38.47 kB / gzip 9.35 kB). Only the expected >500 kB chunk warning (Three.js). |
| `npx playwright test` (dev 5173) | **8 / 8 passed** (3.7 m) for the original suite; QA separately reran it **8/8** (3.4 m). The default `npm run test:e2e` now also discovers the 26 deeper `tests/e2e/team-*.spec.ts` tests. `npm run test:e2e:team` runs the deep sweep alone via `playwright.team.config.ts`. |
| Preview suite (`playwright.preview.config.mjs`, production `dist`, 4173, excluding the origin-specific test) | **7 / 7 passed** (2.9 m) |
| Preview local-request audit | **passed** (1 test, 12 s) |
| Lead layout measurement script at 1920/1366/1024 | no horizontal overflow; vote Record button visible; card/prototype overlap 0; truth labels present; archive scrollable |
| `characters` adapter suite | **21 / 21 passed**; `npx tsc --noEmit` clean |
| `qa` team specs (`agent-reports/TEAM_QA.md`) | branches **15/15**, presenter/resilience **4/4**, factory/fallback **3/3** + mid-animation reload, canonical **1/1**; first report totals **91 passing checks** including 58 unit + 8 repo e2e + 24 team + 1 preview. QA then moved the specs into `tests/e2e/team-*.spec.ts` and added `team-layout.spec.ts`. The full 26-spec suite later passed in isolation; see the 2026-10-22 section. |

One transient typewriter assertion failure occurred in an early preview run; the same test passed in the dev suite (8/8) and in the final preview suite (7/7). It is a headless timing flake, not a reproduced product bug.

## Resumed final verification — 2026-10-22 (final source)

Source changed once after the 2026-10-21 freeze: `src/scene/character-loader.ts` (2026-10-22 07:51) now reads `import.meta.env.BASE_URL` directly so Vite statically substitutes the configured base. All other runtime source remains at the 2026-10-21 23:03–23:25 mtimes. The final build is `dist/assets/index-BzTCGnXf.js` (861.12 kB, gzip 235.17 kB) + `index-nZ-QpDO2.css` (38.47 kB, gzip 9.35 kB).

| Check (2026-10-22) | Command | Result |
|---|---|---|
| Unit/story/state/adapter | `npm test` | **58 / 58 passed**, 4 files, 436 ms (post-fix) |
| Typecheck | `npm run typecheck` | **exit 0**, no output (post-fix and after config edits) |
| Production build | `npm run build` | **exit 0**; 29 modules; only the expected >500 kB Three.js chunk warning |
| Final-source deep browser suite | `npx playwright test --config=playwright.team.config.ts --trace=off --output=.../playwright-team-final` | **26 / 26 passed**, 9.7 min; `.last-run.json` status `passed`, zero failed-test dirs |
| Pre-fix isolated suite | same suite, dedicated output dir | **26 / 26 passed**, 12.3 min (confirms the earlier ENOENT was not product/test logic) |
| Trace-on regression | two formerly ENOENT tests with `--trace=on` | **2 / 2 passed**, 56.5 s; complete trace zips 240,667 B and 2,124,589 B; no `ENOENT` |
| Offline production preview | `offline-preview.cjs` against `dist` on 4173 | **PASS** — `externalRequests: []`, `localRequestFailures: []`, `pageErrors: []`; 4-vote flow reaches finale; all archive facts present |
| GitHub Pages subpath build | `GITHUB_PAGES=true VITE_BASE=/nintendo-next-blue-ocean/ vite build --outDir dist-pages` | **exit 0**; index references `/nintendo-next-blue-ocean/assets/...` |
| Subpath runtime audit | `subpath-preview.cjs` on 4174 | **PASS** — `outsideSubpath: []`, `failedLocal: []`, `pageErrors: []`; archive fact present |

**Trace-cleanup incident (resolved):** the two 2026-10-21 failures (`browserContext.close: ENOENT ... .playwright-artifacts-0/traces/...`) were caused by two Playwright runs sharing the default `test-results` output directory. Playwright recursively clears each project's `outputDir` at startup (`node_modules/playwright/lib/runner/index.js:6586-6603`), so one run deleted the other's live trace files. Evidence: mixed `tests\...` and `tests\e2e\...` locations in the two error contexts, a partial 47 KB trace zip, concurrent preview/team process evidence, and the prior lead's explicit coordination message. The tests were never assertion failures. Durable fix: `playwright.config.ts`, `playwright.team.config.ts` and `playwright.preview.config.mjs` now use sibling output dirs (`test-results/default|team|preview`). Full analysis: `agent-reports/verification-2026-10-22/TRACE_CLEANUP_ANALYSIS.md`.

**Subpath GLB fix (new finding):** the first subpath audit requested `/assets/characters/*.glb` at the origin root instead of under `/nintendo-next-blue-ocean/`. The loader's indirect `import.meta.env?.BASE_URL` access was not statically replaced by Vite. Direct access fixed it; the rebuilt subpath bundle bakes `/nintendo-next-blue-ocean/`, and the five would-be GLB requests now stay under the subpath (`outsideSubpath: []`). No GLB files are present, so the current procedural fallback path was unaffected.

**Independent visual re-check:** `agent-reports/TEAM_VISUAL_FINAL.md` — **PASS WITH RESIDUAL NOTES** for 16:9 (1920/1366); all four prior P0s remain closed; no material regression. It corrected the earlier "0 px" overlap claim (see above). Remaining visual notes: 1024×768 archive becomes a one-column 3.75-screen scroll; archive evidence/causal caveat is below the first view in the full four-vote path; 2016 long-title card not captured at 1366/1024; 25–28 px wand-base edge clip; minor eyebrow/stamp wrapping and vote benefit baselines. Physical projector legibility at 3–4 m remains unmeasured.

**Independent QA re-check:** `agent-reports/TEAM_QA_FINAL.md` — **PASS for classroom rehearsal; no confirmed product defect.** It independently ran `npm test` (58/58), `npm run typecheck` (exit 0), `npm run build` (same `index-BzTCGnXf.js`), and the two formerly ENOENT tests with `--trace=on` (2/2, complete trace zips 240,763 B and 1,873,392 B; zero `ENOENT`). It also re-built and re-ran the offline and subpath audits with its own previews, reproducing `externalRequests: []`, `outsideSubpath: []`, no local failures, and no page errors. It audited sealed-history/truth-label/figures across source and tests and found no fabricated figure. Non-blocking notes: Three.js deprecation warnings (`Clock`, `PCFSoftShadowMap`), keyboard-only commit inputs in the team specs, and console-error harvesting limited to the canonical test. Its report confirms the stale `blue-ocean-game/test-results/.last-run.json` (`status: failed`, two 2026-10-21 IDs) is **preserved incident evidence, not the current suite status**; the final run wrote to `playwright-team-final/` and passed.

## What is not verified / known limits
- **Physical projector legibility at 3–4 m** cannot be measured from this machine. Measured CSS sizes meet the documented proxies; confirm on the actual classroom projector.
- **A real Tripo3D GLB** has not been validated. The loader is exercised with mocks and the procedural fallback; orientation, materials, foot contact and clip names must be checked when the first fox arrives. No paid generation was performed.
- Five background GLB requests are attempted at startup even with no files present. They are cached, non-fatal, and produce no page errors, but the dev-server network panel will show them. Adding a filenames manifest would remove the requests; this was not added in order to keep true file-drop behavior. Their URL resolution is now subpath-correct; with no GLBs present, the procedural fallback is unchanged.
- Archive/evidence content intentionally scrolls at 1080p and below; the “Evidence & discussion ↓” button jumps to it. At 1024×768 the archive is a single column and is long (3.75 screens), so the side-by-side three-product comparison is lost.
- The archive evidence/causal caveat sits below the first 1080/1366 view in the full four-vote path; the sealed screen and per-card cautions mitigate it. The 2016 long-title card has not been captured at 1366/1024; its stamp could require card scrolling at 1024 (inferred risk, not observed).
- 4:3 boardroom outer bodies are slightly cropped at 1024×768 (faces remain visible). 16:9 is the primary projector target.
- A real Tripo3D GLB loaded under a GitHub Pages subpath has not been tested (no GLB exists yet); the URL resolver and fallback were tested.
- The original 8-spec repo browser suite was not rerun after the one-line loader fix; it passed 8/8 before the fix. The final 26-spec deep suite includes the canonical four-vote flow, presenter/factory/checkpoint/layout coverage and passed on the final source. The 26 team specs commit votes with keyboard input; pointer selection of a choice card is implemented but not exercised by that suite.
- Two non-blocking Three.js deprecation warnings appear in the console: `THREE.Clock` is deprecated and `PCFSoftShadowMap` is removed (renderer falls back to PCF). No functional failure; clean up if Three.js is upgraded.
- `blue-ocean-game/test-results/.last-run.json` still contains the preserved 2026-10-21 `failed` status and two failed-test IDs from the trace-directory collision. That is incident evidence, **not** the current result; the final suite wrote to `agent-reports/verification-2026-10-22/playwright-team-final/` and passed. Do not delete the incident artifacts if reproducible evidence is still wanted.
- No deployment, git push, paid API, external asset download, or model generation was performed. The working folder is not a git repository.
- Audio is synthesized, subtle, and only starts after a user gesture; it has not been judged on classroom speakers.
- Performance measured under headless SwiftShader is not representative of a real GPU. The boardroom uses ~316 draw calls / ~50.6k triangles; 30 fps on the target laptop should be confirmed live.

## Next priorities (if more time)
1. Lock the classroom output to **16:9 (1920×1080 or 1366×768)**; that is the independently signed-off configuration. Rehearse at that size.
2. Capture the 2016 D3-C/D4-B factory reveal at 1366×768 and 1024×768; confirm the exact stamp and Face button are visible without card scrolling. If not, shorten the title or make the stamp sticky.
3. If 1024×768 must be supported, restore a simultaneous three-product archive comparison (compact Year/Product/Units table or three columns) and add the causal caveat to the first archive view.
4. Confirm the first validated Tripo3D fox GLB and then the remaining four, one at a time, against 1920×1080 and 1366×768 framing, foot contact, and subpath loading.
5. Optional filenames manifest to suppress absent-GLB requests while keeping drop-in behavior.
6. A speaker-focus cue that is actually visible above the table (soft spot/rim or a modest camera shift), per the visual review's P1.
7. Presenter drawer sticky recovery row so Restart/Reset are reachable without scrolling at 1366×768.
8. Only after those: optional decorative factory props (no particles, screen shake, or extra spectacle).

## Related evidence
- `agent-reports/ROUND1_INTEGRATION.md` — Round 1 assignments, integration evidence, screenshots, residual notes.
- `agent-reports/round1/P1.md`–`P5.md` — five specialist reports; raw logs `round1-full-e2e.log`, `round1-preview-e2e.log`, `p1-dialogue-measure.json`, `p4-measure-final.log`, `lead-final-verification.json`.
- `blue-ocean-game/qa-screens/round1/` — final 1920/1366 boardroom and all-five-speaker dialogue captures from production `dist`.
- `agent-reports/TEAM_HANDOFF.md` — verified team membership, ownership, progress, final QA/visual results.
- `agent-reports/TEAM_QA.md`, `agent-reports/TEAM_VISUAL.md`, `agent-reports/TEAM_CHARACTER.md` — original teammate reports.
- `agent-reports/TEAM_VISUAL_FINAL.md` — independent 2026-10-22 projector review (PASS WITH RESIDUAL NOTES; 16:9).
- `agent-reports/TEAM_QA_FINAL.md` — independent final QA (added by the delegated verifier).
- `agent-reports/verification-2026-10-22/` — raw final evidence: `unit-typecheck-build.log`, `team-26-consolidated.log`, `team-26-final.log`, `trace-on-regression.log`, `TRACE_CLEANUP_ANALYSIS.md`, `offline-preview-result-final.json`, `subpath-preview-result-final.json`, `trace-evidence/`, and config/typecheck logs.
- `blue-ocean-game/qa-screens/lead-*.png` — fresh 1920/1366/1024 vote, factory and archive captures from the final build.
- `blue-ocean-game/README.md` — presenter commands, hosting, asset pipeline, limits.
- Prior review evidence (archived): `_archive/agent-reports/QA_REVIEW.md`, `_archive/agent-reports/STORY_REVIEW.md`, `_archive/agent-reports/CHARACTER_INTEGRATION.md`, `_archive/agent-reports/COORDINATOR_STATUS.md`.

## Addendum — procedural speech engine (2026-10-22 afternoon)

A dedicated speech pass implemented `Procedural_speech_prd.md` without changing story, votes, scene, or layout. Full handoff: **`agent-reports/PROCEDURAL_SPEECH.md`**.

- **New source:** `src/audio/voice-profiles.ts`, `src/audio/speech-timeline.ts`, `src/audio/mumble-voice.ts`.
- **Scoped integration:** `src/audio/audio.ts` creates the engine after the first gesture and routes mute/stop; `src/ui/ui.ts` now reveals text and fires vowel events from one shared timeline. Narrator and reduced-motion remain silent.
- **Five profiles:** Hootley (196 Hz, breathy), Slyvester (305 Hz, high/quick), Damian (138 Hz, dry), Pawson (88 Hz, low/mellow), Shelldon (68 Hz, lowest/slow/wobbling).
- **Synthesis:** sawtooth → three parallel band-pass formants per PRD vowel targets; generated breath noise; ADSR; jitter/wobble; no samples, TTS, CDNs, or new dependencies.
- **Controls:** punctuation pauses preserved within the existing sub-second reveal cap; ≈10 vowel hand-offs/sec in the compressed presentation to avoid buzz; skip/hidden/mute/new line/restart/reset fade and disconnect; first gesture unlocks; engine still runs standalone `typeText()` with the literal 33 ms cadence.
- **Verified final:** `npm run typecheck` pass; `npm test` **78/78**; `npm run build` pass (same pre-existing >500 kB chunk warning); relevant Playwright **10/10** in 3.6 min, including a full four-vote walkthrough and a new browser speech lifecycle test. Logs: `agent-reports/procedural-speech-20261022/`.
- **Known limit:** the five synth voices were node/state verified but not subjectively mixed on classroom speakers. A real presenter soundcheck is recommended.

## Addendum — licensed boardroom music (2026-10-22)

The boardroom now streams an original-score track from the licensed album *Towball's Crossing*. No Nintendo audio is bundled.

- **Tracks:** "1am" (title), "7am" (boardroom dialogue), "6pm" (background context and voting), "10pm" (factory) and "5am - Goodbye" (finale) by Towball, from *Towball's Crossing* — **CC BY 4.0** (attribution required). Source: https://towball.itch.io/towballs-crossing. Licence verified on the album page.
- **Assets:** `blue-ocean-game/public/audio/towball-1am.mp3` (2.64 MB, 128 kbps, 2:45), `towball-7am.mp3` (3.27 MB, 3:24), `towball-6pm.mp3` (2.60 MB, 2:43), `towball-10pm.mp3` (2.45 MB, 2:33) and `towball-5am-goodbye.mp3` (5.02 MB, 5:13); all transcoded from the source MP3s, no musical edits. Full attribution and change record: `blue-ocean-game/MUSIC_LICENSE.md`.
- **Source:** `src/audio/music.ts` (`BackgroundMusic`) routes a streaming `HTMLAudioElement` through the existing master bus; no new npm dependency, no CDN, no network at runtime.
- **Cue map:** `musicModeForPhase()` plays "1am" on the title screen, "7am" in opening/advisors/feedback/boss/transition, "6pm" in briefing and voting, "10pm" in the factory, and "5am - Goodbye" in the finale. The title cue begins on the first user gesture (browser autoplay policy); clicking straight through to Start will move on to the boardroom cue quickly. Every phase now has a cue; `silent` remains as the stopping state.
- **Behaviour:** starts only after the first gesture; loops; fades in/out on scene changes; ducks about 9 dB while an advisor speaks and restores after the line; pauses on `visibilitychange`; shares mute (`M`) and the master volume slider.
- **Presenter controls:** new persisted **Music** slider in the drawer (**P**), default 70%. The title screen credits the artist; the presenter drawer and finale archive sources name all five tracks and the licence.
- **Measured in the live game (default 62% master):** music-only peak −19.5 dBFS / RMS −33.7 dBFS; ducked under a speech line RMS −43.8 dBFS. Background music is clearly audible without masking the mumble.
- **Verified:** `npm run typecheck` pass; `npm test` **86/86**; `npm run build` pass (same >500 kB warning); Playwright `background-music.spec.ts` covers all five cues, ducking, the Music slider, credits and leave/return pause, and `procedural-speech.spec.ts` passed across three repeats after fixing a stale `play()` refcount race. The speech e2e now samples on a 10 ms timer because headless SwiftShader frames can skip a 60–90 ms note window.
- **Still recommended:** a live speaker soundcheck; the Music slider is there to tune the room.

## Addendum — natural speech pacing (2026-10-22)

The compressed sub-second dialogue cap was replaced with a natural speaking cadence so the typewriter and the mumble voice no longer race.

- **Shared clock:** `src/ui/ui.ts` passes `baseIntervalMs: 62 / 1.5` (about 41.3 ms) to `buildSpeechTimeline`; the typewriter reveal and vowel events still share one timeline. There is no `targetDurationMs` compression in the presentation path.
- **Punctuation:** comma/sentence/ellipsis pauses now scale with the chosen base interval (`src/audio/speech-timeline.ts`), preserving the PRD's relative pauses rather than keeping absolute 99/198/300 ms values.
- **Speaker pace:** each profile's `speedMultiplier` now audibly matters — Slyvester is quicker, Shelldon and Pawson slower.
- **Syllable envelopes:** `voice-profiles.ts` syllable durations are 67–97 ms, tuned to the 1.5× pace so notes read as syllables rather than blips.
- **Safety net:** the wall-clock completion timeout is now the line duration + 400 ms instead of a 950 ms hard cap.
- **Measured live at 1.5×:** Shelldon 152 characters in 10.3 s; Hootley 111 in 5.2 s; Slyvester 72 in 3.5 s; Shelldon 136 in 8.5 s. The earlier natural-pace baseline was 14.9 / 7.9 / 4.8 / 12.6 s.
- **Presenter control unchanged:** a click while a line is typing completes it immediately; the next click advances.
- **Session estimate:** a full read-through at this pace is roughly 11–13 minutes of dialogue plus votes and factory time, close to the title card's 12-minute estimate; clicking early still shortens it.
- **Supersedes** the earlier "≈10 vowel hand-offs/sec" and "sub-second cap" notes in the procedural-speech addendum.
- **Verified:** unit tests include the natural-pace/punctuation-ratio test; the main browser suite (interactions, dialogue bubble, case, procedural speech, background music, factory branches, presenter resilience, layout) passed after the pacing change.
