# TEAM_VISUAL_FINAL — Independent Projector Sign-off

**Reviewer:** independent visual reviewer (read-only)
**Timestamp:** 2026-10-22 07:40 PT
**Project:** `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game`
**Scope:** final vote, factory-reveal and archive captures at 1920x1080, 1366x768 and 1024x768; regression check against `agent-reports/TEAM_VISUAL.md` §11.
**Runtime statement:** **No browser, Playwright, dev server, preview server or build was run.** No source, CSS, test, config, `BUILD_STATUS.md` or prior report was edited. `metrics.json` is treated as reported data, not as visual proof.

---

## 1. Verdict

**PASS WITH RESIDUAL NOTES — for a 16:9 classroom projector at 1920x1080 or 1366x768.**

All four previously closed P0s remain closed as classroom blockers. The vote hierarchy is clear, the factory reveal leaves the decision-defining prototype visible, both truth labels are present and readable at 1:1, and the archive presents the correct Wii / Wii U / Switch names, years and figures. Nothing materially regressed from §11; the frozen source mtimes are unchanged.

The release is **not a clean pass** for every configuration:

- At **1024x768 (4:3)** the archive stacks to one column and becomes a 3.75-screen scroll; the audience cannot compare all three products together. The 2016 factory card at that width is also **unverified** and is at risk of internal scrolling because of its long title.
- The **exact truth labels are 14.5/14 px at 1920 and 10.5 px at 1366/1024**, below the project's 24 px projection benchmark. They are legible in the captures, but 10.5 px on a 4:3 projector is marginal from the back row.
- The **archive's evidence/causal caveat is below the first 1080 view in the full four-vote path**. The pre-reveal “sealed archive” screen and the per-card cautions mitigate this, but the main evidence headline is not visible without scrolling.

If the classroom is locked to 1024x768, treat the archive comparison and the 2016 card as a **conditional BLOCK for the side-by-side teaching goal** until captured/rehearsed, or fix the 4:3 layout. If the classroom outputs 1366x768 or 1920x1080 — the documented primary target — the build is releasable with notes.

---

## 2. Evidence discipline

- **[OBSERVED]** — seen directly in a PNG listed in §9.
- **[REPORTED]** — read from `metrics.json`, `BUILD_STATUS.md`, the prior report, or source/CSS. Not independently measured from pixels.
- **[INFERRED]** — a calculation or a risk deduced from CSS/source and image geometry; not proven by a runtime capture.

The 24 px benchmark discussion uses the prior report's definition: 24 CSS px at 1920x1080, physically equivalent to about 17 px at 1366x768/1024x768 on the same projected screen. I did not invent pixel measurements; values below are either reported or explicitly labelled inferred.

**Frozen source verified by mtime:**

| File | mtime |
|---|---|
| `src/style.css` | 2026-10-21 23:21:02 |
| `src/scene/prototypes.ts` | 2026-10-21 23:21:18 |
| `src/scene/scene-director.ts` | 2026-10-21 23:25:53 |
| `src/ui/ui.ts` | 2026-10-21 23:03:54 |
| `src/scene/boardroom.ts` | 2026-10-21 23:09:57 |

These match the snapshot used by the prior post-freeze pass (§11), so any visual change since then is capture state, not source drift.

Skills applied: `game-designer`, `nintendo-game-design`, `threejs-game`. I ignored the viral-spectacle advice (screen shake, hit-freeze, heavy particles, rainbow backgrounds, persistent trails): it is incompatible with a 10–15 minute lecture and with the project documents.

---

## 3. The four previously closed P0s

### P0-1 — Factory card obscuring the prototype: CLOSED as a blocker; small P2 residual

**Reported geometry** (`metrics.json`, mesh projection):

| Viewport | Card | Prototype screen bbox | Overlap | Percent of prototype bbox |
|---|---|---|---|---|
| 1920x1080 | 540x515 at x=1336 | 605x249, right=1337 | 1 px x 229 px | 0.1% |
| 1366x768 | 410x484 at x=923 | 432x177, right=951 | 28 px x 177 px | 6.5% |
| 1024x768 | 307x613 at x=692 | 431x175, right=718 | 25 px x 175 px | 5.9% |

