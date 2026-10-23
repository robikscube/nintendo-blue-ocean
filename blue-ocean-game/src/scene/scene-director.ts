import * as THREE from 'three'
import gsap from 'gsap'
import type { CharacterId, GameState, Mood, PrototypeSpec } from '../core/types'
import { getCurrentLine } from '../core/state'
import { Boardroom } from './boardroom'
import type { AdvisorId } from './character-adapter'
import { Factory } from './factory'

type SceneMode = 'boardroom' | 'factory'
type FactoryView = 'wide' | 'reveal'
type SpeakerId = Exclude<CharacterId, 'narrator'>

interface CameraPose {
  position: [number, number, number]
  look: [number, number, number]
  fov?: number
}

/**
 * Ensemble shot. Deliberately gentler and more centred than the original
 * right-biased pose so the widened, arc-shaped seating plan (P4) keeps every
 * advisor and chair inside a 16:9 frame with margin.
 */
const BOARDROOM_WIDE: CameraPose = {
  // Verified by P4's vertex-projected silhouette measurement against the final
  // arc (Damian needs the pull-back and de-biased look; the old 6.4/11.6 pose
  // clipped him by 34 px at 1920x1080).
  position: [5.0, 6.2, 12.8],
  look: [-0.35, 2.4, -1.1],
  fov: 34.5,
}

/**
 * Medium speaker shot. These are *composition* constants, not seat
 * coordinates: every pose is rebuilt from the live seat root / head anchor so
 * it follows boardroom rearrangements and future taller GLB avatars.
 */
const SPEAKER_SHOT = {
  /** Moderate lens: no face-only telephoto compression. */
  fov: 32,
  /**
   * Target share of frame width for the projected avatar silhouette. Keeping
   * this near a quarter of the frame yields a medium shot: ~50% body height,
   * head + shoulders + paws above the dialogue bubble, and neighbouring
   * chair/table context instead of a face-dominated close-up.
   */
  widthShare: 0.28,
  minDistance: 4.7,
  maxDistance: 10.8,
  /** 3/4 offsets from the character's own facing (degrees). */
  sideYawDeg: [18, 29] as const,
  /** Head-height 3/4 offset for the CEO at the table head. */
  centerYawDeg: 19,
  /** Camera sits slightly above the head; look target sits at upper chest. */
  eyeLift: 0.55,
  aimDrop: 0.42,
  /** Keep the face clear of the P2 dialogue bubble (lower ~25-30%). */
  minFaceTop: 0.06,
  maxFaceTop: 0.3,
} as const

/** Boardroom envelope used to keep a computed shot out of the walls. */
const ROOM_LIMITS = {
  minX: -8.1,
  maxX: 8.1,
  minZ: -4.9,
  // There is no front wall in the set; the preview camera lives at z≈12.8.
  // Allow the medium shot to sit in front of the rug when a wide silhouette
  // needs a little more distance.
  maxZ: 10.5,
} as const

const FACTORY_WIDE: CameraPose = {
  position: [9.8, 7.8, 14.2],
  look: [0.3, 3.15, 0.2],
  fov: 35,
}

const FACTORY_REVEAL: CameraPose = {
  position: [7.4, 5.75, 10.9],
  look: [-0.55, 2.45, 0.4],
  fov: 33,
}

export class SceneDirector {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly boardroom = new Boardroom()
  readonly factory = new Factory()
  readonly reducedMotion: boolean
  private mode: SceneMode = 'boardroom'
  private currentSpeaker: SpeakerId | null = null
  private readonly look = new THREE.Vector3(...BOARDROOM_WIDE.look)
  private readonly clock = new THREE.Clock()
  private elapsed = 0
  private cameraTweens: gsap.core.Tween[] = []
  private cueTweens: gsap.core.Tween[] = []
  private factoryView: FactoryView = 'wide'
  private readonly background = new THREE.Color(0x1d1a20)
  private readonly fogColor = new THREE.Color(0x1d1a20)
  private readonly keyLight: THREE.DirectionalLight
  /** Static warm follow-spot: a quiet speaker cue, never a shadow caster. */
  private readonly speakerLight: THREE.SpotLight
  private readonly speakerLightTarget = new THREE.Object3D()
  /** Off-screen probe used to measure projected framing without moving the shot. */
  private readonly probeCamera = new THREE.PerspectiveCamera(32, 1, 0.1, 80)
  private readonly probeVector = new THREE.Vector3()
  private lastSpeakerFraming: Record<string, unknown> | null = null
  /** Authored duration of the most recent focus/wide camera request. */
  private lastFocusDuration = 0
  /** Original avatar material values, restored when focus returns to wide. */
  private readonly avatarMaterialState = new Map<
    THREE.Material,
    {
      color: THREE.Color
      emissive: THREE.Color | null
      emissiveIntensity: number
    }
  >()
  onContextLost: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // The presentation camera and lights are fixed. Refresh shadows only when
    // the set changes, not every animation frame; this roughly halves draw work.
    this.renderer.shadowMap.autoUpdate = false
    this.renderer.shadowMap.needsUpdate = true
    this.renderer.domElement.setAttribute('aria-hidden', 'true')

