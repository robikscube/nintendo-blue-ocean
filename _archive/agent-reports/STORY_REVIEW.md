# STORY_REVIEW — Educational & Narrative Audit

**Reviewer:** Educational/story reviewer (review-only)
**Date:** 2026-10-21
**Scope:** Narrative contract, history/fiction boundary, factual consistency with `GAME_DESIGN.md`, decision pedagogy, finale, labels, and replay/reload narrative integrity. **No source, config, or other docs were modified.** No build, install, deployment, or online fact-check was performed; all findings are static code/doc analysis unless stated.

**Citation legend**
`S` = `blue-ocean-game/src/core/story.ts` · `ST` = `.../core/state.ts` · `T` = `.../core/types.ts` · `CP` = `.../core/checkpoint.ts` · `U` = `blue-ocean-game/src/ui/ui.ts` · `PM` = `.../scene/prototype-model.ts` · `TEST` = `blue-ocean-game/tests/story.test.ts` · `GD` = `GAME_DESIGN.md`.

## 0. Verdict at a glance
- **Structure:** PASS — exactly 3 chapters (2005/2011/2016), 4 votes (1/1/2), 3 options each, one Chapter 3 factory.
- **History/fiction boundary:** PASS in substance; no product names, launch years, or sales figures before the finale, and history is a fixed constant. Two wording ambiguities and one unsupported demographic assertion need editing.
- **Factual consistency with GD:** the three figures, years, date label, off-TV caveat, and Switch "not the first portable" caveat all match. The 156.59M figure and "Original Nintendo Switch" naming still need independent verification.
- **Pedagogy:** decisions are genuinely strategic, but briefings are heavily signposted toward the historically closest options and Chapter 3 repeats its synthesis line. Three must-fix issues before classroom use.

## 1. Structural contract — PASS

| Requirement | Evidence | Result |
|---|---|---|
| Exactly 3 chapters, years 2005/2011/2016 | `S:361-497`; ids/years at `S:363-365`, `S:409-410`, `S:454-455` | PASS |
| Votes 1 / 1 / 2 | `S:376` (`['d1']`), `S:421` (`['d2']`), `S:466` (`['d3','d4']`) | PASS |
| Exactly 4 votes total | `DECISIONS` d1–d4 at `S:334-359`; `DECISION_ORDER` at `S:499`; active-decision logic `ST:59-69` | PASS |
| ≤3 predefined options per vote | Option arrays `S:104-162`, `S:164-222`, `S:224-277`, `S:279-332`, each exactly A/B/C; type-enforced tuple at `T:73`; runtime assertion `TEST:41-50` | PASS |
| Chapter 3 holds the factory until both votes exist | `ST:127-148` (guard at `ST:131-138`); `COMMIT_CHOICE` `ST:204-210` | PASS |
| One factory reveal per chapter, one for 2016 | Same guard; UI factory is a single screen `U:501-544` | PASS |
| Decision order fixed | `DECISION_ORDER` `S:499`; UI track `U:284-298` | PASS |
| Four votes never overwritten by normal flow | `ST:208-209` rejects a second commit; tested `state.test.ts:174-183` | PASS (but see R2 for jumps) |

The flow is data-driven and matches the required sequence: opening → briefing → advisors → voting → factory → feedback → boss → transition → next chapter / finale (`ST:107-125`, `ST:224-246`). No divergent historical branch exists: `ACTUAL_HISTORY` is a frozen constant (`S:630-667`) rendered only in `phase === 'finale'` (`U:356-358`, `U:587-675`), and `state.choices` is used only for the side-by-side class comparison (`U:617-622`).

## 2. History vs. fiction boundary — PASS with caveats

