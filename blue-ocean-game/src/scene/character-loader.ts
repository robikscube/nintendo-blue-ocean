import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { CharacterId } from '../core/types'

/**
 * Optional Tripo3D GLB pipeline for the five boardroom advisors.
 *
 * This module only *finds, loads, validates and caches* external character
 * models. It never mounts anything into the scene: `character-adapter.ts`
 * owns the stable advisor slot and decides when a validated model may replace
 * the procedural fallback. Every public load path resolves; nothing rejects,
 * and a missing/corrupt/offline asset is a normal `procedural` result.
 *
 * No Draco/Meshopt/KTX2 decoder is configured on purpose. The asset pipeline
 * delivers plain embedded GLBs, and unsupported compression must fall back
 * rather than throw at load time.
 */

export type AdvisorId = Exclude<CharacterId, 'narrator'>
export type AdvisorEmotion = 'idle' | 'think' | 'excited' | 'disappointed'
export type AdvisorSource = 'procedural' | 'glb'
export type AdvisorClip = 'idle' | 'talk' | 'think' | 'celebrate' | 'disappointed'

export interface AdvisorAssetSpec {
  /** Folder inside `public/assets/characters/`. */
  folder: string
  /** File name inside the folder. */
  file: string
  /** Normalized world height in boardroom units. */
  targetHeight: number
  /** Rotate the exported model's front to +Z. The seat root yaw is untouched. */
  yawOffsetDeg?: number
  /** Exact exported clip names, when the aliases below are not enough. */
  clips?: Partial<Record<AdvisorClip, string>>
}

/**
 * Canonical drop-in locations. Directory spelling matches ASSET_PIPELINE.md.
 * Keep target height at 3.0 so framing and the speaker camera stay identical
 * to the procedural cast.
 */
export const ADVISOR_ASSETS: Record<AdvisorId, AdvisorAssetSpec> = {
  mori: { folder: 'owl', file: 'owl.glb', targetHeight: 3.0 },
  pip: { folder: 'fox', file: 'fox.glb', targetHeight: 3.0 },
  bolt: { folder: 'beaver', file: 'beaver.glb', targetHeight: 3.0 },
  grumble: { folder: 'bear', file: 'bear.glb', targetHeight: 3.0 },
  shell: { folder: 'tortoise', file: 'tortoise.glb', targetHeight: 3.0 },
}

export const ADVISOR_IDS = ['mori', 'pip', 'bolt', 'grumble', 'shell'] as const satisfies readonly AdvisorId[]

/** A GLB is never stretched to more than this ratio without being rejected. */
const MIN_SCALE_RATIO = 0.001
const MAX_SCALE_RATIO = 1000

/** Conservative, documented clip aliases. Explicit manifest names win first. */
export const ADVISOR_CLIP_ALIASES: Record<AdvisorClip, readonly string[]> = {
  idle: ['idle', 'breath', 'breathing'],
  talk: ['talk', 'speak', 'speaking', 'gesture', 'gesturing'],
  think: ['think', 'thinking', 'ponder', 'pondering'],
  celebrate: ['celebrate', 'celebration', 'celebrating', 'happy', 'excited'],
  disappointed: ['disappointed', 'disappointment', 'sad', 'concern', 'concerned'],
}

export type ResolvedAdvisorClipMap = Partial<Record<AdvisorClip, string>>

export type AdvisorFallbackCode =
  | 'unknown-asset'
  | 'load-failed'
  | 'no-mesh'
  | 'no-rig'
  | 'invalid-bounds'
  | 'missing-idle'

export interface AdvisorMetrics {
  /** Source (pre-normalization) bounding height in GLB units. */
  height: number
  width: number
  depth: number
  meshCount: number
  skinnedMeshCount: number
  triangleCount: number
  materialCount: number
}

export type AdvisorValidation =
  | {
      ok: true
      clipMap: ResolvedAdvisorClipMap
      idleClip: THREE.AnimationClip
      metrics: AdvisorMetrics
    }
  | { ok: false; code: AdvisorFallbackCode; detail: string }

