# NINTENDO: THE NEXT BLUE OCEAN
## Game Design Document (GDD) — 24-Hour Production Scope
**Version:** 1.0 | **Date:** 2026-10-21 | **Format:** 10–15-minute presenter-led interactive teaching case

> **Creative premise:** The lecture audience is the board of a fictionalized Nintendo executive team. The presenter operates the browser. Across three historically situated chapters, the class votes on four high-stakes strategic decisions. A whimsical factory assembles a *hypothetical* device reflecting the votes. A fictional Big Boss challenges proposals that diverge from Nintendo's documented history. Only at the end do we reveal the real Wii → Wii U → original Switch products and outcomes.

## 1. Nonnegotiable product contract
- **Presentation format:** One browser tab, played on a laptop and projected. The audience votes by show of hands; **the presenter clicks** the winner. No mobile voting, login, server, cloud API, online AI, or database.
- **Hosting:** Static GitHub Pages or local HTTP server. All images, audio, fonts, and 3D assets are local for offline classroom operation.
- **Length:** Target ~12 minutes; must be completable in ≤15 minutes with timed presentation pacing.
- **Three chapters, four decisions:** 2005 / one decision; 2011 / one decision; 2016 / two decisions. Each has **exactly three** predefined options maximum.
- **Two reusable environments:** Cozy, low-poly fictional **boardroom** and **factory** with robotic arms and a stamping press. Reuse both every chapter, changing dialogue, lighting, props, and assembled device.
- **Visual tone:** Warm, miniature, approachable 3D inspired by the accessibility of cozy Nintendo games. **Original** animal executives, names, models, textures, writing, and audio; do not copy actual Animal Crossing assets or voice samples.
- **Sound:** Locally generated Web Audio 'mumble' or 'babble' from original pitched synthetic syllables triggered by dialogue reveal. Not sampled or cloned Nintendo character voices. Mute and volume controls.
- **Factory:** Pick up 2–3 modular parts, place into assembly area, animate robot arms and a large stamp, reveal the audience's *fictional* prototype. Identical animation across chapters, parameterized geometries and components.
- **Ads:** Optional short prerecorded locally stored videos of **under 15 seconds**. Cut entirely from MVP if time is tight.
- **Truth rule:** Historical facts and official results come only in a closing historical reveal, except for broad contextual chapter briefings needed for continuity. No fabricated counterfactual sales, profits, market shares, or adoption numbers.

## 2. Core learning outcomes
1. Recognize the red-ocean contest over technical performance and the possibility of developing noncustomers.
2. Understand the Wii as a deliberate alternative to the established technology-performance race, supported by control accessibility and shared play.
3. Understand why an innovative element such as the Wii U GamePad does not automatically create perceived buyer value or defensible new demand.
4. Assess Switch's value proposition as home-console plus handheld flexibility and spontaneous local multiplayer, while acknowledging other causes of its success.
5. Distinguish **historical evidence** from speculative design feedback; use Eliminate / Reduce / Raise / Create (ERRC), value-cost alignment, and strategic renewal.

## 3. The fiction-vs-history contract
**Audience timeline** = `audienceVotes` + factory's illustrative prototypes + qualitative advisor trade-offs. These outcomes are explicitly stamped **SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT**.

**Historical timeline** = fixed chronological setting and final reveal; it does not branch. The **Big Boss** (a fictional tortoise chairperson, not a depiction of any real Nintendo executive) uses a gentle executive-veto device: if a vote differs from the documented direction, they note a risk and say the real company made a different choice. They do **not** identify the actual product, give lifetime sales, or disclose the correct option until the finale. If a vote is similar to actual strategy, the boss commends its logic without confirming correctness.

**Crucial sequence:** For each chapter, *briefing → advisors → vote(s) → fictional factory reveal → consequence and Big Boss → historical transition*. Chapter 3 has TWO votes but ONE factory reveal. After Chapter 3, reveal all three real consoles and true outcomes together.

**Narrative continuity:** The audience timeline is not allowed to change history. Chapter 2011 may disclose that Nintendo's preceding product reached new audiences and is facing pressure, but not name Wii or show historical product/sales. Chapter 2016 may disclose the next product struggled and Nintendo needs renewal, but not name Wii U or reveal its numbers. **This is a stylized teaching experience, not a literal reconstruction of board meetings.**

