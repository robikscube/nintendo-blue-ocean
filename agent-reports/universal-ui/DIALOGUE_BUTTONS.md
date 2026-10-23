# Workstream B — Dialogue and Shared Buttons

**Status:** COMPLETE — 2026-10-22. Source edits finished; no further source changes. Typecheck and unit tests pass; focused dialogue browser suite passes 5/5. One unrelated 1024 layout timeout is recorded below.

## Files changed (exclusive ownership only)

1. `blue-ocean-game/src/ui/screens/dialogue-panel.ts`
2. `blue-ocean-game/src/ui/components/button.ts`
3. `blue-ocean-game/src/styles/dialogue-buttons.css`
4. This report

No files outside this ownership set were edited.

## What changed

### Dialogue markup — `dialogue-panel.ts`

Preserved every contract node and name exactly:

- `#dialogue-panel` / `.dialogue-panel` with `hidden` and `data-speaker="narrator"`.
- `#dialogue-art` / `.dialogue-art` with the approved `${import.meta.env.BASE_URL}assets/ui/dialogue-bubble.png` path and 3872 × 1552 intrinsic attributes.
- `.name-tag-tint` SVG and its `<path>`.
- `.name-live`, `#speaker-name`, `#dialogue-text`, `#dialogue-accessible`.
- `.continue-pulse` and `#dialogue-continue` with the exact `aria-label="Continue to the next line"`.

Semantic additions only: initial `aria-busy="false"`, `aria-hidden="true"` on the decorative art, `role="status"` plus `aria-atomic="true"` on the live region, and `aria-keyshortcuts="Enter Space"` on the continue button. No timing, reveal, state, or event-handler contract was changed.

### Shared actions — `button.ts`

- Kept the public `actionButton(options)` signature, tone mapping, native `<button type="button">`, `data-action`, disabled attribute and escaped attribute values unchanged.
- The trusted decorative `icon` is now wrapped in `<span class="button-icon" aria-hidden="true">…</span>` so it is always hidden from assistive technology.
- Labels, IDs, action names, classes, and `attrs` values remain escaped; only the documented trusted icon fragment is interpolated as HTML.

### Dialogue and button CSS — `dialogue-buttons.css`

Selectors added or overridden:

- `.ui-root :is(.primary-button, .secondary-button, .text-button, .danger-button)` — shared 45px minimum height, 11px radius, 13px/700 label, 10px icon gap, inherited font and paint-only transitions.
- `… .large` — 54px minimum height, 15px label, 26px inline padding.
- `.ui-root .text-button` — quiet transparent surface retained; no smaller 38px target and no uppercase label.
- `… :hover:not(:disabled)` / `… :focus-visible` / `… :disabled` — consistent hover suppression, 2px gold focus ring at 3px offset, opacity 0.36 disabled state, and no transform/box-shadow on disabled.
- `.button-icon`, `.button-icon > svg` — fixed one-em decorative icon box.
- `.dialogue-panel` — 16–24px `clamp()` bottom safe gap, 3872 / 1552 ratio, transparent surface, `max-width: calc(100vw - 24px)`. The approved responsive width rule in `style.css` (`min(55vw, 1000px)`, plus its narrower breakpoints) is intentionally left in place and not replaced.
- `.dialogue-art` — 100% box, exact aspect ratio, `object-fit: contain`, transparent background, no border.
- `.name-tag-tint`, `.name-tag-tint path`, and all six speaker tint values — preserved/restated.
- `.dialogue-copy` — approved copy-region percentages preserved with `min-width: 0` and `max-width: 100%`.
- `.dialogue-text` — full-width constrained text with `overflow-wrap: break-word`; responsive type sizing remains the approved `style.css` scale (31 / 25.95 / 24.06px).
- `.continue-pulse` — pointer-events remain off; source-art chevron untouched.
- `.dialogue-continue` — 44 × 44px minimum hit target preserved; dedicated 2px gold-soft focus ring at 3px offset.
- `@media (prefers-reduced-motion: reduce)` — panel enter/leave motion off, breathing pulse animation off with a static visible chevron glow, button transitions off.

Scope stayed limited to the four button classes, `.button-icon`, `.dialogue-panel`, `.dialogue-*`, and `@media (prefers-reduced-motion)`. No welcome, vote-card, factory-card, archive, HUD, or presenter selectors were restyled.

## Verification actually run

Working directory for all commands: `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game`

| Command | Result |
|---|---|
| `npm run typecheck` | **exit 0**, no diagnostics |
| `npm test` | **8 files / 87 tests passed**, 6.99 s |
| `npx playwright test tests/e2e/dialogue-bubble.spec.ts --config=playwright.config.ts` | **5/5 passed**, 7.7 min |
| `npx playwright test tests/e2e/team-layout.spec.ts --config=playwright.config.ts` | 1366×768 **passed** (19.2 s); 1024×768 run hit its own 150 s test timeout while a concurrent lead preview Playwright suite was running |
| Bubble PNG SHA-256 | **7BA24E94876551C39F3324D2B55CEE6F252F363EAC3934A46D236C35283687B6** — unchanged |
| Bubble PNG size / dimensions | **274,232 bytes**, **3872 × 1552** — unchanged |

The focused browser suite exercises the bubble at the default 1920×1080 viewport, 1366×768, and 1024×768. Its assertions passed for the approved art dimensions/ratio, bottom gap, 154-character longest authored line, copy-region containment, 44px continue target, exact aria label, and horizontal overflow ≤1px. The suite runs with `reducedMotion: 'reduce'`, so the explicit reduced-motion CSS path is exercised; the normal-motion chevron breathe is defined in existing `style.css` and only disabled by this file.

No dev server started by this workstream remains. Playwright reused the pre-existing dev server and its run exited. The long-running wait task created for the concurrent preview process was stopped on the lead's request.

## Residual notes / unresolved

1. The 1024×768 `team-layout` run did not report a layout assertion failure; it timed out at 150 s in a busy environment with a separate lead preview suite active. It should be rerun after integration when only one browser suite is running. The 1024×768 dialogue-specific test did pass, including its horizontal-overflow assertion.
2. Button geometry is enforced centrally, and the 1366×768 full-screen layout test passed. A dedicated per-screen visual capture of every button at 1920/1366/1024 remains for the lead/QA integration pass.
3. The frozen bubble PNG was hash-checked before and after edits; it was never copied, replaced, or modified.
4. No build was run by this workstream after the edits; typecheck and the browser suite already serve the modified TypeScript/CSS. The lead has separately reported build passing.
