# 24-Hour Build Plan — Nintendo: The Next Blue Ocean
## How to use these files
Give Claude Code **GAME_DESIGN.md**, **TECHNICAL_SPEC.md**, and **24_HOUR_BUILD_PLAN.md** together. Do not ask it to build a full game from scratch in one unverified pass. Build vertical slices with runnable checkpoints.

## Definition of done
A presenter-controlled static web experience that completes 3 chapters/4 votes, creates one fictional 3D product reveal per chapter, provides boss dialogue, finishes with fact-checked Wii/Wii U/Switch historical reveals, runs offline on a laptop and on GitHub Pages, and is safe to demonstrate live. **A working complete prototype is better than an ambitious unfinished one.**

## Timebox / critical path
| Hour window | Deliverable | Exit check |
|---|---|---|
| 0–2 | Initialize Vite TS + Three.js + GSAP; render boardroom + HTML dialogue + presenter keys. | Page runs locally, no CDN, skip/advance works. |
| 2–5 | Implement story data, all three chapter briefings, 4 decision cards, choice persistence, boss dialogue, final archive (text-only first). | Entire story playable using placeholder colored boxes. |
| 5–8 | Build low-poly boardroom furniture and 5 primitive animal advisor **fallbacks**; create reusable advisor slots that can later load Tripo3D GLBs; camera speaker focus; emotion poses. | Dialogue speakers readable, console colors cohesive. |
| 8–12 | Build single factory, arms/stamp, parametric prototype generator. Support D1/D2 3 choices each, D3×D4 all 9 combinations. | All 15 factory input combinations work, replay/skip works. |
| 12–14 | Integrate transitions, character mumble synth, mute and sound effects. | No audio without user gesture; no crash when muted. |
| 14–17 | Finalize factual archive, citations, audience-vs-history comparison, one strong ending moment. | No historical names or figures leak before finale. |
| 17–19 | Test branches and controls, refresh, restart, fps, projected text, keyboard. | Can give a continuous <=15-minute demo 3x without errors. |
| 19–21 | GitHub Pages pipeline/build, local offline build, README presenter instructions. | Both hosting modes verified. |
| 21–24 | Buffer for bugs, polish only AFTER complete success; optional original sound cues. | Tagged release, backup local copy, last run-through. |

## Tripo3D asset integration checkpoint (after playable MVP)
See `ASSET_PIPELINE.md`. Character generation is a **separate manual/external stage**: start with one original Fox in Tripo3D; use a neutral A-pose, inspect biped rigging, verify idle/gesture animations, optimize to approximately 2,000–5,000 triangles and one small texture/material where practical, export an animation-tested GLB, then replace the procedural Fox through the optional advisor adapter. Repeat for Owl, Beaver, Bear and Tortoise only after the Fox works. If a Tripo animation export needs conversion, inspect in Blender and re-export GLB. Missing models must always fall back to simple characters. No click-to-walk in first release.

## Mandatory freeze points
- **By hour 5:** Entire story must work with placeholder art. If not, stop visual work until it does.
- **By hour 12:** If factory unreliable, replace robotic complexity with one scripted stamp + reveal; don't add more modeling.
- **By hour 17:** Freeze features. No additional videos or fancy shaders.
- **By hour 21:** Stop tweaking aesthetics; create release build, test offline, and rehearse.

## Fallbacks if behind schedule
- Five unique animals too slow? Keep three distinctive avatars, with two advisors as dialogue portraits in 2D; preserve all roles.
- Robotic arms too hard? One animated arm + press in a fixed scene; reuse across chapters.
- Nine final product variants too hard? Three chassis plus three controller attachment modules, composited programmatically.
- Voice synthesis noisy? Mute by default and use very quiet UI chirps; never delay story.
- No time for ad? Remove it. Add video slot after lecture if desired.
- GitHub deployment flaky? Demonstrate with local `npm run preview` / built folder served through localhost. Never open `index.html` through `file://` for module-based projects.

## Claude Code task prompt
> You are building a presenter-controlled 12-minute browser-based university teaching case titled 'Nintendo: The Next Blue Ocean'. Read GAME_DESIGN.md and TECHNICAL_SPEC.md completely before editing code. Respect the 24-hour scope and history-vs-simulation labels. Use Vite+TypeScript+Three.js+GSAP, local-only resources, original primitive low-poly animal **fallbacks** with an optional Tripo3D GLB character loader/animation adapter, HTML dialogue/choice overlays, a reusable factory with arms and mold stamp, 3 chapters with exactly 4 votes and three options per vote, one factory output per chapter, original Web Audio mumble, boss feedback, and a final factual Wii/Wii U/original Switch archive. Start by delivering a full playable story vertical slice with placeholders; only then add 3D scenes and audio. No online APIs or unnecessary dependencies. Persist checkpoints. Implement skip/replay/reset/presenter shortcuts. After every major milestone run build and tests, report exactly what works and what remains. Never portray fictional products or modeled outcomes as real Nintendo history; do not reveal real product names/units until the finale. Prioritize reliable classroom presentation and readme. Do not implement optional ads until every acceptance test passes.

## Presenter rehearsal card
- Open local site (recommended as backup) and optionally enable browser fullscreen.
- Explain: 'You are a fictional Nintendo board. Your votes create fictional prototypes; we'll compare with Nintendo's real decisions at the end.'
- Run Chapter 1 (one vote), Chapter 2 (one vote), Chapter 3 (two votes).
- Count hands quickly, choose majority with number key 1/2/3, press V to commit. Narrate trade-offs while factory assembles.
- Use `S` to skip lengthy animations and `M` to mute if necessary; avoid live debugging.
- Reveal actual 2006 Wii, 2012 Wii U, 2017 original Switch plus three official lifetime totals at end.
- Final discussion: 'Which moves created demand instead of merely competing for existing demand? Why didn't the first success guarantee the next?'

## Sources to keep bundled in release docs
- Nintendo sales: https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html (June 30, 2026 lifetime values).
- Nintendo 2006 public strategic goal: https://nintendoworldreport.net/news/11480/nintendo-media-briefing-speech
- INSEAD Wii case: https://publishing.insead.edu/case/nintendo-wii-lessons-learned-noncustomers
- INSEAD Switch case: https://publishing.insead.edu/case/nintendo-switch-shifting-market-competing-market-creating-strategy
- Nintendo 2017 Switch release: https://www.nintendo.co.jp/corporate/release/en/2017/170113.html