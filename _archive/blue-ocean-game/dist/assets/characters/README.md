# Advisor Character Assets — Drop-In Manifest

**Status: no GLB files are included in this repository.** The game runs the full
three-chapter story with the original procedural advisors. Placing a validated
GLB in the paths below upgrades that advisor on the next page load; removing it
restores the procedural fallback with no code change.

Runtime code lives in:

- `src/scene/character-loader.ts` — URL resolution, GLTFLoader, validation, clip mapping, cache.
- `src/scene/character-adapter.ts` — stable `AdvisorHandle` slot, synchronous procedural fallback, optional background swap.

## Canonical paths

Assets are served from Vite's `public/` at the configured base URL. The loader
constructs `${import.meta.env.BASE_URL}assets/characters/<folder>/<file>`, so
GitHub Pages subpath hosting works without a leading slash.

| Advisor | Role | Folder | File | Normalized height |
| --- | --- | --- | --- | --- |
| Hootley | Owl, Consumer Insight | `owl/` | `owl.glb` | 3.0 world units |
| Slyvester | Fox, Marketing | `fox/` | `fox.glb` | 3.0 world units |
| Damian | Beaver, Engineering | `beaver/` | `beaver.glb` | 3.0 world units |
| Pawson | Bear, Finance | `bear/` | `bear.glb` | 3.0 world units |
| Shelldon | Turtle, Big Boss | `tortoise/` | `tortoise.glb` | 3.0 world units |

```
public/assets/characters/
  fox/fox.glb
  owl/owl.glb
  beaver/beaver.glb
  bear/bear.glb
  tortoise/tortoise.glb
```

Only add files that pass Section 6 provenance below. Do not add Blender files,
source images, or large working assets to `public/`.

## What the runtime accepts

A model is installed only if **all** of these pass:

1. It parses with the stock Three.js `GLTFLoader` (no Draco, Meshopt or KTX2 decoder is configured).
2. The scene contains at least one `Mesh` and at least one `SkinnedMesh` (rigged character).
3. Bounding height is finite, non-zero, and within 0.001×–1000× the target height.
4. It has a usable idle clip (explicit manifest name or alias match below).
5. Textures are embedded or co-located; no external/CDN URLs.
6. It loads over the app's base path, locally and in `npm run preview`.

Failure of any gate keeps the procedural avatar and resolves the handle's
`ready` promise as `'procedural'`. The app never blocks, throws or retries
beyond one attempt per advisor per page lifetime.

The scene is cloned per advisor with `SkeletonUtils.clone`, normalized so the
feet sit at local y=0 and the bounding box is centered in x/z, scaled uniformly
to the target height, then rotated by the manifest `yawOffsetDeg`. The seat
root (position, facing, name `advisor-<id>`) never moves. Embedded cameras and
lights are removed. Opaque meshes cast/receive shadows; transparent meshes do
not; skinned meshes have frustum culling disabled.

## Clip mapping

Recommended clips: **Idle** (required), **Talk/Gesture**, **Think**,
**Celebrate**, **Disappointed**. Names are resolved case-insensitively in this
order:

| Semantic | Accepted aliases (first match wins) |
| --- | --- |
| idle | `idle`, `breath`, `breathing` |
| talk | `talk`, `speak`, `speaking`, `gesture`, `gesturing` |
| think | `think`, `thinking`, `ponder`, `pondering` |
| celebrate | `celebrate`, `celebration`, `celebrating`, `happy`, `excited` |
| disappointed | `disappointed`, `disappointment`, `sad`, `concern`, `concerned` |

Aliases match whole tokens (a token may start with a long alias, so
`Concerned_Loop` maps to disappointed, but `Saddle` never maps to sad).

If the exporter uses different names, declare them exactly in
`src/scene/character-loader.ts` → `ADVISOR_ASSETS`:

```ts
pip: {
  folder: 'fox',
  file: 'fox.glb',
  targetHeight: 3.0,
  yawOffsetDeg: 0,
  clips: { idle: 'Fox_Idle_Loop', talk: 'Fox_Talk_01', celebrate: 'Fox_Cheer' },
},
```

Explicit names override aliases. A missing optional clip degrades to idle (or a
talk clip while speaking) plus subtle procedural sway. Idle is mandatory.

Mood compatibility is automatic: `neutral → idle`, `thoughtful → think`,
`pleased → excited`, `concerned → disappointed`.

## Orientation and scale troubleshooting

- **Faces sideways/backwards:** set `yawOffsetDeg` per advisor. The GLB front
  should face +Z after the offset. The default is 0.
- **Too tall/short:** do not edit camera code. The loader normalizes to
  `targetHeight`; adjust only that manifest value, and re-check seat framing.
- **Floating/sunk:** the loader places `box.min.y` at 0. If the exported model
  has an offset armature or a helper ground plane, clean the export first.
- **T-pose or frozen:** confirm an Idle clip exists and is not a static pose.

## Provenance and acceptance record (required per model)

Before committing a GLB to `public/`, record in the team handoff/report:

- Advisor and file path + SHA-256
- Creation tool/account/date and source prompt or style reference
- Ownership/license note confirming original output; **no Nintendo or Animal
  Crossing meshes, textures, names, extracted audio, or unknown downloads**
- Triangle count (target 2,000–5,000), material count (target ≤1), texture sizes
- Rig type and exact animation clip names
- Validation date and who validated it

A model that cannot pass this gate is not accepted, even if it renders.

## Verification checklist

With all files absent (the current state):

```powershell
cd C:\Users\robwa\Desktop\Nintendo\blue-ocean-game
npx tsc --noEmit
npx vitest run tests/character-adapter.test.ts
npm run dev
```

Confirm the story starts immediately with all five procedural advisors and no
GLB requests are attempted for an unconfigured character. After adding one
GLB, confirm exactly one request for that file, a smooth upgrade without a
reload, unchanged seat/camera framing, 30 seconds of stable idle, and that
temporarily renaming the file restores the procedural advisor on reload.

For subpath hosting, test with:

```powershell
$env:VITE_BASE='/nintendo-next-blue-ocean/'
npm run build
npm run preview
Remove-Item Env:VITE_BASE
```

Then `clearAdvisorCache()` during teardown disposes cached source geometry,
materials and textures. Individual advisor disposal stops its mixer and
releases only its cloned skeleton; it deliberately does not dispose geometry
or materials shared with the cache.