**Observed:** at all three sizes the console and the gesture-wand ball/shaft are visible. The card does not cover the console body. The two wand crops show the card edge cutting only the right end of the wand's base/stand:

- `crop-factory-1366-wand.png` — ball, shaft and most of the base visible; card edge clips the base's right end.
- `crop-factory-1024-wand.png` — ball and shaft visible; more of the base disappears under the card.

The decision-defining D1-B feature is therefore recognisable at every measured size; this is no longer a classroom blocker. It is still not the “0 px overlap” claimed in `BUILD_STATUS.md` (see §6).

**Also observed:** the right robot arm's working end sits behind the card at 1366/1024; the factory still reads as an assembly line because the left arm and press are unobstructed. No new animation or particles are needed.

### P0-2 — Truth labels below projector legibility: CLOSED for presence/readability; residual size risk

**Reported:**

| Viewport | `.factory-label` | `.simulated-stamp` | Label visible | Stamp visible | Card scroll |
|---|---|---|---|---|---|
| 1920x1080 | 14.5 px | 14 px | yes | yes | no (513/513) |
| 1366x768 | 10.5 px | 10.5 px | yes | yes | no (482/482) |
| 1024x768 | 10.5 px | 10.5 px | yes | yes | no (611/611) |

`labelDisplay: block` at 1024; the ≤850 px hide rule does not apply. Both exact strings are rendered in the reveal markup and are not clipped.

**Observed:** the banner “AUDIENCE CONCEPT · NOT HISTORICAL” and the boxed “SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT” are readable in all three factory captures. At 1920 the stamp wraps as “SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO” / “PRODUCT” (orphan word); at 1024 it wraps in two balanced lines; at 1366 it is one line.

**Inferred:** 14.5/10.5 px does **not** meet the 24 px benchmark. The 10.5 px card stamp on a 1024 projector is small from 3–4 m, even though the high-contrast dashed box helps. This is a residual risk, not an observed failure: I could not test physical distance.

### P0-3 — Vote option copy below projector legibility: CLOSED

**Reported:**

| Viewport | `.choice-detail` | `.choice-tradeoff > span` | `.vote-header p` | Record button bottom | Screen scroll | H-overflow |
|---|---|---|---|---|---|---|
| 1920x1080 | 23.76 px (2.20 vh) | 21.5 px (1.99 vh) | 16.5 px | 931 / 1080 | 786/786, none | no |
| 1366x768 | 16.896 px (2.20 vh) | 15.36 px (2.00 vh) | 13.5 px | 675 / 768 | 551/551, none | no |
| 1024x768 | 16.896 px (2.20 vh) | 15.36 px (2.00 vh) | 13.5 px | 709 / 768 | 617/617, none | no |

**Observed:** all three cards, their benefit/trade-off text and the Record button are visible without scrolling at all three sizes. The 1920 detail/benefit text is clearly the lesson-bearing tier; the 1366/1024 sizes are physically equivalent to the 1080 values. The selected state uses a gold border plus check mark, not colour alone.

Remaining minor points: `.choice-id` is 8 px and the BENEFIT/TRADE-OFF labels are 10 px (decorative, not audience-critical); the vote context line is 13.5 px at 1366/1024 (supporting, not the question). Neither reopens P0-3.

### P0-4 — Contrast failures: CLOSED

The prior report's measured ratios were recomputed approximately from the frozen CSS colours/alphas over representative panel colours. These are **[INFERRED]** composites; gradients and backdrop blur shift them slightly, so this is a verification of the remediation values, not a pixel-sampled audit.

