# TEAM_VISUAL — Projector, Composition and Art Review

**Reviewer:** `visual` (read-only art direction; no source edits)
**Snapshot:** 2026-10-21 23:07 PT
**Source mtimes in this snapshot:** `src/style.css` 23:03:55, `src/ui/ui.ts` 23:03:54, `src/scene/scene-director.ts` 22:57:01, `src/scene/boardroom.ts` 22:31:38.
**Method:** read the three mandatory skills in full, `GAME_DESIGN.md`, `TECHNICAL_SPEC.md`, `ASSET_PIPELINE.md`, the current CSS/UI/scene source, then inspected the QA screenshots (16–22) and captured fresh read-only screenshots against the already-running dev server at `127.0.0.1:5173` at 1920x1080, 1366x768, 1280x720 and 1024x768 (reduced motion, SwiftShader). Computed font sizes, boxes and contrast were measured from the live DOM; no build, source edit or port change was made.
**Caveat:** the lead was actively editing `src/core/story.ts`, `src/core/state.ts` and `src/ui/ui.ts` around this snapshot, so the fresh screen captures may reflect an intermediate HMR state. The durable evidence for prioritisation is the static CSS/layout/camera analysis and the existing `qa-screens/16–22`; the measured px/vh/contrast values should be re-checked after source freeze. No further captures will run until the lead announces source freeze. Physical legibility must be confirmed on the actual projector at 3–4 m. Line numbers will drift as the lead edits; selectors are the durable reference.

---

## 1. Verdict

The art direction is **on brief and unusually cohesive**: a warm, miniature low-poly boardroom, original animal executives with readable species silhouettes, a cool industrial factory set, a clear DOM-over-3D dialogue hierarchy, and a finale that gives the real products and numbers the visual weight they need. The three-chapter / four-vote / one-factory-per-chapter contract reads correctly on screen.

Two issues are **classroom-sign-off blockers**:

1. **The factory reveal card covers the audience's prototype at 1366x768 and is catastrophic at 1024x768.** At 1366 the gesture wand (the component that makes D1-B visible) is entirely behind the card; at 1024 only a sliver of the prototype is visible. This breaks the definition-of-done requirement that different choices produce visibly different prototypes.
2. **Audience-critical copy is below the documented 24 px projection benchmark.** Vote option detail/trade-offs, both truth labels (`SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT` and `AUDIENCE CONCEPT · NOT HISTORICAL`), factory readouts, title disclosure and most archive supporting text compute to 8.5–17.5 px at 1920x1080. Several supporting lines also fail WCAG AA contrast (2.63:1 to 4.36:1).

A third, lower-severity cluster concerns speaker focus, archive source/caveat visibility, and a small historical-boundary visual echo between the simulated hybrid and the real Switch silhouette. Details and exact proposals below.

---

## 2. Scorecard (game-designer skill, adapted)

Viral-spectacle criteria are marked N/A and deliberately **not** pursued: screen shake, hit-freeze, combo text, particle bursts, rainbow backgrounds and persistent trails are incompatible with a 10–15 minute lecture and the project documents. I kept the skill's atmosphere, palette, hierarchy, typography and accessibility criteria and subordinated the rest.

| Area | Score | Note |
|---|---|---|
| Background and atmosphere | 5 | Warm boardroom, cool factory, both feel inhabited; blackboard, mugs, props, plants, pipework. |
| Colour palette | 5 | Consistent cream/gold/warm wood against teal factory; no red/green-only meaning. |
| Animations and transitions | 4 | Idle breathing, head turns, factory choreography; reduced-motion honoured; no gratuitous camera moves. |
| Particles / spectacle | N/A | Existing dust and live dot are enough for a lecture. Do not add confetti/screen shake. |
| Typography and hierarchy | 2 | Headlines and card titles are strong; micro-copy and the two truth labels are not projector-legible. |
| Visual hierarchy | 3 | Vote cards and dialogue are clear; truth labels are buried at the far edge of the frame at 8.5–9 px. |
| Character identity | 5 | Owl discs, fox ears/scarf, beaver teeth/paddle, bear muzzle, green tortoise shell and glasses all read as original characters. |
| Advisor legibility (projected) | 4 | Faces read at 1920; expression changes are subtle. Speaker identification relies mainly on the dialogue panel. |
| Archive readability | 4 | Names, years and figures are excellent; unit notes, as-of date, cautions and sources are too small/low-contrast. |
| Accessibility | 3 | Reduced motion and DOM text are good; several small-text contrast ratios fail AA. |
| Presenter drawer | 4 | Clear at laptop distance; at 1366x768 the lower controls, including Reset, fall below the fold. |

---

## 3. Measured legibility audit (24 px benchmark)

The documented benchmark is **24 CSS px at 1920x1080**, i.e. **2.22% of viewport height**. The equivalent at 1366x768 or 1024x768 (same physical projector screen) is **about 17 px**, not 24 px. The table therefore reports computed px and `% of viewport height` (`vh%`) so 1920 and 1366 can be compared honestly.

Measured from the live DOM at the snapshot:

