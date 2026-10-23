import * as THREE from 'three'
import type { CharacterId, Mood } from '../core/types'
import { ADVISOR_ASSETS, createAdvisor, type AdvisorHandle, type AdvisorId } from './character-adapter'
import { box, cylinder, group, material, mesh, rounded, sphere } from './primitives'

const WOOD = 0x6a4634
const WALL = 0xdfcbb1
const WALL_DARK = 0xb89476
const GOLD = 0xc9a663

/** Widened oval table. Its far edge is the seating edge. */
const TABLE_CENTER_Z = 0.55
const TABLE_RADIUS_X = 4.4
const TABLE_RADIUS_Z = 2.75
const TABLE_Z_SCALE = TABLE_RADIUS_Z / TABLE_RADIUS_X

interface Seat {
  /** Seats are always advisors; narrator lines have no body. */
  id: AdvisorId
  x: number
  z: number
  facing: number
  chairColor: number
  /** Chair Shelldon gets the taller, gold-trimmed head chair. */
  head?: boolean
}

/**
 * An open, asymmetric executive arc around the far edge of the table. The
 * fixed three-quarter boardroom camera sits to the right, so the right-hand
 * seats are set slightly deeper to balance apparent size. Spacing is chosen
 * so projected silhouette gaps stay at or above half a body width at 16:9.
 *
 * Facings point roughly at the camera (minus a small inward turn) so every
 * face and both ears read in the wide shot and so P5's speaker camera sees a
 * near-frontal or gentle three-quarter face.
 */
const SEATS: readonly Seat[] = [
  { id: 'shell', x: -0.3, z: -3.0, facing: 0.3, chairColor: 0x8d5b44, head: true },
  { id: 'mori', x: -3.4, z: -2.75, facing: 0.47, chairColor: 0x5f7668 },
  { id: 'pip', x: 2.75, z: -3.15, facing: 0.15, chairColor: 0x9b6245 },
  { id: 'grumble', x: -6.3, z: -1.85, facing: 0.6, chairColor: 0x4f6274 },
  { id: 'bolt', x: 5.85, z: -3.25, facing: -0.02, chairColor: 0x8a7449 },
]

/** Read-only seat/anchor data for camera and QA tooling (not story state). */
export interface SeatLayoutEntry {
  readonly id: AdvisorId
  readonly x: number
  readonly z: number
  readonly facing: number
  /** World-space head / upper-body anchor used by `getSpeakerPosition`. */
  readonly anchor: readonly [number, number, number]
  /** Normalized avatar height in boardroom units. */
  readonly height: number
}

export class Boardroom {
  readonly group = new THREE.Group()
  readonly avatars = new Map<AdvisorId, AdvisorHandle>()
  private speaker: CharacterId | null = null
  private readonly dust: THREE.Points
  private readonly tableGlow: THREE.Mesh
  private readonly seatLayout: SeatLayoutEntry[] = []

  constructor() {
    this.group.name = 'boardroom'
    this.buildRoom()
    this.buildTimelineBoard()
    this.buildTable()
    this.buildPendants()
    this.buildPlants()
    this.buildProps()
    for (const seat of SEATS) {
      this.buildChair(seat)
      // Synchronous procedural fallback under a permanent seat root. A future
      // validated GLB upgrades the visual in the background without changing
      // camera framing, dialogue, or the story flow.
      const avatar = createAdvisor(seat.id, {
        position: [seat.x, 0, seat.z],
        facing: seat.facing,
      })
      this.group.add(avatar.root)
      this.avatars.set(seat.id, avatar)
      this.seatLayout.push({
        id: seat.id,
        x: seat.x,
        z: seat.z,
        facing: seat.facing,
        anchor: [seat.x, avatar.headAnchor.position.y, seat.z],
        height: ADVISOR_ASSETS[seat.id].targetHeight,
      })
    }
    this.tableGlow = this.createTableGlow()
    this.dust = this.createDust()
    this.group.add(this.dust)
  }

