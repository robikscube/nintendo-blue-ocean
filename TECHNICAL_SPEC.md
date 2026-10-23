# Nintendo: The Next Blue Ocean — Technical Specification (TDD)
**Version 1.0 — implementation optimized for a 24-hour prototype**

## 0. Guiding constraint
This is a **presenter-controlled interactive narrative**, not a game simulation. Ship a reliable 12-minute lesson before attempting polish. The build must load as static files on GitHub Pages AND from a laptop via a local HTTP server, without internet access.

## 1. Suggested stack
- **Vite + TypeScript + Three.js** using a single `<canvas>` and ordinary DOM/CSS overlays. Use **plain Three.js rather than React Three Fiber** for this 24-hour deliverable unless the coding agent can demonstrate a faster existing R3F starter. Do not build an elaborate React app merely for four multiple-choice panels.
- **GSAP** (local npm dependency) for camera movements, robot-arm choreography, UI fades and punchy prototype reveals. Use Three's built-in clock for low-cost idle loops.
- **Web Audio API** for locally synthesized non-verbal mumble; no TTS APIs, downloads or character-voice samples.
- **CSS / SVG** for highly readable dialogue, choice cards, timeline/results and presenter tools; text MUST NOT be drawn onto low-resolution 3D surfaces.
- **Session storage** for votes and checkpoint; optional `localStorage` for mute setting. No backend.
- **Static assets** under `/public/assets/`, bundled locally. Avoid CDN imports/fonts/external video.

## 2. Directory layout
```
blue-ocean-game/
  index.html
  package.json
  vite.config.ts
  public/
    assets/
      models/              # optional original or properly licensed GLB
      images/              # final source-backed historical photos if rights allow
      videos/              # OPTIONAL pre-rendered <=15s clips
      fonts/               # optional locally stored licensed fonts
  src/
    main.ts
    style.css
    core/
      state.ts             # typed immutable state and transitions
      story.ts             # content data / narrative scripts
      checkpoint.ts        # sessionStorage with schema version
      presenter.ts         # keyboard shortcuts
    scene/
      renderer.ts          # Three renderer, cameras, resize, perf settings
      boardroom.ts         # table, chairs, five animal avatars
      animals.ts           # procedural meshes and expressions
      factory.ts           # robotic arms, press, conveyor, product stage
      prototypes.ts        # geometry recipes from 4 choice ids
      transitions.ts       # camera crossfade/position sequences
    ui/
      dialogue.ts          # typewriter + next
      choices.ts           # 3 cards, highlight, submit
      overlay.ts           # disclaimer, chapter, transition, HUD
      finale.ts            # citation-linked historical comparison
    audio/
      babble.ts            # synthesized per-character mumble
      audio.ts             # unlock, mute, simple stings
  tests/
    story.spec.ts
    prototype.spec.ts
```

### Character asset delivery contract (Tripo3D)
The intended final five advisors will be generated separately in Tripo3D and delivered as optional local `GLB` models under `public/assets/characters/{fox,owl,beaver,bear,tortoise}/<name>.glb`. Do **not** block the 24-hour MVP on asset creation, models, rigs or downloads. Implement a stable advisor adapter with `root`, `setEmotion`, `setSpeaking`, `focus`, `update`, and `dispose` methods, wrapping either a `GLTFLoader`-loaded rigged mesh or an existing procedural fallback. Normalize size/orientation at a stable pivot, map available clip names to semantic actions via `AnimationMixer`, gracefully handle absent clips/morph targets, and preserve current dialogue/camera APIs. Respect `import.meta.env.BASE_URL`. See `ASSET_PIPELINE.md` for details, budgets, validation and fallback rules.

## 3. Types and story data
Define game logic as data, not nested conditionals or scattered JS event listeners.
```ts
type ChapterId = 'c2005' | 'c2011' | 'c2016';
type DecisionId = 'd1' | 'd2' | 'd3' | 'd4';
type Phase = 'opening' | 'briefing' | 'dialogue' | 'voting' | 'factory' | 'feedback' | 'boss' | 'transition' | 'finale';
type ChoiceId = 'A' | 'B' | 'C';
interface Decision { id: DecisionId; prompt: string; options: Array<{id: ChoiceId; title: string; detail: string; benefit: string; tradeoff: string}> }
interface Chapter { id: ChapterId; year: number; title: string; brief: string; decisions: DecisionId[]; advisorLines: DialogueLine[]; bossLines: Record<string,string> }
interface GameState { version: 1; chapterIndex: number; phase: Phase; dialogueIndex: number; selectedChoice: ChoiceId | null; choices: Partial<Record<DecisionId,ChoiceId>>; factoryProgress: 'idle'|'running'|'done'; muted: boolean; presenterMode: boolean; }
```
- Only `commitChoice()` mutates stored vote data. Persist after each commit and phase change.
- For chapter 3, persist D3 first, present D4, then factory ONCE with both attributes. Disable factory until both votes exist.
- Use explicit, pure `next()` and `goToCheckpoint()` state transitions. Presenter shortcuts call the same transition functions as buttons.
- On reset clear session state; on reload validate version and restore a safe checkpoint (not halfway through a GSAP timeline).
- Keep a separate `actualHistory` array used **only** in `finale()`; never use it to populate earlier UI or factory names.

