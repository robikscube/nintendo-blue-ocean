# Welcome Screen Refinement — Approved Title Asset and Start Prompt

**Requested:** 2026-10-22
**Status:** RECORDED / NOT IMPLEMENTED
**Game:** `blue-ocean-game/`
**Owner:** Existing Claude Code UI implementation lead; CSS owner for layout.
**Scope:** Welcome/title screen **only**. No background generation, no scene changes and no changes to game mechanics.

## User-provided reference and approved visual

- **Reference screenshot 1:** Existing Nintendo Blue Ocean welcome screen with blue cross-outs over unnecessary explanatory copy, credits and right-hand statistics panel; music credit explicitly excluded from deletion.
- **Reference screenshot 2:** Animal Crossing title screen showing the title emblem in the **upper central area** and the simple **Press A** action in the **lower center**. Use only as composition/layout inspiration, not as a source for licensed game imagery.
- **Approved generated logo panel:** `the_next_blue_ocean_badge.png`, created and approved in ChatGPT on 2026-10-22. It is a transparent RGBA 1672 × 941 PNG, depicting an original wooden classroom notice-board sign reading **“The Next Blue Ocean”**, with **“Nintendo”** in small letters at the upper-right paper tab. It has already been generated and approved. **DO NOT regenerate it, do not use a generic substitute, and do not rebuild its main lettering in HTML.**
- **Asset handoff note:** At task-recording time this file is **NOT yet present in the project's `public` assets** or Downloads folder. The producer must transfer the approved PNG from its ChatGPT attachment/download before integration. Expected destination: `blue-ocean-game/public/assets/ui/the-next-blue-ocean-title.png`. Do not falsely claim it has been installed. The user can download the previously generated PNG directly from the ChatGPT conversation, then save it under that destination. Do not modify the PNG or reproduce it with CSS.

## A. Title layout — follow Animal Crossing reference image

Place the approved title graphic **horizontally centered in the upper-middle portion** of the welcome screen, occupying the analogous visual role to the large Animal Crossing logo.

Starting responsive geometry for 16:9:
- Horizontal center around **50vw**; max rendered image width around **min(65vw, 900px)** on 1920×1080, tune by browser screenshot so it is clearly legible and does not cover the entire boardroom cast.
- Top edge around **5–10vh** and bottom around **40–47vh**, maintaining image intrinsic aspect ratio and transparent alpha. Use `object-fit: contain` without cropping. A gentle entrance/fade is optional but should not obscure image detail.
- Preserve the low-poly 3D boardroom background and character visibility. **Do not generate or substitute a new background.**
- Title image is decorative visually but the welcome screen must remain accessible: provide an image `alt="The Next Blue Ocean — Nintendo"`, or a separate visually-hidden semantic `h1` for screen readers. Avoid duplicate large live typographic headings.
- Visual scale should be reviewed at **1920×1080** and **1366×768**, optionally 1024×768; it should remain legible without obscuring Start.

## B. Start prompt — position like “Press A”

Replace `Enter the boardroom` with exactly **Start**, positioned in the **lower center**, in the approximate visual zone occupied by the reference's “Press A” call-to-action.
- Suggested center x=50vw, y=**86–91vh** (above bottom safe margin), with an unobtrusive transparent/soft-dark pill or text-button background as needed for contrast.
- Make it a real native accessible `<button data-action="start">` with keyboard Enter/Space support and existing activation logic preserved. Do not embed Start text into the title asset; it is an interactive DOM control.
- Use the game’s approved rounded font, high contrast, a medium-large projector-friendly label. An extremely small keyboard/controller glyph is optional; the visible primary text must be **Start**.
- Do not keep the original big left-aligned gold **Enter the boardroom** CTA, and do not use an additional redundant Start CTA elsewhere.
- Consider safe placement for browser bottom bars/Windows taskbar; no overlap with music credit.

## C. Remove blue-crossed UI clutter; retain music credit

Remove from `renderTitle()` *on the welcome page only*:
- Eyebrow “A PRESENTER-LED STRATEGY CASE · 10–15 MINUTES”
- Extra standalone “NINTENDO” label and the original live serif title block (replaced by asset)
- Descriptive paragraph starting “You are the board. Four votes decide...”
- `Presenter guide` text button
- Disclosure paragraph beginning “Fictional executive dialogue. Audience concepts...”
- Entire right-hand `title-aside` session overview: 12 min panel, 3 chapters, 4 hands-up votes, 3 hypothetical reveals, 1 archive, and “IN THE ROOM” presenter instructions
- Any other blue-crossed welcome copy from the screenshot

**Retain the existing music-credit line with its live hyperlinks and attribution**, including artist/license. Position unobtrusively bottom-left with sufficient contrast. Do not accidentally remove credits from other screens or change audio license compliance.

The existing global HUD cleanup task (removing top-left branding and replacing the Presenter label with a gear icon) applies on the welcome page as well; **do not restore top-left HUD copy** via this task. Keep functional gear, mute, fullscreen, and any other necessary controls.

## D. Implementation boundaries / dependency management

Observed live source before implementation:
- `blue-ocean-game/src/ui/ui.ts` `renderTitle()` near lines 410–447 includes the old title block, text, Start action, credits, and session overview.
- `blue-ocean-game/src/style.css` around `.title-screen`, `.title-column`, `.title-lockup`, `.title-actions`, `.title-credit`, `.title-aside` near lines 635 onward.
- Use the same state transition triggered by `data-action="start"`, no changes to chapters/votes/factory/dialogue/history.
- **UI lead exclusively owns `src/ui/ui.ts`.** Coordinate with existing HUD/factory/vote/transition assignments in `UI_REFINEMENT_TASK_2026-10-22.md` and `UI_REFINEMENT_ROUND2_VOTE_TRANSITION.md` before changes. **Do not spawn a second agent that also edits this file.**
- **CSS specialist exclusively owns `src/style.css`.** After UI markup contract is agreed, CSS specialist implements welcome screen layout. Do not edit CSS concurrently.
- **Read-only QA specialist** checks position at projected resolutions, image loading offline, proper alpha/transparency, Start interaction and keyboard behavior, and music credit presence; report under `agent-reports/ui-refinement/WELCOME_QA.md`. QA may create new tests but may not edit existing `ui.ts` or `style.css`.

## E. Acceptance tests

1. At 1920×1080 and 1366×768, the approved wooden Next Blue Ocean title panel is **centered and high**, compositionally similar to the reference logo's placement; no other large title text appears.
2. No blue-crossed descriptive lines, presenter guide, or right-side statistics card remains on welcome screen.
3. Music credits remain visible and links work.
4. The exact visible word **Start** appears lower center, like the reference's Press prompt, and activates the original first boardroom transition with mouse and keyboard.
5. Existing 3D background unchanged; no generated image used for anything else.
6. Global HUD controls function as before; new heading logo has no clickable overlay that blocks gear/mute/fullscreen.
7. Tests: `npm run build`, applicable existing tests, and Playwright screenshot review. Update exact-string assertions deliberately.
8. Completion report: `agent-reports/UI_WELCOME_REFINEMENT.md` with actual asset installed path, source changes, screenshots, test outcomes, and any unsatisfied acceptance condition.

**Approval gate:** The approved title graphic is already accepted. Integrate it when the actual image file is available; do not replace it with an invented image or silently omit it.