  private buildRoom(): void {
    const floorMat = material(0x694a35, { roughness: 0.9 })
    box(this.group, [18, 0.3, 13], [0, -0.16, 0], floorMat, { castShadow: false })
    for (let index = 0; index < 9; index += 1) {
      const plankMat = material(index % 2 === 0 ? 0x725039 : 0x6b4935, { roughness: 0.95 })
      box(this.group, [1.98, 0.035, 12.9], [-8 + index * 2, 0.008, 0], plankMat, { castShadow: false })
      if (index > 0) {
        box(this.group, [0.018, 0.04, 12.8], [-9 + index * 2, 0.026, 0], material(0x3f2c22), { castShadow: false })
      }
    }

    const wallMat = material(WALL, { roughness: 0.96 })
    const wallLower = material(WALL_DARK, { roughness: 0.96 })
    const trim = material(0x7f5b45, { roughness: 0.85 })
    box(this.group, [18, 7.6, 0.35], [0, 3.8, -6.45], wallMat, { castShadow: false })
    box(this.group, [18, 1.25, 0.42], [0, 0.63, -6.39], wallLower, { castShadow: false })
    box(this.group, [18, 0.14, 0.5], [0, 1.29, -6.35], trim)
    box(this.group, [0.35, 7.6, 13], [-8.95, 3.8, 0], wallMat, { castShadow: false })
    box(this.group, [0.35, 7.6, 13], [8.95, 3.8, 0], wallMat, { castShadow: false })
    box(this.group, [0.5, 1.25, 13], [-8.86, 0.63, 0], wallLower, { castShadow: false })
    box(this.group, [0.5, 1.25, 13], [8.86, 0.63, 0], wallLower, { castShadow: false })

    for (const side of [-1, 1]) {
      for (let index = 0; index < 3; index += 1) {
        const z = -4.2 + index * 3.25
        box(this.group, [0.11, 3.4, 2.45], [side * 8.77, 3.2, z], trim, { rotation: [0, 0, 0] })
      }
    }

    const rugMat = material(0x3f625b, { roughness: 0.98 })
    const rugInner = material(0x54746a, { roughness: 0.98 })
    rounded(this.group, [13.8, 0.08, 8.0], 0.5, [0, 0.08, 1.0], rugMat, { castShadow: false })
    rounded(this.group, [12.9, 0.085, 7.1], 0.42, [0, 0.1, 1.0], rugInner, { castShadow: false })
    box(this.group, [11.8, 0.02, 0.035], [0, 0.145, 1.0], material(0xb9965e), { castShadow: false })

    // Framed abstract art keeps the wall warm without putting text into the 3D scene.
    for (const [index, x] of [-7.35, 7.35].entries()) {
      const frame = rounded(this.group, [2.15, 1.7, 0.16], 0.1, [x, 4.5, -6.2], trim)
      frame.name = `wall-art-frame-${index}`
      const art = rounded(this.group, [1.82, 1.38, 0.08], 0.06, [x, 4.5, -6.1], material(index === 0 ? 0x536e5d : 0x8b5c4b), {
        castShadow: false,
      })
      art.name = `wall-art-${index}`
      if (index === 0) {
        sphere(this.group, 0.37, [x - 0.2, 4.52, -6.03], material(0xd2af66), { scale: [1, 0.8, 0.18], segments: 18, castShadow: false })
        box(this.group, [0.72, 0.2, 0.04], [x + 0.25, 4.35, -6.02], material(0x2e4742), { rotation: [0, 0, -0.18], castShadow: false })
      } else {
        for (let stripe = 0; stripe < 3; stripe += 1) {
          box(this.group, [1.45, 0.12, 0.04], [x, 4.2 + stripe * 0.28, -6.02], material(stripe % 2 ? 0xdfc582 : 0x4f6d68), {
            rotation: [0, 0, stripe % 2 ? 0.08 : -0.06],
            castShadow: false,
          })
        }
      }
    }
  }