## 4. 3D scene topology and low-cost assets
**ONE Three.js scene**, two sets represented as `THREE.Group`: `boardroomGroup` and `factoryGroup`, activated separately, with controlled camera positions and a color/lighting swap. A single directional light, ambient light, matte MeshStandardMaterial or MeshLambertMaterial; no shadows on old laptops if FPS low.

**Boardroom:** floor/walls as boxes; table as rounded-ish cylinder/box; chairs as cubes. Five original primitive animal avatars serve as mandatory fallbacks, with a drop-in optional Tripo3D GLB adapter for final biped characters. Support idle/gesture/thinking/reaction states, `AnimationMixer` when clips exist, and head/body motion fallback if facial controls do not. Keep meshes and draw calls modest; optional `InstancedMesh` for repeated decorations.

**Factory:** conveyor belt, modular robotic arms (base + upper pivot + forearm + clamp), central mold/platen, stage pedestal. All pieces are basic geometries. Use parented pivot groups for rotations; **no physics engine**, IK solver, collision world or ragdoll dynamics.

**Prototype builder:** products are combinations of simple meshes with configurable geometry and attachments. Do not download unofficial Nintendo models or copy precise industrial CAD. Use abstract fictional, original console silhouettes with clear labels:
- D1: `'power-tower'|'social-box'|'early-handheld'`
- D2: `'hd-console'|'second-screen'|'portable'`
- D3 chassis: `'tv'|'handheld'|'hybrid'`
- D4 accessory: `'performance'|'split-controls'|'motion'`
- Factory stage calls `buildPrototype(chapterId, choices)` to return `THREE.Group`, title `Concept Prototype N`, and accessible textual description. Nine D3/D4 combinations must work without nine authored models.

## 5. Factory animation reusable timeline (~7–9 seconds)
Use GSAP timeline scoped to the group and **kill all prior timelines before starting**.
1. `0–1s`: assembly platform arrives / parts move from side trays.
2. `1–3s`: two arms swing in and position chassis and one device component.
3. `3–5s`: controller or screen module locks on, little light flashes.
4. `5–6s`: heavy stamp descends, holds, rebounds; small squash effect.
5. `6–8s`: curtain/plate opens, prototype lifts and rotates, confetti or spotlight; text appears `SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT`.
6. `8–9s`: optionally hold until next click; no autoplay into boss commentary.

Make animations skip-able: `skipFactory()` calls `timeline.progress(1)` (or kill and apply final transforms), then enters `factoryProgress:'done'`. Factory should be replayable without creating duplicate meshes or lights. All children of previous prototype must be disposed before new one is added, including geometry and unique materials.

## 6. Camera, text and screen layout
- Orthographic camera angled downward ~25–35 degrees or mild perspective with fixed positions; no player movement and no required camera orbit.
- Boardroom and factory each have 2 keyed camera presets (wide and speaker/reveal). GSAP interpolation of camera position plus look target; no heavy postprocessing.
- 16:9 composition optimized for 1080p lecture projector. Canvas fills view; UI overlays reserve bottom 28–35% for dialogue. Text minimum 24 CSS pixels on 1080p projection as a starting benchmark; inspect in the real classroom.
- Typewriter dialogue supports click-to-complete, next click-to-advance, `prefers-reduced-motion`, and instant skip. Keep full text in DOM for accessibility; do not split every character into DOM nodes.
- Persist or ignore full-screen preference if browser forbids it; never block play.