### 2.1 What passes
- **Product names and figures appear only at the finale.** `Wii`, `Wii U`, `Nintendo Switch`, `GamePad`, `Joy-Con`, the three unit totals, and launch years are confined to `ACTUAL_HISTORY` (`S:630-667`) and the archive renderer (`U:587-675`). A code-wide grep found no other runtime occurrence. The leak test covers `CHAPTERS`, `DECISIONS`, `CHARACTERS`, `FINALE_INTRO`, `FINAL_CAVEAT`, and `DISCUSSION_QUESTION` (`TEST:15-25`, `TEST:76-93`).
- **No fabricated quantitative outcomes.** There are no revenue, profit, market-share, price, adoption-probability, or score numbers anywhere. Prototype readouts are qualitative (`PM:53-90`; `U:529-532`). Big Boss lines are rhetorical questions and risk notes (`S:122,141,160,182,201,220,240,257,275,295,313,330`) with no later-history reveal. The archive caveat explicitly denies causal proof (`S:690-691`).
- **No impossible guarantees.** No "will succeed" or equivalent claim; proposals use hedged "can/could/may" language. The strongest normative line, "The best strategy is not the most features" (`S:606`), is a thesis, not a prediction.
- **Prototypes are clearly labeled.** Exact label `SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT` at `S:13`, rendered at `U:523` (building) and `U:538` (reveal), plus `AUDIENCE CONCEPT · NOT HISTORICAL` at `U:510`; spec carries the same label at `PM:70,86`. The reveal also says "A fictional composition, not a prediction. No sales, demand, or market outcome is implied" (`U:539`).
- **Timeline does not branch.** Chapter transitions are fixed text (`S:400-405`, `S:445-450`, `S:490-495`); votes cannot alter them. The finale states this explicitly: "Your votes shaped fictional prototypes. They did not change what happened" (`S:624-625`).
- **Opening/title disclaimers are present.** "A fictional boardroom... The products are real; this meeting is not" (`S:82`), "Your prototypes will be hypothetical" (`S:97`), and "Fictional executive dialogue. Audience concepts are hypothetical. Real products, official figures, and outcomes stay sealed..." (`U:391`).
- **Authorized pre-finale history only.** "The next system brought a different kind of household..." (`S:403`), "A distinctive interactive system has reached beyond the core" (`S:413`), "The real successor struggled..." (`S:448`), and "A recent successor underperformed" (`S:458`) are qualitative contextual disclosures expressly permitted by `GD:17`, `GD:33`, and `GD:70`. They reveal no names, years, or figures.

### 2.2 Ambiguities / assertions to correct
1. **`S:413` — "A distinctive interactive system has reached beyond the core."** Because this follows the audience's 2005 vote, an audience that chose A or C may read this as the consequence of its own choice rather than fixed history. `GD:33` permits disclosing the real company's prior outcome, but the wording does not attribute it. **Editorial:** prefix "In the real timeline," (e.g., "In the real timeline, Nintendo's last system reached beyond the core").
2. **`S:448` — "The real successor struggled..."** The word "real" helps, but it appears only after the D2 vote. The same attribution fix in the D2 lead would make the parallel-timeline premise unambiguous. Not a contract violation; a clarity issue.
3. **`S:637` — "The system reached households well beyond the traditional core console audience."** This is a demographic/causal claim not supported by the cited Nintendo IR units source (`S:669-673`), which measures shipments only. `GD:91` says "expanded gaming participation," which is also interpretive. **Editorial:** rephrase as teaching interpretation ("Nintendo positioned Wii to reach beyond the traditional core; the INSEAD case examines that noncustomer story") or attach the INSEAD citation directly to the claim.
4. **`GD:29` vs. the seal — a genuine doc conflict.** The GDD asks Big Boss to "say the real company made a different choice" when a vote diverges. Saying that for a given option would let the audience infer that option was *not* historical and narrow the answer by elimination. The implementation wisely never does this (`S:399`, `S:444`, `S:489` are neutral). This is the right priority under `CLAUDE.md`'s truth/finale rules, but **the doc should be clarified** rather than the code changed. If a divergence note is added later, it must be history-neutral, e.g., "The sealed record may not match this room."
5. **`GD:29` commendation is only partial.** The GDD also asks the Boss to commend logic when a vote resembles history, without confirming it. Some option-specific boss lines do this implicitly (e.g., `S:141`), but not systematically. Low priority; no code change required.

## 3. Factual accuracy against GAME_DESIGN.md

