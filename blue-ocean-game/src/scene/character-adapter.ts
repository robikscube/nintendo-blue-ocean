import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import type { CharacterProfile, Mood } from '../core/types'
import { CHARACTERS } from '../core/story'
import { AnimalAvatar } from './animals'
import {
  ADVISOR_ASSETS,
  loadAdvisorModel,
  stripNonVisualObjects,
  configureAdvisorMeshShadows,
  type AdvisorAssetSpec,
  type AdvisorClip,
  type AdvisorEmotion,
  type AdvisorId,
  type AdvisorLoadResult,
  type AdvisorSource,
  type CachedAdvisorModel,
} from './character-loader'
import { disposeObject } from './primitives'

// Public integration surface. The lead can import everything from this module.
export {
  ADVISOR_ASSETS,
  ADVISOR_CLIP_ALIASES,
  ADVISOR_IDS,
  clearAdvisorCache,
  configureAdvisorMeshShadows,
  disposeAdvisorScene,
  getAdvisorAssetUrl,
  getCachedAdvisorModel,
  loadAdvisorModel,
  normalizeBaseUrl,
  preloadAdvisor,
  resolveAdvisorClipMap,
  stripNonVisualObjects,
  validateAdvisorScene,
} from './character-loader'
export type {
  AdvisorAssetSpec,
  AdvisorClip,
  AdvisorEmotion,
  AdvisorFallbackCode,
  AdvisorId,
  AdvisorMetrics,
  AdvisorSource,
  AdvisorValidation,
  CachedAdvisorModel,
  ResolvedAdvisorClipMap,
} from './character-loader'

/** Height of the projected DOM-tag / head-focus anchor as a share of body height. */
const HEAD_ANCHOR_RATIO = 0.82
/** Hard cap on mixer delta, mirroring SceneDirector's frame cap. */
const MAX_MIXER_DELTA = 0.1
const CROSSFADE_SECONDS = 0.25

const MOOD_TO_EMOTION: Record<Mood, AdvisorEmotion> = {
  neutral: 'idle',
  thoughtful: 'think',
  pleased: 'excited',
  concerned: 'disappointed',
}

const EMOTION_TO_MOOD: Record<AdvisorEmotion, Mood> = {
  idle: 'neutral',
  think: 'thoughtful',
  excited: 'pleased',
  disappointed: 'concerned',
}

/** Public, stable mapping used by Boardroom's existing `setMood` calls. */
export function moodToAdvisorEmotion(mood: Mood): AdvisorEmotion {
  return MOOD_TO_EMOTION[mood] ?? 'idle'
}

export interface AdvisorOptions {
  position: readonly [number, number, number]
  facing?: number
  /** Default true. Pass false for tests or a no-network presenter fallback. */
  loadModel?: boolean
  /** Defaults to the active Vite base (works under GitHub Pages subpaths). */
  baseUrl?: string
}

export interface AdvisorHandle {
  readonly id: AdvisorId
  readonly profile: CharacterProfile
  /** Stable seat anchor. The camera/seating layout refers to this and only this. */
  readonly root: THREE.Group
  /** Projection anchor near the top of the head; never a substitute for DOM labels. */
  readonly headAnchor: THREE.Object3D
  readonly source: AdvisorSource
  /** Resolves exactly once with the source that ended up mounted. Never rejects. */
  readonly ready: Promise<AdvisorSource>
  setEmotion(emotion: AdvisorEmotion): void
  /** Compatibility shim for the existing AnimalAvatar API. Idempotent. */
  setMood(mood: Mood): void
  setSpeaking(speaking: boolean): void
  focus(active?: boolean): void
  update(elapsedSeconds: number, deltaSeconds: number): void
  resetPerformance(): void
  dispose(): void
}

/**
 * Synchronous factory: mounts the procedural AnimalAvatar immediately under a
 * permanent root, then optionally upgrades the visual in the background.
 * The app must never await a model, so a missing GLB cannot delay startup.
 */
export function createAdvisor(id: AdvisorId, options: AdvisorOptions): AdvisorHandle {
  return new AdvisorSlot(id, options)
}

class AdvisorSlot implements AdvisorHandle {
  readonly id: AdvisorId
  readonly profile: CharacterProfile
  readonly root: THREE.Group
  readonly headAnchor: THREE.Group
  readonly ready: Promise<AdvisorSource>