| Element | CSS value | Approx. composite | Approx. contrast | AA 4.5 |
|---|---|---|---|---|
| `.source-date` | rgba(210,197,179,.72), 10 px | (158,149,137) | 5.98 | pass |
| `.path-note` | rgba(221,209,192,.72), 10.5 px | (167,158,147) | 6.48 | pass |
| `.factory-card .fine-print` | rgba(209,196,178,.72), 11.5 px | (159,149,138) | 5.69 | pass |
| `.history-caution` | rgba(211,198,181,.72), 11.5 px | (158,149,138) | 6.10 | pass |
| `.lifetime-figure span` | rgba(216,203,185,.75), 11 px | (168,158,146) | 6.83 | pass |
| `.class-comparison span` | rgba(220,208,191,.68), 9.5 px | (159,151,141) | 5.81 | pass |
| `.title-note` | rgba(219,207,190,.82), 12–13.5 px | (183,173,160) | 8.42 | pass |

The truth/citation text is no longer a contrast blocker. The small sizes remain a separate legibility issue.

---

## 4. Hierarchy and composition

### 4.1 Vote — strong; P0-3 closed

**Observed at 1920:** eyebrow → 49 px question → 16.5 px context → three equal cards with 32 px titles, 23.76 px detail and 21.5 px benefit/trade-off → selected gold card → record button. The frame is calm and the room remains visible behind the card. The 1920 card leaves generous margin; the eye lands on the question and then the three option titles. This is the correct teaching hierarchy.

**Observed at 1366:** the same hierarchy compresses cleanly; the Record button is inside the first view at bottom 675. At 1024 the three cards remain side by side and the button is at bottom 709; the text is denser but not clipped.

**Minor P2:** the benefit/trade-off blocks are bottom-aligned per card, so their baselines differ across the three columns (the shortest detail in card B leaves a large empty middle). At 1920 this is visible as a gap in B and C. It does not impair reading, but aligning the three benefit rows would make comparison scan faster. Do not shorten the content to achieve it.

### 4.2 Factory — set is excellent; reveal card is acceptable; P2 edge polish

**Observed at 1920:** the Hearth Box console and gesture wand sit on the stage, the press, gantry and left arm frame them, and the card starts at x=1336. Both truth labels are visible. The card's lower third (readout, buttons, stamp, fine print) is readable. The right arm is partly behind the card, but the stage still reads as a two-arm machine.

**Observed at 1366:** the console is fully clear of the card; the wand ball and shaft are clear; the card edge clips the wand base. The card's eyebrow, title, lede, readout, source, Face the board button, stamp and fine print all fit without internal scrolling. The card bottom is 737 of 768; no button is cut.

**Observed at 1024:** the console is fully clear; the wand ball/shaft clear; the base is clipped. The card fills the right third (x=692 to 999) and is tall (125 to 737), but the Face button (561–601) and stamp (619–669) are visible. The eyebrow wraps as “FICTIONAL DESIGN EXERCISE · CHAPTER” / “1”, an orphan number (P2). The card is narrow and dense, but the readout is one column and remains legible.

**Branch evidence at 1920:** `team-branch-d2-C-1920.png` shows the large Carry Console with both truth labels and no card collision; `team-branch-d3C-d4B-1920.png` shows the split-grip Take-Anywhere Dock / Shared Play Edition with both controls visible and the card clear. The simulated grips are visibly lavender/gold rather than the archive's coral/mint, confirming the historical-boundary recolour.

**Inferred risk (not captured):** the 2016 card title is long — “The Take-Anywhere Dock · Shared Play Edition” — and wraps to three lines at 1920. At 1024 the card content width is only 265 px and the h2 is 34 px; if the extra title lines push the stamp/fine print past the 611 px card viewport, the exact label would require scrolling for the 2016 reveal. This is a plausible 4:3 risk, not an observed defect. See §7, action 2.

**Do not** add particles, shake, confetti or more factory motion. The light, stage geometry and short assembly beat are sufficient; the card and stamp provide the reveal punctuation.

### 4.3 Archive — correct and strong at 16:9; 4:3 loses the comparison; caveat below first view

