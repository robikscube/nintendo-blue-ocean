# Independent Final QA — Nintendo: The Next Blue Ocean

**Verdict: PASS — release-ready for classroom rehearsal.**
No confirmed product defect, no page error, no fabricated historical figure, and no missing truth label was found. All checks I executed passed. The 26-test suite result is reported evidence (not re-executed by me, per instruction) and was corroborated from its log and artifacts. Residual risks are test-strictness gaps and non-blocking Three.js deprecation warnings, listed in §10.

- **Verification window:** 2026-10-22 08:03:34–08:07:09 PST
- **Verifier:** independent final QA (read-only with respect to runtime source, configs, and existing tests)
- **Artifact output:** `C:\Users\robwa\Desktop\Nintendo\agent-reports\verification-2026-10-22\qa-independent-results`
- **Report:** this file only; no source, CSS, config, `package.json`, existing test, or status document was edited.

## 1. Environment

| Item | Value |
|---|---|
| OS | Windows 10 Home 10.0.19045 |
| Node / npm | v24.14.0 / 11.14.1 |
| Playwright | 1.64.1 |
| Vite / TypeScript / Vitest | 8.3.5 / 5.9.3 / 5.0.5 |
| Browser | Chromium headless, `--use-angle=swiftshader --enable-unsafe-swiftshader` |
| Dev server | `http://127.0.0.1:5173`, PID 8316 (started 07:35), reused and left running |
| Build hash under test | `index-BzTCGnXf.js` / `index-nZ-QpDO2.css` |

The dev server was confirmed HTTP 200 before browser work. No other Playwright process was running at the start of any run. No preview server was listening on 4173/4174. I started preview servers only for the independent offline/subpath audits and stopped my own preview processes afterward; 5173 remained untouched and listening.

## 2. Unit tests — OBSERVED

Command, from `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game`:

```text
npm test
```

Result: **exit 0**, `Test Files 4 passed (4)`, `Tests 58 passed (58)`, duration 1.04 s.

Raw log: `...\qa-independent-results\npm-test.log`

## 3. Typecheck — OBSERVED

```text
npm run typecheck
```

Result: **exit 0**, `tsc --noEmit` produced no diagnostics.

Raw log: `...\qa-independent-results\npm-typecheck.log`

## 4. Production build — OBSERVED

```text
npm run build
```

Result: **exit 0** (`tsc --noEmit && vite build`), Vite 8.3.5, 29 modules transformed, built in 288 ms.

Emitted assets (on disk):

| Asset | Size | Gzip |
|---|---:|---:|
| `dist/index.html` | 0.92 kB | 0.49 kB |
| `dist/assets/index-nZ-QpDO2.css` | 38.47 kB (38,474 B) | 9.35 kB |
| `dist/assets/index-BzTCGnXf.js` | 861.12 kB (861,128 B) | 235.17 kB |
| `dist/assets/index-BzTCGnXf.js.map` | 3,949.99 kB | — |
| `dist/favicon.svg` | 0.24 kB | — |
| `dist/assets/characters/README.md` | 6.2 kB | — |

The **only warning** is the expected `(!) Some chunks are larger than 500 kB after minification` Three.js chunk warning. No other warning or error appeared. The emitted JS hash matches the stated frozen build, `index-BzTCGnXf.js`.

Raw log: `...\qa-independent-results\npm-build.log`

## 5. Final 26-spec suite — REPORTED, artifact-verified (not re-executed)

Per instruction I did **not** rerun the full suite. I read:

- `...\verification-2026-10-22\team-26-final.log`
- `...\verification-2026-10-22\playwright-team-final\.last-run.json`

Observed in the log: `START 2026-10-22 07:53:14 PST`, `Running 26 tests using 1 worker`, 26 `ok` lines, `26 passed (9.7m)`, `EXIT:0 at 2026-10-22 08:03:00 PST`.

Observed in `.last-run.json`: `{"status":"passed","failedTests":[]}`. The final output directory `playwright-team-final` contains **only** `.last-run.json` (45 bytes): no failed-test directories and no partial artifacts.

Independent discovery check (no browser executed): `npx playwright test --config=playwright.team.config.ts --list` returned **exit 0**, `Total: 26 tests in 5 files`, matching the log. Raw log: `...\qa-independent-results\playwright-list.log`.

Note: `blue-ocean-game\test-results\.last-run.json` still says `status: failed` with two failed test IDs. That is the preserved 2026-10-21 23:52 incident artifact (trace-directory collision), **not** a current result. The final run wrote to its isolated output directory and is clean. This is consistent with `TRACE_CLEANUP_ANALYSIS.md`.

