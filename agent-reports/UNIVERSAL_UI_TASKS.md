# Universal Round 1 UI Consistency — Assigned Tasks

**Date:** 2026-10-22
**Project:** `blue-ocean-game/`
**Coordinator:** lead session (this session)
**Status:** ACTIVE — assignments below are executable, not a claim of completion.

## Objective

Make the whole presenter journey feel like one deliberately designed exhibit. This is a **visual/UI consistency and simplification pass**, not a story, scene, audio, or mechanics rewrite.

The pass covers the already-approved requests in:

- `UI_WELCOME_PAGE_REFINEMENT.md` — approved title badge, single centered **Start**, clutter removal, retained music credit.
- `UI_REFINEMENT_TASK_2026-10-22.md` — HUD simplification, presenter gear, factory cleanup, exact **Confirm**.
- `UI_REFINEMENT_ROUND2_VOTE_TRANSITION.md` — vote and transition simplification, exact **Confirm** / **Continue**.
- Current dialogue-bubble approval and the licensed music attribution.

Where a source task asks for deletion of a visible counterfactual label, the educational disclosure is retained as one quiet, nonintrusive line (factory) and in briefing/presenter copy. No fabricated product, sales figure, or outcome may be introduced.

## Frozen assets and protected code

These files must remain byte-identical. Hash baselines are recorded in `agent-reports/universal-ui/PROTECTED_BASELINE.sha256`.

- `blue-ocean-game/public/assets/ui/dialogue-bubble.png` (approved bubble; SHA-256 `7ba24e94…87b6`)
- `blue-ocean-game/public/assets/ui/the_next_blue_ocean_badge.png` (approved title badge; 1672 × 941 RGBA)
- `blue-ocean-game/public/audio/towball-*.mp3` (licensed music)
- `blue-ocean-game/public/MUSIC_LICENSE.md`, `MUSIC_LICENSE.md`
- `src/core/**` (story, decisions, state, checkpoint, types, store)
- `src/audio/**` (speech, mumble, music routing)
- `src/scene/**` (boardroom, factory, characters, camera)
- `package.json`, `package-lock.json`, Vite/Playwright/Vitest configs

No new npm packages, CDNs, external assets, image generation, or font bundling in this round. The KFhimaji license review is not part of Round 1; keep the current typography stacks.

## Exclusive ownership matrix

No agent edits another agent's files. The lead alone integrates `ui.ts`, `main.ts`, `style.css`, HUD markup, existing tests/scripts, and `BUILD_STATUS.md`.

| Owner | Exclusive files | Report |
|---|---|---|
| **Lead** | `src/ui/ui.ts`, `src/ui/screens/shared.ts`, `src/main.ts`, `src/style.css`, `src/styles/universal.css`, `agent-reports/UNIVERSAL_UI_TASKS.md`, `agent-reports/UNIVERSAL_UI_REPORT.md`, existing tests/scripts, `BUILD_STATUS.md` | `UNIVERSAL_UI_REPORT.md` |
| **A — Welcome / title** | `src/ui/screens/title.ts`, `src/styles/welcome.css` | `agent-reports/universal-ui/WELCOME.md` |
| **B — Dialogue / shared buttons** | `src/ui/screens/dialogue-panel.ts`, `src/ui/components/button.ts`, `src/styles/dialogue-buttons.css` | `agent-reports/universal-ui/DIALOGUE_BUTTONS.md` |
| **C — Vote / factory / archive / presenter** | `src/ui/screens/briefing.ts`, `voting.ts`, `factory.ts`, `transition.ts`, `finale.ts`, `presenter.ts`, `src/styles/screens-responsive.css` | `agent-reports/universal-ui/SCREENS.md` |
| **D — Independent QA** | `agent-reports/universal-ui/QA.md`, `tests/e2e/universal-ui.spec.ts`, `scripts/universal-ui-qa.mjs`, `agent-reports/universal-ui/screens/**` | `QA.md` |

**Read-only rule for QA:** QA may read all source and run the app/tests but must not edit `src/**`, `public/**`, or existing tests. Defects go to the lead, not into a competing implementation.

## Shared design contract

All owners use these tokens/classes. Lead seeds the tokens in `src/styles/universal.css`; agents consume them and may add component-local variables.

