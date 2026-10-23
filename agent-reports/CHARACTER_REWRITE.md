# Character Persona Pass and Full Dialogue Rewrite

**Date:** 2026-10-22
**Owner:** lead session
**Status:** dialogue rewritten and verified at unit/build level; full browser suite running.
**Persona bible:** `blue-ocean-game/CHARACTER_PERSONAS.md`
**Source:** `blue-ocean-game/src/core/story.ts`
**Final names:** Hootley (owl), Slyvester (fox), Damian (beaver), Pawson (bear), Shelldon (turtle). Internal ids/asset folders remain `mori`/`pip`/`bolt`/`grumble`/`shell` and `owl`/`fox`/`beaver`/`bear`/`tortoise`.

## What the user asked for

- Create five animal-villager personas before touching dialogue.
- Use the downloaded dialogue skills to build those personas.
- Completely rewrite the full script.
- Include banter, witty remarks, and personalities that fit the animals.
- Avoid dialogue that sounds AI-written.

## Skills used

Installed globally and applied:

- **`no-ai-slop`** — edited for specific detail, active voice, no generic AI patterns, no “importance” puffery, and no stack of repeated sentence shapes.
- **`character-sim`** — separated each character’s **style** (speech patterns, vocabulary, rhythm) from **state** (history, wants, fears, avoidances); wrote pressure behavior as deflection, silence, jokes, or bluntness rather than clean explanation.
- **`natural-dialogue-techniques`** — voice tables, subtext, interruptions, casual contractions, action/silence, and the blind test: cover the name tag and the speaker should still be identifiable.

All three installs reported Safe / 0 Socket alerts / Low Snyk risk.

## Personas

| Character | Animal | Villager archetype mix | Voice engine |
|---|---|---|---|
| **Hootley** | Owl | Normal + quietly odd | Concrete anecdotes, notebook, late nights, small honest questions. Almost no slogans. |
| **Slyvester** | Fox | Peppy + Smug | Fast fragments, poster language, self-correction, harmless vanity. Sells the feeling, then tells the truth. |
| **Damian** | Beaver | Jock + maker | Short bursts, hands-on nouns, build claim then physical constraint. Never the pure voice of “no.” |
| **Pawson** | Bear | Cranky + Lazy | Deadpan cost statements, long pauses, snacks, reluctant compliments. Never cruel to the class. |
| **Shelldon** | Turtle | Snooty + slow sage | Measured reframes, dry asides, direct questions to named characters. Never grades or reveals history. |

The full persona bible includes animal behavior, wants/fears, voice fingerprints, “never” lists, relationship dynamics, recurring gags, blind-test lines, and a same-prompt five-voice calibration exercise.

## Rewrite scope

There are **66 unique authored spoken strings**:

| Group | Count |
|---|---:|
| Opening | 5 |
| Chapter 1–3 advisor lines | 22 |
| Option feedback | 12 |
| Option boss strings | 12 |
| D3×D4 coherence lines | 9 |
| Chapter boss closings | 3 |
| `getBossLines()` fallbacks | 2 |
| Chapter 3 synthesis | 1 |

Stats: **1,322 words**, min 10, median 21, max 28. No duplicate lines. No banned AI-cliché words. No pre-finale history leaks. Full audit: `agent-reports/round1/dialogue-audit.json`.

### Banter added

- **Opening:** Shelldon welcomes the room, Hootley asks about the people who never play, Slyvester immediately has a poster for them, Shelldon tells him to hold it.
- **Chapter 1:** Slyvester’s poster → Pawson’s invoice → Slyvester: “Retailers don’t buy posters. They buy feelings. Then they buy lunch.” → Pawson: “I’m not buying either.”
- **Chapter 2:** Pawson brings a snack → Slyvester: “We’re launching a console, not a picnic.” → Pawson: “You bring the console. I’ll bring the picnic. Mine has a budget.”
- **Chapter 3:** Slyvester’s six-word pitch → Pawson’s invoice → Slyvester: “A gram of what? It’s a controller, not a sandwich.” → Pawson: “Everything is a sandwich if you’re hungry enough.”
- **Boss questions** now address characters by name: Slyvester selling the big box, Hootley watching the parent by the door, Damian fitting it in a coat pocket, Pawson bringing snacks.
- **Coherence lines** include callbacks: “I know a beaver,” “Slyvester, that’s your poster again,” “Slyvester, where’s the price story?” and “Bring ice for the wrists.”

### Voice differentiation examples

- Hootley: “I visited three families who don’t own a console. Two shrugged. One asked, ‘Could my dad play too?’ I wrote that down.”
- Slyvester: “Oh! Picture the commercial. Grandma bowls, Dad cheers, nobody asks about polygons. I can see the poster already.”
- Damian: “I can make it lighter. I can make it cheaper. I can’t make it lighter, cheaper, and cool. Pick two.”
- Pawson: “Cute poster, Slyvester. Now show me the bill for motion sensors and the six-word slogan you call a forecast.”
- Shelldon: “Slyvester can sell the box. Pawson has to pay for the vents. A faster machine may win the shelf. Will it win a place at a family’s table?”

## Verification actually run

| Check | Result |
|---|---|
| `npm run typecheck` | **exit 0** |
| `npm test` | **58/58 passed** |
| Content audit | 66 unique lines; min 10 / median 21 / max 28 words; 0 duplicates; 0 banned AI-cliché words; 0 pre-finale history leaks |
| `npm run build` | **exit 0**; `dist/assets/index-CENm42im.js` 873.31 kB / gzip 239.15 kB |
| Full Playwright suite | PENDING |

## Files changed

- `blue-ocean-game/src/core/story.ts` — full spoken-script rewrite and final display names.
- `blue-ocean-game/CHARACTER_PERSONAS.md` — new persona bible and final names.
- `blue-ocean-game/tests/character-adapter.test.ts` — expected fox display name.
- `blue-ocean-game/src/ui/ui.ts` — default speaker label.
- `blue-ocean-game/src/scene/animals.ts`, `boardroom.ts`, `scene-director.ts` — character-name comments only; ids/positions unchanged.
- `blue-ocean-game/README.md`, `GAME_DESIGN.md`, `PLAYTEST_FEEDBACK_ROUND1.md`, `ASSET_PIPELINE.md`, `BUILD_STATUS.md` — cast names and dialogue behavior.
- `blue-ocean-game/public/assets/characters/README.md`, `character-reference-images/CHARACTER_DESIGN_GUIDE.md`, `character-reference-images/TRIPO_UPLOAD_MANIFEST.md` — final display names; folder/internal ids unchanged.
- `agent-reports/ROUND1_INTEGRATION.md`, `agent-reports/round1/ASSIGNMENTS.md` — rename notes; historical reports retain former names.
- `agent-reports/round1/dialogue-audit.json` — 66-line content audit.
- `agent-reports/round1/story-animal-draft-2026-10-22.ts` — earlier draft preserved for reference; not the shipped version.

## Remaining checks

- Full 34-spec browser suite after the rewrite.
- Live read-through on the target projector/laptop for pacing and voice fit.
- Physical audio/timing judgment remains a presenter task.
- No deployment, push, paid asset, runtime AI, or external dialogue source was used.