export interface CachedAdvisorModel {
  readonly id: AdvisorId
  /** Parsed source scene. Never attached directly; clone it with SkeletonUtils. */
  readonly scene: THREE.Group
  readonly clips: readonly THREE.AnimationClip[]
  readonly clipMap: ResolvedAdvisorClipMap
  readonly metrics: AdvisorMetrics
  readonly url: string
}

export type AdvisorLoadResult =
  | { source: 'glb'; model: CachedAdvisorModel }
  | { source: 'procedural'; reason: AdvisorFallbackCode; detail: string; url: string }

/* -------------------------------------------------------------------------- */
/* URL handling                                                                */
/* -------------------------------------------------------------------------- */

function readViteBaseUrl(): string | undefined {
  try {
    // Access the property directly so Vite can statically replace it with the
    // configured base. An indirect `import.meta.env?.BASE_URL` access survives
    // minification untouched and resolves to '/' in production builds.
    return import.meta.env.BASE_URL
  } catch {
    return undefined
  }
}

/**
 * Normalize a Vite base into a prefix that always ends in exactly one slash.
 * Works for '/', '/nintendo-next-blue-ocean/' and relative bases such as './'.
 */
export function normalizeBaseUrl(baseUrl?: string): string {
  const raw = (baseUrl ?? readViteBaseUrl() ?? '/').trim()
  if (!raw) return '/'
  return raw.endsWith('/') ? raw : `${raw}/`
}

/**
 * Resolve the canonical GLB URL for an advisor under the active Vite base.
 * The `assets/...` segment deliberately has no leading slash so GitHub Pages
 * subpath hosting and relative preview servers both work.
 */
export function getAdvisorAssetUrl(id: AdvisorId, baseUrl?: string): string {
  const spec = ADVISOR_ASSETS[id]
  return `${normalizeBaseUrl(baseUrl)}assets/characters/${spec.folder}/${spec.file}`
}

/* -------------------------------------------------------------------------- */
/* Clip resolution                                                             */
/* -------------------------------------------------------------------------- */

function clipTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function matchesAlias(name: string, alias: string): boolean {
  if (name.toLowerCase() === alias) return true
  const tokens = clipTokens(name)
  return tokens.some((token) => token === alias || (alias.length >= 6 && token.startsWith(alias)))
}

/**
 * Map semantic actions to exported clip names.
 *
 * Priority per action: an explicit manifest name (case-insensitive), then the
 * conservative aliases above, then nothing. A clip already claimed by a more
 * important action is not reused, so `Idle_Talk` cannot drive both idle and
 * talk. Idle is resolved first because the pipeline treats it as mandatory.
 */
export function resolveAdvisorClipMap(
  availableNames: readonly string[],
  spec?: Pick<AdvisorAssetSpec, 'clips'>,
): ResolvedAdvisorClipMap {
  const result: ResolvedAdvisorClipMap = {}
  const claimed = new Set<string>()
  const order: readonly AdvisorClip[] = ['idle', 'talk', 'think', 'celebrate', 'disappointed']

  for (const semantic of order) {
    const explicit = spec?.clips?.[semantic]
    let chosen: string | undefined

    if (explicit) {
      const wanted = explicit.toLowerCase()
      chosen = availableNames.find((name) => !claimed.has(name) && name.toLowerCase() === wanted)
    }

    if (!chosen) {
      for (const alias of ADVISOR_CLIP_ALIASES[semantic]) {
        chosen = availableNames.find((name) => !claimed.has(name) && matchesAlias(name, alias))
        if (chosen) break
      }
    }

    if (chosen) {
      result[semantic] = chosen
      claimed.add(chosen)
    }
  }

  return result
}

/* -------------------------------------------------------------------------- */
/* Validation and scene hygiene                                                */
/* -------------------------------------------------------------------------- */

function isTransparentMaterial(mat: THREE.Material): boolean {
  return mat.transparent === true || mat.opacity < 1
}