**Observed at 1920:** all three 2006/2012/2017 cards are visible together with product names, pitches, lifetime figures, comparison blocks and per-card cautions. The official-figures stamp (“As of June 30, 2026”) is in the top-right. The historical facts visible are correct: Wii 101.63 million, Wii U 13.56 million, Original Nintendo Switch 156.59 million. The evidence panel begins at reported y=1040 with the screen bottom at 1057, so only a sliver is in the first view; the header “READ THE EVIDENCE CAREFULLY / Commercial scale is not causal proof.” and the sources are not visible without scrolling in the full four-vote path. In the lead's partial-vote 1920 capture (D2–D4 “Not voted”), the shorter path panel lets the evidence header and sources appear at the bottom of the first view; this confirms the caveat visibility is path-height dependent, not a fixed layout choice.

**Observed at 1366:** all three names, pitches and figures are visible together; the details and comparison blocks extend below the fold. The evidence panel is below the first view (reported top 991). This is a usable three-product comparison; the presenter can scroll or use “Evidence & discussion ↓”.

**Observed at 1024:** the archive is one column and 3.75 screens tall (reported 676 client / 2536 scroll). The first view shows the header, stamp, path and the 2006 card with “Wii” at the very bottom; 2012 and 2017 require substantial scrolling. The side-by-side teaching point is lost. The lead's partial-vote 1024 capture shows the same one-column behavior with only the 2006 card.

**Mitigation observed:** the pre-reveal “The sealed archive” screen already states “Commercial scale is not proof that one strategy caused success…”, and each archive card carries its own caution line. The causal caveat therefore is not solely dependent on the below-fold evidence panel; the main evidence headline still should be made visible in the first archive view.

**Metrics flag note:** `metrics.json` reports `clipped: true` for some headings (vote h2, archive h2, history years/names). The PNGs show complete glyphs and no visual truncation; I treat this as a line-box measurement artifact, not a defect.

---

## 5. Regression check against §11

| Area | Prior §11 | Fresh evidence | Result |
|---|---|---|---|
| Vote type | 23.76/21.5 @1920; 16.896/15.36 @768; Record 931/675/709 | Same reported values; observed same layout | No regression |
| Factory card/prototype | 1 px/28 px/25 px overlap; labels 14.5/10.5 | Same reported values; crops match | No regression |
| Archive | 968/1501 @1920; 676/1451 @1366; 676/2536 @1024 one column | Same reported values; observed same | No regression |
| Contrast | 5.88/6.55/5.66/6.00/6.70/5.99/8.72 | Frozen CSS values unchanged; approximate recompute 5.7–8.4 | No regression |
| Truth labels | Present in build/reveal, 14/10.5 | Observed in all factory captures | No regression |
| Split-grip colour | Lavender/gold applied | Source uses lavender/gold; 2016 capture shows it | No regression |
| Source | Frozen 23:21/23:21/23:25/23:03 | Same mtimes | No source drift |

No new visual regression was found. The differences between the lead captures and the final-visual captures are selection state (lead vote/factory show no selected card; final vote/factory show B selected) and vote completeness (lead archive shows D2–D4 “Not voted”), not layout changes.

**Documentation inconsistency (new finding):** `BUILD_STATUS.md` states “Measured prototype/card overlap: **0 px at 1920, 1366 and 1024**.” The fresh mesh-projection metrics in `final-visual/metrics.json` report 1 px, 28 px and 25 px, and the crops visibly show the 1366/1024 base clip. The prior report §11.2 already reported 25–28 px. This is a documentation accuracy issue, not a visual regression. Correct the build note to match the measured residual; do not claim 0 px.

---

## 6. Remaining P1 / P2 issues and new findings

