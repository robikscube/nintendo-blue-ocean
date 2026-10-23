# Round 1 Playtest Feedback — Nintendo Boardroom UX & Character Dialogue
**Priority:** P1–P5 from presenter playthrough, 2026-10-22. **Status:** Requirements / implementation assignment, NOT completed code. **Owner:** Claude Code interactive team; lead owns integration, delegate to UI, narrative, and camera specialists with exclusive file ownership. **Supersedes** any previous requirement that blocks these changes; does not change the three-chapter/four-vote structure.

## Evidence: three reference screenshots supplied in ChatGPT
- **Reference A / first uploaded picture:** *Animal Crossing: New Horizons* — cheerful three-dimensional characters, an organic rounded ivory speech balloon, detached colored oval speaker name tag, dark friendly lettering, minimal chrome, low triangular/teardrop continue marker.
- **Current game / second uploaded picture:** The boardroom currently has five animals clustered around a table and a large rigid **dark rectangular** bottom dialogue HUD, including an oversized monogram, role label, phase label, numbered progress, and CLICK OR SPACE.
- **Reference B / third uploaded picture:** Earlier *Animal Crossing* speech UI — a **semi-transparent dark, softly irregular organic/oval speech bubble** with a clear light outline, a separate pastel-colored name tab, large clean light dialogue lettering, and a small orange downward continue triangle. Background scene remains visible through the dialogue bubble.
- **Design resolution:** Use **the transparent dark fill and white/light organic bubble silhouette from Reference B**, with **the warm roundness, floating name pill and generous friendly text hierarchy of Reference A**. DO NOT implement the current opaque black rectangle or copy Nintendo-owned textures/UI image files. Recreate an ORIGINAL CSS/SVG form inspired by overall interface principles, with distinct shape/proportions. Screenshot images are references supplied by the user in chat, not project assets; do not require their physical presence to implement.

## P1 — Rapid automatic character-by-character text completion (blocking)
**Observed source:** `blue-ocean-game/src/ui/ui.ts` currently has a `setInterval(..., 16)` loop in `startLine()` at about lines 737–763. This uses **pre-authored text from `src/core/story.ts`**. There is NO runtime AI or generated dialogue; the words are being progressively displayed, not generated.
**User problem:** Text does not *feel* complete without clicking to finish it.
**Required behavior:**
1. Reveal dialogue **very quickly and completely with zero clicks**: target 150–220 visible characters/second, plus a hard cap so any ordinary line (up to ~200 characters) is fully displayed **within 1.0 second**, preferably 0.4–0.8 seconds. If the browser throttles timers or the tab loses focus, force full text on a wall-clock deadline; never leave partial text on screen indefinitely.
2. Let the user watch the short reveal for visual charm. Once complete, **hold the entire dialogue until click/Space/Enter**; do not auto-advance to the next speaker. Existing click while typing should instantly reveal the full sentence, with a *second* deliberate click to advance. Guard against the same keydown/click skipping and advancing twice.
3. Prefer a time-based `requestAnimationFrame` or robust timer with `performance.now()` elapsed calculations over a frame-count-based glyph interval. Handle interruptions, hidden tabs, resets, chapter jumps, and `prefers-reduced-motion` (immediate full text). Avoid a visible typing caret lingering after text is complete.
4. Synthetic mumbling should stop when the line finishes; cap sound rate and prevent overlapping notes. Different character delivery rhythms come from audio/motion, **not slower on-screen text**.
5. Optional polish: put small 50–120 ms punctuation beats into voice/emotion, but these must not delay full-text completion or require interaction.
**Acceptance:** At 1920x1080 and 1366x768, 10 consecutive lines fully render within ~1 second each without clicks; then hold indefinitely without auto-advancing. Typing can be skipped; double press does not skip a speaker. Narrator and reduced-motion display immediately.