## 4. Characters and tone
- **Hootley (Owl), Consumer Insight:** Knows the people who *do not* play, careful and thoughtful. Reactions: observes, points to charts, raises eyebrow.
- **Slyvester (Fox), Marketing:** Energetic, brand-focused, loves a big reveal. Reactions: cheer, rapid talking, shocked glance.
- **Damian (Beaver), Engineering:** Proud inventor; flags battery, processing and production trade-offs. Reactions: nod, head scratch, inspect parts.
- **Pawson (Bear), Finance:** Calm and cost-sensitive; flags implementation and risks. Reactions: fold arms, nod, skeptical blink.
- **Chair Shelldon (Turtle), Big Boss:** Friendly but decisive and sometimes funny. Acts as a historical continuity mechanism, not a correct-answer announcer.

Character dialogue: 1–2 concise sentences per bubble, 10–28 words, with speaker name and readable rounded type. Lines reveal automatically in under one second and hold until click/Space; a click while revealing completes the line instantly, and a later click advances. Never auto-advance. Synthetic mumbling is subtle and interruptible.

## 5. Scripted chapters and choices
### Opening (30–45 seconds)
Wide camera shot of a low-poly boardroom. A framed company timeline has its product names covered by paper slips. The presenter is introduced as the new strategic committee chair. Chair Shelldon says: “Welcome to the board. Three major product launches, four choices, and no time machine. Let's see how your strategy compares with history.” On-screen note: **Fictional meeting, historical strategic dilemmas.**

### Chapter 1 — 2005: The Console Wars (~2.5–3 min)
**Briefing:** Conventional home consoles compete on graphics and processing power. Nintendo has fewer previous-generation hardware sales than the market leader. Many people find controllers and game conventions intimidating.

**Decision D1: Where should the next platform compete?**
- **A: The Power Race** — Invest in advanced graphics, media features, and big-budget games. **Benefit:** clear appeal to established enthusiasts. **Trade-off:** greater investment and head-to-head rivalry. **Factory module:** wide black tower with cooling fins / conventional controller.
- **B: Open the Living Room** — Build approachable controls and active family participation. **Benefit:** invites lapsed/nonplayers. **Trade-off:** uncertain response from core gamers and motion-control execution risk. **Factory module:** small compact body + playful gesture controller. **Historically closest to Wii's direction**, but do not mark this until the finale.
- **C: Play Anywhere** — Merge portable and home use early. **Benefit:** greater flexibility. **Trade-off:** 2005-era screen, battery and performance constraints; feasibility is speculative. **Factory module:** portable integrated-screen console.

**Post-factory trade-off:** Show one meaningful customer utility benefit and one cost/implementation concern selected from the option; no scores. Chair Shelldon: “Intriguing prototype. But strategy isn't just what we can build; it's whose problem we solve. Keep that thought. The actual decision stays sealed until our final report.”

**Chapter transition, no history reveal:** “The company's next system brought a different kind of household into the conversation. A few years later, new alternatives began competing for attention.”

### Chapter 2 — 2011: Success Creates a New Problem (~2.5–3 min)
**Briefing:** A distinctive interactive system has enjoyed major success, but momentum is challenged by smartphones, tablets, and changing play habits. How should the follow-up offer new value?

**Decision D2: What should the successor emphasize?**
- **A: Join the HD Race** — Increase technical specifications and court dedicated console enthusiasts. **Benefit:** aligns with traditional premium-game expectations. **Trade-off:** costly direct competition. **Factory module:** taller chassis + advanced controller.
- **B: Reinvent the Second Screen** — Make a tablet-like controller the distinctive feature of shared living-room gameplay. **Benefit:** new asymmetrical play and off-TV uses. **Trade-off:** cumbersome communication and reliance on a nearby base console. **Factory module:** stationary console + oversized touch controller. **Historically closest to Wii U's GamePad approach.**
- **C: Go Fully Portable** — Combine handheld portability with a broader game library. **Benefit:** higher mobility. **Trade-off:** cost, battery, graphics and software portfolio complications for that moment. **Factory module:** handheld console.

**Post-factory trade-off:** Avoid saying 'this will fail'. Highlight that novelty, customer utility and effective communication differ. Chair Shelldon: “A feature can be impressive and still be hard for customers to explain. Will people know why they need your product?”

**Chapter transition, no history reveal:** “The real successor struggled to sustain the earlier system's momentum. Nintendo now faced another chance to reconsider the entire category.”

### Chapter 3 — 2016: Redefine the Platform (~3.5–4.5 min)
**Briefing:** A recent successor underperformed. The industry has changed. The next launch needs a compelling value proposition spanning how and where games are played.