    this.scene.background = this.background
    this.scene.fog = new THREE.Fog(this.fogColor, 20, 38)
    this.camera = new THREE.PerspectiveCamera(
      BOARDROOM_WIDE.fov ?? 33,
      window.innerWidth / window.innerHeight,
      0.1,
      60,
    )
    this.camera.position.set(...BOARDROOM_WIDE.position)
    this.camera.lookAt(this.look)

    const ambient = new THREE.AmbientLight(0xffe3c5, 0.95)
    this.scene.add(ambient)
    const hemisphere = new THREE.HemisphereLight(0xffe8cc, 0x293231, 1.35)
    this.scene.add(hemisphere)
    this.keyLight = new THREE.DirectionalLight(0xfff0d7, 2.1)
    this.keyLight.position.set(5, 11, 7)
    this.keyLight.castShadow = true
    this.keyLight.shadow.mapSize.set(1536, 1536)
    this.keyLight.shadow.camera.left = -12
    this.keyLight.shadow.camera.right = 12
    this.keyLight.shadow.camera.top = 12
    this.keyLight.shadow.camera.bottom = -12
    this.keyLight.shadow.camera.near = 1
    this.keyLight.shadow.camera.far = 28
    this.keyLight.shadow.bias = -0.0004
    this.keyLight.shadow.normalBias = 0.025
    this.scene.add(this.keyLight)
    this.scene.add(this.keyLight.target)

    // A single warm follow-spot marks the speaker without postprocessing,
    // screen shake or new assets. It is intentionally shadowless: the static
    // shadow map must not be refreshed on every speaker change.
    this.speakerLight = new THREE.SpotLight(0xffe0b5, 0, 9.5, 0.42, 0.9, 2)
    this.speakerLight.name = 'speaker-follow-spot'
    this.speakerLight.castShadow = false
    this.speakerLight.position.set(0, 5.3, 3.4)
    this.speakerLightTarget.position.set(0, 2.1, 0)
    this.speakerLight.target = this.speakerLightTarget
    this.scene.add(this.speakerLight)
    this.scene.add(this.speakerLightTarget)

    this.scene.add(this.boardroom.group)
    this.scene.add(this.factory.group)
    this.factory.group.visible = false

    // Static shadow maps are refreshed only when the set changes. An optional
    // GLB advisor can arrive after startup, so refresh once it swaps in.
    for (const avatar of this.boardroom.avatars.values()) {
      void avatar.ready.then((source) => {
        if (source === 'glb') this.renderer.shadowMap.needsUpdate = true
      })
    }

