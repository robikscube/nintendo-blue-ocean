# Character Integration — Current Coupling and GLB Adapter Design

**Status:** design/review only. No source or asset changes. Snapshot: 2026-10-21. Line numbers may shift if the implementation worker edits concurrently.
**Goal:** drop in Tripo3D-exported rigged GLBs, one validated model at a time, without changing dialogue, story state, camera framing, or offline play. The procedural cast remains the deterministic fallback.

## 1. Current-state facts and coupling points

There is no GLB loader, asset manifest, name-tag object, or `public/assets/characters/` directory yet. All five advisors are one synchronous class, `AnimalAvatar`, instantiated directly by `Boardroom`.

- **Cast and seats:** five fixed seats (`shell`, `mori`, `pip`, `grumble`, `bolt`) with x/z and facing (`src/scene/boardroom.ts:19-25`). `Boardroom` creates each avatar synchronously in its constructor, adds `avatar.group`, and stores it in `Map<CharacterId, AnimalAvatar>` (`src/scene/boardroom.ts:29,34-51`).
- **Stable world anchor:** `AnimalAvatar.group` is the root, named `advisor-${id}`, positioned at the seat and yaw-rotated to face the camera (`src/scene/animals.ts:32-41`). Geometry is built in local coordinates with feet/ring at y=0; head pivot is y=2.44 (`src/scene/animals.ts:72-74`). The cast is roughly 3.0–3.3 units tall including ears. This root, not a loaded GLB scene, is what seating and cameras reference.
- **Visual contents:** procedural body, arms, head, eyes, brows, mouth, species features, accessories, tail, and focus ring (`src/scene/animals.ts:43-183,186-343`). Each avatar owns its materials and most geometry. There is no `dispose()` on `AnimalAvatar` or `Boardroom`; `SceneDirector.dispose()` disposes only the factory and renderer (`src/scene/scene-director.ts:292-299`). The shared helper disposes geometries/materials but **not textures** (`src/scene/primitives.ts:124-139`).
- **Speaking contract:** `setSpeaking(true)` sets internal state and reveals a foot focus ring; it does not control DOM dialogue or audio (`src/scene/animals.ts:334-348`). `Boardroom.setSpeaker()` calls it for every avatar on every applied state (`src/scene/boardroom.ts:354-361`).
- **Mood contract:** `Mood` is `neutral | thoughtful | pleased | concerned` (`src/core/types.ts:17`). `setMood()` tilts mouth/brows; neutral is the reset state (`src/scene/animals.ts:350-397`). The boardroom currently calls `setMood()` repeatedly; an adapter must make setters idempotent or clips will restart on every render.
- **Update contract:** `update(time, delta)` uses absolute elapsed seconds for breathing, head sway, blink cadence, and talking; `delta` for damping (`src/scene/animals.ts:399-429`). `SceneDirector` passes elapsed seconds and a delta capped at 0.1 (`src/scene/scene-director.ts:271-275`). `Boardroom` updates every avatar while visible (`src/scene/boardroom.ts:370-376`). A GLB mixer should consume capped delta, not elapsed time.
- **Reset contract:** `resetPerformance()` clears speaking, hides the ring, neutralizes mood, and resets head rotation (`src/scene/animals.ts:431-436`). `Boardroom.reset()` calls it for all avatars (`src/scene/boardroom.ts:378-385`); `showBoardroom()` and Reset Demo invoke that path (`src/scene/scene-director.ts:123-132`, `src/ui/ui.ts:1217-1226`).
- **Camera coupling:** camera focus uses only the root x/z plus a fixed y=2.4, then a fixed boardroom pose (`src/scene/boardroom.ts:363-368`, `src/scene/scene-director.ts:152-176`). The root must never move during a GLB swap, or focus/wide shots will jump. `applyState()` resolves the current dialogue line/mood before focusing (`src/scene/scene-director.ts:113-121`).
- **Dialogue/name coupling:** names, species, roles, monograms, and speaker labels come from `CHARACTERS` and DOM, not the 3D object (`src/core/story.ts:16-77`, `src/ui/ui.ts:686-698`). Do not add baked 3D text; keep these labels intact. Projected DOM tags, if ever added, should use an adapter head anchor.
- **Startup/lifecycle coupling:** `SceneDirector` constructs `Boardroom` as a field initializer (`src/scene/scene-director.ts:39`), before the renderer/animation loop, and `main.ts` catches synchronous 3D failure but continues text-only (`src/main.ts:35-41`). Therefore model loading must never be awaited by the constructor and must never throw asynchronously.
- **Build/asset coupling:** Vite serves `public/` at the base URL; production base is `/` locally or `/nintendo-next-blue-ocean/` for Pages unless `VITE_BASE` overrides (`blue-ocean-game/vite.config.ts:5-8`). `npm run build` is typecheck plus Vite (`blue-ocean-game/package.json:7-10`). Canonical model paths are defined in `ASSET_PIPELINE.md:29-39`.