| Element (selector) | 1920x1080 | 1366x768 | vh% at 1920 | 24 px benchmark? |
|---|---|---|---|---|
| Dialogue text `.dialogue-text` | 27 px | 22 px | 2.50% | Pass |
| Choice title `.choice-title` | 32 px | 25 px | 2.96% | Pass |
| Vote prompt `.vote-header h2` | 49 px | 36 px | 4.54% | Pass |
| Vote context `.vote-header p` | 13 px | 13 px | 1.20% | **Fail** |
| Option detail `.choice-detail` | **17.5 px** | **14.5 px** | **1.62%** | **Fail (-27%)** |
| Benefit / trade-off `.choice-tradeoff > span` | **14.5 px** | **12.7 px** | **1.34%** | **Fail (-40%)** |
| Option id `.choice-id` | 8 px | 8 px | 0.74% | Decorative; not audience-critical |
| Factory banner `AUDIENCE CONCEPT · NOT HISTORICAL` `.factory-label` | **9 px** | **9 px** | **0.83%** | **Fail (-63%)** |
| Factory stamp `SIMULATED CONCEPT…` `.simulated-stamp` | **8.5 px** | **8.5 px** | **0.79%** | **Fail (-65%)** |
| Factory readout `.prototype-readout p` | 10.5 px | 9.5 px | 0.97% | Fail |
| Factory source line `.factory-source` | 10 px | 10 px | 0.93% | Fail |
| Factory fine print `.factory-card .fine-print` | 10 px | 10 px | 0.93% | Fail |
| Title disclosure `.title-note` | 10.5 px | 10.5 px | 0.97% | Fail |
| Archive product name `.history-card h3` | 33 px | 27.3 px | 3.06% | Pass |
| Archive lifetime figure `.lifetime-figure strong` | 34 px | 30 px | 3.15% | Pass |
| Lifetime unit note `.lifetime-figure span` | 9 px | 9 px | 0.83% | **Fail (and 4.13:1)** |
| Archive product pitch `.history-pitch` | 13.5 px | 11.5 px | 1.25% | Fail |
| Archive detail `.history-detail` | 12 px | 10.5 px | 1.11% | Fail |
| Archive caution `.history-caution` | 10.5 px | 9 px | 0.97% | Fail (4.08:1) |
| Evidence body `.evidence-panel p` | 11.5 px | 11.5 px | 1.06% | Fail |
| Sources `.sources a` | 10.5 px | 10.5 px | 0.97% | Fail |
| Source/date note `.source-date` | 8.5 px | 8.5 px | 0.79% | **Fail (2.63:1)** |
| Class-path note “Simulation only…” `.path-note` | 9 px | 9 px | 0.83% | **Fail (3.05:1)** |
| Archive stamp `As of June 30, 2026` `.archive-stamp strong` | 11 px | 11 px | 1.02% | Fail |
| Discussion question `.discussion-card h3` | 27 px | 24 px | 2.50% | Pass |

Primary hierarchy (dialogue, prompt, product names, figures, discussion question) is correct. The failure is concentrated in the **core vote copy** and the **truth/caveat labels**, which are exactly the lines the room must be able to read.

### Recommended type strategy