    this.onResize = this.onResize.bind(this)
    this.animate = this.animate.bind(this)
    window.addEventListener('resize', this.onResize)
    canvas.addEventListener('webglcontextlost', this.handleContextLost, false)
    this.renderer.setAnimationLoop(this.animate)
    this.focusSpeaker(null)
  }

  private handleContextLost = (event: Event): void => {
    event.preventDefault()
    this.onContextLost?.()
  }

  applyState(state: GameState): void {
    if (state.phase === 'factory') {
      this.showFactory(state.factoryProgress === 'done' ? 'reveal' : 'wide')
      return
    }
    this.showBoardroom()
    const line = getCurrentLine(state)
    this.focusSpeaker(line?.speaker ?? null, line?.mood ?? 'neutral')
  }

  showBoardroom(): void {
    if (this.mode === 'factory') {
      this.mode = 'boardroom'
      this.boardroom.group.visible = true
      this.factory.group.visible = false
      this.boardroom.reset()
      this.animateEnvironment(new THREE.Color(0x1d1a20), 0.9)
      this.applyCameraPose(this.boardroomWidePose(), 0.75)
      this.currentSpeaker = null
      this.lastSpeakerFraming = null
      this.setSpeakerEmphasis(null)
      this.setSpeakerCue(false)
      this.renderer.shadowMap.needsUpdate = true
    }
  }

  showFactory(view: FactoryView = 'wide'): void {
    if (this.mode !== 'factory') {
      this.mode = 'factory'
      this.boardroom.group.visible = false
      this.factory.group.visible = true
      this.currentSpeaker = null
      this.lastSpeakerFraming = null
      this.setSpeakerEmphasis(null)
      this.setSpeakerCue(false)
      this.animateEnvironment(new THREE.Color(0x111a1d), 0.9)
      this.factoryView = view
      this.applyCameraPose(this.factoryPose(view === 'reveal' ? FACTORY_REVEAL : FACTORY_WIDE), 0.9)
      this.renderer.shadowMap.needsUpdate = true
      return
    }
    if (this.factoryView !== view) {
      this.factoryView = view
      this.applyCameraPose(this.factoryPose(view === 'reveal' ? FACTORY_REVEAL : FACTORY_WIDE), 0.85)
      this.renderer.shadowMap.needsUpdate = true
    }
  }

  /**
   * The factory DOM card covers the right third of the frame. On narrow/4:3
   * projectors, shift the camera's look target right so the assembled stage
   * (and its decision-defining attachment) sits in the uncovered left area.
   * 16:9 and wider keep the authored composition unchanged.
   */
  private factoryPose(pose: CameraPose): CameraPose {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight)
    const shift = aspect < 1.7 ? (1.7 - aspect) * 2.1 : 0
    if (shift <= 0) return pose
    return {
      ...pose,
      look: [pose.look[0] + shift, pose.look[1], pose.look[2]],
    }
  }

  /**
   * Reframe toward the speaking advisor over ~0.6-0.78 s. The shot is rebuilt
   * from the live seat root (position + facing), head anchor and visual bounds,
   * never from stale table coordinates, so it follows P4's seating plan and
   * future normalized GLB avatars.
   */
  focusSpeaker(character: CharacterId | null, mood: Mood = 'neutral'): void {
    if (this.mode !== 'boardroom') return
    this.boardroom.setSpeaker(character, mood)
    const speaker: SpeakerId | null = !character || character === 'narrator' ? null : character
    // Same speaker continuing: no repeated push. This also prevents a camera
    // nudge on every line while the presenter reads.
    if (this.currentSpeaker === speaker) return
    this.currentSpeaker = speaker
    this.setSpeakerEmphasis(speaker)

    if (!speaker) {
      this.lastSpeakerFraming = null
      this.setSpeakerCue(false)
      this.lastFocusDuration = 0.66
      this.applyCameraPose(this.boardroomWidePose(), 0.66)
      return
    }

    const shot = this.buildSpeakerShot(speaker)
    if (!shot) {
      this.lastSpeakerFraming = null
      this.setSpeakerCue(false)
      this.lastFocusDuration = 0.66
      this.applyCameraPose(this.boardroomWidePose(), 0.66)
      return
    }

    this.lastSpeakerFraming = shot.debug
    this.setSpeakerCue(true, shot.cuePosition, shot.cueTarget)
    // Longer moves (opposite sides of the table) get the upper end of the
    // authored range; short moves stay brisk. The camera never cuts.
    const travel = this.camera.position.distanceTo(
      new THREE.Vector3(shot.pose.position[0], shot.pose.position[1], shot.pose.position[2]),
    )
    const duration = THREE.MathUtils.clamp(0.6 + travel * 0.012, 0.62, 0.78)
    this.lastFocusDuration = duration
    this.applyCameraPose(shot.pose, duration)
  }

  private boardroomWidePose(): CameraPose {
    return BOARDROOM_WIDE
  }

  private buildSpeakerShot(speaker: SpeakerId): {
    pose: CameraPose
    cuePosition: THREE.Vector3
    cueTarget: THREE.Vector3
    debug: Record<string, unknown>
  } | null {
    const anchor = this.boardroom.getSpeakerPosition(speaker)
    if (!anchor) return null

    const avatar = this.boardroom.avatars.get(speaker as AdvisorId)
    const rootPosition = new THREE.Vector3(anchor.x, 0, anchor.z)
    let facing = 0
    let headY = anchor.y + 0.06
    let visualBounds: THREE.Box3 | null = null
    let silhouetteWidth = 1.8
    let boundsTop = anchor.y + 0.65
    let boundsBottom = 0

    if (avatar) {
      avatar.root.updateWorldMatrix(true, true)
      avatar.root.getWorldPosition(rootPosition)
      facing = avatar.root.rotation.y
      const headWorld = avatar.headAnchor.getWorldPosition(new THREE.Vector3())
      headY = headWorld.y
      const bounds = new THREE.Box3().setFromObject(avatar.root)
      if (!bounds.isEmpty()) {
        // Use the real visual envelope, including depth: a synthetic cube
        // inflates the 3/4 projection and makes the speaker look oversized.
        visualBounds = bounds
        silhouetteWidth = THREE.MathUtils.clamp(bounds.max.x - bounds.min.x, 1.15, 2.6)
        boundsTop = bounds.max.y
        boundsBottom = bounds.min.y
      }
    }

    const isHeadOfTable = Math.abs(rootPosition.x) < 1.4
    const aimY = headY - SPEAKER_SHOT.aimDrop
    const cameraY = headY + SPEAKER_SHOT.eyeLift
    const aspect = window.innerWidth / Math.max(1, window.innerHeight)
    const box =
      visualBounds ??
      new THREE.Box3(
        new THREE.Vector3(
          rootPosition.x - silhouetteWidth / 2,
          boundsBottom,
          rootPosition.z - silhouetteWidth / 2,
        ),
        new THREE.Vector3(
          rootPosition.x + silhouetteWidth / 2,
          boundsTop,
          rootPosition.z + silhouetteWidth / 2,
        ),
      )

    // Cache every advisor's visual box and head anchor once. Candidate scoring
    // needs to know whether a neighbour would loom larger than the speaker or
    // be sliced by the frame edge - the failure mode the Box3 width alone hides.
    const boxes = new Map<SpeakerId, THREE.Box3>()
    const heads = new Map<SpeakerId, THREE.Vector3>()
    for (const [id, other] of this.boardroom.avatars) {
      const otherBox = new THREE.Box3().setFromObject(other.root)
      if (!otherBox.isEmpty()) boxes.set(id as SpeakerId, otherBox)
      const head = new THREE.Vector3()
      other.headAnchor.getWorldPosition(head)
      heads.set(id as SpeakerId, head)
    }
    const speakerHead = heads.get(speaker) ?? new THREE.Vector3(rootPosition.x, headY, rootPosition.z)

    /**
     * A speaker shot may use either side of the face and either a moderate
     * (32°) or slightly tighter (27°) lens. The tighter lens keeps the same
     * speaker size but crops a neighbour that would otherwise loom or clip.
     */
    const relativeYaws = isHeadOfTable
      ? [THREE.MathUtils.degToRad(SPEAKER_SHOT.centerYawDeg)]
      : SPEAKER_SHOT.sideYawDeg.map((degrees) => THREE.MathUtils.degToRad(degrees))
    const fovs = isHeadOfTable ? [SPEAKER_SHOT.fov, 28, 40] : [SPEAKER_SHOT.fov, 27, 40]

    interface Candidate {
      theta: number
      fov: number
      look: THREE.Vector3
      position: THREE.Vector3
      distance: number
      widthShare: number
      visibleWidthShare: number
      score: number
      occluded: boolean
      clippedNeighbours: SpeakerId[]
      maxNeighbourProminence: number
      speakerClipped: boolean
    }
    const candidates: Candidate[] = []

    // A small aim offset lets the camera keep the speaker near centre while
    // cropping a neighbour that would otherwise loom or be sliced by the edge.
    const aimOffsets = isHeadOfTable
      ? [-0.8, -0.4, 0, 0.4, 0.8]
      : [-1.0, -0.5, 0, 0.5, 1.0]

    for (const fov of fovs) {
      for (const relativeYaw of relativeYaws) {
        for (const theta of [facing - relativeYaw, facing + relativeYaw]) {
          for (const aimOffset of aimOffsets) {
            const look = new THREE.Vector3(rootPosition.x + aimOffset, aimY, rootPosition.z)
            const solved = this.solveSpeakerDistance(theta, look, cameraY, box, aspect, fov)
            const position = this.speakerCameraPosition(theta, look, cameraY, solved.distance)
            this.clampToRoom(position, look)
            const projected = this.measureProjectedBox(position, look, fov, box, aspect)
            const visibleWidthShare = Math.max(0, Math.min(1, projected.rightShare) - Math.max(0, projected.leftShare))
            const speakerClipped =
              projected.leftShare < 0.005 ||
              projected.rightShare > 0.995 ||
              projected.topShare < 0.005
            this.probeVector.set(speakerHead.x, speakerHead.y, speakerHead.z).project(this.probeCamera)
            const faceX = (this.probeVector.x + 1) / 2
            const faceY = (1 - this.probeVector.y) / 2
            let score =
              Math.abs(position.x) * 0.08 +
              Math.abs((projected.leftShare + projected.rightShare) / 2 - 0.5) * 22 +
              (SPEAKER_SHOT.fov - fov) * 0.35 +
              // Hold the authored medium-shot size. Candidates that hit the
              // distance clamp and arrive oversized (or tiny) must lose.
              Math.abs(projected.widthShare - SPEAKER_SHOT.widthShare) * 240 +
              (projected.widthShare > 0.35 || projected.widthShare < 0.2 ? 30 : 0) +
              (speakerClipped ? 80 : 0)
            const clippedNeighbours: SpeakerId[] = []
            let maxNeighbourProminence = 0
            const speakerDistance = position.distanceTo(speakerHead)

            for (const [id, neighbourBox] of boxes) {
              if (id === speaker) continue
              const neighbour = this.measureProjectedBox(position, look, fov, neighbourBox, aspect)
              const neighbourVisible = Math.max(0, Math.min(1, neighbour.rightShare) - Math.max(0, neighbour.leftShare))
              if (neighbourVisible <= 0.001) continue
              const head = heads.get(id)
              if (!head) continue
              const neighbourDistance = position.distanceTo(head)
              // Apparent head size is inversely proportional to camera
              // distance for same-height avatars. Ratio > 1 means the
              // neighbour would read larger than the speaker.
              const prominence = speakerDistance / Math.max(neighbourDistance, 0.001)
              maxNeighbourProminence = Math.max(maxNeighbourProminence, prominence)
              const clipped =
                (neighbour.leftShare < -0.005 && neighbour.rightShare > 0.005) ||
                (neighbour.rightShare > 1.005 && neighbour.leftShare < 0.995) ||
                (neighbour.topShare < -0.005 && neighbour.bottomShare > 0.005) ||
                (neighbour.bottomShare > 1.005 && neighbour.topShare < 0.995)
              // Crop a neighbour fully or keep it fully inside; a sliced body
              // beside the speaker reads as a composition mistake.
              if (clipped && neighbourVisible > 0.012) {
                clippedNeighbours.push(id)
                score += 40
              }
              if (prominence > 1.0) score += (prominence - 1.0) * 150
              if (
                faceX >= neighbour.leftShare &&
                faceX <= neighbour.rightShare &&
                faceY >= neighbour.topShare &&
                faceY <= neighbour.bottomShare &&
                neighbourDistance < speakerDistance
              ) {
                score += 50
              }
            }

            const occluded = this.speakerOccluded(position, speakerHead, speaker)
            if (occluded) score += 18
            candidates.push({
              theta,
              fov,
              look,
              position,
              distance: position.distanceTo(look),
              widthShare: projected.widthShare,
              visibleWidthShare,
              score,
              occluded,
              clippedNeighbours,
              maxNeighbourProminence,
              speakerClipped,
            })
          }
        }
      }
    }

    candidates.sort((a, b) => a.score - b.score)
    const chosen = candidates[0]
    if (!chosen) return null
    const look = chosen.look

    // Report the actual projection of the chosen pose (not the solver's
    // intermediate estimate) so QA can compare against the dialogue overlay.
    const projected = this.measureProjectedBox(chosen.position, look, chosen.fov, box, aspect)
    const headBox = new THREE.Box3(
      new THREE.Vector3(rootPosition.x - 0.62, headY - 0.52, rootPosition.z - 0.62),
      new THREE.Vector3(rootPosition.x + 0.62, boundsTop, rootPosition.z + 0.62),
    )
    const headFraming = this.measureProjectedBox(chosen.position, look, chosen.fov, headBox, aspect)
    const shoulderY = headY - 0.8
    this.probeCamera.fov = chosen.fov
    this.probeCamera.aspect = aspect
    this.probeCamera.position.copy(chosen.position)
    this.probeCamera.lookAt(look)
    this.probeCamera.updateProjectionMatrix()
    this.probeCamera.updateMatrixWorld(true)
    this.probeVector.set(rootPosition.x + 0.72, shoulderY, rootPosition.z).project(this.probeCamera)
    const shoulderShare = (1 - this.probeVector.y) / 2
    const pose: CameraPose = {
      position: [chosen.position.x, chosen.position.y, chosen.position.z],
      look: [look.x, look.y, look.z],
      fov: chosen.fov,
    }
    const cuePosition = new THREE.Vector3(
      rootPosition.x + (chosen.position.x - rootPosition.x) * 0.42,
      headY + 2.05,
      rootPosition.z + (chosen.position.z - rootPosition.z) * 0.42,
    )
    const cueTarget = new THREE.Vector3(rootPosition.x, headY - 0.12, rootPosition.z)

    return {
      pose,
      cuePosition,
      cueTarget,
      debug: {
        speaker,
        position: pose.position.map((value) => Number(value.toFixed(2))),
        look: pose.look.map((value) => Number(value.toFixed(2))),
        fov: pose.fov,
        distance: Number(chosen.distance.toFixed(2)),
        widthShare: Number(projected.widthShare.toFixed(3)),
        visibleWidthShare: Number(chosen.visibleWidthShare.toFixed(3)),
        topShare: Number(projected.topShare.toFixed(3)),
        bottomShare: Number(projected.bottomShare.toFixed(3)),
        headTopShare: Number(headFraming.topShare.toFixed(3)),
        headBottomShare: Number(headFraming.bottomShare.toFixed(3)),
        shoulderShare: Number(shoulderShare.toFixed(3)),
        leftShare: Number(projected.leftShare.toFixed(3)),
        rightShare: Number(projected.rightShare.toFixed(3)),
        occluded: chosen.occluded,
        candidateScore: Number(chosen.score.toFixed(2)),
        clippedNeighbours: chosen.clippedNeighbours,
        maxNeighbourProminence: Number(chosen.maxNeighbourProminence.toFixed(3)),
        speakerClipped: chosen.speakerClipped,
        candidateDetails: candidates.slice(0, 5).map((candidate) => ({
          yawDeg: Number(THREE.MathUtils.radToDeg(candidate.theta).toFixed(1)),
          fov: candidate.fov,
          score: Number(candidate.score.toFixed(2)),
          widthShare: Number(candidate.widthShare.toFixed(3)),
          maxNeighbourProminence: Number(candidate.maxNeighbourProminence.toFixed(3)),
          clippedNeighbours: candidate.clippedNeighbours,
          position: [
            Number(candidate.position.x.toFixed(2)),
            Number(candidate.position.z.toFixed(2)),
          ],
        })),
        facingDeg: Number(THREE.MathUtils.radToDeg(facing).toFixed(1)),
        yawDeg: Number(THREE.MathUtils.radToDeg(chosen.theta).toFixed(1)),
        avatarSource: avatar?.source ?? 'missing',
      },
    }
  }

  private solveSpeakerDistance(
    theta: number,
    look: THREE.Vector3,
    cameraY: number,
    box: THREE.Box3,
    aspect: number,
    fov: number,
  ): { distance: number; widthShare: number } {
    let distance = 6.2
    let widthShare = 0
    for (let iteration = 0; iteration < 3; iteration += 1) {
      const position = this.speakerCameraPosition(theta, look, cameraY, distance)
      const framing = this.measureProjectedBox(position, look, fov, box, aspect)
      widthShare = framing.widthShare
      if (widthShare <= 0.0001) break
      distance = THREE.MathUtils.clamp(
        distance * (widthShare / SPEAKER_SHOT.widthShare),
        SPEAKER_SHOT.minDistance,
        SPEAKER_SHOT.maxDistance,
      )
    }
    return { distance, widthShare }
  }

  private speakerCameraPosition(
    theta: number,
    look: THREE.Vector3,
    cameraY: number,
    distance: number,
  ): THREE.Vector3 {
    const vertical = cameraY - look.y
    const horizontal = Math.sqrt(Math.max(distance * distance - vertical * vertical, 0.6))
    return new THREE.Vector3(
      look.x + Math.sin(theta) * horizontal,
      cameraY,
      look.z + Math.cos(theta) * horizontal,
    )
  }

  private clampToRoom(position: THREE.Vector3, look: THREE.Vector3): void {
    // Shrink toward the look target rather than sliding sideways: sliding
    // would silently change the intended 3/4 angle.
    for (let guard = 0; guard < 7; guard += 1) {
      const outside =
        position.x < ROOM_LIMITS.minX ||
        position.x > ROOM_LIMITS.maxX ||
        position.z < ROOM_LIMITS.minZ ||
        position.z > ROOM_LIMITS.maxZ
      if (!outside) return
      position.x = look.x + (position.x - look.x) * 0.92
      position.z = look.z + (position.z - look.z) * 0.92
    }
  }

  /**
   * A neighbouring advisor can sit between an inward 3/4 camera and the
   * speaker. Detect that in plan view so the other valid side of the face is
   * chosen instead of photographing the back of someone's head.
   */
  private speakerOccluded(
    camera: THREE.Vector3,
    speakerHead: THREE.Vector3,
    speaker: SpeakerId,
  ): boolean {
    const dirX = speakerHead.x - camera.x
    const dirZ = speakerHead.z - camera.z
    const lengthSq = dirX * dirX + dirZ * dirZ
    if (lengthSq < 0.001) return false
    for (const [id, avatar] of this.boardroom.avatars) {
      if (id === speaker) continue
      const root = new THREE.Vector3()
      avatar.root.getWorldPosition(root)
      const t = ((root.x - camera.x) * dirX + (root.z - camera.z) * dirZ) / lengthSq
      if (t <= 0.12 || t >= 0.92) continue
      const closestX = camera.x + dirX * t
      const closestZ = camera.z + dirZ * t
      const clearance = Math.hypot(root.x - closestX, root.z - closestZ)
      if (clearance < 0.8) return true
    }
    return false
  }

  private measureProjectedBox(
    position: THREE.Vector3,
    look: THREE.Vector3,
    fov: number,
    box: THREE.Box3,
    aspect: number,
  ): {
    widthShare: number
    topShare: number
    bottomShare: number
    leftShare: number
    rightShare: number
  } {
    const camera = this.probeCamera
    camera.fov = fov
    camera.aspect = aspect
    camera.near = 0.1
    camera.far = 80
    camera.position.copy(position)
    camera.lookAt(look)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld(true)

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (let ix = 0; ix < 2; ix += 1) {
      for (let iy = 0; iy < 2; iy += 1) {
        for (let iz = 0; iz < 2; iz += 1) {
          this.probeVector
            .set(
              ix === 0 ? box.min.x : box.max.x,
              iy === 0 ? box.min.y : box.max.y,
              iz === 0 ? box.min.z : box.max.z,
            )
            .project(camera)
          minX = Math.min(minX, this.probeVector.x)
          maxX = Math.max(maxX, this.probeVector.x)
          minY = Math.min(minY, this.probeVector.y)
          maxY = Math.max(maxY, this.probeVector.y)
        }
      }
    }
    // NDC y is up; convert to a top-down screen share.
    return {
      widthShare: (maxX - minX) / 2,
      topShare: (1 - maxY) / 2,
      bottomShare: (1 - minY) / 2,
      leftShare: (minX + 1) / 2,
      rightShare: (maxX + 1) / 2,
    }
  }

  /**
   * A quiet saturation cue: keep every advisor as context, but let the
   * speaker's materials read at full strength. This is a scene-layer cue
   * only; boardroom.ts owns the models and is never modified.
   */
  private setSpeakerEmphasis(speaker: SpeakerId | null): void {
    const dim = 0.68
    for (const [id, avatar] of this.boardroom.avatars) {
      const isSpeaker = speaker !== null && id === speaker
      const seen = new Set<THREE.Material>()
      avatar.root.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (!mesh.isMesh || !mesh.material) return
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const material of materials) {
          if (seen.has(material)) continue
          seen.add(material)
          const standard = material as THREE.MeshStandardMaterial
          if (!this.avatarMaterialState.has(material)) {
            this.avatarMaterialState.set(material, {
              color: standard.color.clone(),
              emissive: standard.emissive ? standard.emissive.clone() : null,
              emissiveIntensity: standard.emissiveIntensity ?? 0,
            })
          }
          const original = this.avatarMaterialState.get(material)
          if (!original) continue
          if (speaker !== null && !isSpeaker) {
            standard.color.copy(original.color).multiplyScalar(dim)
            if (standard.emissive && original.emissive) {
              standard.emissive.copy(original.emissive).multiplyScalar(dim)
            }
            if (typeof standard.emissiveIntensity === 'number') {
              standard.emissiveIntensity = original.emissiveIntensity * dim
            }
          } else {
            standard.color.copy(original.color)
            if (standard.emissive && original.emissive) standard.emissive.copy(original.emissive)
            if (typeof standard.emissiveIntensity === 'number') {
              standard.emissiveIntensity = original.emissiveIntensity
            }
          }
        }
      })
    }
  }

  private setSpeakerCue(
    active: boolean,
    position?: THREE.Vector3,
    target?: THREE.Vector3,
  ): void {
    for (const tween of this.cueTweens) tween.kill()
    this.cueTweens = []
    if (position) this.speakerLight.position.copy(position)
    if (target) this.speakerLightTarget.position.copy(target)
    const intensity = active ? 19 : 0
    if (this.reducedMotion) {
      this.speakerLight.intensity = intensity
      return
    }
    this.cueTweens.push(
      gsap.to(this.speakerLight, {
        intensity,
        duration: active ? 0.5 : 0.42,
        ease: active ? 'power2.out' : 'power2.inOut',
        overwrite: true,
      }),
    )
  }

  startFactory(spec: PrototypeSpec, onFinished: () => void): void {
    this.showFactory('wide')
    const finish = (): void => {
      this.renderer.shadowMap.needsUpdate = true
      onFinished()
    }
    if (this.reducedMotion) {
      this.factory.play(spec, () => window.setTimeout(finish, 60), true)
    } else {
      this.factory.play(spec, finish)
    }
    this.renderer.shadowMap.needsUpdate = true
  }

  skipFactory(): void {
    this.factory.skip()
    this.renderer.shadowMap.needsUpdate = true
  }

  replayFactory(): void {
    this.showFactory('wide')
    this.factory.replay()
    this.renderer.shadowMap.needsUpdate = true
  }

  private animateEnvironment(color: THREE.Color, duration: number): void {
    const fog = this.scene.fog as THREE.Fog | null
    if (!fog) return
    if (this.reducedMotion) {
      this.background.copy(color)
      this.fogColor.copy(color)
      fog.color.copy(color)
      return
    }
    gsap.to(this.background, {
      r: color.r,
      g: color.g,
      b: color.b,
      duration,
      ease: 'power2.inOut',
      overwrite: true,
    })
    gsap.to(this.fogColor, {
      r: color.r,
      g: color.g,
      b: color.b,
      duration,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => fog.color.copy(this.fogColor),
    })
  }

  private applyCameraPose(pose: CameraPose, duration: number): void {
    for (const tween of this.cameraTweens) tween.kill()
    this.cameraTweens = []
    const fov = pose.fov ?? 33
    if (this.reducedMotion || duration <= 0) {
      this.camera.position.set(...pose.position)
      this.look.set(...pose.look)
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
      this.camera.lookAt(this.look)
      return
    }
    const positionTween = gsap.to(this.camera.position, {
      x: pose.position[0],
      y: pose.position[1],
      z: pose.position[2],
      duration,
      ease: 'power2.inOut',
    })
    const lookTween = gsap.to(this.look, {
      x: pose.look[0],
      y: pose.look[1],
      z: pose.look[2],
      duration,
      ease: 'power2.inOut',
    })
    const fovTween = gsap.to(this.camera, {
      fov,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => this.camera.updateProjectionMatrix(),
    })
    this.cameraTweens.push(positionTween, lookTween, fovTween)
  }

  private onResize(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.renderer.setSize(width, height)
    this.renderer.shadowMap.needsUpdate = true
    if (this.mode === 'factory') {
      this.applyCameraPose(this.factoryPose(this.factoryView === 'reveal' ? FACTORY_REVEAL : FACTORY_WIDE), 0)
      return
    }
    if (this.currentSpeaker) {
      // The medium shot's width share is aspect-dependent; recompute it on a
      // projector/window aspect change instead of waiting for the next line.
      const shot = this.buildSpeakerShot(this.currentSpeaker)
      if (shot) {
        this.lastSpeakerFraming = shot.debug
        this.applyCameraPose(shot.pose, 0)
      }
    } else {
      this.applyCameraPose(this.boardroomWidePose(), 0)
    }
  }

  private animate(): void {
    const delta = Math.min(this.clock.getDelta(), 0.1)
    this.elapsed += delta
    if (this.mode === 'boardroom') this.boardroom.update(this.elapsed, delta)
    else this.factory.update(this.elapsed, delta)
    this.camera.lookAt(this.look)
    this.renderer.render(this.scene, this.camera)
  }

  getDebugInfo(): Record<string, unknown> {
    return {
      mode: this.mode,
      factoryView: this.factoryView,
      camera: this.camera.position.toArray().map((value) => Number(value.toFixed(2))),
      look: [this.look.x, this.look.y, this.look.z].map((value) => Number(value.toFixed(2))),
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      reducedMotion: this.reducedMotion,
      speaker: this.currentSpeaker,
      speakerFraming: this.lastSpeakerFraming,
      lastFocusDuration: Number(this.lastFocusDuration.toFixed(3)),
      speakerCueIntensity: Number(this.speakerLight.intensity.toFixed(2)),
    }
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost)
    this.renderer.setAnimationLoop(null)
    for (const tween of this.cameraTweens) tween.kill()
    for (const tween of this.cueTweens) tween.kill()
    this.cameraTweens = []
    this.cueTweens = []
    this.scene.remove(this.speakerLight)
    this.scene.remove(this.speakerLightTarget)
    this.setSpeakerEmphasis(null)
    this.avatarMaterialState.clear()
    this.boardroom.dispose()
    this.factory.dispose()
    this.renderer.dispose()
  }
}