  private buildTimelineBoard(): void {
    const frame = rounded(this.group, [10.4, 3.15, 0.24], 0.13, [0, 4.62, -6.19], material(0x593f2f, { roughness: 0.75 }))
    frame.name = 'sealed-timeline-board'
    rounded(this.group, [10.0, 2.8, 0.12], 0.08, [0, 4.62, -6.02], material(0x304b45), { castShadow: false })
    box(this.group, [9.3, 0.035, 0.02], [0, 4.84, -5.94], material(0xb99a5d), { castShadow: false })

    for (let index = 0; index < 3; index += 1) {
      const x = -3.1 + index * 3.1
      rounded(this.group, [2.2, 1.67, 0.12], 0.08, [x, 4.33, -5.92], material(0xeddcc2, { roughness: 0.93 }), {
        castShadow: false,
      })
      // Blank device silhouettes, deliberately obscured by sealed paper slips.
      const silhouette = material(0x80948b, { roughness: 0.9 })
      if (index === 0) {
        rounded(this.group, [1.02, 0.36, 0.08], 0.025, [x, 4.09, -5.83], silhouette, { castShadow: false })
        box(this.group, [0.16, 0.46, 0.08], [x - 0.28, 4.39, -5.83], silhouette, { castShadow: false })
      } else if (index === 1) {
        rounded(this.group, [1.3, 0.26, 0.08], 0.025, [x, 4.14, -5.83], silhouette, { castShadow: false })
        rounded(this.group, [0.58, 0.43, 0.08], 0.025, [x + 0.58, 4.36, -5.83], silhouette, { rotation: [0, 0, 0.1], castShadow: false })
      } else {
        rounded(this.group, [1.04, 0.28, 0.08], 0.025, [x, 4.06, -5.83], silhouette, { castShadow: false })
        rounded(this.group, [0.64, 0.56, 0.08], 0.025, [x - 0.4, 4.29, -5.83], silhouette, { rotation: [0, 0, -0.08], castShadow: false })
      }
      const slip = rounded(this.group, [2.26, 0.9, 0.1], 0.045, [x, 4.14, -5.72], material(0xe5d5b9, { roughness: 0.98 }), {
        rotation: [0, 0, index % 2 === 0 ? -0.045 : 0.035],
        castShadow: false,
      })
      slip.name = `sealed-slip-${index + 1}`
      box(this.group, [1.94, 0.025, 0.02], [x, 4.25, -5.66], material(0xb79f7b), {
        rotation: [0, 0, index % 2 === 0 ? -0.045 : 0.035],
        castShadow: false,
      })
      box(this.group, [1.7, 0.025, 0.02], [x, 4.06, -5.66], material(0xb79f7b), {
        rotation: [0, 0, index % 2 === 0 ? -0.045 : 0.035],
        castShadow: false,
      })
      const seal = cylinder(this.group, 0.11, 0.11, 0.035, [x + 0.76, 4.0, -5.64], material(GOLD, { metalness: 0.4, roughness: 0.45 }), {
        segments: 16,
        rotation: [Math.PI / 2, 0, 0],
        castShadow: false,
      })
      seal.name = `wax-seal-${index + 1}`
    }

    for (const x of [-4.7, 0, 4.7]) {
      const cord = cylinder(this.group, 0.012, 0.012, 1.65, [x, 4.38, -5.6], material(0x8f7657), {
        rotation: [0, 0, 0.45],
        segments: 6,
        castShadow: false,
      })
      cord.name = 'sealed-cord'
    }
  }