- Surfaces: `--ink #17161c`, `--ink-deep #0e0d12`, `--panel #201e25`, `--panel-raised #29262d`
- Text: `--cream #f4ebdc`, `--cream-soft #d8ccba`, `--muted #a79f9b`
- Accent: `--gold #e3bd72`, `--gold-soft #f1d79d`, `--coral #e6755c`, `--mint #76c2b2`
- Lines: `--line`, `--line-strong`
- Radii: `--radius-card 16px`, `--radius-panel 20px`, `--radius-control 11px`, `--radius-pill 999px`
- Spacing: `--space-1 6px`, `--space-2 10px`, `--space-3 14px`, `--space-4 20px`, `--space-5 28px`, `--space-6 40px`
- Focus: 2px `--gold` ring, 3px offset, never removed.
- Primary button: 45px min height, 11px radius, 13px/700 label, 54px/15px for `.large`; one gold primary action per screen.
- Secondary: quiet bordered surface; ghost/text: no border; danger: coral outline.
- Motion: 160–220ms UI transitions; honor `prefers-reduced-motion`.
- Projector targets: **1920×1080 and 1366×768 are primary**; 1024×768 must remain usable without horizontal overflow.
- No viewport-relative text below 10.5px for meaningful copy at 1920; keep existing accessible contrast lifts.

## Module contract (lead-seeded before spawn)

`src/ui/screens/shared.ts` (lead): `escapeHtml`, `musicCreditTitles`, `productSilhouette`.

`src/ui/components/button.ts` (B):

```ts
export interface ActionButtonOptions {
  label: string
  action: string
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: string          // trusted decorative glyph/HTML fragment
  large?: boolean
  disabled?: boolean
  id?: string
  className?: string
  attrs?: Record<string, string>
}
export function actionButton(options: ActionButtonOptions): string
```

- Emits a native `<button type="button" data-action="…">`.
- Visible label is exactly the `label` text; optional `icon` is `aria-hidden`.
- `disabled` sets the attribute; `attrs` is escaped.

Screen renderers (all return HTML strings, no DOM side effects):

```ts
renderTitleScreen(): string
renderDialoguePanel(): string
renderBriefingScreen(state: GameState): string
renderVotingScreen(state: GameState): string
renderFactoryScreen(state: GameState, spec: PrototypeSpec | null): string
renderTransitionScreen(state: GameState): string
renderFinaleIntroScreen(): string
renderArchiveScreen(state: GameState): string
renderPresenterDrawer(state: GameState, opts: {
  volume: number; musicVolume: number; archiveOpen: boolean; presenterOpen: boolean
}): string
```

The lead keeps all event handling, state dispatch, dialogue timing, focus/inert management, and `data-action` wiring in `ui.ts`. Agents may add/retain `data-action` values but must not rename existing ones.

## Baseline handoff (already completed by lead)

The lead has completed a behaviour-neutral split so each owner has separate files:

- `src/ui/ui.ts` now imports screen renderers; dialogue timing, events, state, focus/inert, and presenter gating stay there.
- **Baseline at handoff:** `npm run typecheck` exit 0; `npm test` **87/87**; `npm run build` succeeded.
- New CSS files are already imported by `src/main.ts` in this order: `style.css`, `styles/universal.css`, `styles/welcome.css`, `styles/dialogue-buttons.css`, `styles/screens-responsive.css`. Your file is loaded **after** the legacy rules, so equal-specificity overrides win. Keep selectors scoped.
- `src/ui/components/button.ts` is a working baseline helper; improve it without changing the public signature.
- HUD has already been simplified by the lead: brand/chapter/phase/seal are visually hidden (state/test nodes retained), and the presenter control is a gear icon with `aria-label="Presenter settings"`. Do not restyle or reintroduce HUD copy.
- `#seal-indicator`, `#chapter-label`, `#hud-phase`, `#presenter-button`, `#dialogue-*` and all existing `data-action` values must remain present.

## A — Welcome / title heading and Start

**Goal:** Approved badge high-center, single **Start** low-center, music credit retained, everything else removed.

1. `title.ts` renders:
   - `<img id="title-art" class="title-art" src="${import.meta.env.BASE_URL}assets/ui/the_next_blue_ocean_badge.png" alt="The Next Blue Ocean — Nintendo">`
   - one semantic `h1` for screen readers (`class="sr-only"`), no duplicate visible heading.
   - one native `<button class="primary-button large start-button" data-action="start">Start</button>`.
   - retained `.title-credit` with the existing `MUSIC_CREDIT` artist/license links.