/** Remove cameras, lights and other non-visual GLB nodes in place. */
export function stripNonVisualObjects(root: THREE.Object3D): void {
  const removable: THREE.Object3D[] = []
  root.traverse((object) => {
    const light = object as THREE.Light
    const camera = object as THREE.Camera
    if (light.isLight || camera.isCamera) removable.push(object)
  })
  for (const object of removable) object.removeFromParent()
}

/**
 * Validate a parsed scene without touching it. The adapter uses the returned
 * clip map and metrics only after the asset has passed every gate.
 */
export function validateAdvisorScene(
  scene: THREE.Object3D,
  clips: readonly THREE.AnimationClip[],
  spec: AdvisorAssetSpec,
): AdvisorValidation {
  let meshCount = 0
  let skinnedMeshCount = 0
  let triangleCount = 0
  const materials = new Set<THREE.Material>()

  scene.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    meshCount += 1
    const skinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh === true
    if (skinned) skinnedMeshCount += 1

    const geometry = mesh.geometry
    const indexCount = geometry.index?.count
    const positionCount = geometry.getAttribute('position')?.count ?? 0
    triangleCount += Math.round((indexCount ?? positionCount) / 3)

    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of meshMaterials) materials.add(mat)
  })

  if (meshCount === 0) {
    return { ok: false, code: 'no-mesh', detail: 'GLB scene contains no meshes.' }
  }
  if (skinnedMeshCount === 0) {
    return { ok: false, code: 'no-rig', detail: 'GLB scene contains no SkinnedMesh; rigged characters are required.' }
  }

  scene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3()
  box.getSize(size)
  const height = size.y
  const scaleRatio = height / spec.targetHeight

  if (
    !Number.isFinite(height) ||
    height <= 1e-6 ||
    !Number.isFinite(scaleRatio) ||
    scaleRatio < MIN_SCALE_RATIO ||
    scaleRatio > MAX_SCALE_RATIO
  ) {
    return {
      ok: false,
      code: 'invalid-bounds',
      detail: `GLB bounds are unusable (height ${Number.isFinite(height) ? height.toFixed(4) : String(height)} units).`,
    }
  }

  const clipMap = resolveAdvisorClipMap(
    clips.map((clip) => clip.name),
    spec,
  )
  const idleName = clipMap.idle
  const idleClip = idleName ? clips.find((clip) => clip.name === idleName) : undefined
  if (!idleClip) {
    return { ok: false, code: 'missing-idle', detail: 'GLB has no usable idle clip; the pipeline requires Idle.' }
  }

  return {
    ok: true,
    clipMap,
    idleClip,
    metrics: {
      height,
      width: size.x,
      depth: size.z,
      meshCount,
      skinnedMeshCount,
      triangleCount,
      materialCount: materials.size,
    },
  }
}

/** True when the mesh should cast/receive shadows under the boardroom lights. */
export function configureAdvisorMeshShadows(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    const transparent = Array.isArray(mesh.material)
      ? mesh.material.some(isTransparentMaterial)
      : isTransparentMaterial(mesh.material)
    mesh.castShadow = !transparent
    mesh.receiveShadow = !transparent
    // Animated skinned bounds are not reliable for culling; keep the character
    // visible even when its bind-pose bounds sit outside a camera frustum.
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh === true) mesh.frustumCulled = false
  })
}

/* -------------------------------------------------------------------------- */
/* Cache and loading                                                           */
/* -------------------------------------------------------------------------- */

let gltfLoader: GLTFLoader | null = null
let cacheGeneration = 0
const modelCache = new Map<AdvisorId, CachedAdvisorModel>()
const attemptCache = new Map<AdvisorId, Promise<AdvisorLoadResult>>()

function getGltfLoader(): GLTFLoader {
  gltfLoader ??= new GLTFLoader()
  return gltfLoader
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown GLB load failure.'
}

/**
 * Dispose geometry, materials, their textures and skeleton GPU resources.
 * Only call this on scenes this module owns (the cached source), never on an
 * individual clone still sharing the cached geometry/material.
 */
