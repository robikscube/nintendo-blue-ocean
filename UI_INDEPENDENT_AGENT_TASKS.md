# Immediate UI Delegation — October 22
You are the CLAUDE CODE coordinator of independent work items. Read UI_TEAM_HANDOFF.md, UI_REFINEMENT_TASK_2026-10-22.md and UI_REFINEMENT_ROUND2_VOTE_TRANSITION.md.

IMPORTANT: TWO pre-existing Claude sessions are actively modifying blue-ocean-game. DO NOT TOUCH any current game src files, CSS, tests, configs, package files or BUILD_STATUS.md. The old exit-watcher is blocked. Spawn separate specialist SUBAGENTS now for these SAFE NONOVERLAPPING DELIVERABLES:

(A) FONT LICENSE + FONT INTEGRATION PLAN: Read official downloaded font archive at tools/font-reference/KFhimajiMAJI.zip and license readme. Verify whether redistribution and browser @font-face are permitted; do not bundle the font unless documented license permits. Inspect src/style.css READ-ONLY. Write ONLY agent-reports/ui-refinement/FONT_REVIEW.md. Provide precise suggested font declaration/fallback and citations/quotes from license where applicable. Apply project game/visual skills if useful.

(B) UI ACCESSIBILITY + IMPLEMENTATION QA PLAN: Read current src/ui/ui.ts and story/code READ-ONLY. Audit both UI task specs: top-left labels, presenter gear, factory clutter/Confirm, vote Confirm, chapter transition Continue, game integrity. Write ONLY agent-reports/ui-refinement/QA_PLAN.md. Recommend a browser regression matrix for all decisions, transitions, 1080p and 768p. Apply game-qa, nintendo-game-design and game-architecture skills.

(C) UI CHANGE REVIEW: Read current UI task specs and current code READ-ONLY; write ONLY agent-reports/ui-refinement/CHANGE_MAP.md mapping exact render methods/selectors, dependency/null-reference hazards, and safest atomic integration order. Do not change game code.

Create the parent coordination report ONLY at agent-reports/ui-refinement/COORDINATOR_STATUS.md. Verify actual subagents were spawned and report their IDs/outputs; if no delegation tools available, do the reviews sequentially, explicitly state that. MUST NOT make source edits or claim feature implementation. No deployments/paid services. New UI source changes are reserved for UI lead once competing writers are idle/release ownership.