  private buildTable(): void {
    const tableMat = material(WOOD, { roughness: 0.48, metalness: 0.02 })
    const tableTop = cylinder(this.group, TABLE_RADIUS_X, TABLE_RADIUS_X + 0.1, 0.28, [0, 1.61, TABLE_CENTER_Z], tableMat, {
      segments: 64,
    })
    tableTop.scale.z = TABLE_Z_SCALE
    tableTop.name = 'oval-boardroom-table'
    const lower = cylinder(
      this.group,
      TABLE_RADIUS_X - 0.4,
      TABLE_RADIUS_X - 0.28,
      0.13,
      [0, 1.43, TABLE_CENTER_Z],
      material(0x4a3024),
      { segments: 56 },
    )
    lower.scale.z = TABLE_Z_SCALE
    // Long red runner and gold inlay echo a formal board table.
    box(this.group, [7.0, 0.035, 0.9], [0, 1.77, TABLE_CENTER_Z + 0.07], material(0x8c3f35, { roughness: 0.96 }), {
      castShadow: false,
    })
    box(this.group, [6.45, 0.025, 0.045], [0, 1.795, TABLE_CENTER_Z + 0.46], material(GOLD), { castShadow: false })

    for (const x of [-2.7, 2.7]) {
      const leg = cylinder(this.group, 0.2, 0.34, 1.42, [x, 0.73, TABLE_CENTER_Z], tableMat, { segments: 18 })
      leg.name = 'table-leg'
      cylinder(this.group, 0.58, 0.66, 0.16, [x, 0.14, TABLE_CENTER_Z], material(0x4e3428), { segments: 18 })
    }
  }

  private buildChair(seat: Seat): void {
    const chair = group([seat.x, 0, seat.z - 0.7])
    chair.name = `chair-${seat.id}`
    chair.rotation.y = seat.facing
    const upholstery = material(seat.chairColor, { roughness: 0.88, flatShading: true })
    const frame = material(0x563b2b, { roughness: 0.7 })
    const width = seat.head ? 1.38 : 1.3
    rounded(chair, [width, 0.18, 1.08], 0.12, [0, 1.02, 0], upholstery)
    const backHeight = seat.head ? 1.78 : 1.4
    const back = rounded(chair, [width + 0.08, backHeight, 0.19], 0.14, [0, seat.head ? 1.96 : 1.84, -0.49], upholstery)
    back.rotation.x = -0.08
    if (seat.head) {
      // The taller chairback plus a slim gold crest separates Chair Shelldon at
      // the head of the table without hiding the avatar.
      const crest = box(chair, [width - 0.04, 0.06, 0.06], [0, 1.96 + backHeight / 2 + 0.02, -0.53], material(GOLD, { metalness: 0.35, roughness: 0.45 }), {
        castShadow: false,
      })
      crest.name = 'head-chair-crest'
    }
    for (const side of [-1, 1]) {
      for (const z of [-0.36, 0.38]) {
        cylinder(chair, 0.045, 0.055, 0.92, [side * 0.48, 0.51, z], frame, { segments: 8 })
      }
      box(chair, [0.1, 0.1, 0.84], [side * 0.69, 1.24, -0.18], frame)
    }
    const footRail = box(chair, [width - 0.06, 0.05, 0.05], [0, 0.34, 0.4], frame)
    footRail.rotation.x = 0.08
    this.group.add(chair)
  }

  private buildPendants(): void {
    const cordMat = material(0x2d2628, { roughness: 0.8 })
    const shadeMat = material(0x405d55, { roughness: 0.72, metalness: 0.08 })
    const glowMat = material(0xffdca0, { emissive: 0xffbd67, emissiveIntensity: 2.2, roughness: 0.4 })
    for (const [index, x] of [-3.2, 3.2].entries()) {
      cylinder(this.group, 0.018, 0.018, 2.4, [x, 7.2, 0.9], cordMat, { segments: 6, castShadow: false })
      cylinder(this.group, 0.48, 0.24, 0.34, [x, 5.95, 0.9], shadeMat, { segments: 24 })
      sphere(this.group, 0.12, [x, 5.8, 0.9], glowMat, { segments: 12, castShadow: false })
      const light = new THREE.PointLight(0xffc27d, index === 0 ? 46 : 42, 11, 2)
      light.position.set(x, 5.7, 1)
      this.group.add(light)
    }

    // Ceiling trim gives the fixed camera a sense of an enclosed miniature set.
    box(this.group, [18, 0.18, 0.18], [0, 7.28, -6.24], material(0x71503b), { castShadow: false })
    box(this.group, [18, 0.12, 0.5], [0, 7.54, -6.2], material(0x593f2f), { castShadow: false })
  }

