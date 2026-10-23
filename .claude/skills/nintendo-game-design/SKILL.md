---
name: nintendo-game-design
description: Narrative and instructional game-design guidance for Nintendo Blue Ocean Strategy classroom experience. Use to design decisions, dialogue, advisor consequences, chapter pacing, and historical reveal.
license: CC0-1.0
---

# Nintendo Strategy Experience — Game Design Skill

## Player contract
The class votes by show of hands; presenter clicks. Audience members are temporary executives influencing **fictional** Nintendo product concepts in three decisions-era chapters, with **four** total votes. Avoid player avatar movement, combat, random failures, and point-based judging. The game is a strategic learning aid.

## Decision quality review
- Present up to three plausible options per vote, with compelling advantages and genuinely different tradeoffs.
- Give enough contextual evidence before the vote; avoid leaking 'correct' historical answers.
- Each choice must change at least one visible attribute of the prototype or advisor reaction.
- Explain strategic consequences qualitatively: buyers/noncustomers, value, costs, complexity and adoption risks. Do not invent quantified outcomes.
- Test every option for neutrality: no 'dumb' distractor and no heroic easy answer.
- The Big Boss challenges choices in-character without humiliating the audience or declaring correct/incorrect.

## Instructional anchors
D1 (2005): technology-performance rivalry vs noncustomers and accessibility.
D2 (2011): follow-up value; Wii U second-screen promise vs market communication and new demand.
D3 and D4 (2016): home/portable boundary and controller/social experience as integrated proposition.
Finale ONLY: compare historical Wii / Wii U / original Switch and documented sales, with precise date and citations.

## Visual and dialogue direction
Original cozy toy-theatre / low-poly corporate village. Five original animal advisors. Text in legible screen-space DOM, short lines, skip-on-click typewriter. Soft gesture reaction, not unskippable theatrical cinematics. At most one factory sequence per chapter, even though 2016 has two votes. Presenters must be able to interrupt for classroom discussion.

## Character art and runtime boundary
Use five original Tripo3D-generated character models in the final art pass. Models should share a consistent style, be neutral-pose/rig-friendly, and preserve rig/animation clips through optimized GLB export. Browser `GLTFLoader` and `AnimationMixer` support must be interchangeable with original primitive fallback advisors; camera and dialogue systems may never depend on Tripo3D assets being present. Prioritize expressive head/eye/mouth or body reactions without requiring complex facial rigs. Consult `ASSET_PIPELINE.md`. Avoid click-to-walk during the initial build.

## Build/QA checklist
- Read GAME_DESIGN.md and TECHNICAL_SPEC.md in full.
- Construct a continuous runnable narrative before any shaders, detailed assets, AI video, or cinematic polish.
- Verify all 3+3+9 hardware prototype outcomes (D1 three, D2 three, D3xD4 nine).
- Verify that end-of-game historical facts are fixed and not contaminated by hypothetical votes.
- Use 'SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT' on prototypes.
- Run all choices with keyboard or mouse, and test reset, mute, refresh and animation skip.
- Do not make past product launches seem contingent on audience votes.
