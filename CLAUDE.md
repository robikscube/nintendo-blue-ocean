# Nintendo Blue Ocean — Claude Code Project Instructions

## Mission
Build a **presenter-operated, audience-directed, 10–15-minute historical teaching experience** about Nintendo's strategic choices from Wii to Wii U to the original Switch. This is a **decision-driven narrative exhibit, not a ragdoll physics or combat game**. A bare-bones *playable* prototype is the immediate objective; charm and polish are secondary.

Read these files IN FULL, in this order, before coding:
1. GAME_DESIGN.md (creative intent, chapter dialogue, exact decisions, historical boundaries)
2. TECHNICAL_SPEC.md (architecture and detailed contracts)
3. 24_HOUR_BUILD_PLAN.md (timeboxes, checkpoints, fallback and testing)
4. ASSET_PIPELINE.md (Tripo3D final characters and drop-in GLB adapter)

Treat these files as authoritative. Resolve inconsistencies by prioritizing factual accuracy, end-to-end playability, classroom reliability, then visual polish. If a skill recommends practices that conflict with the documents, follow the project documents.

## Overnight task — act autonomously
Do not stop to ask design questions or seek permission for routine local coding tasks. Work ONLY within this Nintendo directory (create a blue-ocean-game subfolder) and its project-scoped .claude/skills. Build and test incrementally. NEVER delete or overwrite the existing case study, design docs, or other user work. Do not deploy, publish, push commits, spend money, or download assets from unknown licensing sources. No external paid APIs.
Aim to deliver a runnable vertical slice and continue through the 24_HOUR_BUILD_PLAN milestones as time permits. Before stopping, write BUILD_STATUS.md with exact commands to run, what works, what fails, next priorities, and any tests/build output. Save intermediate work regularly. Do not claim success without actually running the relevant command.

## Design rules
- Three chapters: 2005, 2011, 2016; four votes total: 1, 1, 2. Exactly <=3 predefined options per vote. Audience votes by hands; presenter selects the winning option.
- Fictional 'Big Boss' gives qualitative consequences/redirects but **all historical product reveals and quantitative sales statistics come only at finale**. Audience-created prototype concepts must be labeled 'SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT.'
- Historical timeline NEVER branches; hypothetical prototypes depend on choice IDs. No fabricated real-world sales, revenues, market shares, or impossible guarantees.
- One low-poly boardroom with original animal executives; one reusable factory with moving robot arms, stamping press, and modular prototype generator. Avoid a physics engine/ragdolls.
- Original procedural Web Audio character babble (not imitating recognizable Nintendo voice audio), with mute and disabled until first click/gesture.
- Static and offline-friendly after npm install: Vite + TypeScript + Three.js + GSAP, CSS/DOM dialogue overlay, no backend/CDNs. GitHub Pages-compatible base path. Project should work locally with npm run dev / npm run build / npm run preview.
- Start with complete text-only story flow and placeholder cubes, THEN add geometric characters/factory animation. Ensure skip, replay, reload, reset, and presenter hotkeys. Run builds/tests throughout.
- Do NOT implement optional ads or AI video tonight. Do NOT spend time chasing photorealism or asset generators. Generate original machine meshes and **temporary character fallbacks** procedurally. Final character art will be created in Tripo3D later; design and, if feasible, scaffold a `GLTFLoader`-based adapter allowing rigged GLBs to replace placeholders without rewriting dialogue/camera code. See ASSET_PIPELINE.md; do not invoke paid model-generation services or wait for assets.
- Avoid unnecessary installs, unrelated software changes, and services. Use pinned npm packages; any asset imported later must have verified reuse license.

## Agent teams after original one-shot worker exits
For any interactive team continuation, read `AGENT_TEAM_TAKEOVER.md` before spawning teammates. True Claude Code teams need an interactive session and the experimental team environment flag, not `claude -p`. The lead must enforce exclusive file ownership and require each teammate to read and apply relevant project skills in `.claude/skills/` (team mode may not preload skills from agent frontmatter). Use `.claude/agents/` project teammate definitions and record verified activity in `agent-reports/TEAM_HANDOFF.md`. Never launch concurrent editors while the original worker is still running.

## Installed project skills
- .claude/skills/nintendo-game-design/SKILL.md — custom pedagogy and UX rules; use during dialogue/choice/story creation.
- .claude/skills/threejs-game/SKILL.md — game renderer/module guidance; apply selectively, do not impose unrelated game mechanics.
- .claude/skills/game-architecture/SKILL.md — restart-safe modular state.
- .claude/skills/game-designer/SKILL.md — visual polish AFTER mechanics; **ignore viral short-video spectacle, heavy particles, excessive screen shakes** as incompatible with lecture.
- .claude/skills/game-qa/SKILL.md — browser QA; make realistic tests aligned to narrative decisions rather than combat/failure/score invariants.

## Definition of done for the morning
1. From the Nintendo folder: cd blue-ocean-game; npm install; npm run dev — experience opens.
2. Start -> 2005 vote -> factory/prototype -> boss -> 2011 vote -> factory -> boss -> 2016 TWO votes -> single factory -> boss -> 2006/2012/2017 historical archive. No internet required at runtime.
3. Multiple decisions produce different labeled prototype geometry; factory animation can be skipped without breaking story.
4. Presenter's UI clear at a distance, persistent checkpoint and reset.
5. npm run build succeeds. BUILD_STATUS.md explains exactly which features were implemented and tested.