## P2 — Replace bottom HUD with transparent organic Animal Crossing–inspired speech bubble (blocking)
**Observed source:** `src/style.css` around `.dialogue-panel` and `src/ui/ui.ts` `buildShelldon()` controls currently use an opaque near-black rectangle, left-colored border, monogram-circle sidebar, tiny metadata, serif text and button label.
**Required original styling:**
- A **soft, irregular superellipse / pill-shaped bubble** with rounded lateral lobes and slightly asymmetric contour. Wide low silhouette; **not** a standard 19px-radius card. Implement with a responsive SVG outline with viewBox, CSS `clip-path` / mask + backing border, or carefully tuned multi-radius CSS; preserve readable text and hit areas. Use a light stroke ~3–5px at 1080p, not heavy rectangular borders.
- Translucent smoky charcoal/espresso fill (starting suggestion `rgba(31,27,29,.78)`), not almost-opaque; subtle inner warm highlight, a little background visible **through** the bubble. Keep practical projection contrast: white/off-white `#fff8ee` dialogue text should remain readable against every boardroom scene. If necessary add a subtle inner dark gradient behind text. Avoid intense backdrop blur that hides scene.
- Floating small oval/bean speaker name tag overlapping **top-left rim** of bubble; muted lilac/pink/coral character-specific hues, white/cream bold text. Name tag should not obscure the line itself. Remove the giant monogram circle and species/role micro-label from main bubble; optional role appears elsewhere or briefly on character introduction. Remove redundant phase label and progress numerals from the speech bubble; retain an unobtrusive presenter HUD outside it if needed.
- Large rounded **sans-serif** typeface, casual but lecture-readable (e.g. locally packaged licensed font or CSS system `'Trebuchet MS', ui-rounded, system-ui, sans-serif`); text size responsive ~28–36px for 1920x1080, ~24–29px at 1366x768, mobile minimum ~20px. No fuzzy thin serif. Aim for 1–3 lines, generous side inset and line spacing 1.25–1.38. Keep visible semantic text and accessible text.
- A small golden/amber downward teardrop / triangle at bubble bottom center, gently pulsing **only when the text is complete**. Full bubble/click or Space advances; visible button accessible to keyboard. Do not force the audience to read a literal CLICK OR SPACE line; presenter can see a discreet shortcut hint outside the bubble.
- Fit lower 25–30% of a 16:9 projector image while retaining the characters' faces above the bubble. Center horizontally, roughly 65–80vw width, with max pixel width tuned to text length; avoid text overflow on 1366x768 / 1024x768.
- Enter/exit should gently scale/fade (~180–250 ms) without causing reflow; no exaggerated shakes. Give the bubble a very subtle bob or bounce only at speaker changes.
- Make it original: emulate qualities (shape, transparency, name tab, readability), not exact Nintendo proprietary UI assets or pixel-perfect duplication.
**Acceptance:** Screenshot tests visually show semi-transparent organic outlined bubble, pastel speaker name tab, light readable lettering and golden continue marker; boardroom visible behind; no old rectangular dark box; responsive and keyboard-operable.

## P3 — Distinct anthropomorphic advisor identities, fresh authored script (high)
### Research basis
Animal Crossing villagers are differentiated by eight recurring personality archetypes (e.g., peppy, cranky, lazy, normal, smug), recurring quirks/subject matter, and speech/reaction/voice qualities. Use this as a **design principle**, NOT as a dialogue bank to copy. Sources:
- https://nookipedia.com/wiki/Villager#Personality
- https://nookipedia.com/wiki/Subtype
- https://www.imore.com/animal-crossing-new-horizons-all-villager-personalities
- https://nerdist.com/article/animal-crossing-normal-villagers-appreciation/
**Original dialogue only**; no verbatim Animal Crossing lines, names/catchphrases, character voice samples or actual Nintendo characters.

### Cast personalities — required distinctive voice bible
**Hootley the Owl — Consumer Insight / gentle observer**
- Inspiration: gentle/normal personality with a bookish, quietly odd nocturnal habit. Kind and methodical, empathetic to **noncustomers**. Hears what others overlook. Occasionally catches himself studying people like an owl watching mice; adjusts tiny spectacles / rotates head a little.
- Speech: quiet questions, concrete human vignettes, slightly wry asides, brief bird/late-night metaphors used sparingly. Uses `I asked...`, `Did anyone notice...`, `Who isn't here?`. Does not lecture with textbook buzzwords.
- Joke bank: `I interviewed three grandmothers. They all beat me at bowling.`; `I've been up all night wondering who *doesn't* play. Occupational hazard.`
- Sample lesson line: `The graphics are lovely. But the people I interviewed didn't ask about pixels. One asked, 'Could my dad play with me?'`
- Reaction signature: curious head tilt, slow blink, notebook gesture; warm lilac/soft blue blips at measured pace.

**Slyvester the Fox — Marketing / charming, excitable show-off**
- Inspiration: peppy + a hint of smug; advertising-minded improviser who loves a memorable slogan and believes every big idea needs a demo. Clever, fast, occasionally oversells then corrects.
- Speech: short exciting pitches, rhetorical questions, playful alliteration/slogans, harmless vanity. `Picture this!`, `I can already see the poster...`, `That's catchy, right?`; occasionally references fabulous tail or marketing poster, but avoid repetitive fox puns.
- Joke bank: `I can sell that in six words. Seven if Finance asks for a disclaimer.`; `The name is gorgeous. The audience? ...Still negotiating.`
- Sample lesson line: `Imagine the ad: Grandma bowls a strike. Dad cheers. Nobody asks how many polygons we drew! ...Though Damian will.`
- Reaction signature: bouncing ears/tail, paw gesture, proud turn and self-correction, faster higher babble; avoid making Slyvester only foolish.

