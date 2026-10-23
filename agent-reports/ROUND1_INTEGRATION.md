# Round 1 Integration — Nintendo Boardroom UX & Character Dialogue

**Date:** 2026-10-22
**Requirements:** `PLAYTEST_FEEDBACK_ROUND1.md` (P1–P5)
**Lead:** main interactive session
**Verdict:** **PASS WITH RESIDUAL NOTES** — all five assignments implemented; typecheck, 58/58 unit tests, build, 34/34 full browser suite, 8/8 production-preview suite, and final 1920×1080/1366×768 acceptance capture are green. Residual notes are camera composition limits (one large neighbour on some side seats), a borderline 19.8% Shelldon visible-width at 1366, and unmeasured physical-projector/GLB behavior.

> **Later change:** the P3 line set was superseded by the persona-driven full dialogue rewrite on 2026-10-22. See `blue-ocean-game/CHARACTER_PERSONAS.md` and `agent-reports/CHARACTER_REWRITE.md`. The Round 1 UI/CSS/boardroom/camera evidence in this report remains valid.
>
> **Cast rename:** Hootley (owl), Slyvester (fox), Damian (beaver), Pawson (bear), Shelldon (turtle). Internal ids and asset folders remain `mori`/`pip`/`bolt`/`grumble`/`shell` and `owl`/`fox`/`beaver`/`bear`/`tortoise`. Historical reports and raw Round 1 evidence may still show the former names.

## Assignments and actual completion

Five specialist teammates were spawned in parallel with exclusive source ownership. All five delivered a written report and messaged the lead. No teammate edited another teammate's file. The task-tracking tools were not exposed in this session, so coordination used in-process teammate messaging and the shared `agent-reports/round1/ASSIGNMENTS.md` tracker.

| Task | Owner | Source file | Report | Status |
|---|---|---|---|---|
| P1 — Rapid automatic dialogue reveal | P1 | `blue-ocean-game/src/ui/ui.ts` | `agent-reports/round1/P1.md` | **DONE** — legacy timing test patched by lead |
| P2 — Organic translucent speech bubble | P2 | `blue-ocean-game/src/style.css` | `agent-reports/round1/P2.md` | **DONE WITH CAVEATS** |
| P3 — Five distinct character voices | P3 | `blue-ocean-game/src/core/story.ts` | `agent-reports/round1/P3.md` | **DONE** |
| P4 — Boardroom breathing room | P4 | `blue-ocean-game/src/scene/boardroom.ts` | `agent-reports/round1/P4.md` | **DONE** |
| P5 — Medium speaker camera | P5 | `blue-ocean-game/src/scene/scene-director.ts` | `agent-reports/round1/P5.md` | **DONE WITH CAVEATS** |

Lead-owned integration: `tests/e2e/interactions.spec.ts` (deterministic dialogue timing test), `blue-ocean-game/README.md` (presenter wording), this report, `BUILD_STATUS.md`, and the new `blue-ocean-game/scripts/round1-acceptance.mjs` evidence harness. No source file owned by a teammate was edited by the lead.

### Coordination evidence

- P1 and P2 agreed verbatim on IDs/classes/states: `dialogue-panel`, `dialogue-nameplate`, `speaker-name`, `dialogue-copy`, `dialogue-text`, `dialogue-accessible`, `dialogue-footer`, `dialogue-continue`, `continue-marker`, `dialogue-shortcut`, `is-typing`/`is-complete`/`is-narrator`/`is-leaving`, and `--speaker-color`/`--speaker-accent`.
- P1 added P2's requested `is-leaving` 210 ms hook; P2 owns the transition CSS.
- P4 sent P5 provisional and final seat coordinates/facings/anchors. P5 froze `scene-director.ts` at 09:22:37 and notified P4; P4's final capture used the frozen camera.
- P3 was independent; it preserved the "Welcome to the board" motif so the existing browser test still targets real scripted text.

## What changed

### P1 — Dialogue engine
- Replaced the 16 ms glyph interval with `requestAnimationFrame` + `performance.now()` at 215 chars/s, clamp 260–1000 ms, hard wall-clock deadline 950 ms.
- Dialogue holds at full text until click/Space/Enter; no auto-advance.
- Click while typing completes the line and sets a 160 ms guard; a controlled 40 ms double-click does not advance; a deliberate later click advances exactly once.
- `prefers-reduced-motion`, narrator, and hidden-tab lines complete immediately.
- Blips are tied to the reveal clock and stop at completion/skip/hide/reset; no caret after completion.
- New exact P1/P2 markup; old monogram/species/role/phase/progress UI removed.
- `is-leaving` 210 ms exit hook; reduced motion hides instantly.

### P2 — Dialogue visual
- Original asymmetric superellipse bubble (45% 53% 41% 50% / 58% 46% 54% 61%), 3 px light rim, translucent charcoal/espresso fill (0.74–0.81), 2.5 px backdrop blur.
- Floating character-colored oval name tag overlapping the top-left rim; cream bold text; no monogram/role/species/phase/progress.
- Local rounded sans stack; 34 px @1920, 24.86 px @1366, 24 px @1024; line-height 1.31.
- Amber teardrop marker (17×20 px) with 46×46 px button; pulses only with `is-complete`; visible 3 px focus ring.
- Discreet "Click / Space" hint outside the bubble; 210 ms entry/exit motion; reduced motion honored.
- Dialogue text measured ≥7.25:1 contrast on sampled backgrounds; name tag ≥5.1:1.

