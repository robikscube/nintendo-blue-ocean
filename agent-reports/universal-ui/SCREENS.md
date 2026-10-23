# Workstream C — Voting / Factory / Archive / Presenter

**Status: COMPLETE (source + scoped CSS) — 2026-10-22.**
All four requested screen changes implemented, verified in the running app via headless Chromium at 1920×1080 / 1366×768 / 1024×768. No long-running dev server was started by this workstream; verification reused the server already listening on 127.0.0.1:5173 and used temporary screenshots under `%TEMP%\ws-c-shots` (not committed).

## Files changed (only owned files)

- `blue-ocean-game/src/ui/screens/voting.ts`
- `blue-ocean-game/src/ui/screens/transition.ts`
- `blue-ocean-game/src/ui/screens/factory.ts`
- `blue-ocean-game/src/styles/screens-responsive.css`
- `agent-reports/universal-ui/SCREENS.md` (this report)

No edits to `briefing.ts`, `finale.ts` or `presenter.ts` markup: their required alignment/reachability work is done entirely in the scoped stylesheet, which keeps every fact, credit, control and `data-action` byte-identical. No edits to tests, `ui.ts`, `main.ts`, `style.css`, `universal.css`, `button.ts`, assets or package files.

## What changed

### A. Voting (`voting.ts`)
- Eyebrow is now exactly `BOARD VOTE · VOTE n OF m`; `CHAPTER` no longer appears.
  Rendered live: `BOARD VOTE · VOTE 1 OF 1` (and `VOTE 2 OF 2` is still produced by the shared renderer for D4).
- Removed the `decision.context` paragraph from the vote header (0 header paragraphs) and the footer instructional paragraph (0 footer paragraphs).
- Primary action is a native button with visible text exactly `Confirm` and unchanged `data-action="commit-choice"`; it renders `disabled` until a card is chosen, then enables. Keyboard 1/2/3 + V behaviour untouched.
- Kept the question, exactly 3 choice cards, detail, Benefit/Trade-off (6 labels), accessible names and HUD vote trail.
- The defensive “votes already recorded” fallback lost its redundant footer sentence; its `continue-factory` button is unchanged.

### B. Transition (`transition.ts`)
- Removed `Historical products and figures are still sealed.` entirely.
- Chapter-to-chapter transitions render exactly `Continue` (verified `A FEW YEARS LATER` → button `Continue`); `data-action="transition-next"` and focus behaviour untouched.
- Eyebrow, title and story paragraph unchanged.
- **Deliberate exception:** the final, third transition into the archive keeps its authored `Open the sealed archive` label (it is not a chapter/year variant and is asserted by `tests/e2e/case.spec.ts`). Flagged below.

### C. Factory (`factory.ts`)
- Removed the top `.factory-banner` block (status/year/`AUDIENCE CONCEPT`) from the DOM.
- Removed the card eyebrow and `.prototype-number` metadata in both building and revealed states.
- Kept title, description, PRIORITIZES / TRADE-OFFS, Replay build, Skip animation and the 3D stage.
- `.factory-source` is present in the DOM with the exact existing choice labels (e.g. `Built from Chapter 1 vote: A · Power Race`) but visually hidden via `class="factory-source sr-only"` plus a scoped `.factory-screen .factory-source` rule. Measured 1×1 px, so traceability/tests remain while the audience does not see it.
- Counterfactual disclosure is now one quiet `.factory-truth` line containing the exact `SIMULATED_LABEL`: `SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT`. Computed style: 10.5px, `border-style: none`, transparent background; the dashed stamp and extra fine print are gone (0 `.simulated-stamp`, 0 factory `.fine-print`).
- Primary action visible text exactly `Confirm`, `data-action="leave-factory"`, returned only in the revealed state (i.e. only once `factoryProgress === 'done'`).

### D. Briefing (CSS only)
- Shared width/type/button rhythm and scoped `.primary-button` geometry.
- Restored the sealed-history card at ≤1100px (the legacy CSS hid `.watch-card`, which contains the sealed-history note) and allowed `overflow-y: auto` so 1024×768 content is reachable instead of clipped. `data-action="begin-chapter"` unchanged.

### E. Finale / archive (CSS only)
- No markup/text edits: every fact, figure, source, caution, discussion prompt and music credit remains byte-for-byte.
- Scoped archive width/grid/type tuning, wrapping for path chips and source links, and a larger, padded evidence-jump target. `.archive-screen` scrolling and `data-action="scroll-discussion"` intact.