**Damian the Beaver — Engineering / obsessive practical maker**
- Inspiration: energetic jock/ambitious maker with unpretentious big-sibling directness. Loves a new mechanism and precise tolerances; gets animated by a good moving part, then raises feasibility caveats.
- Speech: punchy concrete technical analogies, short bursts, `I can build it. Here's the catch...`, playful dam/wood/teeth jokes *once in a while*, not constant. He is creative, not just the voice of no.
- Joke bank: `We can bolt on another screen. We can't bolt another hour onto the battery.`; `I built a prototype from spare parts. And one suspiciously missing chair leg.`
- Sample lesson line: `Two play modes? Fun challenge! But battery, heat, and performance all want the same seat at the table.`
- Reaction signature: enthusiastically taps table, mimes measuring or hammering, teeth showing in concentration, brisk staccato lower-middle blips.

**Pawson the Bear — Finance / gruff, snack-loving softie**
- Inspiration: cranky + lazy, skeptical by habit but protective of the team. Has a secret sweet tooth, watches costs closely, dislikes vague optimism. His barbs should be dry and affectionately funny, never mean to students.
- Speech: compressed deadpan quips, plain financial trade-offs, reluctant compliments; pauses before the punchline. `Show me the bill.`, `Hmm. Define 'affordable'.`, `I do like that. Don't tell anyone.`
- Joke bank: `I approve this budget, provided lunch is included.`; `That controller costs how much? I need a very long hibernation.`
- Sample lesson line: `Two screens, two chargers, one very expensive headache. What does the customer actually gain?`
- Reaction signature: folded paws, eyebrow, long blink, belly sigh and eventual small smile, slow rounded low blips; could tap a honey jar off to side.

**Chair Shelldon the Turtle — Big Boss / kindly strategic judge**
- Inspiration: unhurried sage with soft cranky authority, carefully chosen sentences and gentle teasing. Speaks last, notices weak value propositions without spoiling future history. Not an actual Nintendo CEO.
- Speech: calm aphorisms, measured contrast, subtle turtle/time jokes occasionally; rhetorical question or wry wisdom and warm final redirect. Not academic textbook voice, not moralistic.
- Joke bank: `I have patience. Our investors have somewhat less.`; `I've lived through three console wars. Please don't start a fourth before lunch.`
- Sample lesson line: `A clever invention, certainly. But will a family invite it home? Keep that question. The archive stays sealed.`
- Reaction signature: deliberate blink, slow chin lift, tiny hand raise; lower mellow voice; text still reveals at P1 speed.