**Decision D3: Where does gaming happen?**
- **A: TV-First** — Home console only. **Benefit:** focused design and sustained living-room performance. **Trade-off:** tethered to TV and room.
- **B: Handheld-First** — Fully portable device only. **Benefit:** convenience and travel use. **Trade-off:** gives up effortless big-screen experience.
- **C: Hybrid** — Dock for TV; take the same system on the go. **Benefit:** flexibility without splitting the software experience. **Trade-off:** performance, battery, and form-factor compromise. **Historically closest to Switch.**

**Decision D4: What should design resources prioritize?**
- **A: Maximum Performance** — Advanced graphics and high-end features. **Benefit:** stronger conventional benchmarks. **Trade-off:** cost, energy and size constraints.
- **B: Instant Shared Play** — Split controllers for local multiplayer and flexible play modes. **Benefit:** low-friction social participation. **Trade-off:** controller durability, complexity, and design constraints. **Historically closest to detachable Joy-Con.**
- **C: Motion-First Revival** — Maximize gesture-based group play. **Benefit:** distinctive accessible physical play. **Trade-off:** potential narrowing of audiences and less focus on broad core titles.

**Factory recipe:** D3 chooses chassis/body, dock/screen arrangement. D4 chooses controller/accessory module. The factory uses the same staging for all nine combinations; variations are compositional, not nine custom models.

**Post-factory trade-off:** Advisors point out whether the combination is coherent (e.g., handheld-only + maximum performance imposes clear trade-offs) without assigning a single correctness number. Chair Shelldon: “The best strategy is not the most features. It's a value proposition whose choices work together.”

### Finale — The Sealed Nintendo Archive (~2–3 min)
Curtain rises / whiteboard slides open. Real product names appear sequentially with photographs or stylized factual silhouette, original event captions and citations:
1. **Wii (launched 2006):** accessible motion-controller proposition, Wii Sports social demonstrations, expanded gaming participation; **101.63 million** lifetime hardware units.
2. **Wii U (launched 2012):** tablet-like GamePad and off-TV features; weak commercial adoption and messaging difficulties; **13.56 million** lifetime hardware units.
3. **Original Nintendo Switch (launched 2017):** home + handheld hybrid, detachable Joy-Con, local shared play; **156.59 million** hardware units as of June 30, 2026.
**Critical note:** Sales show commercial scale, not causal proof of Blue Ocean theory or the count of new noncustomers. Nintendo's franchises, software and brand also mattered.

Show the class's saved choices beside the historical strategies, but no pass/fail grade. Finish with a 15–20-second discussion question: “Did Nintendo win by building a better machine, or by changing what people wanted from a machine?” Follow-up: “Why didn't its first success automatically guarantee the next?”

## 6. Art direction and interaction style
- **Cozy, but original:** low-poly animal silhouettes, warm materials, pastel palette, rounded furniture, oversized props, soft shadows, original typefaces and UI frames.
- **Boardroom:** 1 miniature room, 1 oval table, 5 seated animal characters (only speakers animate), timeline board, three props hinting at gaming markets. Orthographic/three-quarter fixed camera, only occasional gentle push-in.
- **Factory:** 1 enclosed room, conveyor/platform, two articulated robotic arms, stamping press, 3–6 reusable components. Dramatic, short, repeatable choreography (~7 seconds). One reveal stage; keep a clear 2D label `AUDIENCE CONCEPT / NOT HISTORICAL`.
- **Dialogue:** animal vocal blips synthesized live; no copyrighted Nintendo voice recordings or near-matching character samples. Click/space skips typing instantly; second click advances.
- **Emotion:** eye blink, head bob, ear twitch, squash/stretch, emoji-shaped thought icons. Avoid ragdolls, crowd AI, exploration and physics.
- **Accessibility:** HTML text outside WebGL for legible projection; subtitles always on; sound optional; safe color contrasts, avoid red/green-only meaning; user can pause/skip animations.

## 7. Presenter controls and class operations
- Click selected choice after audience show-of-hands vote; show/hold choices until voting ends.
- Keyboard shortcuts: `Space/Enter` dialogue advance/complete; `1/2/3` select; `V` commit selected vote; `F` toggle fullscreen (when permitted); `M` mute; `S` skip current animation; `R` restart; `Esc` close overlay; arrow keys for chapter navigation in protected presenter mode.
- Persistent, small **Presenter** menu: Jump to chapter, restart current scene, rewind dialogue, skip animation, mute, show finale only, reset entire demo. Require confirmation to reset all.
- Prefer a simple presenter-mode toggle to prevent accidental chapter-jumping by the audience.
- Each chapter should recover after an unexpected refresh. Auto-save choices and progress to `sessionStorage`; include a one-click Reset Demo.

