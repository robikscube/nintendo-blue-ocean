# UI Refinement Task — Presenter HUD, Factory View and Global Typography
**Status:** Specification only; do NOT mark implemented. **Source:** Three annotated October 22 screenshots provided by presenter. **Executor:** Claude Code. **Project:** `blue-ocean-game/`.

## Objective
Simplify visible classroom UI while preserving operable voting, factory presentation, accessible controls, and the story's distinction between hypothetical audience prototypes and real Nintendo history.

## P1 — Remove top-left HUD branding and replace presenter button with gear
**Screenshot 1:** Blue-crossed upper-left brand/chapter text must disappear entirely; the circled `Presenter` button becomes a small gear icon.

**Code:** `blue-ocean-game/src/ui/ui.ts` near `buildShelldon()` lines 193–225; `src/style.css` `.hud-brand`, `.hud-current`, `.presenter-button`, layout responsive rules. Remove the N medallion, NINTENDO text, THE NEXT BLUE OCEAN subtext, chapter/year/phase/subtitle and seal status from the upper-left HUD. Keep the vote trail and fullscreen/mute controls at upper right. Change visible `Presenter` text to an inline SVG **gear** (or existing icon) with accessible `aria-label="Presenter settings"`, `title`, and existing keyboard P action. Preserve drawer functionality and accessible keyboard/focus handling. After removing HUD markup, fix any DOM `byId()` invariants and references to chapter-label, hud-phase and seal-indicator so no null references or tests break. Do not reintroduce the deleted top-left labels via CSS pseudo-content.

## P2 — Simplify factory view and label button Confirm
**Screenshot 2:** Delete the blue-crossed top-left status/year text, upper-right `AUDIENCE CONCEPT — NOT HISTORICAL` badge, and the blue-crossed factory result-card metadata (two eyebrow/header lines above product title; choice-source line below readout; disclaimer stamp and fine-print at bottom). Replace visible `Face the board` text with exactly **Confirm**.

**Code:** `src/ui/ui.ts` `renderFactory()` near lines 550–590; `src/style.css` `.factory-banner`, `.factory-card`, `.factory-source`, `.simulated-stamp`, `.fine-print`. Delete or visually suppress the unwanted DOM content for BOTH assembly-progress and revealed-result states where applicable, including redundant top-left `.factory-banner`. Keep: actual prototype title, concise description, PRIORITIZES and TRADE-OFFS substance, Replay build action, optional Skip animation, and the `data-action="leave-factory"` action (its functionality remains identical; label `Confirm`). If any layout changes are needed, improve information hierarchy so prototype console and arms remain visible.

**Accuracy constraint:** The professor specifically wants the circled *visual labels* removed, but the underlying educational/counterfactual distinction must remain explicit and accessible somewhere nonintrusive (e.g. an initial briefing, presenter guide, or a concise single explanatory sentence at reveal, not the deleted badge/footer). Maintain `SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT` in model semantics/story documentation and do not suggest the prototype is an actual release or fabricate sales. Confirm that the historical reveal still occurs only in the finale.

## P3 — Change global serif type to cute, legible rounded style
**Screenshot 3:** Inspiration is an Animal Crossing-like soft rounded handwritten sans font, especially the large friendly UI/dialogue lettering. Avoid copying game fonts or assets.

**Preferred candidate:** KFhimajiMAJI / KFひま字マジ. Official source: https://www.kfstudio.net/font/kfhimajimaji/ . Retrieved **official zip** on laptop at `Nintendo/tools/font-reference/KFhimajiMAJI.zip` (177,402 bytes, valid ZIP; includes `KFhimajiMAJI/KFhimajiMAJI.otf` and `kf_readme.html`). This is a local research copy, NOT a web asset or permission to bundle. Review the Japanese creator terms and readme before copying the font into the application's public assets. KF STUDIO states basic commercial and noncommercial use is free, but restrictions and web embedding/redistribution must be checked. If web redistribution/embedding is prohibited or ambiguous, **do not embed**; select an appropriately licensed rounded web font and record the license/source. No need to install font globally on Windows.

**Code:** `src/style.css` root vars near lines 16–17 (`--serif: Georgia`, `--sans`), `--dialogue-font` near line 1333, plus all component font-family declarations; `public/assets/fonts/` only if legally usable. Implement one consistent locally bundled `@font-face` stack where license allows, using a safe fallback. Replace serif typography across interstitials, titles, main dialogue, name tags, button labels, factory panels, chapter cards, choice cards, and finale; preserve semantic hierarchy and projector contrast. Beware KFhimaji glyph coverage, English numerals and punctuation. Don't blindly increase letterspacing or make dense source citations unreadable. Test at 1920×1080, 1366×768 and 1024×768.

## Coordination and scope
- Delegate source ownership without conflicts: HUD/factory UI = one implementer of `src/ui/ui.ts`; typography/layout = one implementer of `src/style.css`; one read-only visual QA reviewer. Agree markup selectors before editing. The lead owns integration, tests and reporting.
- No redesign of the dialogue bubble in this task; prior bubble preview approval is separate.
- Keep keyboard shortcuts, presenter drawer, accessibility, voting trail and transitions operational.
- Source screenshots are in ChatGPT; their annotations are captured by this task doc. Do not require screenshots to be placed in the repository before starting.

## Verification
Run `npm run typecheck`, `npm test`, `npm run build` and browser tests. Make updated screenshots for boardroom/chapter transition, factory completion and dialogue at two projector resolutions. Verify no top-left brand or phase text remains, gear is clickable and keyboard accessible, no crossed factory metadata or badges remain, `Confirm` triggers the existing board-return flow, and the new font loads offline if licensed.

## Deliverables
1. Changed source/CSS only after Claude Code executes this task.
2. `agent-reports/UI_REFINEMENT_2026-10-22.md` with files changed, font choice/licensing rationale, tests and screenshots.
3. Update `BUILD_STATUS.md` only after actual tested implementation.

**This task file is the user's recorded implementation request, not evidence the changes are live.**