Use viewport-height clamps for audience copy. This makes the physical size equivalent at 1080p and 768p. Proposed values (re-test after the lead's other changes):

```css
/* style.css:1037-1044 */
.choice-detail {
  font-size: clamp(16px, 2.2vh, 24px);   /* 24px @1080; ~17px @768 */
}

/* style.css:1054-1061 */
.choice-tradeoff > span {
  font-size: clamp(13.5px, 2.0vh, 21.5px); /* ~21.6px @1080; ~15.4px @768 */
}

/* style.css:1063-1068 */
.choice-tradeoff strong {
  font-size: 10px;                        /* was 8px; keeps structure readable */
}

/* style.css:931-936 */
.vote-header p {
  font-size: clamp(13.5px, 1.55vh, 16.5px); /* context line */
}
```

Space budget: at 1366x768 this grows the vote card by roughly 30–45 px. The current 1366 card is about 308 px high with the footer at y≈626 and the screen bottom at y≈673. Reclaim the increase in the existing `max-height: 800px` block rather than accepting a scroll:

```css
/* inside @media (max-height: 800px) and (min-width: 900px), style.css:2442 */
.voting-screen { padding-top: 14px; padding-bottom: 14px; }
.vote-header { margin-bottom: 8px; }
.vote-footer { margin-top: 8px; padding-top: 8px; }
```

Acceptance test after the change: at 1366x768 and 1024x768 the three cards and the `Record the board's vote` button are visible without scrolling, and no card text is clipped. My pre-change screenshots showed no clipping at either size, but the larger type will consume that margin.

---

## 4. MUST-FIX classroom blockers (P0)

### P0-1 — Factory reveal card obscures the prototype (composition/CSS, all widths below 1920)

Measured card geometry at the reveal:

| Viewport | Card left edge | Card width | Consequence |
|---|---|---|---|
| 1920x1080 | 1322 (68.8%) | 540 | Prototype and wand visible; right robot arm partly behind card |
| 1366x768 | **798 (58.4%)** | **519** | Gesture wand completely hidden; console right edge covered |
| 1280x720 | **748 (58.4%)** | **486** | Same as 1366 |
| 1024x768 | **496 (48.4%)** | **492** | Only a sliver of the D1 prototype remains visible; card covers the stage |

Cause: `style.css:1166` caps the card at 540 px, but `width: min(540px, 38vw)` makes it 38% of a 1366/1280 viewport; the `@media (max-width: 1100px)` override at `style.css:2602-2604` makes it `min(500px, 48vw)`, i.e. nearly half of a 4:3 frame. At the same time the camera framing is fixed, so the card moves left over the hero object as the viewport narrows.

This is not cosmetic: the definition of done requires visible, different prototype geometry from different decisions. At 1366 the D1-B concept's defining gesture controller is invisible.

Lowest-risk CSS stopgap (keeps the card on the right):

```css
/* style.css:1166 */
.factory-card { width: min(540px, 30vw); }

/* style.css:1153-1162; push the card ~14px right at small sizes */
.factory-screen { padding-right: clamp(18px, 2.4vw, 44px); }

/* replace the 48vw override at style.css:2602-2604 */
@media (max-width: 1100px) {
  .factory-card { width: min(420px, 30vw); }
  .prototype-readout { grid-template-columns: 1fr; gap: 10px; }
}
```

Predicted result: card left ≈923 px at 1366 (67.6%) and ≈692 px at 1024 (67.6%), clearing the prototype's right edge at both sizes. The trade-off is a taller card because text wraps; at 1024 the card may scroll internally. Verify the `Face the board` button is still reachable without scrolling.

Robust alternative for 4:3 (recommended if the classroom laptop can output 1024x768): make the factory camera overlay-aware. When the factory reveal card is present, use `PerspectiveCamera.setViewOffset` (or an equivalent look-target shift) to place the stage centre inside the **uncovered** width, i.e. target x ≈ `(viewportWidth - cardWidth - cardPadding) / 2`. This frames the hero correctly at every aspect ratio and also recovers part of the right robot arm. It is a small `SceneDirector` change and should be paired with a ResizeObserver/known card width; do not apply it to the boardroom. Non-negotiable acceptance: the D1/D2/D3/D4-defining component must be visible at 1920x1080, 1366x768 and 1024x768.

Also note the right robot arm's working end sits behind the card at every size. At 1920 the factory still reads as two arms because the upper arm is visible; at 1366/1024 it reads as one arm plus machinery. The same card/camera fix addresses this; do not solve it with extra animation or particles.

### P0-2 — Both truth labels are below projector legibility

- `.factory-label` (“AUDIENCE CONCEPT · NOT HISTORICAL”) inherits **9 px** from `.factory-banner` (`style.css:1100-1116`, label rule 1144-1151). At 1920 that is **0.83% of screen height**, less than 40% of the 24 px benchmark.
- `.simulated-stamp` (“SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT”) is **8.5 px** (`style.css:1248-1260`), **0.79%** of height.

Both are the project's truth-contract labels. Their contrast is good (8.1:1 measured against the panel), so the problem is purely size and prominence. Proposed:

```css
/* style.css:1144-1151 */
.factory-label {
  font-size: clamp(10.5px, 1.35vh, 14.5px); /* ~14.5px @1080; ~10.4px @768 */
  padding: 7px 11px;
  background: rgba(120, 35, 28, 0.18);      /* reads as a deliberate stamp, not a footnote */
}

/* style.css:1248-1260 */
.simulated-stamp {
  font-size: clamp(10.5px, 1.3vh, 14px);    /* ~14px @1080; ~10px @768 */
  padding: 10px 12px;
  letter-spacing: 0.1em;
}
```

At 1366 the label text is still only ~10 px, but that is physically equivalent to ~14 px at 1080 on the same screen and is a marked improvement over 8.5–9 px. The exact label must remain visible in both build and reveal states; I confirmed it is rendered in both (`ui.ts` build branch line 529, reveal branch 544; string from `story.ts:13`). At `max-width: 850px` the banner label is `display:none` (`style.css:2700-2702`); the card stamp remains, so the contract is technically satisfied, but if a narrow projector is possible, keep a compact banner label or move that text into the card header.

### P0-3 — Vote option copy is the core interaction and misses the benchmark

At 1920, option detail is 17.5 px (1.62% height) and benefit/trade-off is 14.5 px (1.34%). At 1366 they are 14.5 px and 12.7 px. The room cannot reliably read the trade-offs from the back of a classroom. Use the type strategy in section 3 (`.choice-detail` 2.2vh, `.choice-tradeoff > span` 2.0vh, labels 10 px) and the low-height space budget. Keep the three-column comparison; the 1920 card can grow to ~450–480 px and still fit inside the 1080 px screen. At 1366, verify the record button remains visible.

Do not solve this by shortening the strategic content unless the lead prefers that trade; the content is the lesson. The vh clamps are the lowest-risk visual fix.

### P0-4 — Contrast failures in supporting and truth text

Computed WCAG ratios (composited from CSS color + alpha over the adjacent panel/background; gradients and backdrop blur will move them slightly):

| Element | Current ratio | AA normal (4.5) | Proposed |
|---|---|---|---|
| `.source-date` 8.5 px, alpha .44 | **2.63** | Fail | 10 px, rgba(210,197,179,.72) → 5.88 |
| `.path-note` 9 px, alpha .45 | **3.05** | Fail | 10.5 px, rgba(221,209,192,.72) → 6.43 |
| `.factory-card .fine-print` 10 px, alpha .54 | **3.80** | Fail | 11.5 px, rgba(209,196,178,.72) → 5.66 |
| `.history-caution` 10.5 px, alpha .58 | **4.08** | Fail | 11.5 px, rgba(204,190,172,.72) → 5.63 |
| `.lifetime-figure span` 9 px, alpha .56 | **4.13** | Fail | 11 px, rgba(211,198,180,.75) → 6.00 |
| `.class-comparison span` 8.5 px, alpha .54 | **4.01** | Fail | 9.5–10 px, alpha .68 → 5.56 |
| `.choice-id` 8 px, alpha .55 | 4.18 | Fail (decorative) | 9 px or leave |
| `.title-note` 10.5 px, alpha .58 | **4.36** | Fail | 12–13.5 px, alpha .82 → 7.41 |
| `.vote-footer p` 11 px, alpha .65 | 4.83 | Pass | Presenter-only; leave |
| `.simulated-stamp` 8.5 px | 8.06 | Pass | Size is the issue (P0-2) |
| `.factory-label` 9 px | 8.11 | Pass | Size is the issue (P0-2) |

The `.path-note` (“Simulation only · never a historical prediction”) and `.source-date` are truth/citation labels, so their failure is not merely cosmetic even though they are small. Raising alpha as above also makes them read on a washed-out projector.

---

## 5. SHOULD-FIX (P1, after P0)

1. **Title disclosure.** `.title-note` is 10.5 px and 4.36:1 over the title scrim. Raise to `clamp(12px, 1.25vh, 13.5px)` and alpha .82. The opening dialogue (“The products are real; this meeting is not.”) is excellent at 27 px; the title note is the supporting disclosure and should not look like legal debris.
2. **Factory card supporting copy.** Raise `.factory-lede` to `clamp(13px, 1.35vh, 15px)` (remove the 11.5 px low-height override), `.prototype-readout p` to 11–13 px, `.factory-source` to 11.5 px/alpha .78, and `.factory-card .fine-print` as in P0-4. The reveal card is where the audience learns why the prototype is fictional; it needs to be readable, not just present.
3. **Archive factual supporting text.** Raise `.lifetime-figure span` to 11 px (unit and as-of date matter), `.archive-stamp span` to 10 px and `.archive-stamp strong` to 13.5 px, `.history-pitch` to `clamp(12.5px, 1.4vh, 15px)`, `.history-detail` to 12.5–13 px, `.evidence-panel h3` to 25 px and `.evidence-panel p` to 13 px, `.sources a` to 11.5 px, `.source-date` as in P0-4, and `.class-comparison` labels/values by 1–1.5 px. The big numbers and product names already meet the benchmark; this is about making the caveat and the date defensible at a glance.
4. **Archive initial view clipping.** At 1920x1080 the evidence panel’s source column runs past the archive screen’s first view (the panel is cut mid-source at the bottom). The archive is scrollable and there is an “Evidence & discussion ↓” jump in the top-right stamp, so this is not a dead end; still, the first projected frame looks clipped. Options: trim archive header/card vertical spacing by ~40 px so the evidence panel fully fits, or add a bottom fade/scroll cue. Do not reduce the big numbers to make room.
5. **Speaker focus is effectively invisible.** `SceneDirector.focusSpeaker()` (`scene-director.ts:159-183`) shifts the camera by at most `point.x * 0.08` (≈0.34 world units) and changes FOV 33→32.4; screenshots with different speakers are nearly identical. `AnimalAvatar`'s focus ring is at floor level (`boardroom.ts:334-342`) under each avatar, i.e. behind the 1.61-high table from the fixed camera; it does not appear in the screenshots. The audience identifies the speaker mainly from the dialogue panel. Lowest-risk fix: reuse one soft, low-intensity spot/rim light that follows the speaking avatar (no new particles, no camera shake), or raise the ring to a small halo behind the chair. If camera motion is preferred, increase influence modestly (camera x `point.x * 0.16`, look x `point.x * 0.30`, FOV ~31.8) and verify all five remain in frame at 4:3. Keep the move gentle; the current no-jolt behaviour is correct for a lecture.
6. **4:3 boardroom framing.** At 1024x768 the outer bear/beaver and tortoise bodies are clipped at the frame edges (faces remain visible). This is acceptable if 16:9 is the classroom target; if 4:3 must be supported, widen the boardroom FOV slightly at aspect < 1.5 (e.g. 34.5–36) or pull the camera back ~6–8%, and re-check the dialogue panel does not cover faces. The factory 4:3 issue is the P0-1 card/camera problem, not just this.
7. **Historical-boundary colour echo.** The simulated D3 hybrid uses `COLORS.coral` (left grip) and `COLORS.mint` (right grip) in `prototypes.ts:359-383`, and the finale’s Switch silhouette uses the same coral/mint side controllers (`.sil-joycon.sil-left/right`, `style.css:1882-1890`). The form is already the historically closest option; repeating the Switch’s colour pair makes the simulated concept read as “the answer” before the finale. Keep the form, but recolour the simulated split grips to the already-available lavender/gold family and reserve coral/mint for the archive silhouette. This is optional but high-value truth clarity and costs only palette values.
8. **Presenter drawer at 1366/4:3.** The 440 px drawer is legible at laptop distance, but at 1366x768 the keyboard/reset sections fall below the fold; `Reset entire demo` is not immediately reachable. Move Restart scene and Reset into a sticky bottom action row, or place the danger section directly under Scene Control. This is a classroom recovery concern, not an audience visual issue.
9. **Micro-label drift.** Eight- to ten-pixel uppercase labels (`OPTION A`, `CONCEPT PROTOTYPE 01`, `CLS`, HUD vote chips, `SPEAKER SPECIES`) are decorative. Raising the truth/caveat labels (P0) while leaving these small preserves hierarchy; do not raise every micro-label, or the screen becomes noisy. Consider dropping nonessential ones at projection sizes rather than scaling all of them.

---

## 6. Composition, pacing and historical-boundary audit

**Boardroom (1920 and 1366, 1024):** strong. The warm room, oval table, red runner, sealed timeline board, mugs and plants read as a cozy corporate toy theatre. Five original species are distinguishable; the owl’s discs/glasses, fox’s ears/scarf, beaver’s teeth/paddle/pencil, bear’s muzzle and the green tortoise’s shell all read. The dialogue panel sits below the faces and does not occlude them at 1920; at 1024 it overlaps the table only. Advisor faces are large enough to read at 1920; at 1366/4:3 they shrink but the DOM dialogue carries the content. The only real gap is the near-invisible speaker cue (P1-5). No new decoration is needed in the boardroom.

**Factory (1920, 1366, 1024):** the set is excellent: gantry, press, conveyor, hazard trim, pipes, stage light and robot arms give a readable “assembly line” without physics or clutter. The stage spotlight and teal palette separate it from the boardroom. The composition fails only because the card overlays the hero at narrow widths (P0-1). The right arm’s working end is behind the card even at 1920; the card/camera fix will help. The prototype itself is well lit and its colour blocking (cream body, mint/teal screen, coloured buttons) is legible; the D1 wand and D3 split grips are distinct shapes. Do not add confetti or shake; the stamp and lift already provide the reveal beat.

**Vote screen (1920, 1366, 1024, 1280):** the hierarchy is correct: eyebrow → question → context → three comparable cards → selection → record. Selected state uses gold border + check + tinted background, not colour alone. No option is marked “correct”; benefit/trade-off labels are neutral. Cards do not clip at 1024 (measured scrollHeight == clientHeight; three cards at 377 px). The cards have some empty middle space because `.choice-tradeoff` is pushed to the bottom with `margin-top:auto`; the larger type in P0-3 will use that space. At 1920 the composition leaves generous background margin, which is good for a projected frame.

**Presenter drawer:** clear at 1920 and 1366; the scrim and blur correctly hide the scene from the audience. The disabled jump buttons plus the presenter-mode toggle communicate the lock. The drawer is 440 px at every width (32% at 1366, 43% at 1024), so on a mirrored display it hides a meaningful slice of the scene; it is a presenter tool and should normally be closed during the story. At 1366 the reset action is below the fold (P1-8). No type increase is required for the audience; the presenter is close to the laptop.

**Archive:** the payoff layout is strong: large years, product names and figures, original silhouettes, a visible “As of June 30, 2026” stamp, the board’s path, comparison blocks and a discussion card. Product names appear only here; no real product names or figures appear before the finale in any screenshot. The caveat headline “Commercial scale is not causal proof.” is visible at the bottom of the first 1080 view; its body and the source list run past the initial view (P1-4). The “No pass/fail” line is present in every comparison block but only 8.5 px; raise it modestly with the other supporting text.

**Pacing and contractual counts:** visual evidence shows “CHAPTER 1 / 3”, “CHAPTER 3 / 3”, “VOTE 1 OF 1”, “VOTE 2 OF 2”, one factory card per chapter, `CONCEPT PROTOTYPE 01/02/03`, and an archive that is sealed until the finale and then marked `HISTORICAL RECORD OPEN`. The 2016 factory is a single reveal after D3 and D4, as required. Factory skip and replay controls are visible in the card; the 8–9 s choreography is short enough for the 10–15 minute lesson. No visual element promotes a different chapter count or an extra vote.

**Fiction/history boundary:** the correct labels are present in the DOM in both build and reveal states (`story.ts:13`, `ui.ts:529/544`) and the banner label is present (except below 850 px, where the card stamp remains). The opening dialogue and title note explicitly frame the meeting as fictional. The only ambiguity is the visual resemblance of the historically closest prototypes (Hearth Box + wand; Take-Anywhere Dock + split grips), amplified by the tiny labels and the coral/mint grip echo. Fixing P0-2 and P1-7 keeps the teaching comparison without making the mock-up look like a leaked product.

**Advisor integration note for the GLB adapter (visual acceptance, not my edit):** when a Tripo3D model replaces a placeholder, keep the current head height (~2.44 world units), face pivot and seat orientation, and ensure the face reads above the 1.61-high table at the fixed camera. Normalize at the feet, preserve matte low-poly materials, avoid shiny/outlined styles that break the set’s lighting, and verify all five at 1920/1366. The procedural fallbacks are the composition baseline; a failed GLB must leave that exact silhouette.

---

## 7. Optional new-file proposal (do not implement without lead approval)

**`src/scene/decorations.ts` — factory foreground balance (optional, P2).** The factory’s left foreground is a large dark floor/wall area in the reveal; the card pulls the eye right. A small, static, matte prop cluster could balance the frame without adding spectacle:

- One low wheeled tool cart: two boxes, four cylinder wheels, a shared material.
- One cable spool: two cylinders and a torus/box wrap, muted teal.
- Two shallow stacked crates or a stanchion with a rope, using existing `primitives.ts` helpers.

Constraints: no text or logos in 3D, no new lights or shadow casters, ≤10 additional draw calls, reuse existing materials, static only, disposed with the factory. It should not sit between the camera and the stage or the DOM card. This is lower priority than every P0/P1 item. The boardroom does not need additional decoration.

Do **not** add particles, screen shake, confetti bursts, motion trails, rainbow backgrounds, or “first-three-seconds” spectacle from the game-designer skill; they conflict with the lecture clarity and time budget.

---

## 8. Exact no-edit change list for the lead

Priority order. All CSS line numbers are from the 23:03 snapshot; re-grep before applying.

### P0

| # | File / selector | Current | Proposed | Why |
|---|---|---|---|---|
| 1 | `src/style.css:1166` `.factory-card` | `width: min(540px, 38vw)` | `width: min(540px, 30vw)` | Stop the card moving left over the prototype at 1366/1280 |
| 2 | `src/style.css:1153-1162` `.factory-screen` | `padding-right: clamp(22px, 3.6vw, 58px)` | `padding-right: clamp(18px, 2.4vw, 44px)` | Gain ~14–25 px of stage clearance |
| 3 | `src/style.css:2601-2603` (inside max-width 1100) `.factory-card` | `width: min(500px, 48vw)` | `width: min(420px, 30vw)` + `.prototype-readout { grid-template-columns: 1fr; gap: 10px; }` | Remove the 4:3 near-half-screen card; one-column readout stays readable |
| 4 | `src/scene/scene-director.ts:29-33` `FACTORY_REVEAL` | fixed pose independent of overlay | overlay-aware `setViewOffset`/look shift when the reveal card covers the right side; stage centre in uncovered width | Robust fix for all aspect ratios; acceptance: prototype component visible at 1920/1366/1024 |
| 5 | `src/style.css:1100-1116`, `1144-1151` `.factory-label` | 9 px inherited | `font-size: clamp(10.5px, 1.35vh, 14.5px)`, `padding: 7px 11px`, tinted background | Make the NOT HISTORICAL label projector-legible |
| 6 | `src/style.css:1248-1260` `.simulated-stamp` | 8.5 px | `font-size: clamp(10.5px, 1.3vh, 14px)`, `padding: 10px 12px` | Required exact label must be readable |
| 7 | `src/style.css:1042` `.choice-detail` | `clamp(14.5px, 1.06vw, 17.5px)` | `clamp(16px, 2.2vh, 24px)` | Hit the 24 px benchmark at 1080 and proportional at 768 |
| 8 | `src/style.css:1059` `.choice-tradeoff > span` | `clamp(12.5px, 0.93vw, 14.5px)` | `clamp(13.5px, 2.0vh, 21.5px)`; label strong `8px → 10px` | The trade-offs are the lesson; 14.5 px is unreadable at distance |
| 9 | `src/style.css:2442` low-height block | existing | add vote padding/header/footer reductions (see section 3) | Fund the larger vote type without pushing the Record button below the fold |
| 10 | `src/style.css` `.source-date`, `.path-note`, `.history-caution`, `.fine-print`, `.lifetime-figure span`, `.class-comparison span`, `.title-note` | alpha .44–.58 | alpha .72–.82 + sizes in the contrast table | Fix 2.63–4.36:1 failures; truth/citation labels must read on a washed-out projector |

### P1

| # | Selector / file | Proposal |
|---|---|---|
| 11 | `.title-note` | 12–13.5 px, alpha .82 |
| 12 | `.factory-lede`, `.prototype-readout p`, `.factory-source`, `.factory-card .fine-print` | 13–15 px, 11–13 px, 11.5 px/.78, 11.5 px/.72 respectively |
| 13 | `.archive-stamp span/strong`, `.history-pitch`, `.history-detail`, `.evidence-panel h3/p`, `.sources a`, `.class-comparison` | raise by 1–2.5 px and lift alpha as in section 5 |
| 14 | `scene-director.ts:159-183` `focusSpeaker` + `boardroom.ts:334-348` focus ring | add a reusable soft spot/rim on the speaker or a visible chair halo; if moving camera, modestly increase influence and re-check 4:3 |
| 15 | `scene-director.ts:273-281` resize + boardroom wide | if 4:3 is supported, widen FOV/pull back so outer bodies are not clipped |
| 16 | `prototypes.ts:359-383` split controls | recolour simulated grips away from the archive’s coral/mint pair (lavender/gold already exist) |
| 17 | `style.css:2144+` presenter drawer | sticky bottom recovery row for Restart/Reset at 1366x768 |
| 18 | `style.css:2701-2703` `.factory-label { display:none }` | keep a compact label at narrow widths; do not remove the truth label |

### P2

- `src/scene/decorations.ts` optional factory foreground props only (section 7).
- Consider deleting nonessential micro-labels at projection sizes rather than enlarging every one.

---

## 9. Verification for the lead after applying fixes

1. Re-capture at 1920x1080, 1366x768, 1280x720 and 1024x768 for: vote, factory build, factory reveal (D1-B and D3-C/D4-B), archive, boardroom dialogue, presenter drawer.
2. Assert at each size: all three choice cards and the Record button visible without scrolling; the prototype and its decision-defining accessory are not covered by `.factory-card`; both truth labels visible; no card/screen horizontal overflow; evidence/source block reachable via scroll or the jump button.
3. Check computed contrast for the P0-4 list (target ≥4.5:1) and computed font sizes (vote detail ~2.2vh, labels ≥1.3vh).
4. View the actual projector from the back of the room at 3–4 m under the classroom's ambient light. The 24 px benchmark is a proxy; the real test is the back row.
5. Repeat with reduced motion off to confirm the type/labels remain visible during the factory choreography, and check `prefers-reduced-motion` still suppresses the animation.
6. Do not sign off on “different prototypes are visible” from a 1920 screenshot alone; the 1366 and 1024 reveal shots are the failing cases.

---

## 10. Evidence files

Existing project screenshots inspected: `qa-screens/16-presenter-drawer.png`, `17-vote-1920.png`, `18-vote-1366.png`, `19-briefing-1366.png`, `20-presenter-1366.png`, `21-title-1366.png`, `22-factory-1920.png`, plus `02-opening-boardroom.png`, `04-advisors.png`, `06-vote-selected.png`, `07/08-factory-*`, `09-feedback.png`, `10-transition.png`, `11-vote-2016-second.png`, `13-factory-hybrid-reveal.png`, `14-finale-sealed.png`, `15-archive.png`.

Fresh read-only captures (job scratch, not project writes; **pre-freeze, may reflect an intermediate HMR state — re-capture after the lead announces source freeze**):
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\visual-shots\factory-reveal-1366.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\visual-shots\factory-1024x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\visual-shots\factory-1280x720.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\visual-shots\vote-1024x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\visual-shots\boardroom-1024x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\visual-shots\title-1920.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\visual-shots\archive-1920.png`

---

# 11. Post-freeze verification — 2026-10-21 23:46 PT

**Status:** source frozen; the lead's applied P0 changes were verified. No remaining P0. One residual 3D edge clip (P2) and archive first-view/4:3 issues (P1) remain. No source edits, config edits or build by `visual`.

**Frozen source in this pass:** `src/style.css` 23:21, `src/scene/prototypes.ts` 23:21, `src/scene/scene-director.ts` 23:25, `src/ui/ui.ts` 23:03.

**Method:** one hardened read-only pass at 1920x1080, 1366x768 and 1024x768; each viewport ran the canonical D1-B → D2-B → D3-C/D4-B path to the archive. Screenshots use reduced motion. Metrics were read from the live DOM and written incrementally. A first attempt timed out on one screenshot (1366 archive); the hardened retry completed all nine images with no page errors. I did not run the build or tests; the lead reports 58 unit tests and 8/8 e2e passing.

## 11.1 Vote — P0-3 closed

| Viewport | `.choice-detail` | `.choice-tradeoff > span` | `.vote-header p` | Record button bottom | Screen client/scroll | Horizontal overflow |
|---|---|---|---|---|---|---|
| 1920x1080 | 23.76 px (2.20 vh) | 21.5 px (1.99 vh) | 16.5 px | 931 (of 1080) | 786 / 786 (no scroll) | No |
| 1366x768 | 16.896 px (2.20 vh) | 15.36 px (2.00 vh) | 13.5 px | 675 (of 768) | 551 / 551 (no scroll) | No |
| 1024x768 | 16.896 px (2.20 vh) | 15.36 px (2.00 vh) | 13.5 px | 709 (of 768) | 617 / 617 (no scroll) | No |

All three cards and the Record button are visible without scrolling at every size. The option detail now meets the 24 px @1080 benchmark (23.76 px); the benefit/trade-off line is 21.5 px, a deliberate 2.0 vh secondary tier. At 1366/1024 the px values are physically equivalent to 23.76/21.5 px on a 1080p projector. The lead's measured bottoms (931/675/709) reproduce exactly. `OPTION A/B/C` remains 8 px and the presenter footer 11 px; both are decorative/presenter-only, so they do not block the room.

## 11.2 Factory done — P0-1/P0-2 closed; small residual edge clip (P2)

| Viewport | `.factory-label` | `.simulated-stamp` | Card box | Card scroll | Label / stamp visible | Prototype projected bbox | Mesh-bbox overlap with card |
|---|---|---|---|---|---|---|---|
| 1920x1080 | 14.5 px | 14 px | 540x515 at (1336,522) | 513 / 513, none | Yes / Yes | 605x249 | 1 px x 229 px = 0.1% (edge rounding; visually clear) |
| 1366x768 | 10.5 px | 10.5 px | 410x484 at (923,253) | 482 / 482, none | Yes / Yes | 432x177 | **28 px x 177 px = 6.5%** |
| 1024x768 | 10.5 px | 10.5 px | 307x613 at (692,125) | 611 / 611, none | Yes / Yes | 431x175 | **25 px x 175 px = 5.9%** |

The truth labels are now legible and unclipped at every size: the top banner label is 14.5 px at 1920 and 10.5 px at 1366/1024 (physically ≈14.8 px at 1080), and the card stamp is 14 px / 10.5 px with a two-line wrap. Both are fully inside the viewport and card; the `Face the board` button is inside the card viewport at all sizes. `factory-label` remains `display:block` at 1024 (the <=850 px hide rule is untouched but does not apply). The card fits exactly at 1024 (611/611) and does not scroll.

**Residual edge clip:** projecting all 17 prototype meshes through the actual camera (not a DOM proxy) finds a 28 px / 25 px horizontal overlap at 1366 / 1024; the crop shows the card edge clipping the right side of the gesture-wand ball/base. The wand is still recognisable and the D1-B decision difference is clear, so this is **P2 cosmetic, not a blocker**, but it does not literally match the lead's 0 px DOM measurement. Lowest-risk fix: pan the reveal camera by +0.3 in look-x (`FACTORY_REVEAL.look[0]` from `-0.55` to `-0.25`), which moves the stage left by roughly 30–40 px; verify the left arm remains in frame and the stamp stays over the stage. CSS alternative: under `@media (max-width: 1500px) and (min-width: 851px)`, set `.factory-card { width: min(420px, 28vw); }` and `.factory-screen { padding-right: 14px; }`; that clears the bbox but narrows the card and may add internal wrap.

At 1024 the card eyebrow wraps as `FICTIONAL DESIGN EXERCISE · CHAPTER` / `1` (P2 typographic nit); shortening the string or reducing its letter-spacing at <=1100 avoids the orphan.

## 11.3 Archive — no horizontal overflow; first-view/4:3 issues remain (P1)

| Viewport | Archive client/scroll | Scroll multiple | Grid columns | Initial visible content | Evidence panel top | Horizontal overflow |
|---|---|---|---|---|---|---|
| 1920x1080 | 968 / 1501 | 1.55 screens | 3 x 485 px | All three cards fully visible (names, figures, details, comparison, caution) | 1040 (screen bottom 1057; only 17 px visible) | No |
| 1366x768 | 676 / 1451 | 2.15 screens | 3 x 397 px | All three names and figures; card detail below the fold | 991 (below screen bottom 753) | No |
| 1024x768 | 676 / 2536 | 3.75 screens | 1 x 911 px | Header, path, and the 2006 card only (name clipped at the bottom); 2012/2017 require scrolling | 2008 | No |

Primary payoff typography passes at every size: product names 33 / 27.3 / 25 px, lifetime figures 34 / 30 / 25 px, years 26 px. The archive stamp is 10 px label + 13.5 px date at all sizes. Contrast is closed (below). The 1366 first view is a usable comparison: all three products and figures are on screen together. At 1024 the one-column breakpoint defeats the simultaneous comparison; that is the main remaining 4:3 concern. The evidence panel, source list and discussion are below the first view at all sizes; the top-right `Evidence & discussion ↓` jump exists, but the audience will see the figures without the "Commercial scale is not causal proof" caveat unless the presenter scrolls.

Supporting copy is improved but still below the benchmark: `.history-pitch` 15 px @1920 / 12.5 px @1366/1024; `.history-detail` 13 px; `.history-caution` 11.5 px; `.sources a` 11.5 px; `.source-date` 10 px; `.evidence-panel p` 13 px. These are now readable at laptop distance; a back-row projector test should decide whether to raise the pitch/caveat another 1–2 px and accept more scroll.

## 11.4 Contrast — P0-4 closed

Computed against representative panel colours with the frozen CSS colors/alphas:

| Element | Previous | Now |
|---|---|---|
| `.source-date` | 2.63 | **5.88** |
| `.path-note` | 3.05 | **6.55** |
| `.factory-card .fine-print` | 3.80 | **5.66** |
| `.history-caution` | 4.08 | **6.00** |
| `.lifetime-figure span` | 4.13 | **6.70** |
| `.class-comparison span` | 4.01 | **5.99** |
| `.title-note` | 4.36 | **8.72** |

All pass WCAG AA normal text at 4.5:1. The truth/citation text is no longer a contrast blocker.

## 11.5 Remaining priorities after freeze

**P1 — archive first-view caveat and 4:3 comparison**
- Add a short, visible caveat in the first archive view (e.g., next to the stamp or above the grid, 13–14 px): “Cumulative shipments. Not causal proof — evidence below.” This preserves the pedagogy without requiring a scroll.
- At 1024, either keep the three-column comparison down to ~1000 px (test with the current card content; the breakpoint is currently 1100) or add a compact three-row Year / Product / Units table above the cards. Otherwise the 4:3 finale becomes a one-product-at-a-time scroll and loses the side-by-side teaching point.
- At 1366 the three-column comparison works; accept the scroll for evidence/sources/discussion.

**P2 — residual polish**
- 25–28 px gesture-wand/base edge clip at 1366/1024 (see 11.2); camera pan +0.3 or 28vw card under 1500.
- 1024 factory card eyebrow orphan (`CHAPTER` / `1`); shorten the eyebrow or reduce letter-spacing.
- Out of this pass's vote/factory/archive scope, and **not re-verified**: the speaker-focus cue, 4:3 boardroom outer-body crop, and presenter Reset below the fold at 1366. They remain as previously reported; no regression claim is made.

## 11.6 Post-freeze evidence

- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-vote-1920x1080.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-vote-1366x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-vote-1024x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-factory-1920x1080.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-factory-1366x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-factory-1024x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-archive-1920x1080.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-archive-1366x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-archive-1024x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\metrics.json` (computed fonts, boxes, visibility, scroll, prototype projection)
- Wand crops: `crop-factory-1366-wand.png`, `crop-factory-1024-wand.png` in the same folder.

**Post-freeze bottom line:** all four P0s are closed. The 1920/1366 experience is visually ready for a 16:9 classroom; the remaining classroom decision is the archive caveat/scroll and the 4:3 one-column comparison. The only new visual regression-like finding is the small, non-blocking wand edge clip at 1366/1024.