| GD claim | Implementation | Match |
|---|---|---|
| Wii launched 2006; 101.63M lifetime | `S:635`, `S:638` | ✓ |
| Wii U launched 2012; 13.56M lifetime | `S:646`, `S:650` | ✓ |
| Original Switch launched 2017; 156.59M as of 2026-06-30 | `S:657`, `S:662-663` | ✓ with GD; external verification needed |
| "As of June 30, 2026" date label | `S:14`, `S:663`; archive `U:598`, `U:660` | ✓ |
| Wii U off-TV play was near the console, not standalone portable | `S:649` | ✓ (`GD:116`) |
| Portable/home gaming existed before Switch; the integration was the move | `S:661` | ✓ (`GD:117`) |
| Sales are not causal proof of Blue Ocean theory | `S:641`, `S:653`, `S:665`, `S:690-691` | ✓ (`GD:94`, `GD:118`) |
| Wii Sports / gesture demonstration | `S:637` | Plausible; interpretive, not separately cited |
| Wii U weak adoption and messaging difficulty | `S:649` | Interpretive but consistent with GD; should be labeled interpretation |

**Verification flags (do not assert as checked here):**
- **VF1 — Switch figure and naming (`S:657-664`).** Confirm against Nintendo IR that 156.59M is the cumulative **Nintendo Switch family** total (which may include OLED/Lite) rather than the original model alone. As of a 2026 class, the label "Original Nintendo Switch" beside a family total can overstate model-level precision. Update `S:657-664`, the archive source note (`S:669-673`), and `TEST:66-73` as one set if the IR figure or definition changes. Also confirm June 30, 2026 is the latest published quarter at presentation time; if not, do not silently mix dates.
- **VF2 — Wii audience claim (`S:637`).** The IR source supports units, not "households beyond the core." Either cite the INSEAD teaching case or soften to "Nintendo aimed it beyond the traditional core audience."
- **VF3 — Launch years/propositions lack a per-product citation.** The source list has the IR page, two INSEAD cases, and the 2017 launch release (`S:675-688`), but no per-card citation for 2006/2012/2017 or for the Wii Sports claim. The 2017 release supports the Switch launch; add launch citations or a visible "historical dates from Nintendo release announcements" note.
- **VF4 — "Wii U messaging difficulties"** is an interpretive judgment. It is consistent with the GDD and the cited INSEAD case, but the archive should visually distinguish official figures from teaching interpretation (see E5).

No contradiction with the GDD's specified history was found in the code. I did **not** independently fact-check the external sources.

## 4. Decision quality and pedagogy

### 4.1 Strengths
- **Genuinely strategic, distinct options.** Each option states a benefit and a trade-off, with no "correct" card and no scoring (`U:469-496`, `U:492`). Options map cleanly to the intended concepts: noncustomers/accessibility (D1), value proposition and communication (D2), platform boundary (D3), controller/social invitation (D4).
- **The 2016 pair is structurally coherent.** D3 sets chassis/place, D4 sets controller/social invitation (`S:347-358`); nine combinations produce nine distinct spec keys/descriptions, enforced by tests (`state.test.ts:145-172`), and the factory waits for both votes (`ST:131-138`). The prototype builder genuinely adapts the accessory to the chassis (`prototypes.ts:359-421`), and the nine coherence lines (`S:511-557`) explicitly test integration rather than correctness.
- **Big Boss is in-character and non-humiliating** in Chapters 1–2: challenges are posed as questions, no stats, no product names, no declaration of right/wrong (`S:122,141,160,182,201,220`; closings `S:399,444`).
- **The finale resists overclaiming.** It lists franchises, software, price, brand, timing, and "commercial scale is not causal proof" (`S:627`, `S:641`, `S:653`, `S:665`, `S:690-691`). The discussion question directly asks why success did not guarantee the next success (`S:693-694`).
- **The audience path is shown without a grade** (`U:603-614`, `U:639-643`), which preserves the teaching-case tone.

