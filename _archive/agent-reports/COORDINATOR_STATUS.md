# Coordinator Status — Parallel Review

**Date:** 2026-10-21 22:50 PT  
**Mode:** Review-only session alongside the live implementation worker. No source, test, configuration, asset, or project-document changes were made by this session. The only writes are the four reports in `agent-reports/`.

## Artifacts

| Report | Scope | Lines |
|---|---|---|
| [`QA_REVIEW.md`](QA_REVIEW.md) | Code-grounded test plan, confirmed defects, coverage gaps | 101 |
| [`CHARACTER_INTEGRATION.md`](CHARACTER_INTEGRATION.md) | Current avatar coupling, GLB adapter contract, migration sequence | 155 |
| [`STORY_REVIEW.md`](STORY_REVIEW.md) | 3 chapters/4 votes, history-fiction boundary, pedagogy, finale | 129 |
| `COORDINATOR_STATUS.md` | This consolidated status | — |

## Overall assessment

The experience is structurally complete and the narrative boundary is sound, but it is **not yet signed off for classroom use**.

**Verified by the reviewers**
- Exactly 3 chapters (2005/2011/2016), exactly 4 votes (1/1/2), and exactly 3 options per vote. Chapter 3 correctly waits for both D3 and D4 before one factory reveal.
- Product names, launch years, and sales figures are confined to the finale/archive. The exact simulated-concept label is present during build and reveal. Big Boss lines remain qualitative. No divergent history path or fabricated numeric market outcome was found.
- `npm test`: **30/30 passed** across 3 files (735 ms).
- `npm run typecheck`: **passed** (`tsc --noEmit`, exit 0).
- The archive facts match `GAME_DESIGN.md`: Wii 2006 / 101.63M; Wii U 2012 / 13.56M; Original Nintendo Switch 2017 / 156.59M as of June 30, 2026.

**Not verified**
- `npm run build`, `npm run preview`, a current full browser walkthrough, offline/subpath behavior, and FPS on the target laptop were not executed by this review session.
- The only browser screenshots are from 22:42–22:44, use reduced motion, cover one branch, and have no assertions. They predate the latest source edits. The built `dist` is older still (22:37).
- There is no runnable Playwright suite: `package.json` has `test:e2e`, but no `playwright.config.*` or e2e specs were found. The ad-hoc walkthrough logs console errors but does not fail on them.
- No GLB loader/`createAdvisor` adapter exists; only synchronous procedural advisors and an all-scene WebGL fallback. This is expected for the overnight scope but blocks the planned Tripo3D integration test.
- No `README.md` or `BUILD_STATUS.md` existed at coordinator close. The implementation worker was still active.

## Consolidated priorities

### P0 — fix before classroom sign-off

1. **Presenter re-entry dead end.** Jumping back to a chapter whose vote is already committed enters `briefing`, then reaches `voting` with `getActiveDecision() === null`; `renderVoting()` returns an empty string and the presenter is stranded. Both QA and story review independently confirmed this. Evidence: `src/core/state.ts:59-68,150-181,204-208`; `src/ui/ui.ts:452-455`. Add a regression test.
2. **Rehearsal placeholder votes contaminate the finale.** `jumpChapter()` fills skipped earlier votes with `"A"` (`state.ts:167-170`), and the archive renders them as real board choices without a marker (`ui.ts:606-611,618-622,639-643`). Either remove the fill and display "Not voted", or persist an explicit placeholder flag and exclude/mark it throughout the comparison.
3. **Obtain fresh, assertion-based end-to-end evidence on the current source.** Run the canonical four-vote flow, archive checks, refresh/reset, factory skip, and console/page-error collection against the final snapshot. Then run `npm run build`, `npm run preview`, and an offline/subpath check. Unit tests and stale screenshots are not enough to claim the classroom flow is verified.

### P1 — should fix or explicitly accept

