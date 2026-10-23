# Nintendo: The Next Blue Ocean

A presenter-operated, audience-directed classroom case about Nintendo's strategic choices from 2005 to 2016. Three chapters, four hands-up votes, three fictional prototype reveals, and one sealed historical archive.

**This is a teaching exhibit, not a simulation of Nintendo's real board meetings.** The audience's choices create explicitly labelled `SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT` prototypes. Real product names, launch years, and official lifetime figures appear only in the final archive. The historical timeline never branches.

## Run locally

Requirements: Node.js 20+ and npm. No internet is needed at runtime after dependencies are installed.

```powershell
cd C:\Users\robwa\Desktop\Nintendo\blue-ocean-game
npm install
npm run dev
```

Open <http://127.0.0.1:5173/>.

Production build and local preview:

```powershell
npm run build
npm run preview
```

Open <http://127.0.0.1:4173/>. Do not open `index.html` through `file://`; this is a module-based Vite app.

Tests:

```powershell
npm test              # unit/story/state/checkpoint/adapter tests
npm run typecheck
npm run test:e2e      # full Playwright classroom suite (starts the dev server)
npm run test:e2e:team # deeper branch/presenter/factory/WebGL/layout sweep only
```

`npm run test:e2e` now runs both the original classroom specs and the deeper `tests/e2e/team-*.spec.ts` sweep. It is thorough but slow (roughly 15–20 minutes under software WebGL); `npm run test:e2e:team` runs only the deeper sweep. Use `npm run test:e2e -- tests/e2e/case.spec.ts` for a quick canonical check.

## Classroom flow

1. **Enter the boardroom.** The opening explains the fiction: the products are real; the meeting is not.
2. **2005 — one vote.** Briefing → advisor lines → vote → one factory reveal → consequence → Chair Shelldon → transition.
3. **2011 — one vote.** Same reusable boardroom/factory staging with new dialogue and lighting.
4. **2016 — two votes, one factory.** Vote on where play happens, then on what design prioritizes; the single factory reveal combines both.
5. **The sealed archive.** Break the seal only after all four votes. It shows Wii (2006), Wii U (2012), and the original Nintendo Switch (2017) with the official lifetime figures and source links, set beside the class's choices without a pass/fail grade.

The presenter counts hands and clicks the majority. There is no scoring, no correct-answer card, and no live polling. Spoken lines finish revealing automatically in under a second and then wait indefinitely for a deliberate click/Space; the first click while text is still appearing only completes the line.

## Presenter controls

| Key | Action |
|---|---|
| `Space` / `Enter` | Reveal the line instantly if it is still typing; advance once it is complete |
| `1` `2` `3` | Select option A / B / C |
| `V` | Record the selected vote |
| `S` | Skip the factory animation |
| `M` | Mute / unmute |
| `F` | Toggle fullscreen (when the browser permits) |
| `R` | Restart the current scene (Shift+R resets everything) |
| `P` | Open the presenter drawer |
| `←` `→` | Jump chapters when presenter mode is on |
| `Esc` | Close the presenter drawer or archive |

The presenter drawer also offers jump-to-chapter, restart scene, rewind line, skip animation, mute, fullscreen, volume and music volume, finale-only, and **Reset entire demo** (confirmation required).

**Jump behavior:** a rehearsal jump re-opens the chosen chapter and clears its votes and every later vote. Earlier votes are kept. Skipped chapters appear as **Not voted** in the archive; the app never invents placeholder votes.

Progress, selections, mute, and presenter mode are saved to `sessionStorage`; mute is also saved to `localStorage`. A refresh during a factory animation safely restarts that factory from idle with all committed votes intact.

## Historical and licensing boundaries

- Official lifetime hardware figures (as of June 30, 2026): Wii **101.63 million**, Wii U **13.56 million**, original Nintendo Switch **156.59 million**. Source: [Nintendo Investor Relations](https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html). These are worldwide cumulative hardware shipments, not unique players, noncustomer counts, revenue, or causal proof.
- Interpretive teaching sources: the INSEAD Wii and Switch case abstracts, Nintendo's 2006 strategic remarks, the 2009 gaming-population presentation, and the January 2017 Switch release. Full citations are displayed in the archive.
- All five animal executives, their writing, the boardroom, the factory, the prototypes, and the synthesized babble are original project work. No Nintendo/Animal Crossing models, textures, voice samples, or copied audio are included.
- Background music is licensed, not Nintendo audio: "1am", "7am", "6pm", "10pm" and "5am - Goodbye" by Towball, from *Towball's Crossing*, used under **CC BY 4.0**. Attribution appears in the game and in `MUSIC_LICENSE.md`.
- The fictional prototypes are design exercises. They do not forecast sales, demand, profit, or market share.

