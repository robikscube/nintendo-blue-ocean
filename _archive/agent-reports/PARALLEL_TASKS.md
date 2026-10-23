# Parallel subagent work — Nintendo Blue Ocean

Main Claude worker owns live game implementation. Do NOT edit its existing files under blue-ocean-game/src, package.json, tests, or configuration while it is running.

Delegate to up to THREE focused subagents, in parallel when supported. **For every subagent explicitly read and use relevant installed project skills from `.claude/skills/`: QA -> `game-qa`, `game-architecture`, `nintendo-game-design`; Character -> `threejs-game`, `game-architecture`, `nintendo-game-design`; Story -> `nintendo-game-design` and `game-designer` (only where classroom presentation benefits). These skills must be actively consulted rather than just mentioned in final reports.** Use the Agent tool and read applicable project skills. All subagent outputs must be self-contained Markdown files in Nintendo/agent-reports, not code changes.

1. **QA analyst**: Inspect current game code and existing tests. Produce `agent-reports/QA_REVIEW.md` with exact reproducible high-priority story-flow, presentation, refresh, factory, screen-size, asset-loading tests; identify actual risks from the code, not guesses.
2. **Character pipeline architect**: Read ASSET_PIPELINE.md and current scene/animals.ts. Produce `agent-reports/CHARACTER_INTEGRATION.md` with a specific drop-in GLB adapter interface and a sequence of non-destructive future code changes. Do not download GLBs or call Tripo. Do not modify existing code.
3. **Educational/story reviewer**: Read GAME_DESIGN.md, TECHNICAL_SPEC.md and the actual story.ts. Produce `agent-reports/STORY_REVIEW.md` checking 3 chapters/4 votes, history-vs-fiction boundary, decision quality, Big Boss feedback and finale facts. Mark actual defects with file locations.

Do not start a second implementation worker; no conflicting source edits. Do not modify CLAUDE.md or any other markdown file beyond agent-reports. Work only inside the Nintendo folder. No browser deployments or git push, no paid tools. Summarize reports in agent-reports/COORDINATOR_STATUS.md. If delegation isn't available, do independent sequential reviews rather than touching source.