  private buildPlants(): void {
    const potMat = material(0x9c6147, { roughness: 0.82, flatShading: true })
    const leafMats = [material(0x4d7253, { roughness: 0.9, flatShading: true }), material(0x66835d, { roughness: 0.9, flatShading: true })]
    const positions: Array<[number, number, number]> = [
      [7.65, -4.9, 1.2],
      [-7.72, -4.95, 0.95],
      [-7.3, 4.25, 0.7],
    ]
    for (const [x, z, scale] of positions) {
      cylinder(this.group, 0.35 * scale, 0.44 * scale, 0.7 * scale, [x, 0.36 * scale, z], potMat, {
        segments: 14,
        rotation: [0, 0, 0],
      })
      cylinder(this.group, 0.06, 0.08, 1.05 * scale, [x, 1.15 * scale, z], material(0x5a4934), { segments: 8 })
      for (let index = 0; index < 5; index += 1) {
        const angle = (index / 5) * Math.PI * 2 + 0.5
        const radius = 0.35 * scale
        const leaf = sphere(
          this.group,
          0.38 * scale,
          [x + Math.cos(angle) * radius, (1.55 + (index % 2) * 0.24) * scale, z + Math.sin(angle) * radius],
          leafMats[index % 2] ?? leafMats[0]!,
          { scale: [1.4, 0.55, 0.8], segments: 12 },
        )
        leaf.rotation.z = Math.cos(angle) * 0.4
        leaf.rotation.y = -angle
      }
    }

    // Low sideboard and a few oversized board-game-like boxes.
    const sideboard = rounded(this.group, [3.0, 1.15, 0.9], 0.09, [7.0, 0.68, -6.0], material(0x5f4432), {})
    sideboard.rotation.y = -0.03
    for (let index = 0; index < 3; index += 1) {
      const color = [0xb5664e, 0x506e65, 0xc9a85d][index] ?? 0xb5664e
      box(this.group, [0.42, 0.55, 0.24], [6.25 + index * 0.55, 1.46, -5.7], material(color, { roughness: 0.82 }), {
        rotation: [0, 0.1, 0],
      })
    }
  }

  private buildProps(): void {
    const paperMat = material(0xf0e4cc, { roughness: 0.98 })
    const inkMat = material(0x554f4e, { roughness: 0.8 })
    for (let index = 0; index < 7; index += 1) {
      const x = -2.45 + (index % 4) * 0.78 + (index > 3 ? 1.35 : 0)
      const z = -0.2 + Math.floor(index / 4) * 0.66
      const paper = box(this.group, [0.66, 0.018, 0.45], [x, 1.79 + index * 0.003, z], paperMat, {
        rotation: [0, -0.18 + index * 0.04, 0],
        castShadow: false,
      })
      paper.name = `board-paper-${index}`
      box(this.group, [0.38, 0.005, 0.018], [x + 0.04, 1.803 + index * 0.003, z], inkMat, {
        rotation: [0, -0.18 + index * 0.04, 0],
        castShadow: false,
      })
    }

    const mugColors = [0xc6634c, 0x557469, 0xd1a859, 0x697c90, 0x94644f]
    for (let index = 0; index < 5; index += 1) {
      const angle = -1.1 + index * 0.55
      const x = Math.sin(angle) * 3.1
      const z = TABLE_CENTER_Z + Math.cos(angle) * 1.62
      const mug = cylinder(this.group, 0.11, 0.13, 0.22, [x, 1.88, z], material(mugColors[index] ?? 0xc6634c, { roughness: 0.65 }), {
        segments: 14,
      })
      mug.name = `mug-${index}`
      const handle = mesh(new THREE.TorusGeometry(0.075, 0.02, 6, 12), material(mugColors[index] ?? 0xc6634c), { castShadow: false })
      handle.position.set(x + 0.13, 1.88, z)
      handle.rotation.x = Math.PI / 2
      this.group.add(handle)
    }

    // Three quiet market props: a controller, a pocket screen, and a house-shaped block.
    const propDark = material(0x30333b, { roughness: 0.62 })
    rounded(this.group, [0.72, 0.09, 0.36], 0.08, [-3.55, 1.81, 1.62], propDark, { rotation: [0, 0.2, 0], castShadow: false })
    sphere(this.group, 0.045, [-3.7, 1.86, 1.63], propDark, { segments: 8, castShadow: false })
    box(this.group, [0.05, 0.025, 0.18], [-3.79, 1.86, 1.63], material(0xd0b77c), { castShadow: false })

    const phone = rounded(this.group, [0.38, 0.035, 0.74], 0.035, [3.62, 1.8, 1.55], propDark, { rotation: [0, -0.28, 0], castShadow: false })
    phone.name = 'pocket-screen-prop'
    box(this.group, [0.3, 0.006, 0.62], [3.62, 1.82, 1.55], material(0x73999e, { emissive: 0x324d52, emissiveIntensity: 0.22 }), {
      rotation: [0, -0.28, 0],
      castShadow: false,
    })

    const houseMat = material(0xc38d61, { roughness: 0.85 })
    rounded(this.group, [0.62, 0.4, 0.4], 0.05, [0, 1.81, 2.3], houseMat, { rotation: [0, 0.2, 0], castShadow: false })
    const roof = mesh(new THREE.ConeGeometry(0.45, 0.3, 4), material(0x577267, { roughness: 0.82 }))
    roof.position.set(0, 2.12, 2.3)
    roof.rotation.y = Math.PI / 4
    this.group.add(roof)
  }