## 6. Trace-on regression of the two ENOENT tests — OBSERVED

Exact command, reusing the running dev server:

```text
npx playwright test --config=playwright.team.config.ts --trace=on --grep "D1 A reaches a distinct factory concept|refresh preserves a draft vote and committed factory" --output="C:/Users/robwa/Desktop/Nintendo/agent-reports/verification-2026-10-22/qa-independent-results"
```

Result: **exit 0, 2 passed (1.1m)**, 08:04:00–08:05:08 PST:

- `D1 A reaches a distinct factory concept` — 8.2 s
- `refresh preserves a draft vote and committed factory, and reset clears the demo` — 51.8 s

Both `trace.zip` files exist and are non-trivial:

| Trace | Size | Integrity |
|---|---:|---|
| `e2e-team-branches-every-D1-45f8f--a-distinct-factory-concept-chromium\trace.zip` | 240,763 B | `unzip -t`: no errors |
| `e2e-team-presenter-resilie-96c66-y-and-reset-clears-the-demo-chromium\trace.zip` | 1,873,392 B | `unzip -t`: no errors |

Each archive contains `test.trace`, `1-trace.trace`, `1-trace.network`, `src/*.ts`, and multiple screencast JPEGs — i.e., complete traces with resources, not the truncated 47,915-byte incident trace. A case-insensitive search of the run log for `ENOENT` or `browserContext.close` returned **0 matches**. No teardown error occurred. The presenter test also refreshed `qa-screens\team-reload-factory-checkpoint-1920.png` at 08:04 (1,147,672 B), confirming the screenshot path executed.

Raw log: `...\qa-independent-results\playwright-trace-on.log`

## 7. Coverage mapping of the 26 tests — REPORTED + source audit

I read all five team spec files and mapped every required area to assertions:

| Required area | Tests | What is actually asserted |
|---|---|---|
| D1 A/B/C | 1–3 | 3 choice cards, keyboard commit, factory done and rendered, expected `buildPrototypeSpec(0, choice)` heading, D1 decision label, exact `SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT` text, no page errors |
| D2 A/B/C | 4–6 | D1=A retained (`state.choices === {d1:'A', d2:choice}`), distinct D2 factory heading, D2 label, truth label, no page errors |
| D3×D4 (9 combinations) | 7–15 | `VOTE 1 OF 2`, D4 absent after D3, no factory between votes, `VOTE 2 OF 2`, exactly one combined factory, both D3 and D4 labels, expected combined spec heading, final 4-choice state, truth label, no page errors |
| Canonical 4-vote / 3-factory flow at 1080p | 16 | Real UI navigation through all three chapters; factory-entry subscription count **exactly 3**; D1=B, D2=B, D3=C, D4=B; 3 cards per vote; no factory between the two 2016 votes; archive facts and source href; viewport 1920×1080; no horizontal overflow; no page errors; no unexpected console errors |
| Sealed history | 16 | `HISTORY_LEAK` regex (`Wii`, Wii U, Nintendo Switch, Joy-Con, GamePad, 101.63, 13.56, 156.59, 2006, 2012, 2017, …) absent from body text at title, briefing, voting, factory, transition, and sealed finale; `#seal-indicator` reads `HISTORICAL RECORD SEALED` until the archive button is used, then `HISTORICAL RECORD OPEN`; archive absent before opening |
| Factory skip / replay / reduced motion / WebGL off | 17–20 | Skip via `S` finishes < 8 s with one leave action; replay returns to running with Skip and one factory screen/card; story continues once into feedback at `dialogueIndex 0`; mid-animation reload restores a rebuildable factory; reduced-motion replay transitions exactly `idle → running → done` in < 1.5 s and unblocks; WebGL denial shows `#fallback-note` and `no-webgl`, `scene === null`, full factory and finale still work |
| Presenter revisit / jump / Not voted | 23–24 | Jump back clears D1 and reopens a real voting screen (3 cards, non-empty `#view`), re-vote reaches a new factory; jump ahead invents no votes (`choices === {}`), archive shows exactly **4** `Not voted` chips and no `A · ` path |
| Checkpoint reloads | 18, 25, 26 | Draft selection survives refresh while committed choices stay empty; committed factory survives refresh and rebuilds; mid-animation reload is recoverable; refreshing the opened finale returns to the sealed intro, never the open archive |
| Reset | 25 | Confirmed reset dialog, returns to `title`, clears choices/started, preserves mute, mute button `aria-pressed=true` |
| 1366×768 and 1024×768 4:3 layout | 21–22 | 3 cards within viewport, commit control contained, factory card contained, archive contained, no horizontal overflow, archive vertically scrollable, truth label visible, no page errors |