### 4.2 Defects
- **D-P1 (must-fix): Chapter 3 repeats the synthesis line verbatim and changes its speaker.** `getFeedbackLines` appends `COHERENCE_LINES[key]` (`S:577-582`), then `getBossLines` uses the *same* text as the Chair's substantive line (`S:598-603`). The audience sees the same sentence twice in consecutive phases, first as Mori/Pip/Bolt and then as Chair Shell. This reads as a scripting error and dilutes the Boss's role. It also leaves all six D3/D4 `boss` strings unused (`S:240,257,275,295,313,330`); `getBossLines` reads `option.boss` only for Chapters 1–2 (`S:612-614`).
- **D-P2 (should-fix): The framing pre-signals the historical answers.** The "blind spot" in the 2005 watch-for card (`S:371-375`, rendered `U:433-437`) and the "head-on spending race" constraint point at B; the 2011 watch-for "does the extra screen solve a customer problem, or add a chore?" (`S:417-420`) points against B; three of four 2005 advisor lines discourage the power race (`S:377-398`); all four 2011 advisor lines are cautionary (`S:422-443`); and three of four 2016 advisor lines endorse one-library/hybrid or instant-join/split (`S:467-488`). Combined with the glowing `hybrid:split-controls` synthesis (`S:547-551`), the blue-ocean path feels pre-ordained. This weakens neutrality and the finale's reveal. The GDD and skill want contextual evidence, but not a labeled "blind spot" or a one-sided advisor chorus.
- **D-P3 (should-fix): D1 C pre-empts D3 C.** "Play Anywhere" is effectively the Switch hybrid in 2005 (`S:143-161`), with the unqualified benefit "a flexibility no stationary competitor can match" (`S:148-150`) and an unusually affirming boss line (`S:160`). It telegraphs the 2016 Hybrid answer and makes the later vote less novel. The speculative trade-off is present, but the framing should emphasize "appealing but premature" rather than presenting the answer early.
- **D-P4 (should-fix): No explicit Blue Ocean/ERRC scaffold.** The narrative uses "nonplayers" (`S:92`, `S:380`) but never names noncustomers as a framework, value innovation, red ocean, or Eliminate/Reduce/Raise/Create. Learning outcome 5 (`GD:24`) is therefore only implicit. A single briefing/finale "Blue Ocean lens" line or panel would close this gap without adding mechanics.
- **D-P5 (should-fix): Archive comparison is too terse.** The class path shows only "D1 · B · Living Room" (`U:606-611`) and the history card shows the label beside the product (`U:639-643`). Students must remember what their label meant. Show the chosen option's one-line detail or a short "your option said..." phrase beside each product; `getDecisionLabel` (`S:506-509`) currently returns only the short label.
- **D-P6 (minor): D4 A overlaps earlier options.** "Maximum Performance" repeats D2 A and D3 A thematically, reducing the sense of a new 2016 trade-off. It remains a legitimate choice, but the option card could distinguish it more sharply (e.g., performance *specifically in handheld mode*).
- **D-P7 (minor): D4 B's card wording assumes a screen-bearing chassis.** "Two compact side controllers detach from the system" (`S:305-306`) is awkward after a TV-first D3 vote. The coherence line and prototype builder handle it (`S:517-521`; `prototypes.ts:359-382`), but the card itself could say "detachable controllers (or a split pad) work with the chosen chassis."

## 5. Archive, labels, replay/reload, and audience instructions

### 5.1 Good
- **Archive is truly gated.** The seal screen precedes the archive (`U:356-358`, `U:567-585`); the archive only renders after "Break the seal" or a presenter command. Reloading during the finale resets the UI-local `archiveOpen` to false (`U:242-249`), so a refresh returns to the seal rather than skipping the reveal. This protects narrative integrity.
- **Labels are persistent through build and reveal** (`U:510`, `U:523`, `U:538`) and are not hidden when the scene is skipped (`U:1191-1201`; state-only fallback `U:890-897`).
- **Skip/replay is state-safe.** Skipping calls `FACTORY_FINISHED` and enters feedback without duplicating the animation (`ST:212-222`; `U:1191-1201`). Replaying only restarts the scene animation; it does not alter votes (`U:965-969`). Reload during factory restarts at idle with both votes intact (`CP:121-145`); reload during voting preserves the committed vote and reopening selection (`CP:151-157`).
- **Audience instructions are present and clear.** Title aside: "hands-up votes," "Count hands," presenter records with V (`U:404-407`); voting footer: "Audience votes by hand. Presenter selects the majority with 1–3, then records with V. There is no scoring or 'correct' card" (`U:492`); presenter shortcut list (`U:867-874`). The title correctly advertises 3 chapters, 4 votes, 3 fictional reveals (`U:398-403`).
- **Reset is confirmed and returns to the title** (`U:1217-1227`); "Run the case again" from the archive uses the same confirmation (`U:669`, `U:985-987`).