**Invariants for any replacement:** stable root identity/name/position/facing; map entry remains valid; `setSpeaking`/speaking ring; all four moods; `update(elapsed, delta)`; reset; every-frame idempotence; no camera/dialogue edits; immediate offline fallback.

## 2. Recommended drop-in adapter interface

Use a synchronous factory returning a permanent **slot handle** with a procedural visual mounted immediately. A GLB upgrade happens later inside that same root. This is a deliberate refinement of the `Promise<AdvisorHandle>` example in `ASSET_PIPELINE.md:42-51`: awaiting a model in `Boardroom` would delay the app and make offline failure a startup risk. `ready` supplies the async result; add `createAdvisorAsync` only if a Promise façade is desired.

```ts
import type * as THREE from 'three'
import type { CharacterId, CharacterProfile, Mood } from '../core/types'

export type AdvisorId = Exclude<CharacterId, 'narrator'>
export type AdvisorEmotion = 'idle' | 'think' | 'excited' | 'disappointed'
export type AdvisorSource = 'procedural' | 'glb'
export type AdvisorClip = 'idle' | 'talk' | 'think' | 'celebrate' | 'disappointed'

export interface AdvisorAssetSpec {
  folder: string                  // 'fox', 'owl', 'beaver', 'bear', 'tortoise'
  file: string                    // 'fox.glb', ...
  targetHeight: number            // default 3.0 world units
  yawOffsetDeg?: number           // rotate GLB front to +Z; root yaw unchanged
  clips?: Partial<Record<AdvisorClip, string>> // exact exported names override aliases
}

export interface AdvisorOptions {
  position: readonly [number, number, number]
  facing?: number
  loadModel?: boolean             // default true; false for tests/rollback
  baseUrl?: string                // default import.meta.env.BASE_URL
}

export interface AdvisorHandle {
  readonly id: AdvisorId
  readonly profile: CharacterProfile
  readonly root: THREE.Group          // stable seat anchor; NEVER replaced
  readonly headAnchor: THREE.Object3D // y≈0.82 × targetHeight; tags/projection only
  readonly source: AdvisorSource
  readonly ready: Promise<AdvisorSource> // resolves after attempt; never rejects
  setEmotion(emotion: AdvisorEmotion): void
  setMood(mood: Mood): void           // compatibility shim; maps to emotion, idempotent
  setSpeaking(speaking: boolean): void
  focus(active?: boolean): void
  update(elapsedSeconds: number, deltaSeconds: number): void
  resetPerformance(): void
  dispose(): void
}

export function createAdvisor(id: AdvisorId, options: AdvisorOptions): AdvisorHandle
export function preloadAdvisor(id: AdvisorId, baseUrl?: string): Promise<AdvisorSource>
export function clearAdvisorCache(): void
```

Asset map and URL contract:

```ts
export const ADVISOR_ASSETS: Record<AdvisorId, AdvisorAssetSpec> = {
  mori:   { folder: 'owl',      file: 'owl.glb',      targetHeight: 3.0 },
  pip:    { folder: 'fox',      file: 'fox.glb',      targetHeight: 3.0 },
  bolt:   { folder: 'beaver',   file: 'beaver.glb',   targetHeight: 3.0 },
  grumble:{ folder: 'bear',     file: 'bear.glb',     targetHeight: 3.0 },
  shell:  { folder: 'tortoise', file: 'tortoise.glb', targetHeight: 3.0 },
}
// base = (options.baseUrl ?? import.meta.env.BASE_URL).replace(/\/?$/, '/')
// url  = `${base}assets/characters/${spec.folder}/${spec.file}`  — no leading slash
```

**Load/parse and caching.** Create one module-level `GLTFLoader` from `three/addons/loaders/GLTFLoader.js`. Cache one attempt per `AdvisorId`; a rejected load is remembered for the page lifetime (no retry loop, no console spam). Use `loadAsync(url)`, catch every failure, and return the fallback. Require at least one `Mesh`, at least one `SkinnedMesh`, a finite non-zero bounding height, and an `idle` clip (the pipeline minimum at `ASSET_PIPELINE.md:20,48`). Reject/fallback for unreadable GLB, unsupported compression, no rig, no usable idle clip, or absurd scale. Do not configure Draco/Meshopt/KTX2 loaders unless the asset pipeline explicitly adopts them.

**Cloning/skinning.** Cache the parsed source but never attach it. Clone each instance with `SkeletonUtils.clone()` from `three/addons/utils/SkeletonUtils.js`; ordinary `Object3D.clone()` can break skinned skeleton bindings. Create one `AnimationMixer(instanceVisual)` per handle and bind cached clips to that clone. Strip embedded cameras/lights from imported scenes.

**Scale/orientation/anchors.** Keep `root.position` = the seat x/z with y=0 and `root.rotation.y` = seat facing, exactly as `AnimalAvatar` (`src/scene/animals.ts:38-41`). Put the cloned visual and normalization wrapper beneath the root. Temporarily put the skeleton in bind pose, call `updateMatrixWorld(true)`, measure with `Box3`, scale uniformly so height = `targetHeight`, center x/z, and translate so `box.min.y` sits at 0. Apply `yawOffsetDeg` to the visual wrapper, not the root. Set `headAnchor` at roughly 82% of normalized height, and `root.name = "advisor-${id}"`, `root.userData = { characterId, advisorSource }`. Never silently move the seat to compensate; expose per-character offsets in the manifest instead. Name tags remain the existing DOM labels; a future tag must project `headAnchor`, not add text geometry.

**Animation selection/looping.** Resolve clips by manifest name first, then conservative aliases (`idle|breath`, `talk|speak|gesture`, `think|ponder`, `celebrat|happy|excited`, `disappoint|sad|concern`). Idle is required and loops; talk is optional and loops while speaking; think loops while selected; celebrate/disappointed play once (`LoopOnce`) and fade back to idle/talk on `finished`. Priority: active emotion clip > talk when speaking > idle. Crossfade 0.2–0.3s; never restart the same action or emit duplicate mixer events. Missing talk/emotion clips degrade to idle plus subtle wrapper/head-anchor motion; if a clearly named head bone is available and configured, a small secondary tilt is allowed, but do not guess facial bones or morph targets. `setSpeaking`/`setEmotion`/`setMood` must be edge-triggered and safe to call repeatedly. `resetPerformance()` stops one-shots, returns to idle, hides focus, and clears cached emotion. `update()` calls `mixer.update(Math.min(deltaSeconds, 0.1))`; elapsed time is only for procedural secondary motion.