No required area from the task list is missing from the 26-test inventory.

## 8. Offline and GitHub Pages subpath — OBSERVED independently

Both audits were rerun by me against previews of my own fresh builds. Results reproduce the reported evidence.

### 8.1 Offline production preview (port 4173)

Served `dist` with `vite preview`, then ran the existing isolated script `offline-preview.cjs` at 1920×1080 with the network set offline after load:

```json
{
  "base": "http://127.0.0.1:4173",
  "fallbackHidden": true,
  "phase": "finale",
  "choices": { "d1": "B", "d2": "B", "d3": "C", "d4": "B" },
  "factsPresent": true,
  "externalRequests": [],
  "localRequestFailures": [],
  "pageErrors": []
}
```

The full canonical path reached the finale, all archive facts were present, **zero external requests**, zero failed local requests, zero page errors. This matches `offline-preview-result-final.json`.

Logs: `...\qa-independent-results\offline-independent.log` and preview stdout/stderr logs.

### 8.2 GitHub Pages subpath (port 4174)

I rebuilt independently with `GITHUB_PAGES=true`, `VITE_BASE=/nintendo-next-blue-ocean/`, `--outDir dist-pages`: **exit 0**, same `index-DDNUDmjY.js` hash as the reported subpath build. `dist-pages/index.html` references `/nintendo-next-blue-ocean/assets/index-DDNUDmjY.js` and `/nintendo-next-blue-ocean/assets/index-nZ-QpDO2.css`.

Served that build at the subpath and ran `subpath-preview.cjs`:

```json
{
  "subpath": "http://127.0.0.1:4174/nintendo-next-blue-ocean/",
  "ready": true,
  "fallbackHidden": true,
  "factsPresent": true,
  "resourceCount": 7,
  "outsideSubpath": [],
  "failedLocal": [],
  "pageErrors": []
}
```

All seven loaded resources stayed under the subpath; no failures and no page errors. This matches `subpath-preview-result-final.json`.

Note: PowerShell rendered Vite's single chunk-size warning as a `NativeCommandError` because it writes to stderr; the process exit code was 0 and the only diagnostic was the expected >500 kB chunk warning.

Logs: `...\qa-independent-results\subpath-build-independent.log`, `subpath-independent.log`.

## 9. Narrative, truth-label, and historical audit — OBSERVED source audit + REPORTED tests

- **Truth label:** `SIMULATED_LABEL` is defined once as the exact required string in `src/core/story.ts:13` and rendered on both the building and revealed factory card (`src/ui/ui.ts:547,562`). It was asserted visible in all 3 D1, 3 D2, and 9 D3×D4 branch tests, the canonical flow, both layout tests, factory tests, and the WebGL-off test.
- **Sealed boundary:** `ACTUAL_HISTORY` contains all product names, launch years, and sales figures (`src/core/story.ts:655–692`). A grep of the story data before that block found **no** product names, launch years, or sales figures in chapter dialogue or decision text. The canonical test's no-leak regex passes across every pre-archive phase.
- **Figures:** Wii 2006 — 101.63 million lifetime units; Wii U 2012 — 13.56 million; Original Nintendo Switch 2017 — 156.59 million as of June 30, 2026. These match `GAME_DESIGN.md` and `TECHNICAL_SPEC.md`. The archive displays `As of June 30, 2026`, the Nintendo IR link (`https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html`), interpretive sources, and caveats that the figures are not unique players, noncustomer counts, revenue, or proof of causal strategy.
- **Fabricated figures:** none found. The only quantitative real-world claims are the three official lifetime hardware totals and the stated as-of date. Decision dialogue is qualitative ("a decade early", cost/risk language) with no invented sales, market share, or guarantees.
- **History not contingent on votes:** prototypes are labeled fictional, `ACTUAL_HISTORY` is a constant, and the finale states that votes did not change what happened.
- **"Not voted":** verified in the archive path with no votes (test 24).

Caveat: because this audit was offline and external services were prohibited, I did **not** live-check the three totals against Nintendo IR. They are internally consistent, match the authoritative project documents, and are presented with a date and linked source; live verification remains an external fact-check step.

## 10. Gaps, residual risks, and non-blocking observations

No confirmed defect. These are limitations or low-priority observations, not reproduced failures:

