# Post-shutdown recovery — Nintendo Next Blue Ocean
Date: 2026-10-22, after laptop restarted.

## Verified baseline (fresh, after restart)
- Desktop Commander online on Rowa-Laptop-15; no Claude Code processes or sessions survived reboot.
- `blue-ocean-game/npm run typecheck`: PASS (exit 0).
- `blue-ocean-game/npm test`: PASS, 87/87 tests.
- `blue-ocean-game/npm run build`: PASS, Vite 47 modules; large bundle warning only.
- Prior universal UI four-way delegation was real, with reports:
  - A: `agent-reports/universal-ui/WELCOME.md`: PASS WITH NOTES, files completed.
  - B: `agent-reports/universal-ui/DIALOGUE_BUTTONS.md`: COMPLETE, 5/5 focused Playwright passed.
  - C: `agent-reports/universal-ui/SCREENS.md`: COMPLETE; three viewports inspected; historical test errors were before 17:06 corrections.
  - D: `agent-reports/universal-ui/QA.md`: IN PROGRESS, browser matrix not completed.
- `agent-reports/universal-ui/playwright-lead-preview/.last-run.json` says FAILED with 5 test IDs (pre-reboot); `playwright-lead-case/.last-run.json` says failed without IDs. Inspect screenshots/logs and rerun after fixing selectors.
- `agent-reports/UNIVERSAL_UI_REPORT.md` missing. `BUILD_STATUS.md` has no final universal UI sign-off.
- Original git repo at Nintendo root has .git and .gitignore but no commits on main. Other recent work consisted of repository preparation and final audio changes; do not discard completed changes.

## Recovery ownership — do not duplicate completed A/B/C work
1. **UI integration lead**: exclusive control of `src/ui/ui.ts`, `src/styles/universal.css`, `src/main.ts`, legacy `src/style.css`, pre-existing tests and visual scripts, `BUILD_STATUS.md`, `agent-reports/UNIVERSAL_UI_REPORT.md`. Review current state before changing; repair stale selectors (Start / Confirm / Continue / removed title-lockup and simulated-stamp), ensure four votes/two chapter transitions/three factories and finale work. Existing A/B/C source files are read-only unless their owner is re-dispatched. Run integration tests and publish definitive results. Create `agent-reports/universal-ui/LEAD_READY_FOR_QA.flag` after integration edits and initial tests. Avoid concurrent Playwright using same outputDir.
2. **Independent QA recovery**: exclusive writer for `tests/e2e/universal-ui.spec.ts`, `scripts/universal-ui-qa.mjs`, `agent-reports/universal-ui/QA.md` and new evidence under `agent-reports/universal-ui/screens/`. Fix its prior TypeScript errors, then wait for lead-ready flag before running full browser matrix. Must not edit `src/**`, pre-existing tests, images/audio. Use isolated Playwright output/ports; notify lead by report if defects. Browser matrix and production smoke must produce real results, not inferred pass.
3. **Git preparation recovery**: read-only audit of repository and `.gitignore`, report to `agent-reports/GIT_RECOVERY.md`; can improve root `.gitignore` if necessary. Do NOT run git add, commit, reset, clean, push or otherwise mutate Git index/history; game sources remain exclusively with UI/audio agents.
4. **Audio finalization audit**: read-only check of existing `src/audio/**`, music assets/license, `Procedural_speech_prd.md`, BUILD_STATUS, recent source timestamps. Report any interrupted audio work, gaps, and verification to `agent-reports/AUDIO_RECOVERY.md`; no audio edits during UI hash-frozen integration unless the lead coordinates explicitly. Do not start concurrent browser suites.

## Constraints
No process kills, no deployment, no pushes, no paid services, no new assets. Preserve approved badge, dialogue bubble, licensed music, story, factual caveats, and existing audio. Do not start duplicate coordinator/team process: check live processes first. Never claim subagents are working without actual PIDs, files and report updates.
