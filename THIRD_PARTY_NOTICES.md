# Third-party notices

This project contains original code and artwork plus the third-party material
listed below.

## Music

Five tracks by **Towball** from the album ***Towball's Crossing*** are used
under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

| Track | Album position | In-game use | Asset |
| --- | --- | --- | --- |
| "1am" | 22 | Title screen | `public/audio/towball-1am.mp3` |
| "7am" | 03 | Boardroom dialogue | `public/audio/towball-7am.mp3` |
| "6pm" | 15 | Briefing and voting | `public/audio/towball-6pm.mp3` |
| "10pm" | 06 | Factory scenes | `public/audio/towball-10pm.mp3` |
| "5am - Goodbye" | 26 | Finale and archive | `public/audio/towball-5am-goodbye.mp3` |

- **Artist:** Towball
- **Album:** *Towball's Crossing*
- **Source:** <https://towball.itch.io/towballs-crossing>
- **Licence:** <https://creativecommons.org/licenses/by/4.0/>
- **Licence verified:** 2026-10-22 on the album's itch.io page

**Changes made:** all five tracks were transcoded from the album's VBR MP3s to
128 kbps MP3 for web delivery; cover art and original metadata were removed;
title, artist, and album tags were added; the tracks loop, are attenuated at
runtime, and the boardroom track ducks under dialogue. No melodic, lyrical, or
structural changes were made.

**Attribution format:** "1am", "7am", "6pm", "10pm" and "5am - Goodbye" by
Towball, from *Towball's Crossing*, used under CC BY 4.0.

The full music licence ships with every build in
[`blue-ocean-game/MUSIC_LICENSE.md`](blue-ocean-game/MUSIC_LICENSE.md) and at
`MUSIC_LICENSE.md` in the deployed site.

## Runtime software

| Package | Version | Licence |
| --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js) | 0.186.1 | MIT — <https://github.com/mrdoob/three.js/blob/dev/LICENSE> |
| [GSAP](https://gsap.com/) | 3.15.0 | GSAP Standard "no charge" licence — <https://gsap.com/standard-license/> |

GSAP is **not** MIT-licensed; its use is governed by the GSAP Standard
Licence. Review that licence if you redistribute or commercialise this
project.

## Build and test tools

These are development dependencies and are not part of the deployed runtime:

| Package | Version | Licence |
| --- | --- | --- |
| Vite | 8.3.5 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| Vitest | 5.0.5 | MIT |
| Playwright (`@playwright/test`) | 1.64.1 | Apache-2.0 |
| `@types/node`, `@types/three` | — | MIT (DefinitelyTyped) |

## Fonts

No font files are bundled. The interface uses system font stacks, so no
third-party font licence applies.

## Artwork, characters, and audio

The five animal executives, the boardroom, the factory, the prototype meshes,
the dialogue-bubble artwork, and the synthesized character babble are original
project work. No Nintendo or *Animal Crossing* models, textures, UI images,
voice samples, or copied audio are included. No Tripo3D character GLBs are
included; the optional slots under `blue-ocean-game/public/assets/characters/`
are empty.

## Trademarks

Nintendo, Wii, Wii U, and Nintendo Switch are trademarks of Nintendo. They are
used in this project for identification and historical commentary only. This
project is not affiliated with, endorsed by, or sponsored by Nintendo.