1. **Team suite commit input is keyboard-only.** All four vote commits use `1/2/3` + `V`; pointer selection of `.choice-card` is not exercised in the 26 team specs. The UI does implement click handlers, and the canonical test uses mouse clicks for navigation buttons, but pointer voting was not independently verified in this window. The repo's default e2e suite was not rerun per instruction.
2. **Console-error harvesting is only in the canonical test.** The other 25 tests assert `pageerror` only. The two full traces I generated contain no console errors — only the two Three.js warnings below — and my independent offline full-flow run recorded zero page errors, but it did not capture console-level errors.
3. **Three.js deprecation warnings (non-blocking):** `THREE.Clock: This module has been deprecated` (`src/scene/scene-director.ts:45`) and `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead` (`src/scene/scene-director.ts:68`). These are warnings, not errors; the renderer falls back to PCF shadows. No user-facing failure was reproduced. Worth a future cleanup if Three.js is upgraded, and it means the intended soft-shadow look may be slightly sharper.
4. **Reload strictness:** test 18 accepts `idle` or `running` after a mid-animation reload. Checkpoint logic normalizes to idle, but the scene auto-starts quickly, so the test tolerates the race. It verifies recoverability, not the exact restored frame.
5. **Presenter focus trap/inert** is described as fixed in the handoff but is not explicitly asserted by the 26 team specs. The jump tests exercise the drawer and Escape close, not Tab containment.
6. **Mute:** state and persistence are tested; actual audio silence and "no audio before first gesture" are not observable by Playwright and were not independently verified. Source review shows a single `AudioContext` created only on first `pointerdown`/`keydown` and gain forced to zero when muted.
7. **Sales figures are not live-verified** (see §9).
8. **Historical incident artifacts remain** at `blue-ocean-game\test-results\.last-run.json` (`status: failed`) and the two 2026-10-21 directories. They are deliberately preserved evidence of the trace-directory collision and are outside the isolated final output directory. They must not be read as the current suite status.

## 11. Reproduced failures

**None.** I did not observe any assertion failure, page error, console error, trace teardown error, offline external request, subpath resource escape, truth-label absence, historical-figure leak, or build/typecheck failure.

## 12. Release verdict

**PASS for classroom rehearsal.** The narrative flow (3 chapters, 4 votes, 3 factories, sealed archive), all 15 prototype branches, skip/replay/reduced-motion/WebGL-off fallback, presenter jump/revisit/Not-voted behavior, checkpoint/reload/reset, 1080p and 1366/1024 layout, unit tests, typecheck, production build, offline runtime, and GitHub Pages subpath have passing evidence. The two formerly failing trace tests now pass with complete trace archives.

Recommended before class: use a Chromium-based browser at 1920×1080 with WebGL enabled; run `npm run dev` from `blue-ocean-game`; do a five-minute presenter dry run of presenter-mode jumps and projector scaling. The only accepted visual caveat from the visual review (minor card/wand edge clipping at 4:3 and archive-first-view scrolling) is a P1/P2 and does not block rehearsal.

## 13. Evidence index

Primary independent evidence (all under `C:\Users\robwa\Desktop\Nintendo\agent-reports\verification-2026-10-22\qa-independent-results`):

- `npm-test.log`, `npm-typecheck.log`, `npm-build.log`
- `playwright-trace-on.log`, `.last-run.json`
- `e2e-team-branches-every-D1-45f8f--a-distinct-factory-concept-chromium\trace.zip` (240,763 B)
- `e2e-team-presenter-resilie-96c66-y-and-reset-clears-the-demo-chromium\trace.zip` (1,873,392 B)
- `playwright-list.log` (26 tests / 5 files)
- `offline-independent.log`, `preview-4173-independent.stdout.log`, `preview-4173-independent.stderr.log`
- `subpath-build-independent.log`, `subpath-independent.log`, `preview-4174-independent.stdout.log`, `preview-4174-independent.stderr.log`

Reported evidence cross-checked:

- `C:\Users\robwa\Desktop\Nintendo\agent-reports\verification-2026-10-22\team-26-final.log`
- `C:\Users\robwa\Desktop\Nintendo\agent-reports\verification-2026-10-22\playwright-team-final\.last-run.json`
- `C:\Users\robwa\Desktop\Nintendo\agent-reports\verification-2026-10-22\offline-preview-result-final.json`
- `C:\Users\robwa\Desktop\Nintendo\agent-reports\verification-2026-10-22\subpath-preview-result-final.json`
- `C:\Users\robwa\Desktop\Nintendo\agent-reports\verification-2026-10-22\TRACE_CLEANUP_ANALYSIS.md`

Source files audited read-only: `src\core\story.ts`, `src\core\state.ts`, `src\core\checkpoint.ts`, `src\ui\ui.ts`, `src\main.ts`, `src\audio\audio.ts`, `src\scene\scene-director.ts`, `src\scene\character-loader.ts`; all five `tests\e2e\team-*.spec.ts` files; `playwright.team.config.ts`, `playwright.config.ts`, `playwright.preview.config.mjs`.