## 8. Content accuracy and labeling
- Facts in final captions require visible citations and a source list. For console lifetime totals use Nintendo official figures with **As of June 30, 2026** label.
- Use the words “illustrative”, “hypothetical”, and “fictional executive dialogue” in the opening and prototype labels. No simulated numbers for profit, console demand, or pricing.
- In 2011, **Wii U GamePad off-TV play was not fully portable**; avoid suggesting it functioned like Switch outside console range.
- In the Switch discussion, note that the hybrid idea was not the world's first portable game device; the market move was the coherent combination of modes, software and controls.
- Do not imply Blue Ocean Strategy was the only reason for Nintendo's results.

## 9. MVP vs stretch scope
### Character asset direction (Tripo3D, later integration)
The final five original animal executives (Fox, Owl, Beaver, Bear, Turtle) are intended to be generated with **Tripo3D**, using a shared style reference and neutral A-pose. Rig/animate before optimizing; export tested GLB files and integrate via an advisor adapter with procedural fallback. Facial expressions and speech cues must degrade gracefully without blendshapes. **Character generation itself is not part of the 24-hour critical path.** Preserve full playability with placeholder animals. See `ASSET_PIPELINE.md` for complete art, rigging, texture, import, QA and licensing workflow. Boardroom/factory machinery and prototypes remain primarily procedural; no free-roaming or click-to-walk in MVP.

### Must ship in 24 hours
1. Story and choices function end-to-end (4 votes, 3 chapters).
2. Two simple 3D sets: boardroom and factory.
3. Original procedural animal **fallbacks** with 2–3 expressive actions, and modular character slots compatible with later Tripo3D GLB replacement.
4. One reusable mechanical assembly and stamp sequence, 3 factory outputs (chapter 3 modular based on both votes).
5. Presenter controls, mute, skip, restart, finale comparisons and accurate cited facts.
6. GitHub Pages **and** local browser build tested with no network.

### Only after must-ship tests pass
- Additional decoration; more nuanced animation; voice timbres/emotes; sound polish; optional 10–15-second prerecorded ad per chapter; custom 3D modeled console shells; screenshot gallery; mobile compatibility.

### Explicitly excluded
Live polls, multiplayer, login, backend, physics simulation, complex character rigs, open-ended product builder, numerical market simulation, runtime AI generation, exact Animal Crossing assets, and 9 hand-built final-chapter consoles.

## 10. Acceptance criteria
- All three chapters and the complete finale can be demonstrated within ≤15 minutes, repeatedly, without internet access.
- All 3 choices of each of the first 2 decisions and all 9 combinations of the final 2 decisions can produce a meaningful factory prototype without errors.
- Every branch returns to an accurate historical timeline. No reveal of product names/real lifetime sales before the finale.
- Factory animation can be skipped and replayed; no overlapping animation loops or dialogue race conditions.
- Browser reload does not corrupt state; presenter can reset quickly.
- No misleading historical numbers, external service dependencies, recognizable copied Nintendo audio, or unlicensed models.

## 11. Sources and evidence inventory
1. Nintendo official lifetime console totals (June 30, 2026): https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html
2. Kim, Mauborgne & Hunter, Wii/noncustomers teaching case: https://publishing.insead.edu/case/nintendo-wii-lessons-learned-noncustomers
3. Kim, Mauborgne & Olenick, Wii U/Switch case: https://publishing.insead.edu/case/nintendo-switch-shifting-market-competing-market-creating-strategy
4. Iwata's 2006 strategic public remarks, contemporary transcript: https://nintendoworldreport.net/news/11480/nintendo-media-briefing-speech
5. Nintendo investor presentation on gaming population, 2009: https://www.nintendo.co.jp/ir/en/events/090508/02.html
6. Nintendo Switch 2017 official release: https://www.nintendo.co.jp/corporate/release/en/2017/170113.html
7. Assigned HBR article: Kim & Mauborgne, “Blue Ocean Strategy,” *Harvard Business Review*, October 2004, especially value innovation, noncustomers, and strategic-move unit of analysis.

**Source caveat:** INSEAD webpage abstracts support interpretive teaching claims; full paid case text was not used or reproduced. All fictional vote outcomes are author-created instructional hypotheses, not assertions about Nintendo's actual board meetings or unbuilt products.