- **Chapter 3 repeats the same synthesis sentence twice.** Feedback appends the D3×D4 coherence line; the boss phase then reuses the identical text under Chair Shell. All six D3/D4 `boss` strings are unused (`src/core/story.ts:577-582,598-603,240/257/275/295/313/330`). Use the option-specific Boss lines or a fresh integration line.
- **Factory replay is not represented in state.** The UI calls `scene.replayFactory()` without `FACTORY_STARTED`; the card remains “ASSEMBLY COMPLETE”, the Skip control stays absent, and reduced-motion replay still runs the full animation (`ui.ts:965-969`; `scene-director.ts:194-197`; `factory.ts:510-514`).
- **Projection typography misses the documented 24 px benchmark.** Choice detail/trade-off, factory, and archive supporting copy computes to roughly 8–16 px at 1920×1080 (`src/style.css:1042,1059,1198-1204,1280-1284,1895,1926`). Test the actual projector at 3–4 m and 1366×768/1024×768 before deciding how much to enlarge.
- **No automated browser suite.** Add a minimal Playwright config plus one canonical story spec and one resilience spec (jump, reload, factory skip, WebGL fallback). The QA report includes exact selectors and steps.
- **Presenter drawer focus containment** is absent (`role="dialog" aria-modal="true"` without inert/Tab containment). Lower priority than the story blockers.
- **GLB integration is design-only.** Follow the adapter/migration sequence in `CHARACTER_INTEGRATION.md`; do not await model loads in `Boardroom`, keep the procedural fallback, and validate one fox GLB before adding the other four. No Tripo/download/paid action was taken.
- **Narrative editorial work:** briefings pre-signal historically closest options; D1 “Play Anywhere” pre-empts the 2016 Hybrid choice; no explicit Blue Ocean/ERRC/noncustomer scaffold; archive comparison shows labels without the option’s meaning. These are refinements, not story-flow defects.

### Must verify before class (factual, not code)

- Confirm 156.59M against Nintendo IR and whether the figure is the Switch **family** total rather than the original model alone; the label “Original Nintendo Switch” may overstate model-level precision.
- Confirm June 30, 2026 is the latest published quarter at presentation time and that all three figures share the same reporting date.
- The Wii “households beyond the traditional core” claim is a teaching interpretation, not a units-source fact; cite the INSEAD case or soften the wording.
- No independent external fact-check was performed in these reviews.

## Report-level notes

- **QA:** emphasizes confirming the presenter-jump failure in-browser, adding an assertion-based suite, and regenerating screenshots after source freeze. It lists exact tests for the canonical flow, archive sealing, refresh/checkpoint/reset, factory skip/replay, nine D3×D4 combinations, viewports, WebGL fallback, GLB fallback (deferred), and performance/offline.
- **Character:** current `AnimalAvatar` and `Boardroom` are synchronous and camera-coupled to a stable root; the report proposes a synchronous slot with immediate procedural fallback and an async, non-blocking GLB upgrade, plus `SkeletonUtils.clone`, clip mapping, asset provenance, and a seven-step non-destructive migration. It is a future plan, not implemented source.
- **Story:** structural contract PASS; history/fiction boundary PASS in substance; three must-fix items are the chapter 3 duplicate line, the presenter revisit dead end, and placeholder votes in the archive. Editorial and factual-verification lists are separated from code defects.

## Coordination note

The review snapshot is source as of approximately 22:45 PT. The implementation worker subsequently touched `style.css`, `ui.ts`, `checkpoint.ts`, and tests (latest observed 22:49:58). A coordinator spot-check at 22:50 found the `jumpChapter()` behavior and the duplicated Chapter 3 boss line still present, but line numbers may move. Re-read each cited location before patching and rerun all verification after the implementation freeze.

**Release recommendation:** not ready for classroom sign-off until the presenter re-entry dead end, archive placeholder disclosure, and fresh browser/build/offline verification are complete. The three-chapter narrative and finale facts themselves are in good shape.