**Material/frustum/performance policy.** Preserve the GLB's embedded textures and PBR materials (one atlas, 512–1024px target per `ASSET_PIPELINE.md:16-19`). Enable cast/receive shadows on opaque meshes; disable shadow casting for transparent ones; do not force unlit materials. Do not mutate shared cached materials. Set `frustumCulled = false` only on skinned meshes (animated bounds can cull incorrectly); leave other meshes culled. Log per-character triangles/material/draw-call cost and expose it via debug info, but keep the story independent of it. Target 2,000–5,000 triangles and ≤1 material per character. Remove cameras/lights; no postprocessing, LOD, or per-frame material churn.

**Async races and deterministic fallback.** `createAdvisor` synchronously builds the existing procedural avatar beneath the stable root, starts the optional load in a microtask, and returns. Validation happens before any swap; on success, atomically replace only the visual child. If the handle is disposed or reset while loading, ignore the result and attach nothing. If the file is absent, is an HTML/404 response, is corrupt, lacks a rig/idle clip, or the runtime is offline, keep the procedural visual and resolve `ready` as `'procedural'`. The app never blocks, throws, or shows a modal for character failure. Do not dispose shared cached geometry/materials when a single handle is disposed; stop its mixer, uncache its root, and dispose only handle-owned resources. `clearAdvisorCache()` must dispose textures as well as geometry/material; the existing `disposeObject` helper does not (`src/scene/primitives.ts:124-139`).

## 3. Non-destructive migration sequence

Each step should end with `npm test`, `npm run build`, and a short manual story run before the next begins. Every step is reversible by leaving the asset absent or setting `loadModel: false`.

| Step | Change | Files that would eventually change |
|---|---|---|
| 0 | Record baseline: tests/build, screenshots, draw calls. | none |
| 1 | Add pure asset manifest, URL helper, loader/cache, validation; **no integration**. Unit-test URL/base and rejection paths. | new `src/scene/character-loader.ts` |
| 2 | Add `AdvisorHandle` + procedural adapter wrapping `AnimalAvatar`; move the focus ring to the permanent slot root so swaps keep it. `loadModel: false`. | new `src/scene/character-adapter.ts`; possibly small export change in `src/scene/animals.ts` |
| 3 | Change `Boardroom` map/creation to `AdvisorHandle` but still construct synchronously with the procedural visual; no network. Verify zero visual/camera diff. | `src/scene/boardroom.ts` |
| 4 | Enable optional background loading with all GLBs absent. Confirm one failed request per ID, fallback, no unhandled rejection, full story. | adapter/loader only |
| 5 | Add only `fox/fox.glb`; validate with Section 4. Then add owl, beaver, bear, tortoise one per commit, repeating validation. | `public/assets/characters/**`, manifest only if filenames differ |
| 6 | Add handle/boardroom disposal (mixer, clone, focus ring), texture-aware cache clearing, and optional debug counters. | `boardroom.ts`, `scene-director.ts` debug/dispose, loader |
| 7 | Optional polish (better clip aliases, DOM-projected head tags, subtle gestures) only after all five pass. | adapter/UI overlay only; never story or camera constants |

Do not change `src/core/types.ts`, `src/core/story.ts`, `src/core/state.ts`, `src/ui/ui.ts` dialogue labels, the fixed camera poses, or factory/prototype code. The only `scene-director.ts` changes should be debug reporting and lifecycle disposal.

## 4. Validation checklist for the first rigged GLB (fox)

**Provenance/licensing gate (before the file enters `public/`):** original Tripo3D output or otherwise documented rights for this project; no Nintendo/Animal Crossing meshes, textures, names, or extracted audio; no unknown downloaded components; embedded/local textures only; record tool/account/date, source prompt/style reference, license/ownership note, SHA-256, triangle count, material count, texture sizes, rig/clip names, and validation date. A model that cannot pass this gate is not a candidate, even if it renders.