### F. Presenter (CSS only)
- All controls, `data-action` values, dialog semantics and focus behaviour unchanged.
- Consistent 10–13px type scale and spacing; width 470px (490px at short heights).
- At `max-height: 900px`, the Reset block is `position: sticky; bottom: 0`, so Reset is always reachable while the rest of the drawer scrolls. At `max-height: 800px` sections are compacted so Restart scene is already in view.

### G. Scope
All overrides live in `screens-responsive.css` and are prefixed with `.voting-screen`, `.briefing-screen`, `.transition-screen`, `.factory-screen`, `.archive-screen` or `.presenter-drawer`/`.drawer-*`. Shared tokens from `universal.css` are used for control height/radius/font and spacing. Title, dialogue and HUD are untouched.

## Commands and actual results

| Command | Result |
|---|---|
| `npm run typecheck` | **PASS** (exit 0, no output) at 16:36:47, after all source edits and before QA's new spec landed. |
| `npm test` | **PASS** — 8 files, **87/87 tests**, 7.97 s. |
| `npx vite build` | **PASS** — 47 modules, built in 1.27 s; CSS 50.61 kB, JS 895.04 kB (chunk-size warning only). |
| `npm run build` | **FAIL (external)** — `tsc --noEmit` stopped on three errors in QA-owned `tests/e2e/universal-ui.spec.ts`: `TS6133 'overlaps' unused` (line 85), `TS2345 string \| undefined` (576), `TS18048 'expected' possibly undefined` (582). None are in Workstream C files; that file was created/changed concurrently at 16:41. |

### Live DOM verification (headless Chromium, reused server 127.0.0.1:5173)
- Voting: `eyebrow="BOARD VOTE · VOTE 1 OF 1"`, `CHAPTER=false`, header paragraphs 0, footer paragraphs 0, `Confirm` disabled → enabled after `1`, 3 cards, 0 page errors.
- Factory: `.factory-banner` 0, card eyebrow/prototype-number 0, source `1×1` with correct label, truth text exact and visible at 10.5px with no border/background, `Confirm` present, fine-print 0, simulated-stamp 0, `<canvas>` present.
- Factory card boxes (right edge inside viewport in every case):
  - 1920×1080: x 1336, y 683, 540×354 (right 1876)
  - 1366×768: x 923, y 412, 410×326 (right 1333)
  - 1024×768: x 692, y 340, 307×397 (right 999)
- Transition: button `Continue`, sealed footnote absent, eyebrow `A FEW YEARS LATER`.
- Presenter at 1366×768 and 1024×768: drawer opens; Reset box 675–720 (fully inside 768); Restart 498–532 (fully inside); drawer scrolls; sticky reset working.
- Archive: all three totals present (`101.63`, `13.56`, `156.59`), 8 source links, evidence jump present, `.archive-screen` horizontal overflow **0** at 1366 and 1024, document horizontal overflow **0**.
- No `pageerror` events during the run.

## Responsive notes / measurements
- Voting screen width `min(1460px, 100vw − 104px)`; archive `min(1560px, 100vw − 96px)`; briefing `min(1280px, 100vw − 104px)` — all inside the `.view` gutter at 1920/1366/1024. Archive measured 1270px at 1366 and 928px at 1024.
- Confirm/Continue buttons use the 45px `--control-height`, 11px `--radius-control`, 13px `--control-font`.
- Factory card keeps the authored 30vw footprint (540 cap), so the camera’s existing narrow-aspect stage shift keeps the prototype/arms in the uncovered area; card never leaves the viewport.
- Briefing stacks at ≤1100 with the sealed card restored and vertical scrolling enabled.
- Archive stacks to one column at ≤1100 (existing behaviour), all copy reachable by scrolling; no horizontal overflow.

## Residual issues / blockers for the lead
1. `npm run build` is currently red only because of QA’s `tests/e2e/universal-ui.spec.ts` TypeScript errors listed above. Workstream C cannot edit tests. `npx vite build` passes.
2. Existing lead-owned scripts still query removed classes/labels: `scripts/lead-visual-check.mjs` looks for `.simulated-stamp`; `scripts/visual-walkthrough.mjs` uses `Face the board` / `Continue to Chapter n`. They need the new `Confirm` / `Continue` labels and `.factory-truth` selector.
3. The third (finale) transition intentionally keeps `Open the sealed archive`; if the lead wants `Continue` on every transition screen, change the one line in `transition.ts` and update `case.spec.ts`.
4. Screenshot capture stalled under concurrent WebGL load in this environment; DOM/geometry verification above is complete, but no new visual-regression images were produced by this workstream. QA should capture the matrix after other writers stop.