| Priority | Issue | Evidence | Recommendation |
|---|---|---|---|
| **P1** | 1024 archive loses the simultaneous three-product comparison; first view shows only the 2006 card | [OBSERVED] `final-archive-1024x768.png`, `lead-archive-1024x768.png`; [REPORTED] one column, 676/2536 scroll, 3.75 screens | If 4:3 must be supported, keep a compact three-row Year/Product/Units table above the cards or force three columns down to ~1000 px. Otherwise state 16:9 as the classroom requirement. |
| **P1** | Full four-vote path puts the evidence/causal caveat below the first 1080/1366 view | [OBSERVED] `final-archive-1920x1080.png` shows cards but no evidence header; [REPORTED] evidence top 1040 of screen bottom 1057; 1366 top 991 | Add a 13–14 px caveat line in the archive header or above the grid: “Cumulative shipments. Not causal proof — evidence below.” Keep the sealed-screen caveat. |
| **P1 / conditional** | 2016 long-title card at 1366/1024 is unverified; at 1024 the extra title lines may push the exact stamp below the card's first view | [INFERRED] from 1920 three-line title, 1024 content width 265 px, 34 px h2, D1 card already 611/611; no 1366/1024 2016 capture was provided or verified in this pass | Capture D3-C/D4-B at both sizes. If the card scrolls, reduce the 2016 title size or make the exact stamp sticky. Do not sign off 4:3 from the 1920 branch shot. |
| **P2** | 25–28 px card/wand-base edge clip at 1366/1024 | [OBSERVED] both wand crops; [REPORTED] 28 px / 6.5% and 25 px / 5.9% | Optional: pan reveal look-x by about +0.3 or use a 28vw card below 1500 px; verify the left arm stays in frame. The wand ball/shaft is already visible, so this is cosmetic. |
| **P2** | 1024 factory eyebrow orphan: “FICTIONAL DESIGN EXERCISE · CHAPTER” / “1” | [OBSERVED] `final-factory-1024x768.png` | Shorten the eyebrow at ≤1100 px or reduce letter-spacing. |
| **P2** | 1920 stamp orphan: “SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO” / “PRODUCT” | [OBSERVED] `final-factory-1920x1080.png`, `lead-factory-1920x1080.png` | `text-wrap: balance` or reduce letter-spacing slightly; keep the exact string. |
| **P2** | Vote benefit/trade-off rows do not share a baseline across the three cards | [OBSERVED] 1920/1366/1024 vote captures; empty mid-card gap in B/C | Align the benefit blocks or accept as an equal-height-card trade-off. Content is unaffected. |
| **P2** | Truth labels remain below the 24 px benchmark (14.5 px @1920, 10.5 px @768) | [REPORTED] metrics; [OBSERVED] readable at 1:1; [INFERRED] marginal at distance on 4:3 | If 1024 is supported, raise the stamp/banner to ~12 px equivalent at 768, or put the exact string in a larger first-view line. |
| **Carry-over** | Speaker-focus cue, 4:3 boardroom outer-body crop, presenter Reset below the fold at 1366 | Not re-captured in this pass; prior §5/§11 | Keep as prior P1s. Do not claim they are fixed. |
| **P3** | 8 px option IDs, 10 px BENEFIT labels, 10.5 px path note | [REPORTED]/[OBSERVED] decorative | Leave; raising every micro-label would add noise. |

No new image shows a broken layout, clipped primary copy, horizontal overflow, or a missing truth label. The “team-factory-revealed-1920.png” image shows the stage with no card; the test source captures it immediately after skip, and its DOM assertions confirm the card exists with the stamp text. **[INFERRED]** the blank stage is the card's entrance animation/capture timing at opacity 0, not a reachable card-less state. It was not used for legibility judgments.

---

## 7. Prioritized next actions

1. **Lock the classroom output to 16:9 (1920x1080 or 1366x768)** and rehearse at that size. This is the configuration I can sign off.
2. **Capture the 2016 D3-C/D4-B reveal at 1366x768 and 1024x768.** Verify the card does not scroll, the Face the board button is reachable, and the exact simulated-concept stamp is visible without scrolling. If it scrolls, shorten the 2016 card title or make the stamp sticky.
3. **If 1024x768 must be supported, fix the archive first:** add a compact three-row comparison or keep three columns, so 2006/2012/2017 are visible together. Re-check the first-view caveat at 1920/1366 in the full four-vote path.
4. **Add a visible causal caveat to the first archive view** (or keep the sealed-screen caveat prominently before the reveal). The per-card cautions are good but the evidence headline is below the fold.
5. **Optional P2 polish:** pan the factory reveal camera slightly to clear the wand base; shorten the 1024 eyebrow; balance the 1920 stamp wrap; align the vote benefit rows.
6. **Do not add** particles, shake, confetti, trails or extra factory spectacle. They would not improve the lecture and would compete with the card and dialogue.