  private sourceValue: AdvisorSource = 'procedural'
  private readonly spec: AdvisorAssetSpec
  /** Holds either the procedural avatar or the normalized GLB wrapper. */
  private readonly visualSlot = new THREE.Group()
  /** Secondary motion layer so normalization scale/offsets stay untouched. */
  private readonly motion = new THREE.Group()
  /** Adapter-owned focus ring; only visible when it will not double the avatar's. */
  private readonly focusRing: THREE.Mesh
  private readonly phase: number
  private procedural: AnimalAvatar | null
  private mixer: THREE.AnimationMixer | null = null
  private actions: Partial<Record<AdvisorClip, THREE.AnimationAction>> = {}
  private currentAction: THREE.AnimationAction | null = null
  private oneShotAction: THREE.AnimationAction | null = null
  private emotion: AdvisorEmotion = 'idle'
  private speaking = false
  private focused = false
  private secondaryTime = 0
  private disposed = false
  private resolveReady: (source: AdvisorSource) => void = () => {}

  constructor(id: AdvisorId, options: AdvisorOptions) {
    this.id = id
    this.spec = ADVISOR_ASSETS[id]
    if (!this.spec) throw new Error(`No advisor asset spec registered for "${id}".`)
    this.profile = CHARACTERS[id]
    this.phase = hashString(id) * 0.37

    this.root = new THREE.Group()
    this.root.name = `advisor-${id}`
    this.root.position.set(...options.position)
    this.root.rotation.y = options.facing ?? 0
    this.root.userData = {
      characterId: id,
      advisorSource: 'procedural' satisfies AdvisorSource,
    }

    this.visualSlot.name = `advisor-visual-slot-${id}`
    this.visualSlot.add(this.motion)
    this.root.add(this.visualSlot)

    this.motion.name = `advisor-motion-${id}`
    const procedural = new AnimalAvatar(id, [0, 0, 0], 0)
    // The stable root already owns `advisor-<id>`; keep the internal visual
    // distinguishable for QA without changing AnimalAvatar's public contract.
    procedural.group.name = `advisor-procedural-${id}`
    this.motion.add(procedural.group)
    this.procedural = procedural

    this.headAnchor = new THREE.Group()
    this.headAnchor.name = `advisor-head-anchor-${id}`
    this.headAnchor.position.set(0, this.spec.targetHeight * HEAD_ANCHOR_RATIO, 0)
    this.root.add(this.headAnchor)

    this.focusRing = this.createFocusRing()
    this.root.add(this.focusRing)

    this.ready = new Promise<AdvisorSource>((resolve) => {
      this.resolveReady = resolve
    })

    if (options.loadModel === false) {
      this.resolveReady('procedural')
      return
    }

    queueMicrotask(() => {
      void this.tryUpgrade(options.baseUrl)
    })
  }

  get source(): AdvisorSource {
    return this.sourceValue
  }

  setEmotion(emotion: AdvisorEmotion): void {
    if (this.disposed || emotion === this.emotion) return
    this.emotion = emotion
    if (this.procedural) {
      this.procedural.setMood(EMOTION_TO_MOOD[emotion])
    } else {
      this.reconcileAnimation()
    }
  }

  setMood(mood: Mood): void {
    this.setEmotion(moodToAdvisorEmotion(mood))
  }

  setSpeaking(speaking: boolean): void {
    if (this.disposed || speaking === this.speaking) {
      this.updateRing()
      return
    }
    this.speaking = speaking
    if (this.procedural) {
      this.procedural.setSpeaking(speaking)
    } else {
      this.reconcileAnimation()
    }
    this.updateRing()
  }

  focus(active = true): void {
    if (this.disposed) return
    this.focused = active
    this.updateRing()
  }

  update(elapsedSeconds: number, deltaSeconds: number): void {
    if (this.disposed) return

    if (this.procedural) {
      this.procedural.update(elapsedSeconds, deltaSeconds)
      return
    }

    const delta = Math.min(Math.max(deltaSeconds, 0), MAX_MIXER_DELTA)
    this.mixer?.update(delta)

    // Imported clips may lack breathing; a tiny procedural sway keeps the cast
    // alive without touching the normalized model transform or the seat root.
    this.secondaryTime += delta
    const sway = Math.sin(this.secondaryTime * 0.9 + this.phase)
    this.motion.position.y = sway * 0.006
    this.motion.rotation.z = Math.sin(this.secondaryTime * 0.55 + this.phase) * 0.004

    if (this.focusRing.visible) {
      this.focusRing.scale.setScalar(1 + Math.sin(elapsedSeconds * 2.6) * 0.04)
    }
  }