### P3 — Character script
- Rewrote all **58 unique authored speaking strings**: 4 opening, 15 advisor lines, 12 option feedbacks, 12 boss strings, 9 coherence lines, 3 boss closings, 2 fallbacks, and the Chapter 3 synthesis.
- Five distinct voices: Hootley's noncustomer vignettes, Slyvester's pitches/payoffs, Damian's build-then-caveat, Pawson's invoice/snack deadpan, Shelldon's measured reframes.
- Added cross-character payoffs (Slyvester's six-word pitch → Pawson's invoice; Damian's battery caveat).
- Stats: 1,219 words; min 14 / median 22 / max 28 words; no line over two sentences.
- Preserved three chapters, four votes, option metadata, archive facts, sources, and sealed-history rules; zero pre-finale leak terms.

### P4 — Boardroom layout
- Final seat arc: Shelldon `(-0.30,-3.00)`, Hootley `(-3.40,-2.75)`, Slyvester `(2.75,-3.15)`, Pawson `(-6.30,-1.85)`, Damian `(5.85,-3.25)`.
- Widened table/room, chairs, rug, timeline board, pendants, props; Shelldon keeps a taller gold-crested head chair.
- Wide gaps: **0.52–0.64 body widths** at 1920 and 1366 (minimum 0.52 both).
- All five faces above the dialogue overlay (face y 467–540 vs top 835 @1920; 332–384 vs 593 @1366); no avatar/chair/table/prop intersections.
- Adapter preserved: same `createAdvisor` roots, normalized 3.0 height, procedural fallbacks; added read-only `getSeatLayout()`; `getSpeakerPosition()` returns the head anchor.
- Draw calls 328 / triangles 51,682.

### P5 — Speaker camera
- Wide pose `[5.0, 6.2, 12.8]`, look `[-0.35, 2.4, -1.1]`, fov 34.5; constructor now applies 34.5 on the opening path.
- Speaker medium shot rebuilt from live seat/anchor/Box3; solved to **27.9–28.0% projected silhouette width**; head/ears/shoulders 23.6–58.3% down the frame, all above the 77.2–77.3% overlay top.
- Authored move **0.707 s**; same-speaker continuation does not re-trigger; wide return for narrator/voting/briefing/transitions; factory presets untouched.
- Reduced motion snaps to the settled pose; spotlight + 0.68 non-speaker dim provides focus.

## Verification

### Commands actually run by the lead

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **exit 0** |
| Unit/story/state/adapter | `npm test` | **58/58 passed**, 4 files |
| Production build | `npm run build` | **exit 0**, `index-BfqS2-PE.js` 872.38 kB / gzip 238.73 kB; `index-B4ztitwS.css` 40.18 kB / gzip 10.09 kB |
| Focused dialogue/factory/resilience | `npx playwright test tests/e2e/interactions.spec.ts --config=playwright.config.ts` | **4/4 passed** (1.6 min) |
| Full browser suite | `npx playwright test --config=playwright.config.ts` | **34/34 passed**, 12.1 min; `EXIT:0` |
| Production preview suite | `npx playwright test tests/e2e/case.spec.ts tests/e2e/interactions.spec.ts --config=playwright.preview.config.mjs` (dist on 4173) | **8/8 passed**, 2.7 min; `EXIT:0` |
| Independent acceptance capture | `node scripts/round1-acceptance.mjs http://127.0.0.1:4173/` | **14/14 captures**, 0 page errors, 0 horizontal overflow |

### Specialist verification (reported and independently reviewed)

- **P1:** 1920×1080 10/10 lines 481–951 ms (max 950.8 ms, deadline path under an event-loop stall); 1366×768 10/10 lines 484–795 ms. All held with no auto-advance; all complete/clean/no-caret; zero blips during hold. Reduced motion/narrator immediate; forced 1 fps line completed in 769.9 ms via deadline; hidden tab completes immediately. Controlled 40 ms double-click did not advance; deliberate click did.
- **P2:** 22 final screenshots across 1920/1366/1024 plus mobile and focus/exit; measured panel/type/tag/marker/overflow/contrast; no legacy HUD nodes; typecheck and 58/58 green.
- **P3:** Isolated production preview branch sweep: all five speakers, 12 feedbacks, 9 coherence lines, 16 boss lines, 81 rendered instances, 0 leaks, 0 page errors; typecheck and 58/58 green.
- **P4:** Typecheck, 58/58, in-game 1920/1366 capture; gaps 0.52–0.64; zero page/console errors; no intersections.
- **P5:** Typecheck, 58/58, reduced-motion metric probe at both sizes, behavior pass 9/10 (one normal-motion wide check hit the SwiftShader wall-clock guard; reduced-motion proves the exact wide target); no page errors.

Raw integration logs: `agent-reports/round1/round1-full-e2e.log` (34/34), `agent-reports/round1/round1-preview-e2e.log` (8/8), `agent-reports/round1/lead-final-verification.json` (14 captures), `agent-reports/round1/p1-dialogue-measure.json` (10-line timing), `agent-reports/round1/p4-measure-final.log` (layout).

### Acceptance coverage

| Requirement | Evidence |
|---|---|
| Ten consecutive lines complete automatically <1 s and hold | P1 10-line measurements; lead focused test |
| Skip while typing, deliberate advance, no double-skip | P1 controlled double-click + lead `interactions.spec.ts` |
| Narrator/reduced-motion immediate | P1; Playwright configs use reduced motion |
| Blips stop on completion/skip/hide | P1 counters |
| Original organic bubble, pastel tag, amber marker, no old HUD | P2 measurements/screenshots |
| Five distinct character voices, all spoken lines, sealed history | P3 inventory + isolated branch sweep; unit story tests |
| All five faces visible, spacing, no clipping (wide) | P4 projection metrics/screenshots |
| Medium speaker focus, face above bubble, wide return, 0.55–0.8 s | P5 metrics/behavior; P4 captures |
| Four votes, three factories, finale, presenter controls | Full browser suite 34/34, including canonical four-vote flow and presenter/reset/checkpoint tests |
| All five speakers at both target sizes with final camera + bubble | Lead acceptance capture: 14 screenshots, 0 page errors; Shelldon/Hootley/Slyvester/Pawson/Damian visible width 19.8–25.1% |
| No horizontal overflow / readable type | Panel 1380×211 @1920, 1065×150 @1366; 34 px / 24.86 px; 0 overflow |
| Build/typecheck/unit | green |

## Screenshots

- **Final lead acceptance captures (production `dist` on 4173):** `blue-ocean-game/qa-screens/round1/{1920x1080,1366x768}-{01-narrator-wide,02-shell,03-mori,04-advisor-mori,05-advisor-pip,06-advisor-grumble,07-advisor-bolt}.png` (14 total). Raw metrics: `agent-reports/round1/lead-final-verification.json`.
- P2 evidence: `agent-reports/round1/dialogue-{narrator,shell,mori,pip,grumble,bolt,focus}-{1920x1080,1366x768,1024x768}.png`, plus mobile/focus/exit frames.
- P4 evidence: `agent-reports/round1/p4-{1920x1080,1366x768}-{narrator-wide,speaker-shell,speaker-mori,speaker-pip,speaker-grumble,speaker-bolt,voting-wide}.png`.
- P5 evidence: `agent-reports/round1/p5-1920x1080-*.png`, `subset-mori.png`, `subset-chapter-advisor-2.png`, `subset-chapter-advisor-3.png`.

## Remaining issues / caveats

1. **P5 neighbour hierarchy (main residual).** The five-seat arc makes "speaker strictly largest and every neighbour fully inside" impossible for every seat at this medium-shot width. P5 measured Hootley's head 1.1% smaller than Pawson's; Shelldon's 13% smaller than Slyvester's; Shelldon/Hootley/Slyvester/Damian each have one neighbour clipped at a frame edge. The speaker remains centred and is emphasized by a warm spot and 0.68 non-speaker material dim. This is documented, not claimed as a clean pass.
2. **Visible body / width at the low end.** The lead's final pixel capture measured Shelldon **20.2%** at 1920 and **19.8%** at 1366; Hootley 22.9–23.8%, Slyvester 22.5%, Pawson 21.8%, Damian 25.1%. Shelldon at 1366 is 0.2 points below the 20% floor; all others are inside the 20–35% band. P5's Box3 projection reports 27.9–28.0%.
3. **Wide spacing measurement methods differ.** P4's vertex-projected silhouette method reports **0.52–0.64 body-width gaps**; the lead's conservative mesh-AABB capture reports 0.42–0.55 because it includes tails/ears. The final screenshots show all five faces and bodies separated, with no avatar/chair/table/prop intersections. P4's agreed silhouette method is the acceptance metric.
4. **Headless GSAP lag.** SwiftShader stretches a 0.707 s camera move to several wall-clock seconds. This is not representative of the target GPU; reduced-motion and settled-pose metrics verify the authored target. The classroom laptop should be checked live.
5. **Physical projector legibility at 3–4 m** is unmeasured. CSS sizes/contrast meet documented proxies.
6. **Real Tripo3D GLBs** remain unvalidated. The adapter contract and normalized 3.0-high anchors are preserved; P4 estimates room for ~22–31% wider silhouettes.
7. **P2 exit fade** was verified by computed timing/slowed frames because headless sampling was frame-starved; product CSS is 210 ms.
8. **No deployment, GitHub push, paid asset, runtime LLM/API, or external asset download.**

## Status

**DONE — PASS WITH RESIDUAL NOTES.** Core implementation is complete; all five specialist reports are present; typecheck, 58/58 unit tests, build, 34/34 full browser suite, 8/8 production-preview suite, 4/4 focused dialogue/factory tests, and 14/14 final acceptance captures are green. The residual P5 composition caveat and physical-projector/GLB limits are documented above.