---

## 8. What this review does not establish

- I did not run the app, tests, build, Playwright or a server. I did not observe runtime animation, performance, audio, keyboard controls, reload/checkpoint, or the presenter drawer.
- I did not measure physical projector legibility at 3–4 m. The 24 px/17 px proxy is not a substitute for the back-row test.
- I did not capture the 2016 factory card at 1366/1024, the boardroom at 4:3, the title screen at 768, or the presenter drawer. Those remain prior-report findings or open evidence gaps.
- The contrast table is computed from frozen CSS and representative panel colours, not sampled from the screenshots. It confirms the remediation values but is not a pixel audit.
- The fresh metrics are reported data. I used them for geometry/type values, not as proof that I saw a rendered result.

---

## 9. Exact files inspected

**Skills read/applied:**
- `C:\Users\robwa\Desktop\Nintendo\.claude\skills\game-designer\SKILL.md`
- `C:\Users\robwa\Desktop\Nintendo\.claude\skills\nintendo-game-design\SKILL.md`
- `C:\Users\robwa\Desktop\Nintendo\.claude\skills\threejs-game\SKILL.md`

**Design and prior reports:**
- `C:\Users\robwa\Desktop\Nintendo\GAME_DESIGN.md` (sections 1, 6–10)
- `C:\Users\robwa\Desktop\Nintendo\agent-reports\TEAM_VISUAL.md` (full, including §11)
- `C:\Users\robwa\Desktop\Nintendo\BUILD_STATUS.md` (full)
- `C:\Users\robwa\Desktop\Nintendo\agent-reports\verification-2026-10-22\team-26-consolidated.log` (partial, 5/26 tests visible at read time)
- `C:\Users\robwa\Desktop\Nintendo\agent-reports\verification-2026-10-22\unit-typecheck-build.log` (reported 58/58 unit, typecheck/build exit 0)

**Source/CSS read (sections; no edits):**
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\src\style.css`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\src\scene\scene-director.ts`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\src\ui\ui.ts`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\src\scene\prototypes.ts`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\src\scene\prototype-model.ts`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\src\core\story.ts`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\tests\e2e\team-factory-fallback.spec.ts` (screenshot context)

**Final captures and metrics:**
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-vote-1920x1080.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-vote-1366x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-vote-1024x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-factory-1920x1080.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-factory-1366x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-factory-1024x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-archive-1920x1080.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-archive-1366x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\final-archive-1024x768.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\crop-factory-1366-wand.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\crop-factory-1024-wand.png`
- `C:\Users\robwa\.claude\jobs\e3566973\tmp\final-visual\metrics.json`

**Lead captures:**
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\lead-vote-1920x1080.png`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\lead-vote-1366x768.png`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\lead-vote-1024x768.png`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\lead-factory-1920x1080.png`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\lead-factory-1366x768.png`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\lead-factory-1024x768.png`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\lead-archive-1920x1080.png`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\lead-archive-1366x768.png`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\lead-archive-1024x768.png`

**Additional branch/state captures:**
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\team-branch-d2-C-1920.png`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\team-branch-d3C-d4B-1920.png`
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\team-factory-revealed-1920.png` (capture-timing artifact; not used for legibility)
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\team-canonical-01-title-1920.png` (post-freeze title capture)
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\team-canonical-06-finale-sealed.png` (pre-freeze at 23:12; used only to confirm the caveat wording/presence, not final-state layout)
- `C:\Users\robwa\Desktop\Nintendo\blue-ocean-game\qa-screens\team-canonical-03-factory-2005.png` (pre-freeze at 23:11; used only as a stage reference, not a final-state metric)

---

**Bottom line:** The 16:9 classroom build is visually ready to present, with residual notes. The four P0s are closed, the historical record and truth labels are present, and no material regression occurred. The remaining classroom decisions are the 4:3 archive comparison, the 2016 card's small-width layout, and the below-fold archive caveat. Do not claim 0 px card overlap in `BUILD_STATUS.md`; the measured residual is 25–28 px on the wand base and is visible in the crops.
