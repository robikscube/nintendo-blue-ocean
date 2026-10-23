# Claude Code UI Team Handoff — October 22, 2026

## Assignment
Implement **UI_REFINEMENT_TASK_2026-10-22.md**. Read CLAUDE.md, PLAYTEST_FEEDBACK_ROUND1.md, current game source, BUILD_STATUS.md and relevant installed game/UI skills before editing.

## Important concurrency gate
At handoff, an **existing interactive Claude Code session** called `blue-ocean-game-74` was busy in the same `blue-ocean-game` directory; `blue-ocean-game-67` was idle. The lead MUST check whether another agent has write ownership of ui.ts, style.css, or related files. Do not edit conflicting files until released. Never kill other agents. If conflicts remain, perform only read-only review and record blockers.

## Delegation and exclusive ownership
- **Lead / UI engineer**: sole source writer for `blue-ocean-game/src/ui/ui.ts`. Remove top-left HUD branding/phase, remove circled factory labels/card metadata, change button label to Confirm, replace Presenter visible label with accessible gear SVG. Coordinate selectors with typography specialist.
- **Typography agent**: sole source writer for `blue-ocean-game/src/style.css` and optional NEW locally licensed font asset(s). Inspect downloaded official KFhimajiMAJI ZIP in `tools/font-reference` and author licensing notes. Do not embed or distribute KFhimaji unless permission permits web use and font-file redistribution; otherwise use a licensed rounded alternative.
- **QA agent**: read-only inspection plus NEW files in `agent-reports/ui-refinement/` and, if needed, NEW test files. Verify presenter drawer and keyboard commands, factory actions, counterfactual disclosures, mobile/projector layout, screenshots, tests; send defects to lead, do not edit src.
- The team lead creates a real Claude Code agent team if available with experimental teams flag. Every teammate reads related installed skills. Verify actual spawning rather than claiming names.
- Avoid overlapping edits. Do not edit source from the team lead and typography agent simultaneously on the same file.

## Acceptance
See detailed criteria in `UI_REFINEMENT_TASK_2026-10-22.md`. Run build, tests and screenshots after integration. Preserve factual-history-only finale; prototypes are hypothetical and should not be confused with Nintendo products, even after visible label cleanup.

## Reporting
Record actual team roster, source ownership, changes, tests and screenshots in `agent-reports/UI_REFINEMENT_2026-10-22.md` and update BUILD_STATUS.md after verification. Do NOT deploy or publish without explicit instruction. No work outside Nintendo folder.

## NEW Round 2 vote / transition task — required in same implementation pass
**Before editing or delegating, read `UI_REFINEMENT_ROUND2_VOTE_TRANSITION.md`.** This newer task is explicitly assigned to the **existing UI lead** who exclusively owns `src/ui/ui.ts`, because P1/P2 from the first task and the new vote/transition changes all target the same TypeScript file. It must be integrated as one conflict-free implementation pass, not delegated to a second overlapping ui.ts writer.

The new visible UI copy changes are: remove “CHAPTER n” from vote eyebrow, remove vote context subtitle and footer instructional paragraph, rename “Record the board's vote” to **Confirm**; remove the transition footnote “Historical products and figures are still sealed”, rename chapter transition action to **Continue**. Apply through shared rendering paths across all four votes and all chapter transitions.

Assign the **QA subagent** to both existing UI refinement and NEW `UI_REFINEMENT_ROUND2_VOTE_TRANSITION.md` cross-chapter regression, including all four votes and both transitions, reporting in `agent-reports/round2/VOTE_TRANSITION_QA.md` and `agent-reports/UI_REFINEMENT_2026-10-22.md`. QA must not edit existing UI or CSS.

Assign the typography specialist exclusive `style.css` ownership for any CSS spacing adjustments once the common renderer markup is finalized. Ensure two-way coordination with UI lead to prevent edits in the same files. Do not claim any child spawned until an actual Claude Code teammate/subagent is visible.

## NEW Welcome Page title-screen refinement — after Round 2
Read `UI_WELCOME_PAGE_REFINEMENT.md` for the **approved title-image + Start placement** task, grounded in the presenter's annotated welcome screenshot and Animal Crossing title screen layout reference.

Do not create new artwork or change the boardroom background. The approved transparent title graphic `the_next_blue_ocean_badge.png` was created in ChatGPT and is **not yet on the laptop**: request/copy the approved actual PNG to `blue-ocean-game/public/assets/ui/the-next-blue-ocean-title.png` before integrating (do not invent an alternative asset). Preserve music credits and remove all other blue-marked welcome helper copy and the session overview. Move a single `Start` DOM button to bottom-center using the reference's “Press A” placement; keep its existing `data-action="start"`.

**Ownership:** Existing UI lead exclusively edits `src/ui/ui.ts` (same owner as existing P1/P2/Round2); existing typography/layout specialist exclusively edits `src/style.css` after markup contract; QA may write `agent-reports/ui-refinement/WELCOME_QA.md` and new tests only. Avoid overlapping existing source file modifications or claiming the asset is installed when unavailable. Include UI welcome refinement in the same tested integration pass and final report.
