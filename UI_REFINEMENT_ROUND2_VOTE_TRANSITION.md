# Round 2 — Vote and Chapter Transition UI Simplification
**Date:** 2026-10-22
**Status:** NEW TASK / not yet implemented
**Project:** `blue-ocean-game/`
**Source:** Two annotated presenter screenshots supplied in ChatGPT:
1. Board vote (Chapter 1, 2005) — blue strikeouts and orange confirmation button
2. Chapter transition (Chapter 1 to 2) — blue strikeout and orange continue button

## Requested changes — ALL chapters and decisions

### A. Voting/choice screen (Image 1)
In the common choice screen renderer, remove the **specific blue-marked text**:
- Remove `CHAPTER 1` (and analogous dynamically generated `CHAPTER 2` / `CHAPTER 3`) from the small eyebrow over the vote prompt. Retain `BOARD VOTE` and, if useful, `VOTE n OF m` as concise progress context; do not show “CHAPTER n” here.
- Remove the entire secondary explanatory paragraph directly below the question heading (for example “Each direction trades a different benefit...”); this is the `decision.context` paragraph **in this screen** only. Do not remove the source data or the actual option details.
- Remove the entire footer instruction paragraph (for example “Audience votes by hand. Presenter selects the majority...” and keyboard instructions). Do not remove the selection UI, keyboard shortcuts, or logic.
- Rename the lower-right orange-circled `Record the board's vote` button to **Confirm** (exact visible text). Keep `data-action="commit-choice"`, selection validation/disabled until an option is selected, click/keyboard actions, and existing vote recording behavior. Remove decorative text arrows only if necessary for an exact clean “Confirm” label.

**Preserve:** The actual question, three option cards, descriptive text and Benefit / Trade-off content, vote state trail in global HUD, and accessible labels. Avoid deleting instructional content in presenter documentation if that information is needed there; it should simply not clutter the audience-facing vote overlay.

### B. Chapter transition card (Image 2)
- Remove the blue-crossed small paragraph **“Historical products and figures are still sealed.”** from the common transition panel entirely.
- Rename the orange-circled button from `Continue to Chapter 2 · 2011` (or other chapter/year variants) to the **exact visible text “Continue”** on ALL transition screens.
- Keep `data-action="transition-next"`, its state transition behavior, and keyboard/focus accessibility. Do not remove the chapter/year logic from story data if other parts still need it.

**Preserve:** “A FEW YEARS LATER”/current eyebrow, transition title and main explanatory story paragraph, current button styling and layout, and the rule that official Nintendo platforms and sales are only revealed during the finale.

### C. Cross-chapter generalization
Apply the modifications in **shared reusable render functions**, not hard-coded Chapter 1 conditionals. They must work for:
- All four decisions D1, D2, D3, D4, including Chapter 3’s two votes
- Both chapter transitions and any same-component future uses
- Any entry path, presenter chapter jump, reset and keyboard navigation
- Both 1920×1080 and 1366×768 projector layouts

## Verified implementation locations (before edits)
- `blue-ocean-game/src/ui/ui.ts` `renderVoting()` around lines 503–546:
  - eyebrow `BOARD VOTE · CHAPTER ${chapter.number} · VOTE ${voteNumber} OF ${chapterVotes.length}`
  - explanatory `<p>${escapeHtml(decision.context)}</p>`
  - footer `<p><strong>Audience votes by hand.</strong> ...</p>`
  - `<button data-action="commit-choice">Record the board's vote</button>`
- `blue-ocean-game/src/ui/ui.ts` `renderTransition()` around lines 601–614:
  - `<button data-action="transition-next">${escapeHtml(chapter.transition.nextLabel)}</button>`
  - `<p class="sealed-small single">Historical products and figures are still sealed.</p>`
- `blue-ocean-game/src/style.css` only adjust spacing/layout when removing DOM lines causes visible excess whitespace. Note the prior typography/UI refinement assignment already owns CSS.

## Delegation — nonoverlapping file ownership
**Existing UI refinement implementation lead** exclusively owns `src/ui/ui.ts` and should incorporate this task into its pending `UI_REFINEMENT_TASK_2026-10-22.md` work; do not launch another concurrent writer for this file.

**Read-only vote/transition QA subagent** owns NEW file `agent-reports/round2/VOTE_TRANSITION_QA.md` and optional NEW test spec `blue-ocean-game/tests/round2-vote-transition.spec.ts` (verify no pre-existing path first). Must not edit existing `ui.ts` or `style.css`. Test every decision and both transitions, focus/navigation and button actions.

**Typography/layout specialist** already owns `src/style.css`; can fix vote/transition spacing after the UI lead finalizes markup, but no overlapping CSS edits with any other agent.

Every subagent should read relevant installed skills (`nintendo-game-design`, `threejs-game`, `game-qa`, `game-architecture` depending on responsibility), coordinate via lead, report real status; do not invent spawned agents.

## Acceptance and reporting
1. Screenshot each of D1, D2, D3 and D4: no “CHAPTER n” in vote eyebrow, no question subtitle or footer instruction; primary action reads **Confirm**.
2. Choice still must be selected before Confirm becomes enabled and records the correct vote; keyboard controls 1/2/3 and V preserved.
3. Both transition cards: no “Historical products and figures are still sealed” footnote; primary action text exactly **Continue**; advances correctly.
4. No regression in chapter flow, factory, fictional/historical fact boundaries, presenter mode, or resets.
5. Run TypeScript check, npm tests/build and relevant browser tests (record skips honestly if unsupported); capture screenshots at two projector sizes.
6. Agent reports should include actual changed files, validation evidence and remaining blockers; append Round 2 outcome to `agent-reports/UI_REFINEMENT_2026-10-22.md` or create `agent-reports/ROUND2_VOTE_TRANSITION.md` after QA.

**Do not edit user-facing game content other than the explicitly circled UI copy; do not change historical facts.**