### 5.2 Problems
- **R1 (must-fix): Placeholder "A" votes can appear in the archive as genuine audience choices.** `jumpChapter` fills missing earlier votes with `'A'` (`ST:167-170`; disclosed in a toast/hint at `U:1206-1211`, `U:845`), but the finale path and comparison render them as ordinary votes (`U:606-611`, `U:618-622`, `U:639-643`). A presenter who rehearses by jumping to Chapter 3 and later shows the archive will display "A · Power Race" and "A · HD Race" as the board's decisions, which the class never made. This contaminates the exhibit's central "your path vs history" comparison. The state test currently blesses the placeholder behavior (`state.test.ts:212-222`) but does not check archive disclosure.
- **R2 (must-fix): Jumping/revisiting a completed chapter soft-locks the voting screen.** `JUMP_CHAPTER` always enters `briefing` (`ST:150-181`), but a chapter whose decision is already in `choices` yields `getActiveDecision === null` (`ST:59-69`); `renderVoting` then returns an empty string (`U:452-455`), `COMMIT_CHOICE` refuses (`ST:207`), and `handlePrimaryKey` has no voting fallback (`U:1145-1175`). The presenter's documented left-arrow review (`U:1137-1142`) can therefore strand the presentation on a blank screen. This is a code-path finding, not reproduced in a browser in this review.
- **R3 (should-fix): The finale is a simultaneous grid, not the GDD's sequential reveal.** `GD:90` describes names appearing sequentially with event captions; `U:616-648` renders all three cards at once. Comparison is arguably better this way, but it is a design deviation and reduces the reveal's pacing. Also, no per-product event caption/citation is attached to each card (see VF3).
- **R4 (editorial): The archive mixes official figures and interpretation under one "OFFICIAL FIGURES" stamp** (`U:596-600`). The figures are official; the propositions, "weak commercial adoption," and "reached households well beyond..." are teaching interpretation. Add a small "Teaching interpretation" label or split the card sections.
- **R5 (minor): The discussion card merges the primary question and follow-up** (`S:693-694`; `U:664-667`). `GD:96` presents them as a 15–20-second question plus follow-up. Splitting them would pace the closing discussion better.

## 6. Prioritized fixes

### Must-fix — code/runtime defects
- **M1 [CODE + CONTENT] Remove the Chapter 3 boss/feedback duplication and use the unused D3/D4 boss lines.** At `S:598-603`, replace `substantive = COHERENCE_LINES[key]?.text` with the two option-specific challenges, e.g. `[d3Option?.boss, d4Option?.boss]` converted to `{ speaker: 'shell', text }` lines, then keep `S:606` and `chapter.bossClosing`. Leave the coherence line once in feedback (`S:580-581`). This fixes the repeated line, the speaker misattribution, and the dead content at `S:240,257,275,295,313,330` in one change.
- **M2 [CODE] Fix the revisit soft-lock.** Minimal options: in `jumpChapter` (`ST:150-181`), clear the target chapter's and all later decisions when jumping backward, with a presenter hint ("Rehearsal rewind cleared votes from this chapter onward"); **or** add a `phase === 'voting'` fallback in `handlePrimaryKey`/`renderVoting` that continues to feedback/factory when `getActiveDecision` is null. Do not leave a blank voting screen reachable by a documented shortcut.
- **M3 [CODE + CONTENT] Stop displaying placeholder votes as real board choices.** Simplest: remove the fill at `ST:167-170` and show "Not voted" in the archive for skipped chapters (the Chapter 3 factory only needs d3/d4, so the fill is unnecessary for factory validity). If placeholders are retained, add a persisted `placeholderChoices` flag and render "(rehearsal placeholder)" in `U:606-611`, `U:618-622`, `U:639-643`, and exclude them from "your path."