**Build and loading**
1. Place exactly one file at `blue-ocean-game/public/assets/characters/fox/fox.glb`; all other character files remain absent. Run `cd C:\Users\robwa\Desktop\Nintendo\blue-ocean-game`, `npm test`, `npm run build`, `npm run dev`.
2. At 1920×1080, confirm the app starts immediately with all five procedural characters. Network shows one local `fox.glb` request (200); no CDNs, external textures, or failed fonts. A successful validated model swaps in without reload; failure leaves the fox placeholder.
3. Check console: no uncaught error/unhandled rejection; one concise fallback reason at most. Reload, refresh mid-chapter, Reset Demo, and replay factory; no duplicate fox instances, no repeated load, no stale visual.

**Visual and camera**
4. In the wide shot and when Pip speaks, feet contact y=0, fox is centered in the seat, faces the board/camera, is not hidden by table/chair, and height/framing match the prior placeholder. Root x/z and camera poses are unchanged.
5. Check daytime/tone-mapped materials under the existing lights; shadows do not flicker or explode; no camera clipping.
6. Toggle presenter mode/reset and return from the factory: focus ring still works and no T-pose flashes after reset.

**Animation and state**
7. Idle loops for at least 30 seconds without snapping, double playback, or drift; no root translation across the seat.
8. Advance dialogue: neutral speaker plays talk (if present) or remains idle with the speaking ring; `thoughtful`, `pleased`, and `concerned` map to the correct clips or degrade gracefully. No restart on repeated UI renders. One-shots return to idle without a limb snap.
9. Temporarily remove the talk clip mapping from the manifest/asset: no exception, idle + subtle secondary motion, story continues. Restore it.
10. Remove/rename the GLB, then test a zero-byte/corrupt GLB: the procedural fox remains, no exception, and all three chapters/finale are completable offline.

**Deployment/performance**
11. Test `npm run preview`, then the GitHub Pages configuration in PowerShell: `$env:GITHUB_PAGES='true'; $env:VITE_BASE='/nintendo-next-blue-ocean/'; npm run build; Remove-Item Env:GITHUB_PAGES; Remove-Item Env:VITE_BASE`; `npm run preview`. Confirm the GLB resolves under the subpath and no leading-root URL is requested.
12. Disable Wi-Fi with the local preview running and complete the story. Confirm all assets are bundled, the fallback still works when a model is missing, and babble/mute behavior is unaffected.
13. With all five eventually loaded, check 30 fps minimum on the target laptop, draw calls/triangles, memory stability after replay/reset, and no texture/shader leak in a 10-minute run.

## 5. Risks/gotchas and explicit non-goals

**Risks/gotchas**
- A global T-pose/pose pop, missing bounds, or disappearing skinned mesh: use `SkeletonUtils.clone`, bind-pose measurement, and disable frustum culling only on skinned meshes.
- Wrong units/front axis/foot pivot: Tripo assets may be meters, face -Z, or be centered at the torso. Normalize before swap; keep this out of camera code.
- Root-motion clips can walk a seated character out of frame. Require in-place clips; optionally filter only documented scene-root translation tracks.
- Shared cache ownership: don't dispose a geometry/material still used by another clone. Textures are not handled by the current dispose helper.
- `setMood`/`setSpeaking` being called repeatedly by render/state application can restart clips; edge-trigger them.
- PBR materials may look darker/shinier than the flat procedural cast under ACES; tune only the asset/material at import, not global lighting.
- Missing/renamed clips, unsupported Draco/Meshopt, or external texture URLs fail offline. Validate before shipping.
- Loading after reset/dispose can attach stale objects. Guard with handle/generation state.
- Name tags in 3D would risk legibility and would duplicate DOM labels; use DOM/projected tags if needed.
- Vite dev may answer a missing asset with an HTML document; treat parse failure exactly like offline failure.

**Explicit non-goals:** no backend, CDN, runtime generation, Tripo calls, downloads, or paid services; no changing story, dialogue, votes, camera, or factory code; no game-physics, ragdolls, locomotion, raycaster walking, or camera orbit; no facial-morph/lip-sync guarantee; no 3D text name tags; no nine-model prototype variants; no LOD/compression pipeline in this phase; no model is accepted without the provenance gate.
