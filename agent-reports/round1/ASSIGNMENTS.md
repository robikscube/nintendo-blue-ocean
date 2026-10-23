# Round 1 — Agent Assignments and Ownership

Started: 2026-10-22 (lead session)
Source of requirements: `PLAYTEST_FEEDBACK_ROUND1.md`

**Cast rename (2026-10-22):** Hootley (owl), Slyvester (fox), Damian (beaver), Pawson (bear), Shelldon (turtle). These reports and raw evidence predate the rename and may still show Mori/Pip/Bolt/Grumble/Shell. Internal ids and asset folders are unchanged.

| Task | Owner | Exclusive source | Report | Peer dependency | Status |
|---|---|---|---|---|---|
| P1 Dialogue engine: fast automatic reveal, hold until advance, blip stop | P1 | `blue-ocean-game/src/ui/ui.ts` | `agent-reports/round1/P1.md` | P2 (markup/CSS) | DONE (legacy test patched by lead) |
| P2 Dialogue visual: translucent organic bubble, name tag, amber marker | P2 | `blue-ocean-game/src/style.css` | `agent-reports/round1/P2.md` | P1 (markup/CSS) | DONE WITH CAVEATS |
| P3 Character writer: all scripted lines, five distinct voices | P3 | `blue-ocean-game/src/core/story.ts` | `agent-reports/round1/P3.md` | none (independent) | DONE |
| P4 Boardroom layout: five seats, breathing room, adapter-safe | P4 | `blue-ocean-game/src/scene/boardroom.ts` | `agent-reports/round1/P4.md` | P5 (camera targets) | DONE |
| P5 Cinematic camera: medium speaker framing, return to wide | P5 | `blue-ocean-game/src/scene/scene-director.ts` | `agent-reports/round1/P5.md` | P4 (seat anchors) | DONE WITH CAVEATS |

## Binding interface contracts

### P1 ↔ P2
Markup:
```
section.dialogue-panel#dialogue-panel[hidden]
  div.dialogue-nameplate#dialogue-nameplate > span.speaker-name#speaker-name
  div.dialogue-copy
    p.dialogue-text#dialogue-text[aria-hidden]
    span.sr-only#dialogue-accessible[aria-live]
    div.dialogue-footer > button.dialogue-continue#dialogue-continue > span.continue-marker
  span.dialogue-shortcut[aria-hidden]
```
States: `is-typing`, `is-complete`, `is-narrator`. CSS variables: `--speaker-color`, `--speaker-accent`.
Old monogram/species/role/phase/progress UI is removed from the bubble.

### P4 ↔ P5
P5 consumes `Boardroom.getSpeakerPosition()` and/or final seat anchors from P4. P4 must send P5 final coordinates after layout changes; P5 validates framing against those coordinates. No hard-coded stale seats in P5.

## Lead-only scope
Integration, test updates (after agent reports), verification, screenshots, `agent-reports/ROUND1_INTEGRATION.md`, `BUILD_STATUS.md`. The lead does not edit P1–P5 source files while agents own them.

## Coordination outcome
- P1/P2 shipped the agreed markup/CSS contract; P1 added P2's `is-leaving` 210 ms exit hook.
- P4/P5 shared and froze the final seat/camera coordinates; `scene-director.ts` frozen at 09:22:37.
- P1's one legacy timing assertion was replaced by the lead in `tests/e2e/interactions.spec.ts` with a deterministic same-task skip + hold + deliberate-advance test. The app behavior was not weakened; the 160 ms guard remains.
- All five reports are present: `P1.md`–`P5.md`. Integration evidence is in `ROUND1_INTEGRATION.md` and `lead-final-verification.json`.

## Baseline (before round 1)
- Existing build previously verified: 58/58 unit, typecheck, build, 26/26 team browser suite.
- Current dialogue uses a 16 ms glyph timer; current HUD is opaque rectangular.
- Current seats: x = 0, ±2.28, ±4.22 in a near-straight row.
- Current camera speaker focus is a small shift of the wide pose.