  private createTableGlow(): THREE.Mesh {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe1b96f,
      transparent: true,
      opacity: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.65, 7.0, 64), ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(0, 0.17, 0.7)
    this.group.add(ring)
    return ring
  }

  private createDust(): THREE.Points {
    let seed = 407
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    const positions = new Float32Array(64 * 3)
    for (let index = 0; index < 64; index += 1) {
      positions[index * 3] = (random() - 0.5) * 16
      positions[index * 3 + 1] = 1.3 + random() * 5.2
      positions[index * 3 + 2] = -4.6 + random() * 9.6
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const pointMat = new THREE.PointsMaterial({
      color: 0xffe0b4,
      size: 0.035,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const points = new THREE.Points(geometry, pointMat)
    points.name = 'boardroom-dust'
    return points
  }

  setSpeaker(character: CharacterId | null, mood: Mood = 'neutral'): void {
    this.speaker = character === 'narrator' ? null : character
    for (const [id, avatar] of this.avatars) {
      const active = id === this.speaker
      avatar.setSpeaking(active)
      avatar.setMood(active ? mood : 'neutral')
    }
  }

  /**
   * Head / upper-body anchor for camera framing. This is deliberately above
   * the seat's feet-root: the adapter normalizes every future GLB to the same
   * 3.0-unit height, so the anchor and framing stay valid when final models
   * replace the procedural cast.
   */
  getSpeakerPosition(character: CharacterId | null): THREE.Vector3 | null {
    if (!character || character === 'narrator') return null
    const avatar = this.avatars.get(character as AdvisorId)
    if (!avatar) return null
    avatar.root.updateWorldMatrix(true, true)
    return avatar.headAnchor.getWorldPosition(new THREE.Vector3())
  }

  /** Read-only copy of the final seat/anchor layout for the camera director. */
  getSeatLayout(): readonly SeatLayoutEntry[] {
    return this.seatLayout.map((seat) => ({
      ...seat,
      anchor: [...seat.anchor] as [number, number, number],
    }))
  }

  update(time: number, delta: number): void {
    for (const avatar of this.avatars.values()) avatar.update(time, delta)
    const glowMaterial = this.tableGlow.material as THREE.MeshBasicMaterial
    glowMaterial.opacity = 0.055 + Math.sin(time * 0.35) * 0.012
    this.dust.rotation.y = Math.sin(time * 0.035) * 0.035
    this.dust.position.y = Math.sin(time * 0.24) * 0.05
  }

  reset(): void {
    this.presenterReset()
  }

  private presenterReset(): void {
    this.speaker = null
    for (const avatar of this.avatars.values()) avatar.resetPerformance()
  }

  dispose(): void {
    for (const avatar of this.avatars.values()) avatar.dispose()
    this.avatars.clear()
  }
}