### Should-fix — tests and content
- **S1 [TEST] Close the leak-test gap.** `TEST:15-25` omits `OPENING_LINES` and all UI template strings; `TEST:76-93` therefore cannot catch a future product-name/number leak in the opening or title/voting copy. Add `OPENING_LINES` to the fixture and add a browser/QA assertion that `Wii|Wii U|Switch|Joy-Con|GamePad|101.63|13.56|156.59` are absent from the DOM before the archive opens. Also add a regression test that no sentence appears in both Chapter 3 feedback and boss phases, and a test for revisiting a completed chapter.
- **S2 [EDITORIAL] Neutralize the framing skew.** Reword the 2005 "blind spot" to a question ("Who is not at the table?"), keep the power-race constraint but add a pro-A advisor line ("The spec race is the language retailers and publishers already speak"), and add at least one genuine advocate for the conventional options in 2011 and 2016. The goal is real debate, not a pre-announced answer.
- **S3 [EDITORIAL] Reframe D1 C.** Keep the option, but make the headline trade-off feasibility-first ("The right idea, a decade early?") and remove the unqualified "flexibility no stationary competitor can match" (`S:148-150`). This preserves the speculative choice without pre-empting D3 C.
- **S4 [EDITORIAL] Add a Blue Ocean/ERRC lens.** One line in the 2005 briefing and one finale panel using Eliminate/Reduce/Raise/Create and "noncustomers" would make learning outcome 5 explicit (`GD:24`) without changing mechanics. Cite the HBR reading or the INSEAD cases.
- **S5 [EDITORIAL] Attribute the 2011 lead to the real timeline** (`S:413`) and, if desired, use "Nintendo's actual last system" once in the 2011 brief. This prevents an audience that voted A/C from reading fixed history as its own consequence.
- **S6 [EDITORIAL] Soften the Wii demographic claim** (`S:637`) and label archaeological interpretation separately from official units. Consider "Nintendo aimed Wii beyond the traditional core; the INSEAD case examines that noncustomer story."
- **S7 [EDITORIAL] Expand the archive comparison** to show the chosen option's meaning, not only "D1 · B · Living Room" (`U:606-611`, `U:639-643`). A one-line detail from `DecisionOption.detail` beside each historical product would make the comparison teachable without grading.
- **S8 [EDITORIAL] Add "illustrative" to the opening or title note.** `GD:115` asks for "illustrative," "hypothetical," and "fictional executive dialogue"; the latter two are present (`S:97`, `U:391`), "illustrative" is absent.
- **S9 [EDITORIAL] Separate the discussion question and follow-up** (`S:693-694`; `U:664-667`) to match the GDD's pacing.

### Must-verify before class — factual, not code
- **V1** Verify 156.59M and the "Original Nintendo Switch" family definition against Nintendo IR; update `S:657-664`, `S:669-673`, and `TEST:66-73` together if needed.
- **V2** Verify the June 30, 2026 date is the latest published quarter at presentation time and that all three figures are from the same reporting date.
- **V3** Confirm the Wii audience-expansion wording is supported by the cited INSEAD case, not merely inferred from unit sales (`S:637`).

## 7. Verification limits
This review is static: I read `GAME_DESIGN.md` in full, `TECHNICAL_SPEC.md`, `CLAUDE.md`, the `nintendo-game-design` skill, the story/state/checkpoint/types/store modules, the UI, prototype builder, and tests. I did not run `npm run dev`, the test suite, or a browser session, and I did not access external sources. The soft-lock (R2) and placeholder exposure (R1) are code-path findings that should be reproduced in the browser before being marked fixed. All structural counts, labels, and final figures are verified against the source text as cited.