  resetPerformance(): void {
    if (this.disposed) return
    this.speaking = false
    this.emotion = 'idle'
    this.focused = false
    this.oneShotAction = null
    this.secondaryTime = 0
    this.motion.position.y = 0
    this.motion.rotation.z = 0

    if (this.procedural) {
      this.procedural.resetPerformance()
    } else if (this.mixer) {
      this.mixer.stopAllAction()
      this.currentAction = null
      this.reconcileAnimation(true)
    }

    this.updateRing()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.settleReady()

    if (this.mixer) {
      this.mixer.removeEventListener('finished', this.handleFinished)
      this.mixer.stopAllAction()
      this.mixer.uncacheRoot(this.motion)
      this.mixer = null
    }

    if (this.procedural) {
      // Procedural geometry/materials are owned by this slot.
      disposeObject(this.procedural.group)
      this.procedural = null
    } else {
      this.disposeCloneSkeletons()
    }

    this.actions = {}
    this.currentAction = null
    this.oneShotAction = null
    this.focusRing.geometry.dispose()
    const ringMaterial = this.focusRing.material
    if (Array.isArray(ringMaterial)) {
      for (const mat of ringMaterial) mat.dispose()
    } else {
      ringMaterial.dispose()
    }
    this.root.removeFromParent()
    this.root.clear()
  }

  /* ---------------------------------------------------------------------- */
  /* Background upgrade                                                     */
  /* ---------------------------------------------------------------------- */

  private async tryUpgrade(baseUrl?: string): Promise<void> {
    let result: AdvisorLoadResult
    try {
      result = await loadAdvisorModel(this.id, baseUrl)
    } catch (error) {
      result = {
        source: 'procedural',
        reason: 'load-failed',
        detail: error instanceof Error ? error.message : 'Unknown advisor load failure.',
        url: '',
      }
    }

    if (this.disposed) {
      this.settleReady()
      return
    }

    if (result.source === 'glb') {
      try {
        this.installModel(result.model)
        this.root.userData.advisorMetrics = result.model.metrics
        this.root.userData.advisorClipMap = result.model.clipMap
      } catch (error) {
        // Keep the procedural visual: validation happened already, but
        // normalization/cloning must still never break the story.
        if (typeof console !== 'undefined') {
          console.warn(`[advisor] Keeping procedural ${this.id}; GLB preparation failed.`, error)
        }
      }
    }

    this.settleReady()
  }

  private settleReady(): void {
    this.resolveReady(this.sourceValue)
  }