### Rewrite scope / rules
- Rewrite **all speaking lines**, not just one introductory sentence: `OPENING_LINES`, all three `CHAPTERS[].advisorLines`, each D1–D4 option's `feedback` and `boss` text, `COHERENCE_LINES` (all 9), `getBossLines()` common lines and `bossClosing`. Keep decision titles, factual chapter context, factual history and official sales intact unless correcting a genuine factual error.
- Each line must have a unique speaker voice; no interchangeable corporate/consulting jargon. Prefer 1–2 sentences / 12–28 spoken words. Max ~35 words except rare story-critical explanations. Use only one playful beat per line, not stand-up comedy. Lessons about noncustomers, perceived value, value-cost trade-offs and coherent strategic choices remain understandable.
- **Dialogues are authored data**, not runtime LLM. No API keys or generation requests in the game. Narrator can stay neutral and brief.
- Reactions must follow existing `mood` flags or add compatible states if useful: owl curious, fox excited, beaver tinkering, bear skeptical, chair thoughtful. Preserve accessible text and captions; original synthetic mumble per character continues.
- The boss is NEVER a right/wrong grader and does not reveal Wii/Wii U/Switch names or outcomes until the final archive. Feedback should reflect the selected option specifically and distinguish speculative consequences from real facts. Keep recorded chapter order unchanged.
- Add character interplay in **a few** short pairs rather than five unrelated monologues: Slyvester pitches and Pawson objects; Damian volunteers a build then questions battery; Hootley gently asks about nonplayers; Shelldon reframes. Never extend total runtime above 15 minutes.
- Introduce occasional recurring gags with payoff across chapters (Slyvester's six-word pitch vs Pawson's budget disclaimer; Damian's extra screen vs actual power constraints). No heavy animal pun saturation and no insulting the class.
- Run story and browser test suite; update snapshot assertions deliberately if scripts are text-specific.

### Suggested sample rewrite snippets (original, illustrative)
- Opening, Shelldon: `Welcome, directors! Three launches, four votes, and one very stubborn archive. Even I can't peek inside. Officially.`
- Opening, Hootley: `Before we talk about gamers... may I ask about the people who never touch a controller? I stayed up thinking about them.`
- 2005, Slyvester: `Picture the commercial! A family laughing together. Or we could sell more polygons. Less catchy, though.`
- 2005, Damian: `A remote you can swing? I love it! But please don't test the prototype next to Pawson's coffee.`
- 2005, Pawson: `Our rivals want a power contest. Charming. I'll ask the budget to lift weights first.`
- 2011, Slyvester: `Everyone has a shiny screen in their pocket now. Why should they invite ours into the living room?`
- 2011, Damian: `I can fit a screen in the controller. Now the tricky bit: make it feel like a game, not homework.`
- 2011, Hootley: `One family told me, 'We loved playing together.' They didn't say, 'Please give us another screen to charge.'`
- 2011, Pawson: `That second screen costs real money. If our customers shrug, even my honey jar won't cover it.`
- 2016, Hootley: `At home, on a train, at a friend's table... why should play have to pick just one address?`
- 2016, Damian: `A dock, a battery, detachable controllers? Now that's a puzzle worth chewing on. Figuratively.`
- 2016, Slyvester: `Two friends. One little screen. No awkward 'sorry, did you bring a controller?' moment. That's my poster.`
- 2016, Pawson: `Lovely idea. Now: weight, battery, price. Three very grumpy bears. One of them is me.`
- Closing, Shelldon: `All right, board. Put down the prototypes. Time to meet what history actually built.`
These are authored creative examples, not quotes from Animal Crossing or real Nintendo employees.

## P4 — More breathing room between directors (high)
**Observed source:** `src/scene/boardroom.ts` has `SEATS` around lines 21–25 with positions x = 0, ±2.28, ±4.22. All five silhouettes feel like a packed straight row from the current camera.
**Required:** Rearrange seat positions and, if needed, widen table/room and reposition props. Aim for **at least 0.5 avatar-body-width of visible empty space** between neighboring silhouette outlines in a wide projected 16:9 frame; never intersect arms, ears, chairs or table props. Prefer an **open shallow arc** or asymmetrical executive arrangement around the far edge of the table, rather than shoulder-to-shoulder lineup. Keep CEO visually distinct at head of table. Avoid making characters too tiny. Check both primitive avatars and future Tripo GLBs: normalize scale and preserve breathing room. Show table width, hands and chairbacks where natural. Retake screenshot at 1920x1080 and 1366x768, including with dialogue overlay; ensure every face is visible.

## P5 — Comfortable speaker-focused camera, NOT extreme face zoom (high)
**Observed source:** `src/scene/scene-director.ts` `focusSpeaker()` lines ~183–207 currently shifts perspective around the wide camera; user wants a visible focus change, but **medium composition, not close-up face crop**.
**Required:** On speaker change, smoothly reframe over ~0.55–0.8 seconds toward speaker, using a **medium shot** with head, upper body/paws and some table or one neighboring advisor visible. The speaking avatar should occupy about **20–35% of screen width** and stay above dialogue bubble. Keep the actor's face, both ears, and shoulders in frame. Prefer a 3/4 framing with medium lens/FOV and subtle spotlight / saturation cue; avoid huge camera push, jumping, nausea, or repeated moves when the same person continues speaking. Return to ensemble wide for narrator/choice panels and factory transitions. Compute poses from current character anchor positions after P4 changes, with distinct targets for seat sides and center; constrain framing for 1366x768. Test all five speaking characters with overlay and future taller GLB models.

## User-directed acceptance checklist / task routing
- **P1:** Text completes automatically very fast, remains until intentional next; no mandatory 'complete text' click, and blips stop properly.
- **P2:** Original translucent organic outlined bubble with floating pastel name tag and warm rounded sans type; clear resemblance in **UI language** to references A/B, not identical copyrighted asset reproduction.
- **P3:** All spoken lines transformed into distinctive, concise, charming character voices; still teach strategic choices and distinguish hypothetical outcomes; no unverified generated text at runtime.
- **P4:** Five directors visibly separated, no clipping, table remains readable.
- **P5:** Speaker-focus feels intentional yet contextual; no face-only closeups or dialogue overlap.
- **Tests:** Every major branch and all four votes still work; 3 factory reveals, boss logic and final archive remain historically accurate; no runtime external asset dependencies; `npm run build`, unit/story tests, and targeted Playwright screenshots pass.
- **Delegation:** Team lead owns prioritization and merging. Assign mutually exclusive modules: P1/P2 to UI engineer (`src/ui/ui.ts` and `src/style.css`); P3 to narrative writer (`src/core/story.ts`); P4/P5 to scene engineer (`src/scene/boardroom.ts`, `src/scene/scene-director.ts`). QA reports independently. Each must read skills relevant to their assignment and coordinate any overlapping code.
