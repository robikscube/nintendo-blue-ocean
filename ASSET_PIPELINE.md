# Character Asset Pipeline — Tripo3D to Nintendo Blue Ocean Web Game
**Status:** Approved art workflow, optional upgrade to the 24-hour functional MVP. **Runtime:** Static and offline-capable once exported GLB files are bundled. **Character art:** Original designs inspired by the general charm of cozy, stylized low-poly games; no Nintendo/Animal Crossing meshes, character designs, extracted voices, or textures.

## 1. Production decision and priority
- **Final intended character source:** Tripo3D-generated 3D models for Slyvester the Fox, Hootley the Owl, Damian the Beaver, Pawson the Bear, and Chair Shelldon the Turtle. Internal ids and asset folders remain `fox/`, `owl/`, `beaver/`, `bear/`, and `tortoise/` for compatibility.
- **Tonight:** Claude Code must finish the playable story with original primitive placeholder animals and build a drop-in loader/controller abstraction. Do not make a Tripo account, use paid generation, download unknown assets, or block on missing GLBs.
- **Tomorrow / once available:** Hand a validated single FOX GLB to the game; confirm it loads and animates, then apply the same process to the remaining four.
- **Keep boardroom furniture, factory, robotic arms, stamping press and prototype consoles procedural in Three.js.** Existing gameplay stays playable if any external model fails.
- **No click-to-walk or Raycaster locomotion in MVP.** Keep fixed cinematographic boardroom/factory cameras. Clicking an advisor may focus the camera; movement/patrol can be explored after the lecture.

## 2. Create one coherent cast before generating 5 models
Use one master character reference/style sheet: short upright bodies, heads proportionally larger than torsos, distinctive ears/muzzles, rounded faceted forms, matte/pastel color blocking, clean simple faces, small business-style accessories, consistent eye materials and lighting. Avoid close reproduction of actual Animal Crossing character designs.
Generate the Fox first; use its proportions, palette, eye and clothing style as visual reference for the Owl, Beaver, Bear and Turtle. Ask Tripo for each original biped character in an **A-pose or neutral pose** with arms clearly separated from torso for rigging; request a readable front, side and rear reference when helpful. Check symmetry, clean hands/feet, no stray parts, correct face direction, and rig-safe joints before export.

## 3. Modeling, rigging and performance budgets
- Start with **2,000–5,000 triangles per character**, rather than treating under 2,000 as a hard cap. Measure triangle count (not just vague 'polygon' counts); only decimate if measured performance requires it. Keep total boardroom GPU/material/draw-call costs low; fewer materials and draw calls often matter more than tiny triangle differences.
- **Rig before destructive decimation/optimization** and verify skin weights afterward. Prefer a biped/humanoid skeleton for these anthropomorphic characters. Automated rigging may fail for unusual anatomy; inspect clips in the exporter or a viewer.
- Aim for **1 material/texture atlas per character**, with small textures (512–1024px as a starting point; evaluate on projected screen). Use physically inexpensive diffuse/flat-style shading, MeshLambertMaterial or restrained MeshStandardMaterial when appropriate; do not force everything into unlit materials because form and expression need readable lighting.
- GLB is the preferred final delivery format. It must contain the mesh, material(s), texture references embedded where possible, skeleton/skin weights, and any available animation clips. Browsers load via Three.js `GLTFLoader` (not natively by themselves). Accept `.gltf` with external files only as a fallback when all resources are co-located.
- Recommended motions: **Idle** (minimum), **Talk/Gesture**, **Think**, **Celebrate**, **Disappointed**. **Walk** is optional and not needed for MVP. Clip names may differ—record them and map through an adapter.
- If Tripo exports animations better via FBX for a particular character, use **Blender as a conversion/inspection tool only**: FBX import, verify skeleton, inspect animation clips, export GLB, reopen resulting GLB and confirm it works. Blender is optional, not a project dependency.
- Optional optimization after validation: glTF Transform or gltfpack. Preserve rigs, UVs, textures, morph targets, clips and clip names; do not introduce Draco/Meshopt-compressed files unless the loader is configured for their decoders. Compress textures only after they pass visual QA.

## 4. Delivery and naming
```
Nintendo/
  ASSET_PIPELINE.md
  blue-ocean-game/
    public/assets/characters/
      fox/fox.glb
      owl/owl.glb
      beaver/beaver.glb
      bear/bear.glb
      tortoise/tortoise.glb
    src/scene/
      character-loader.ts    # GLTFLoader, caching, runtime validation, fallback
      animals.ts             # reusable character slots and original primitives
```
All models optional until delivered. Store each model within its named folder. Do not include giant source assets or Blender files in the deployable `public` folder. Keep source images/working meshes outside published assets. The project must use `import.meta.env.BASE_URL` for assets on GitHub Pages.

## 5. Integration API contract for Claude Code
Provide character creation as a single abstraction, e.g. `createAdvisor(id, options): Promise<AdvisorHandle>`, where an advisor handle exposes:
- `root: THREE.Group` (stable world anchor that the camera and seating layout refer to)
- `setEmotion('idle'|'think'|'excited'|'disappointed')`
- `setSpeaking(boolean)`
- `focus()`, `update(deltaSeconds)`, `dispose()`
- Optional animation clips mapped by semantic action; support `AnimationMixer` and cross-fades if GLB clips exist.
- When a model is absent, invalid, poorly rigged, or lacks clips, **return an original procedural placeholder** with the same public interface. Do not throw or block the story.
- Normalize scale to a configurable common seated/standing height via bounding-box check, apply per-character orientation offsets, and position relative to a stable pivot at the feet. Keep speaking/emotion controls independent from dialogue narrative state.
- Facial animation should **not assume facial bones or morph targets are present**. If mouth/eye morph targets exist, drive them gently. Otherwise use parented simple meshes if compatible, or fallback to subtle head bob, eye movement via overlays, head tilt and blink cues. Do not deform/mutate imported skinned geometry indiscriminately.
- The synthetic babble generator stays separate from character meshes. Its speaking state drives subtle animation; never extract or mimic copyrighted game audio.

## 6. Acceptance test before accepting each model
1. Load GLB with Three.js GLTFLoader from local project server AND production preview; no missing external texture URLs, no console errors, no failed fetch under subpath hosting.
2. Inspect orientation, scale, floor contact, head/face visibility, shading and camera framing against fixed boardroom camera at 1920×1080.
3. Play an Idle animation loop for 30 seconds; switching between clips must not snap limbs, double-play sounds or leak memory. Missing optional clips should gracefully fall back.
4. Trigger dialogue and verify legible expressions/synthetic babble without lip-sync assumptions. Test mute and skip.
5. Repeat with all five advisors loaded at once; aim for smooth projector playback (30 fps minimum on target laptop) and sensible memory use.
6. Temporarily remove one GLB and confirm that its primitive character appears and the entire 3-chapter story remains playable.
7. Test Windows local preview and GitHub Pages-relative asset URLs; bundle all required files for offline classroom use.

## 7. Suggested schedule
**While Claude builds tonight:** Maintain modular `AdvisorHandle` interface, placeholders and optional GLB path lookup; do not trigger paid Tripo actions. **After full playable build is stable:** generate one fox in Tripo; verify rig, animation, texture and browser appearance; then generate the remaining four using matching references. **After all required gameplay tests:** polish facial controls, lighting and optional scripted gestures. Do not let character asset work delay the voting/story/factory/finale experience.