  private installModel(model: CachedAdvisorModel): void {
    const built = buildAdvisorVisual(model, this.spec)

    let mixer: THREE.AnimationMixer | null = null
    try {
      mixer = new THREE.AnimationMixer(built.wrapper)
      const actions: Partial<Record<AdvisorClip, THREE.AnimationAction>> = {}
      const entries = Object.entries(model.clipMap) as Array<[AdvisorClip, string]>
      for (const [semantic, clipName] of entries) {
        const clip = model.clips.find((candidate) => candidate.name === clipName)
        if (clip) actions[semantic] = mixer.clipAction(clip)
      }
      mixer.addEventListener('finished', this.handleFinished)

      // Commit point: only now replace the visual.
      if (this.procedural) {
        this.procedural.group.removeFromParent()
        disposeObject(this.procedural.group)
        this.procedural = null
      }
      this.motion.add(built.wrapper)
      this.mixer = mixer
      this.actions = actions
      this.currentAction = null
      this.oneShotAction = null
      this.headAnchor.position.y = this.spec.targetHeight * HEAD_ANCHOR_RATIO
      this.sourceValue = 'glb'
      this.root.userData.advisorSource = 'glb'
      this.reconcileAnimation(true)
      this.updateRing()
    } catch (error) {
      if (mixer) {
        mixer.removeEventListener('finished', this.handleFinished)
        mixer.stopAllAction()
      }
      built.wrapper.removeFromParent()
      throw error
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Animation state                                                        */
  /* ---------------------------------------------------------------------- */

  private reconcileAnimation(force = false): void {
    if (!this.mixer) return

    if (this.emotion !== 'idle') {
      const semantic: AdvisorClip =
        this.emotion === 'think' ? 'think' : this.emotion === 'excited' ? 'celebrate' : 'disappointed'
      const action = this.actions[semantic]
      if (action) {
        if (semantic === 'think') {
          // Switching from a one-shot to a looping emotion must detach the
          // finished handler; otherwise the old action's fade-out completion
          // would erase the new emotion.
          this.oneShotAction = null
          this.playAction(action, true)
        } else {
          if (this.currentAction !== action || force) {
            this.playAction(action, false)
            this.oneShotAction = action
          }
        }
        return
      }
      // Missing emotion clip: fall through to talk/idle rather than freezing.
    }

    if (this.speaking && this.actions.talk) {
      this.oneShotAction = null
      this.playAction(this.actions.talk, true)
      return
    }

    if (this.actions.idle) {
      this.oneShotAction = null
      this.playAction(this.actions.idle, true)
    }
  }

  private playAction(action: THREE.AnimationAction, loop: boolean): void {
    if (this.currentAction === action) return

    const previous = this.currentAction
    action.reset()
    action.enabled = true
    action.setEffectiveTimeScale(1)
    action.setEffectiveWeight(1)
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1)
    action.clampWhenFinished = !loop
    action.play()
    if (previous && previous !== action) {
      action.crossFadeFrom(previous, CROSSFADE_SECONDS, false)
    }
    this.currentAction = action
  }

  private readonly handleFinished = (event: {
    type: 'finished'
    action: THREE.AnimationAction
    direction: number
  }): void => {
    if (this.disposed || event.action !== this.oneShotAction) return
    this.oneShotAction = null
    this.emotion = 'idle'
    this.reconcileAnimation(true)
  }

  /* ---------------------------------------------------------------------- */
  /* Helpers                                                                */
  /* ---------------------------------------------------------------------- */

  private createFocusRing(): THREE.Mesh {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.84, 40),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.profile.accent),
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
      }),
    )
    ring.name = 'advisor-focus-ring'
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.055
    ring.visible = false
    return ring
  }

  private updateRing(): void {
    if (this.disposed) {
      this.focusRing.visible = false
      return
    }
    // The procedural avatar owns its own speaking ring. Use the adapter ring
    // only for focus while silent, or for GLB visuals once the avatar is gone.
    const active =
      this.sourceValue === 'glb'
        ? this.speaking || this.focused
        : this.focused && !this.speaking
    this.focusRing.visible = active
  }

  private disposeCloneSkeletons(): void {
    const skeletons = new Set<THREE.Skeleton>()
    this.motion.traverse((object) => {
      const skinned = object as THREE.SkinnedMesh
      if (skinned.isSkinnedMesh === true && skinned.skeleton) skeletons.add(skinned.skeleton)
    })
    for (const skeleton of skeletons) skeleton.dispose()
  }
}

/* -------------------------------------------------------------------------- */
/* Visual normalization                                                       */
/* -------------------------------------------------------------------------- */

interface BuiltAdvisorVisual {
  wrapper: THREE.Group
  /** Normalized height in boardroom units. */
  height: number
}

/**
 * Clone the cached scene with SkeletonUtils (ordinary Object3D.clone breaks
 * skinned bindings), strip non-visual nodes, center the feet pivot, scale to
 * the common target height, then apply the manifest yaw offset. The seat root
 * is never touched.
 */
function buildAdvisorVisual(model: CachedAdvisorModel, spec: AdvisorAssetSpec): BuiltAdvisorVisual {
  const scene = cloneSkeleton(model.scene)
  stripNonVisualObjects(scene)
  configureAdvisorMeshShadows(scene)

  scene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3()
  box.getSize(size)
  const height = size.y
  if (!Number.isFinite(height) || height <= 1e-6) {
    throw new Error(`Advisor ${model.id} has unusable bounds after cloning.`)
  }

  // Feet at y=0 and horizontally centered before yaw/scale.
  scene.position.set(
    -(box.min.x + box.max.x) / 2,
    -box.min.y,
    -(box.min.z + box.max.z) / 2,
  )

  const centered = new THREE.Group()
  centered.name = `advisor-centered-${model.id}`
  centered.add(scene)
  centered.rotation.y = THREE.MathUtils.degToRad(spec.yawOffsetDeg ?? 0)

  const wrapper = new THREE.Group()
  wrapper.name = `advisor-model-${model.id}`
  wrapper.add(centered)
  wrapper.scale.setScalar(spec.targetHeight / height)
  wrapper.userData.advisorSource = 'glb'
  wrapper.userData.sourceHeight = height

  return { wrapper, height: spec.targetHeight }
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 9973
  }
  return hash
}