2. Removed from the welcome screen: eyebrow, live serif lockup, dek, presenter-guide button, disclosure paragraph, entire `title-aside`/session overview, and any other crossed-out welcome copy.
3. `welcome.css`:
   - image horizontally centered, top edge ~5–10vh, max width `min(65vw, 900px)`, intrinsic ratio, `object-fit: contain`, no crop.
   - Start centered at ~86–91vh, above bottom safe margin, at least 44px tall, high contrast.
   - music credit bottom-left, unobtrusive but readable, never under Start/browser bars.
   - `@media` tuning for 1920×1080, 1366×768, 1024×768; no overlap with HUD gear/mute/fullscreen.
   - background boardroom remains visible; only a soft legibility gradient is permitted.
4. Do not alter or copy the PNG. Use the existing approved path.
5. Acceptance: at both primary sizes, the badge loads (`naturalWidth > 0`), is centered/high, Start is the only visible CTA, music credit is visible, no old welcome copy, and keyboard Enter/Space activates Start.

## B — Dialogue and shared buttons

**Goal:** one coherent dialogue surface and one button language.

1. `dialogue-panel.ts` reproduces the current static markup exactly in contract: `#dialogue-panel` (`hidden` initially), `#dialogue-art` (`dialogue-bubble.png`), `.name-tag-tint` path, `#speaker-name`, `#dialogue-text`, `#dialogue-accessible` (`aria-live="polite"`), `.continue-pulse`, `#dialogue-continue` with accessible label.
2. Do not change dialogue timing/reveal/audio logic in `ui.ts`; preserve all IDs/classes the logic addresses.
3. `dialogue-buttons.css`:
   - keep the approved artwork ratio `3872 / 1552`, transparent PNG, tag tint, copy region, and chevron pulse.
   - keep 16–24px bottom safe gap; 55vw/1000px cap at 1920, adaptive at 1366/1024; no crop, no stretched art.
   - ensure text fits the art's copy region for the longest authored strings; no overlap with HUD or screen content.
   - visible focus ring on `#dialogue-continue`; reduced-motion disables the breathing pulse.
4. Shared buttons:
   - implement `actionButton()`; use it in your own dialogue markup where applicable.
   - define `.primary-button`, `.secondary-button`, `.text-button`, `.danger-button` consistently (height, radius, weight, focus, disabled, icon gap).
   - button labels used by this round: **Start**, **Confirm**, **Continue**, plus existing secondary actions.
5. Acceptance: bubble visually unchanged apart from consistency fixes; all five speakers + narrator still show correct name-tag fills; no overflow at 1920/1366/1024; buttons have identical geometry across screens; keyboard focus is visible.

## C — Voting / factory / archive / presenter responsive consistency

**Goal:** remove the crossed-out clutter and make all four screens feel like the same exhibit at projector sizes.

1. **Voting** (`voting.ts`):
   - eyebrow becomes `BOARD VOTE · VOTE n OF m` (no `CHAPTER n`).
   - remove `decision.context` paragraph from this screen only.
   - remove the footer instructional paragraph.
   - primary action visible text exactly **Confirm**; keep `data-action="commit-choice"`, disabled until a card is selected, and 1/2/3 + V behavior.
   - keep question, three cards, detail, Benefit/Trade-off, accessible names, and HUD vote trail.
2. **Transition** (`transition.ts`):
   - remove `Historical products and figures are still sealed.`
   - primary action visible text exactly **Continue** on both transitions; keep `data-action="transition-next"`.
   - keep eyebrow/title/paragraph.
3. **Factory** (`factory.ts`):
   - remove the top `.factory-banner` entirely (status/year/`AUDIENCE CONCEPT` badge).
   - remove the card eyebrow and prototype-number metadata above the title.
   - keep title, description, PRIORITIZES, TRADE-OFFS, Replay build, Skip animation.
   - make the choice-source line visually hidden but present in the DOM as `.factory-source` (traceability and existing tests); keep its exact choice labels.
   - keep the counterfactual disclosure as **one quiet line** with the exact `SIMULATED_LABEL` text (no dashed stamp, border, or large badge); remove the extra fine print.
   - primary action **Confirm** (`data-action="leave-factory"`); it must remain hidden until the build completes.
   - ensure the 3D prototype/arms remain visible at 1920/1366/1024; card must not cover the decision-defining prototype.