## Procedural speech

Dialogue uses an original, sample-free Web Audio mumble engine (`src/audio/`). It analyzes the authored line as it is revealed, triggers only at the start of vowel clusters, and synthesizes each vowel through a sawtooth source, three band-pass formants, a short breath-noise layer, and an attack/hold/decay envelope. The five advisors have separate pitch, vocal-tract, jitter, wobble, breath, and pacing profiles: Shelldon and Pawson are deliberately low, Slyvester is high and quick, Hootley is breathy and mid-soft, and Damian is dry and sturdy.

Commas, sentence endings, ellipses, question bends, exclamation lifts, and ALL-CAPS emphasis are represented in both the visible reveal rhythm and the synthesized phrase. Text and audio share one clock: a natural 62 ms-per-character pace sped up 1.5× to about 41 ms, with punctuation pauses scaled to match and each advisor's speed multiplier on top. A typical line takes 3–10 seconds, and clicking while it types still completes it instantly. The narrator and reduced-motion mode stay silent. Audio unlocks only on the first click/keypress, mute is immediate, and skip/new line/hidden tab/restart/reset cleanly fade and release every audio node. The standalone `MumbleVoiceEngine.typeText()` API keeps the literal 33 ms authored cadence for reuse outside this presentation.

## Background music

Five licensed cues run through the same master bus as the synthesized voices, so mute (`M`), the master volume and the separate **Music** slider all apply. The mapping is:

| Scene | Track |
| --- | --- |
| Title | "1am" |
| Boardroom dialogue (opening, advisors, feedback, boss, transition) | "7am" |
| Chapter briefing and voting | "6pm" |
| Factory | "10pm" |
| Finale (sealed intro and archive) | "5am - Goodbye" |

Music loops, fades in/out at scene changes, ducks under advisor dialogue, and pauses while the tab is hidden. Because browsers require a gesture, the title cue starts on the first click/keypress; clicking straight through **Enter the boardroom** moves quickly to the boardroom cue. Tracks and attribution live in `public/audio/` and `MUSIC_LICENSE.md`.

## Character assets (optional Tripo3D upgrade)

Voice and personality rules for the five original advisors: `CHARACTER_PERSONAS.md`.

The procedural low-poly advisors are the shipped, deterministic fallback. A Tripo3D-generated rigged GLB can be dropped in later without changing dialogue or camera code:

```
public/assets/characters/
  fox/fox.glb
  owl/owl.glb
  beaver/beaver.glb
  bear/bear.glb
  tortoise/tortoise.glb
```

`src/scene/character-loader.ts` and `src/scene/character-adapter.ts` implement the optional loader and the `createAdvisor` abstraction. Missing, corrupt, offline, or unrigged models always fall back to the procedural avatar; the story never waits for a model. See `../ASSET_PIPELINE.md` and `public/assets/characters/README.md` for the provenance gate. No model-generation service is used by the app.

## Offline and static hosting

All runtime assets are local and bundled by Vite. After `npm run build`, `dist/` runs from a local static server with no network.

GitHub Pages subpath build (not deployed by this project):

```powershell
$env:GITHUB_PAGES='true'
$env:VITE_BASE='/nintendo-blue-ocean/'
npm run build
Remove-Item Env:GITHUB_PAGES
Remove-Item Env:VITE_BASE
```

Serve `dist/` from the matching subpath. The app uses `import.meta.env.BASE_URL` for any optional character assets, so it is subpath-safe. A service worker is deliberately not used.

## Source map

```
src/core/        story data, typed state transitions, session checkpoint, store
src/ui/          DOM overlays: dialogue, choices, factory card, presenter drawer, archive
src/scene/       one Three.js scene: boardroom, factory, prototypes, optional GLB adapter
src/audio/       Web Audio babble, cues and licensed-music routing, muted until first gesture
tests/           Vitest pure tests; tests/e2e Playwright classroom flows
scripts/         optional local screenshot/perf inspection scripts
```

## Known limits

- One fixed 16:9 composition is the primary target (1920×1080 projector). Smaller 16:9 and 4:3 layouts are supported but supporting archive/factory text is denser than the main dialogue.
- The babble synthesizer is intentionally subtle and can be muted; it is not voice acting.
- There is no backend, login, mobile voting, live poll, physics engine, click-to-walk exploration, or runtime AI.
