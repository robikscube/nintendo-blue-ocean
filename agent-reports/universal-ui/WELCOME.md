# Workstream A — Welcome / title heading and Start

**Status: PASS WITH NOTES** (2026-10-22)
**Owner:** Welcome agent (exclusive files below)
**Scope:** Welcome/title screen only. No story, scene, audio, HUD, or shared-button changes.

## Files changed (only these)

- `blue-ocean-game/src/ui/screens/title.ts` — rewrote `renderTitleScreen()`
- `blue-ocean-game/src/styles/welcome.css` — scoped welcome composition
- `agent-reports/universal-ui/WELCOME.md` — this report

No other project file was edited. The approved badge was read only, never copied, cropped, regenerated, or replaced.

## Implementation

### Markup (`title.ts`)

- One semantic heading: `<h1 id="title-heading" class="sr-only">Nintendo: The Next Blue Ocean</h1>`; the section uses `aria-labelledby="title-heading"`.
- Approved image at the exact contract path:
  `${import.meta.env.BASE_URL}assets/ui/the_next_blue_ocean_badge.png`, with `id="title-art"`, `class="title-art"`, `alt="The Next Blue Ocean — Nintendo"`, intrinsic `width="1672" height="941"`, `draggable="false"`, and `object-fit: contain`.
- One visible CTA, exactly:
  `<button class="primary-button large start-button" type="button" data-action="start">Start</button>`
- Retained `.title-credit` with live `MUSIC_CREDIT` links: Towball (`https://towball.itch.io/towballs-crossing`) and CC BY 4.0 (`https://creativecommons.org/licenses/by/4.0/`).
- Removed: eyebrow, live serif `.title-lockup`, `.title-dek`, presenter-guide button, `.title-note` disclosure, entire `.title-aside`/session overview, and all other old welcome copy.

### CSS (`welcome.css`, all scoped under `.title-screen`)

Selectors added:

- `.title-screen` (full-viewport transparent overlay; resets legacy panel/grid)
- `.title-screen::before` (soft legibility gradient only; boardroom remains visible)
- `.title-screen .title-art`
- `.title-screen .primary-button.start-button`
- `.title-screen .primary-button.start-button:hover:not(:disabled)`
- `.title-screen .primary-button.start-button:focus-visible`
- `.title-screen .title-credit`
- `.title-screen .title-credit a` / `:hover`
- `@keyframes title-screen-in`, `@keyframes title-art-in`
- `@media (max-height: 800px)`, `@media (max-width: 700px), (max-height: 600px)`, `@media (prefers-reduced-motion: reduce)`

Key geometry: art top `clamp(52px, 6vh, 84px)`, width `min(65vw, 900px, 72vh)` (the `72vh` cap keeps the badge above ~47vh at 16:9); Start center `87.5vh`, `min-height: 54px`, `min-width: 188px`; credit `left: clamp(18px, 2.4vw, 40px)`, `bottom: max(16–18px, env(safe-area-inset-bottom))`. All new CSS loads after `style.css`, deliberately overriding legacy title rules.

## Verification (actually run)

### Commands

| Command | Result |
|---|---|
| `npm run typecheck` (in `blue-ocean-game`) | exit 0, no output |
| `npm test` (in `blue-ocean-game`) | **87/87 passed**, 8 test files, 4.44s |
| Badge SHA-256 check | `78f560df78b9baa509ce5ee8555969ce76100dcb73bd78e2d7a6427e6965536c` — matches approved baseline |
| Badge PNG header check | RGBA (color type 6), 1672 × 941 |

### Browser geometry (Chromium via local Vite server)

| Viewport | Art rect | Art center Δ | Art top / bottom | Start rect | Start center | Credit | Checks |
|---|---|---|---|---|---|---|---|
| 1920×1080 | x 571.2, y 64.8, 777.6×437.6 | 0 px | 6.00vh / 46.52vh | 866,918, 188×54 | Δ 0, 87.5vh | y 1044.1, bottom gap 18px | naturalWidth 1672; 1 Start CTA; no HUD overlap; no credit/Start overlap; no overflow; no console/page errors |
| 1366×768 | x 406.5, y 52, 553×311.2 | 0 px | 6.77vh / 47.29vh | 589,645, 188×54 | Δ 0, 87.5vh | y 735.5, bottom gap 16px | same, plus reduced HUD breakpoint |
| 1024×768 | x 235.5, y 52, 553×311.2 | 0 px | 6.77vh / 47.29vh | 418,645, 188×54 | Δ 0, 87.5vh | y 735.5, bottom gap 16px | same |

Additional assertions at all three sizes:

- Badge loaded from local `/assets/ui/the_next_blue_ocean_badge.png` (`naturalWidth > 0`, `complete: true`); no failed requests, no external requests.
- Exactly one visible control whose text contains "Start".
- `h1` text: "Nintendo: The Next Blue Ocean"; class `sr-only`; no duplicate visible title text in screenshots.
- Old copy absent from `document.body.innerText`: "Enter the boardroom", "Presenter guide", "You are the board", "Session overview", "IN THE ROOM", "A PRESENTER-LED".
- Credit links present with correct artist/license URLs.
- `document.body.scrollHeight === innerHeight` and no horizontal overflow at every size.
- Badge, gear, mute, and fullscreen button bounding boxes do not intersect.
- Keyboard activation: focused Start + `Enter` → phase `opening`; fresh title + `Space` → phase `opening`.
- Screenshots reviewed at all three sizes (`%TEMP%/nbo-title-1920x1080.png`, `-1366x768.png`, `-1024x768.png`). Composition matches the reference: emblem upper-center, single Start lower-center, credit bottom-left, boardroom visible.

The local Vite check used an already-running server on port 5173 (this workstream's own `npm run dev` attempt exited with "Port 5173 is already in use"). No server started by this workstream remains running.

## Notes / blockers for integration

1. **Existing E2E selectors must be updated by the lead/QA.** Several specs still use `getByRole('button', { name: /Enter the boardroom/i })` (expected per the integration plan). In addition, `tests/e2e/background-music.spec.ts:27` clicks `.title-lockup`, which no longer exists because that live serif title was explicitly removed. Update it to `#title-art` (or `.title-art`) before running the E2E suite. This is the only known acceptance-adjacent breakage.
2. `npm run build` was not run by this workstream (lead owns integration builds). The image path uses the same static `import.meta.env.BASE_URL` pattern already proven by `dialogue-bubble.png`, so it is Pages-base-compatible.
3. No blockers in the owned implementation. All assignment acceptance items for the welcome screen are met.

## Status: PASS WITH NOTES