4. **Briefing** (`briefing.ts`): keep the chapter story and the sealed-history note; align its type/spacing/buttons with the shared system. Do not remove the counterfactual/sealed disclosure from this screen.
5. **Archive / finale** (`finale.ts`):
   - keep every fact, figure, source, caution, discussion prompt, and music credit exactly.
   - consistent card grid, type scale, spacing, and focus at 1920/1366; at 1024 keep all content reachable with no horizontal overflow (stacking is acceptable).
   - keep `.archive-screen` scrolling and the evidence jump.
6. **Presenter** (`presenter.ts`):
   - consistent spacing/type with the shared system; keep all controls and shortcuts.
   - at 1366×768 ensure Restart/Reset remain reachable without hunting (sticky recovery row or compact sections).
   - keep dialog semantics, focus trap, `inert` background, and `data-action` names.
7. `screens-responsive.css` may override existing component rules; keep all changes scoped to these screens. Do not restyle the HUD, title, or dialogue bubble.
8. Acceptance: all four votes, both transitions, all three factory reveals, sealed finale, open archive, and presenter drawer pass at 1920/1366/1024 with no horizontal overflow and no clipped primary action.

## D — Independent QA

QA is adversarial and read-only for source. It writes only its own report/test/script/screens.

1. Verify frozen assets by SHA-256 against `PROTECTED_BASELINE.sha256`; report any change.
2. Verify protected logic/audio/scene files are untouched (compare hashes or git status/diff).
3. Browser matrix:
   - welcome at 1920×1080, 1366×768, 1024×768
   - dialogue with all five speakers + narrator
   - D1, D2, D3, D4 vote screens; both transitions
   - 2005/2011/2016 factory build + reveal states
   - sealed finale, open archive, presenter drawer
   - keyboard-only path and reduced-motion path
4. Required assertions:
   - approved badge and bubble load from local assets; no external requests.
   - exactly one visible Start CTA; title badge centered/high; music credit visible/linked; no old welcome clutter.
   - vote eyebrow has no `CHAPTER`; no context/footer instruction; **Confirm** disabled until selection, then records the chosen option.
   - transition has no sealed footnote; **Continue** advances.
   - factory has no banner, no badge, no card metadata clutter; quiet exact truth label present; **Confirm** returns to the board; different choices produce different prototype titles/geometry.
   - archive shows Wii 101.63M, Wii U 13.56M, Switch 156.59M, source links, cautions; no pre-finale history leak.
   - presenter gear has `aria-label="Presenter settings"`, opens drawer, focus is trapped, background inert, reset works.
   - no page errors, no failed local requests, no horizontal overflow at all three sizes.
   - speech and music still initialize after first gesture; mute works.
5. Produce screenshots under `agent-reports/universal-ui/screens/` at 1920 and 1366 (and 1024 where relevant).
6. Report **PASS / PASS WITH NOTES / FAIL**, with exact command output, defects, and evidence. Do not silently accept a broken acceptance criterion.

## Integration protocol

1. Lead finishes the non-behavioral module/CSS split and records a baseline build.
2. Agents A/B/C start in parallel. Each writes a first status line to its report within the first minutes, then fills the report when done.
3. Agents must not run long-lived dev servers or concurrent Playwright suites. Use `npm run typecheck`/`npm test`; QA may run Playwright on a unique port/output dir after integration.
4. Lead integrates, updates old test labels deliberately (`Enter the boardroom` → `Start`, `Face the board` → `Confirm`, `Continue to Chapter n` → `Continue`), and runs build/typecheck/unit/browser suites.
5. Lead writes `agent-reports/UNIVERSAL_UI_REPORT.md` with actual commands/results, screenshots, residual notes, and asset hashes.
6. No deployment, publish, push, paid service, model generation, or work outside `C:\Users\robwa\Desktop\Nintendo`.

## Definition of done

- `npm run dev` opens the new welcome; Start → four votes → three factories → transitions → sealed archive works.
- All four requested workstreams have real agent reports and real file changes.
- Dial/visual language is consistent: one primary button system, one dialogue surface, one spacing/type rhythm.
- Approved images/music are byte-identical; story/history/audio/scene logic untouched.
- `npm run typecheck`, `npm test`, `npm run build` pass; relevant Playwright suites pass or failures are documented honestly.
- `agent-reports/UNIVERSAL_UI_REPORT.md` states exactly what was verified and what remains.
