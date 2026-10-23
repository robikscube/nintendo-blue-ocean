# Interactive Agent-Team Takeover — Nintendo Blue Ocean
Date: 2026-10-21. This takeover must start only after one-shot implementation and review-coordinator processes have EXITED, without killing them. Team launch is in **interactive session mode**, not `-p`.

## First steps for lead
1. Read `CLAUDE.md`, `GAME_DESIGN.md`, `TECHNICAL_SPEC.md`, `24_HOUR_BUILD_PLAN.md`, `ASSET_PIPELINE.md`, and existing `BUILD_STATUS.md` or `agent-reports/*.md` if present.
2. Study the currently implemented `blue-ocean-game/` source and any QA screenshots. Do not throw away working code. Check running processes to avoid duplicate editing and let prior workers finish cleanly.
3. Read the game-related project skills in `.claude/skills/` and ASK EACH TEAMMATE to read/apply their role's relevant skills (even if agent frontmatter lists them: team mode may not preload `skills`).
4. Create a REAL CLAUDE CODE AGENT TEAM (not merely parallel `-p` workers). Spawn 3 named teammates using project agent types:
   - `nintendo-character-engineer` named `characters` (optional Tripo3D GLB adapter, new files only);
   - `nintendo-qa-engineer` named `qa` (tests/verification, new files only);
   - `nintendo-art-director` named `visual` (visual/projector review and optional scoped new asset module).
5. LEAD owns the remaining work and game integration; consult `.claude/agents/nintendo-gameplay-integrator.md` and corresponding skills `nintendo-game-design`, `threejs-game`, `game-architecture`. A separate gameplay teammate is unnecessary until independent work can be assigned without conflicting source edits.

## Hard constraints
- No teammates edit the same existing file at the same time. Each team role has explicit ownership in its `.claude/agents/*.md` definition.
- Teammates must send findings to lead through built-in inter-agent messaging and coordinate assumptions with one another. Use a shared task list if Task tools are available.
- Read actual SKILL.md contents before implementing. Follow relevant practices; ignore unrelated game-creator advice about combat, click-to-walk, scores, physics, excessive spectacle, online services, or full game jam complexity.
- Preserve exactly 3 chapters / 4 decisions / 3 factory outputs and 1 factual finale. No fabricated historical success data. Keep original low-poly style and the GLB fallback path.
- Do not deploy/push, access unrelated folders, or use paid APIs. Do not change source based on hypothetical bug reports without verifying code and running tests.
- If an existing coordinator already produced QA/story/character reports, consume them before repeating work.
- Run `npm run build`, relevant tests, and a complete playable story walkthrough. Favor fixing live demo blockers over more features. Document exact status in `BUILD_STATUS.md`.
- Maintain `agent-reports/TEAM_HANDOFF.md` with initial state, teammates confirmed present (not assumed), file ownership, tasks, progress, tests and user instructions to attach. Save whenever reaching a stable milestone.

## Definition of complete takeover
A real agent team is visible in Claude Code's in-process team panel and/or `~/.claude/teams/` created automatically by Claude (do not hand-create team config). Its lead and teammates are communicating and the original one-shot worker is no longer editing files.