export function disposeAdvisorScene(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const skeletons = new Set<THREE.Skeleton>()

  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (mesh.isMesh) {
      geometries.add(mesh.geometry)
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of meshMaterials) materials.add(mat)
    }
    const skinned = object as THREE.SkinnedMesh
    if (skinned.isSkinnedMesh === true && skinned.skeleton) skeletons.add(skinned.skeleton)
  })

  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) {
    for (const value of Object.values(material)) {
      const texture = value as THREE.Texture | undefined
      if (texture && texture.isTexture) textures.add(texture)
    }
    material.dispose()
  }
  for (const texture of textures) texture.dispose()
  for (const skeleton of skeletons) skeleton.dispose()
}

function fallback(
  code: AdvisorFallbackCode,
  detail: string,
  url: string,
): Extract<AdvisorLoadResult, { source: 'procedural' }> {
  return { source: 'procedural', reason: code, detail, url }
}

async function loadAdvisorAsset(
  id: AdvisorId,
  baseUrl: string | undefined,
  generation: number,
): Promise<AdvisorLoadResult> {
  const spec = ADVISOR_ASSETS[id]
  if (!spec) return fallback('unknown-asset', `No advisor asset is registered for "${id}".`, '')

  const url = getAdvisorAssetUrl(id, baseUrl)

  let gltf: Awaited<ReturnType<GLTFLoader['loadAsync']>>
  try {
    gltf = await getGltfLoader().loadAsync(url)
  } catch (error) {
    return fallback('load-failed', describeError(error), url)
  }

  if (generation !== cacheGeneration) {
    // The cache was cleared while this request was in flight; the result must
    // not be resurrected after a reset.
    disposeAdvisorScene(gltf.scene)
    return fallback('load-failed', 'Advisor cache was cleared during loading.', url)
  }

  const validation = validateAdvisorScene(gltf.scene, gltf.animations ?? [], spec)
  if (!validation.ok) {
    disposeAdvisorScene(gltf.scene)
    return fallback(validation.code, validation.detail, url)
  }

  stripNonVisualObjects(gltf.scene)
  configureAdvisorMeshShadows(gltf.scene)

  const model: CachedAdvisorModel = {
    id,
    scene: gltf.scene,
    clips: gltf.animations ?? [],
    clipMap: validation.clipMap,
    metrics: validation.metrics,
    url,
  }

  if (generation !== cacheGeneration) {
    disposeAdvisorScene(model.scene)
    return fallback('load-failed', 'Advisor cache was cleared during validation.', url)
  }

  modelCache.set(id, model)
  return { source: 'glb', model }
}

/**
 * Cached model load. One attempt per advisor per page lifetime; failures are
 * remembered so an absent GLB produces exactly one request and no retry loop.
 * This promise never rejects.
 */
export function loadAdvisorModel(id: AdvisorId, baseUrl?: string): Promise<AdvisorLoadResult> {
  const cached = modelCache.get(id)
  if (cached) return Promise.resolve({ source: 'glb', model: cached })

  const existing = attemptCache.get(id)
  if (existing) return existing

  const generation = cacheGeneration
  const attempt = loadAdvisorAsset(id, baseUrl, generation)
  attemptCache.set(id, attempt)
  return attempt
}

/** Convenience façade for callers that only need the resolved source. */
export async function preloadAdvisor(id: AdvisorId, baseUrl?: string): Promise<AdvisorSource> {
  try {
    const result = await loadAdvisorModel(id, baseUrl)
    return result.source
  } catch {
    // Defensive: loadAdvisorModel already resolves every failure.
    return 'procedural'
  }
}

/** Return the already-validated cached model, if one is loaded. */
export function getCachedAdvisorModel(id: AdvisorId): CachedAdvisorModel | null {
  return modelCache.get(id) ?? null
}

/**
 * Drop all cached attempts and dispose cached source geometry/materials/
 * textures. Do not call while advisor handles that upgraded to GLB are still
 * alive: their clones share the cached geometry/material.
 */
export function clearAdvisorCache(): void {
  cacheGeneration += 1
  for (const model of modelCache.values()) disposeAdvisorScene(model.scene)
  modelCache.clear()
  attemptCache.clear()
}
