# TEAM CHARACTER — GLB Adapter and Boardroom Integration

**Teammate:** `characters` (nintendo-character-engineer)
**Status:** COMPLETE, integrated by lead at 23:11 PST
**Skills applied:** `.claude/skills/threejs-game`, `.claude/skills/game-architecture`, `.claude/skills/nintendo-game-design` (read in full before implementation).

## What was added (new files only)
- `blue-ocean-game/src/scene/character-loader.ts` — canonical asset map, `BASE_URL`-safe URLs, one-attempt cache, GLTF `loadAsync`, validation (mesh, skinned mesh, finite bounds, required idle clip), conservative semantic clip aliases, non-rejecting fallback result.
- `blue-ocean-game/src/scene/character-adapter.ts` — synchronous `createAdvisor` that mounts the existing procedural `AnimalAvatar` under a permanent seat root, then optionally upgrades to a validated GLB cloned with `SkeletonUtils`. Exposes `root`, `headAnchor`, `setMood`, `setSpeaking`, `setEmotion`, `focus`, `update`, `resetPerformance`, `dispose`, and `ready`.
- `blue-ocean-game/tests/character-adapter.test.ts` — 21 tests: URL/base resolution, clip alias/override resolution, validation rejection paths, lights/cameras stripped, all five procedural advisors, idempotent presenter calls, mocked full GLB swap under an unchanged root, one-attempt caching, shared-cache disposal ownership.
- `blue-ocean-game/public/assets/characters/README.md` — drop-in locations, provenance gate, naming, performance budgets, acceptance checklist.

**No GLB, downloaded asset, Tripo call, or paid service was used.** The five procedural advisors remain the shipped visual.

## Integration performed by the lead
- `src/scene/boardroom.ts`: `avatars` now `Map<AdvisorId, AdvisorHandle>`; constructor calls `createAdvisor({ position, facing })`, adds `avatar.root`; `getSpeakerPosition` reads `avatar.root`; added `dispose()`.
- `src/scene/scene-director.ts`: calls `boardroom.dispose()` on teardown and refreshes the static shadow map when an advisor's `ready` resolves `'glb'`.
- Camera poses, dialogue, story, and factory were not changed by the adapter.
- `tests/character-adapter.test.ts` passes as part of the full 58-test Vitest run; `tsc --noEmit` clean; `npm run build` succeeds; the canonical browser walkthrough passes with all five procedural advisors mounted.

## Contract
- App startup never awaits a model and never throws for a missing/corrupt/offline file.
- Mood mapping: neutral→idle, thoughtful→think, pleased→excited, concerned→disappointed; setters are edge-triggered.
- Mixer delta is capped at 0.1 s; crossfades 0.25 s; one-shots return to talk/idle; missing clips degrade to idle + subtle secondary motion.
- Root-motion clips are not filtered; assets must be exported in place.

## Known limitations
- No real Tripo3D model has been validated yet; orientation, materials, foot contact and clip names must be checked for the first delivered fox.
- With no files present, the loader makes five background requests. They are cached as failed, non-fatal, and produce no page or console errors; a filenames manifest would remove them but was not added to preserve true drop-in behavior.
- `clearAdvisorCache()` must not be called while GLB-backed handles are alive (their clones share cached resources).