## 7. Procedural voice mumble: original sound design
Implement `MumbleSynth` after first user interaction (browser autoplay policy). **Make an original warm 'paper-toy babble', not an imitation of Isabelle, Tom Nook, or any named character.** No sample extraction, voice cloning, copyrighted audio or trademark character names.
- Basic patch per animal: oscillator (`sine`, `triangle`, softened square) → low-pass filter → gain ADSR (~15ms attack, 55–90ms decay), with 2–3 randomized notes per word cluster.
- Character timbres/pitch ranges: Owl mid soft; Fox bright quick; Beaver lower percussive; Bear low mellow; Boss slow rounded. Use seeded pseudo-random patterns for repeatable demo.
- Trigger audio only for non-space glyph chunks while typing, throttle to <=10 blips/second and avoid starting a voice per letter. 25–65ms duration per blip; stop on dialogue completion or skip. On mute call master gain ramp to zero; sound and text remain independent.
- Include volume slider or simple mute, default moderately quiet, preserve mute preference locally.
- Avoid holding AudioNodes indefinitely; reusable context + master bus; handle suspended/resumed context gracefully.

## 8. Alternate outcome feedback (not simulated financial forecasting)
The user's choice triggers prewritten benefit/trade-off/board reactions. Do **not** compute fictitious market share, revenue or success probability. If preferred show qualitative labels `customer access`, `technical ambition`, `operational complexity` as illustrative, but **no numbers or bars implying calibrated data**. In the `boss` phase, explain risk and say that the real timeline may differ; don't identify historical choice.

## 9. Optional short videos
No generated video in the application. If clips already exist, ship locally as compressed MP4 H.264 (with optional WebM) and `<video playsinline muted>`; explicit presenter play/pause/skip. Use at most ~15 seconds and never block story flow on video load. Fictional product ads MUST be watermarked `SPECULATIVE / STUDENT CONCEPT` and contain no real Nintendo branding unless discussing a factual historical ad with appropriate permission.

## 10. Finale data + evidence
UI must display the actual hardware and lifetime figures with visible **“As of June 30, 2026”** disclaimer and linked source:
- Wii — 101.63 million lifetime units.
- Wii U — 13.56 million lifetime units.
- Original Nintendo Switch — 156.59 million lifetime units.
SOURCE: https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html
Interpretive sources: https://publishing.insead.edu/case/nintendo-wii-lessons-learned-noncustomers and https://publishing.insead.edu/case/nintendo-switch-shifting-market-competing-market-creating-strategy .
IMPORTANT: Figures represent worldwide cumulative hardware shipments/sales as reported by Nintendo, NOT unique players, buyers gained from nonconsumption, or product-level profit.

## 11. Hosting and offline deployment
- Use `npm run dev` on presenter's laptop for rehearsal; `npm run build` + `npm run preview` for testing production build locally. No internet is needed at runtime after npm dependencies are installed/build output generated.
- For GitHub Pages use a dedicated `VITE_BASE` or `GITHUB_PAGES=true` config flag, e.g. `base: process.env.GITHUB_PAGES === 'true' ? '/REPO_NAME/' : '/'`. GitHub Actions should build with `GITHUB_PAGES=true`. If a user-site `username.github.io` repo, base should instead be `/`.
- Never fetch runtime assets from absolute leading-root `/assets/` without considering `import.meta.env.BASE_URL`; use `new URL('...', import.meta.env.BASE_URL)` or Vite-safe imports.
- Fully test after build using browser DevTools Network with offline mode / disconnected Wi-Fi. Avoid service workers for initial MVP.
- Provide `README.md` with exact local commands, projector setup, shortcuts, and GitHub Pages steps.

## 12. Test matrix / stop-ship bugs
1. `d1` A/B/C build and return to chapter 2 correctly.
2. `d2` A/B/C build and return to chapter 3 correctly.
3. All 9 D3×D4 configurations assemble and show specific visible differences; no crashes.
4. Historical archive remains hidden until finale; final three facts match Nintendo's cited numbers.
5. Typewriter skip/reveal and one-click/space advance cannot double-trigger transitions.
6. Factory may be skipped and replayed; no stuck robot arms, duplicate stages or repeated audio.
7. Refresh mid-game restores a clean briefing or voting checkpoint with earlier votes intact; Reset Demo clears it.
8. Disable network and load local server; project continues and has no missing fonts/assets.
9. Test Chrome at 1920×1080; check text legibility and 30fps target on integrated graphics.
10. Final presentation can be completed in under 15 minutes without developer intervention.

## 13. Explicitly not required
No networking, live audience polling, multiplayer, save accounts, voice recognition, LLM runtime API, model-generation service, realistic console physics, point-and-click locomotion, HDRI, SSAO/postprocessing or detailed factory simulation. **GLB character loading and animation compatibility are now part of the planned adapter**, but generating and integrating finished Tripo3D characters is not required to ship the overnight prototype.