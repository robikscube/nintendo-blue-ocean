import * as THREE from 'three'
import gsap from 'gsap'
import type { PrototypeSpec } from '../core/types'
import { createPrototype } from './prototypes'
import { box, cylinder, disposeObject, group, material, mesh, rounded, sphere } from './primitives'

interface ArmRig {
  shoulder: THREE.Group
  elbow: THREE.Group
  wrist: THREE.Group
  side: -1 | 1
}

const STAGE_Y = 1.45
const PRESS_UP = 5.28
const PRESS_DOWN = 3.78
const ARM_REST = 0.14
const ARM_REACH = 1.02

export class Factory {
  readonly group = new THREE.Group()
  private readonly prototypeMount = new THREE.Group()
  private readonly leftArm: ArmRig
  private readonly rightArm: ArmRig
  private readonly press: THREE.Group
  private readonly partA: THREE.Group
  private readonly partB: THREE.Group
  private readonly stageRing: THREE.Mesh
  private readonly ringMaterial: THREE.MeshBasicMaterial
  private readonly beaconMaterial: THREE.MeshStandardMaterial
  private readonly fan: THREE.Group
  private readonly stageSpot: THREE.SpotLight
  private readonly partStartA = new THREE.Vector3(-4.9, 1.9, 0.65)
  private readonly partStartB = new THREE.Vector3(4.9, 2.05, -0.15)
  private timeline: gsap.core.Timeline | null = null
  private onFinished: (() => void) | null = null
  private completed = false
  private readonly glowState = { value: 0.2 }
  private readonly boostState = { value: 0 }
  private currentSpec: PrototypeSpec | null = null
  private currentModel: THREE.Group | null = null

  constructor() {
    this.group.name = 'factory'
    this.buildRoom()
    this.buildConveyor()
    this.buildStage()
    this.buildGantry()
    this.leftArm = this.createArm(-1)
    this.rightArm = this.createArm(1)
    this.buildLights()
    this.press = this.buildPress()
    this.partA = this.buildPartModule('part-a', 0xe7b45f, this.partStartA)
    this.partB = this.buildPartModule('part-b', 0x68c1b3, this.partStartB)
    this.group.add(this.partA)
    this.group.add(this.partB)
    this.fan = this.buildFan()
    this.group.add(this.fan)
    this.prototypeMount.position.set(0, STAGE_Y - 0.02, 0.35)
    this.prototypeMount.visible = false
    this.group.add(this.prototypeMount)
    this.stageRing = this.buildStageRing()
    this.ringMaterial = this.stageRing.material as THREE.MeshBasicMaterial
    this.beaconMaterial = material(0xffb15c, { emissive: 0xff8d3a, emissiveIntensity: 1.5 })
    const beacon = sphere(this.group, 0.16, [0, 6.98, 0.16], this.beaconMaterial, { segments: 14, castShadow: false })
    beacon.name = 'press-warning-beacon'
    const stageLight = new THREE.PointLight(0x7cd7c7, 14, 7, 2)
    stageLight.position.set(0, 3.8, 1.0)
    this.group.add(stageLight)
    this.stageSpot = new THREE.SpotLight(0xffd298, 190, 18, 0.62, 0.5, 1.2)
    this.stageSpot.position.set(-0.8, 7.4, 4.5)
    this.stageSpot.target.position.set(0, 2.1, 0.25)
    this.group.add(this.stageSpot)
    this.group.add(this.stageSpot.target)
  }

  private buildRoom(): void {
    const concrete = material(0x565650, { roughness: 0.98 })
    const concreteDark = material(0x3d3d3a, { roughness: 0.98 })
    const wall = material(0x2e4545, { roughness: 0.86, metalness: 0.06 })
    const wallDark = material(0x223637, { roughness: 0.9 })
    const steel = material(0x596669, { roughness: 0.55, metalness: 0.38 })
    const darkSteel = material(0x303a3c, { roughness: 0.62, metalness: 0.26 })
    const amber = material(0xd3a34e, { roughness: 0.74 })

    box(this.group, [18, 0.3, 13], [0, -0.16, 0], concrete, { castShadow: false })
    for (let index = 0; index < 7; index += 1) {
      box(this.group, [0.02, 0.035, 12.8], [-7.5 + index * 2.5, 0.02, 0], concreteDark, { castShadow: false })
      box(this.group, [18, 0.035, 0.02], [0, 0.025, -5.6 + index * 1.6], concreteDark, { castShadow: false })
    }
    box(this.group, [18, 8.6, 0.4], [0, 4.3, -6.45], wall, { castShadow: false })
    box(this.group, [18, 1.15, 0.5], [0, 0.57, -6.35], wallDark, { castShadow: false })
    box(this.group, [18, 0.2, 0.6], [0, 1.2, -6.32], steel, { castShadow: false })
    box(this.group, [0.4, 8.6, 13], [-8.95, 4.3, 0], wall, { castShadow: false })
    box(this.group, [0.4, 8.6, 13], [8.95, 4.3, 0], wall, { castShadow: false })
    box(this.group, [0.6, 1.15, 13], [-8.85, 0.57, 0], wallDark, { castShadow: false })
    box(this.group, [0.6, 1.15, 13], [8.85, 0.57, 0], wallDark, { castShadow: false })

    // Corrugated back-wall ribs.
    for (let index = 0; index < 26; index += 1) {
      box(this.group, [0.17, 5.9, 0.11], [-8.15 + index * 0.65, 4.4, -6.21], wallDark, { castShadow: false })
    }

    // Hazard edges keep the stage legible from a projector.
    for (const z of [-3.55, 4.3]) {
      for (let index = 0; index < 10; index += 1) {
        box(this.group, [1.2, 0.035, 0.26], [-5.4 + index * 1.2, 0.038, z], index % 2 ? darkSteel : amber, {
          rotation: [0, 0.35, 0],
          castShadow: false,
        })
      }
    }

    // Pipes, pressure valves, and utility boxes.
    const pipeMat = material(0x7a8a85, { roughness: 0.52, metalness: 0.42 })
    for (const y of [5.35, 6.05]) {
      cylinder(this.group, 0.15, 0.15, 13.5, [0, y, -6.02], pipeMat, {
        rotation: [0, 0, Math.PI / 2],
        segments: 14,
        castShadow: false,
      })
      for (const x of [-5.2, -2.0, 2.0, 5.2]) {
        const valve = mesh(new THREE.TorusGeometry(0.24, 0.06, 7, 16), steel, { castShadow: false })
        valve.position.set(x, y, -5.82)
        valve.rotation.x = Math.PI / 2
        this.group.add(valve)
      }
    }
    for (const x of [-6.9, 6.9]) {
      cylinder(this.group, 0.11, 0.11, 5.2, [x, 3.7, -6.03], pipeMat, {
        segments: 10,
        castShadow: false,
      })
    }
    for (const [index, x] of [-7.0, 7.0].entries()) {
      rounded(this.group, [1.25, 0.8, 0.3], 0.06, [x, 2.3, -6.15], darkSteel, { castShadow: false })
      for (let row = 0; row < 3; row += 1) {
        box(this.group, [0.75, 0.035, 0.04], [x, 2.16 + row * 0.16, -5.98], index === 0 ? amber : steel, {
          castShadow: false,
        })
      }
    }

    // Tall service doors and a glowing safety line.
    for (const x of [-5.7, 5.7]) {
      rounded(this.group, [2.1, 3.6, 0.18], 0.05, [x, 1.95, -6.15], wallDark, { castShadow: false })
      box(this.group, [1.8, 0.05, 0.4], [x, 0.18, -5.95], steel, { castShadow: false })
    }
    box(this.group, [10.5, 0.035, 0.06], [0, 0.045, 3.75], material(0xd5a657, { emissive: 0x8d5e1c, emissiveIntensity: 0.25 }), {
      castShadow: false,
    })
  }

  private buildConveyor(): void {
    const beltMat = material(0x252b2d, { roughness: 0.9 })
    const frameMat = material(0x586265, { roughness: 0.45, metalness: 0.38 })
    const rollerMat = material(0x8a9696, { roughness: 0.38, metalness: 0.5 })
    const xStart = -5.2
    const width = 10.4
    const z = -2.0
    box(this.group, [width, 0.18, 1.32], [0, 1.22, z], beltMat, { castShadow: false })
    box(this.group, [width, 0.14, 0.13], [0, 1.42, z - 0.67], frameMat, { castShadow: false })
    box(this.group, [width, 0.14, 0.13], [0, 1.42, z + 0.67], frameMat, { castShadow: false })
    for (let index = 0; index < 15; index += 1) {
      const x = xStart + index * (width / 14)
      cylinder(this.group, 0.13, 0.13, 1.3, [x, 1.31, z], rollerMat, {
        rotation: [Math.PI / 2, 0, 0],
        segments: 12,
        castShadow: false,
      })
    }
    for (const x of [-5.1, 5.1]) {
      for (const dz of [-0.66, 0.66]) {
        box(this.group, [0.18, 1.2, 0.18], [x, 0.6, z + dz], frameMat)
      }
    }
    // A few original abstract crates queue behind the line.
    for (let index = 0; index < 3; index += 1) {
      const crateColor = [0x8e6148, 0x4e6e68, 0x8a774e][index] ?? 0x8e6148
      const crate = rounded(this.group, [0.8, 0.62, 0.72], 0.06, [-3.8 + index * 1.1, 1.72, z], material(crateColor, {
        roughness: 0.9,
      }))
      crate.name = `conveyor-crate-${index + 1}`
      box(this.group, [0.52, 0.05, 0.03], [-3.8 + index * 1.1, 1.72, z + 0.38], material(0xc7a56a), { castShadow: false })
    }
  }

  private buildStage(): void {
    const base = material(0x2d3738, { roughness: 0.72 })
    const trim = material(0x5d6d69, { roughness: 0.42, metalness: 0.35 })
    const top = material(0x3b4845, { roughness: 0.66, metalness: 0.08 })
    const topInset = material(0x303c3b, { roughness: 0.58, metalness: 0.16 })
    rounded(this.group, [4.7, 0.28, 3.55], 0.09, [0, 0.16, 0.25], base)
    rounded(this.group, [4.25, 0.85, 3.1], 0.08, [0, 0.72, 0.25], top)
    rounded(this.group, [4.45, 0.16, 3.24], 0.06, [0, 1.32, 0.25], trim)
    rounded(this.group, [3.7, 0.03, 2.35], 0.04, [0, 1.405, 0.32], topInset, { castShadow: false })
    box(this.group, [3.5, 0.04, 0.04], [0, 1.42, 1.65], material(0xe2b25c, { emissive: 0x815617, emissiveIntensity: 0.3 }), {
      castShadow: false,
    })
    for (const x of [-2.05, 2.05]) {
      for (const z of [-0.75, 1.35]) {
        box(this.group, [0.35, 0.02, 0.04], [x, 1.423, z], material(0x6f7f7b, { metalness: 0.3 }), { castShadow: false })
      }
    }
    for (const x of [-2.25, 2.25]) {
      for (const z of [-1.25, 1.75]) {
        cylinder(this.group, 0.08, 0.1, 0.2, [x, 0.1, z], trim, { segments: 10 })
      }
    }
  }

  private buildGantry(): void {
    const steel = material(0x4e5c5d, { roughness: 0.43, metalness: 0.45 })
    const darkSteel = material(0x2f383a, { roughness: 0.5, metalness: 0.32 })
    const amber = material(0xd2a04b, { roughness: 0.7 })
    for (const side of [-1, 1]) {
      box(this.group, [1.1, 0.26, 1.65], [side * 3.12, 0.15, 0.15], darkSteel)
      box(this.group, [0.42, 6.1, 0.42], [side * 3.12, 3.2, 0.15], steel)
      for (let index = 0; index < 7; index += 1) {
        box(this.group, [0.34, 0.28, 0.05], [side * 2.9, 0.5 + index * 0.74, 0.38], darkSteel, { castShadow: false })
      }
      box(this.group, [0.7, 0.3, 0.7], [side * 3.12, 6.2, 0.15], darkSteel)
    }
    box(this.group, [6.9, 0.42, 0.52], [0, 6.45, 0.15], steel)
    box(this.group, [5.7, 0.15, 0.62], [0, 6.72, 0.15], darkSteel)
    box(this.group, [3.1, 0.1, 0.08], [0, 6.88, 0.45], amber, { castShadow: false })
    for (const x of [-1.8, 1.8]) {
      cylinder(this.group, 0.08, 0.08, 0.22, [x, 6.92, 0.15], material(0xffbc6e, { emissive: 0xff8c36, emissiveIntensity: 1.2 }), {
        segments: 10,
        castShadow: false,
      })
    }
  }

  private buildPress(): THREE.Group {
    const steel = material(0x465153, { roughness: 0.38, metalness: 0.5 })
    const plate = material(0x2b3335, { roughness: 0.5, metalness: 0.32 })
    const dark = material(0x202728, { roughness: 0.58, metalness: 0.2 })
    const amber = material(0xdfac51, { roughness: 0.5, metalness: 0.08 })
    const glow = material(0xffc36d, { emissive: 0xe08c36, emissiveIntensity: 0.65, roughness: 0.4 })
    const press = group([0, PRESS_UP, 0.15])
    press.name = 'stamping-press'
    cylinder(press, 0.22, 0.22, 1.1, [0, 0.86, 0], steel, { segments: 16 })
    for (const side of [-1, 1]) {
      cylinder(press, 0.1, 0.1, 1.2, [side * 0.9, 0.72, 0.22], dark, { segments: 10 })
    }
    rounded(press, [2.55, 0.34, 1.64], 0.06, [0, 0.04, 0], steel)
    box(press, [2.31, 0.17, 1.43], [0, -0.18, 0], plate)
    box(press, [1.95, 0.12, 1.16], [0, -0.31, 0], dark)
    for (const side of [-1, 1]) {
      box(press, [0.38, 0.26, 0.5], [side * 1.08, -0.17, 0], amber)
      box(press, [0.07, 0.34, 1.25], [side * 1.22, -0.14, 0], amber, { castShadow: false })
    }
    for (let index = 0; index < 5; index += 1) {
      const stripe = box(press, [0.3, 0.11, 0.026], [-1.0 + index * 0.5, 0.05, 0.842], index % 2 === 0 ? amber : dark, {
        rotation: [0, 0, -0.45],
        castShadow: false,
      })
      stripe.name = `press-hazard-${index + 1}`
    }
    box(press, [2.0, 0.025, 0.04], [0, -0.26, 0.74], glow, { castShadow: false })
    for (const x of [-0.92, 0.92]) {
      cylinder(press, 0.06, 0.06, 0.03, [x, 0.2, 0.84], glow, {
        rotation: [Math.PI / 2, 0, 0],
        segments: 10,
        castShadow: false,
      })
    }
    this.group.add(press)
    return press
  }

  private createArm(side: -1 | 1): ArmRig {
    const steel = material(0x78898a, { roughness: 0.35, metalness: 0.5 })
    const dark = material(0x333e40, { roughness: 0.54, metalness: 0.25 })
    const accent = material(0xd8a54f, { roughness: 0.52 })
    const base = group([side * 3.35, 0, 0.7])
    cylinder(base, 0.58, 0.76, 0.34, [0, 0.19, 0], dark, { segments: 18 })
    cylinder(base, 0.34, 0.48, 1.15, [0, 0.92, 0], steel, { segments: 18 })
    cylinder(base, 0.23, 0.3, 2.55, [0, 2.66, 0], steel, { segments: 16 })
    cylinder(base, 0.38, 0.3, 0.28, [0, 3.9, 0], accent, { segments: 16 })
    for (const level of [1.52, 2.48, 3.36]) {
      box(base, [0.72, 0.16, 0.72], [0, level, 0], dark, { castShadow: false })
    }
    box(base, [0.6, 0.4, 0.72], [0, 4.05, 0.25], dark)
    const shoulder = group([0, 4.12, 0.58])
    shoulder.rotation.z = side * ARM_REST
    box(shoulder, [0.68, 0.52, 0.68], [0, 0, 0], dark)
    cylinder(shoulder, 0.25, 0.25, 0.66, [0, 0, 0], accent, {
      rotation: [0, 0, Math.PI / 2],
      segments: 16,
    })
    box(shoulder, [0.36, 1.48, 0.38], [0, -0.79, 0], steel)
    const elbow = group([0, -1.55, 0])
    cylinder(elbow, 0.27, 0.27, 0.66, [0, 0, 0], accent, {
      rotation: [0, 0, Math.PI / 2],
      segments: 16,
    })
    box(elbow, [0.31, 1.36, 0.32], [0, -0.73, 0], steel)
    const wrist = group([0, -1.46, 0])
    cylinder(wrist, 0.18, 0.18, 0.3, [0, 0, 0], dark, {
      rotation: [Math.PI / 2, 0, 0],
      segments: 14,
    })
    const clamp = group([0, -0.18, 0])
    for (const finger of [-1, 1]) {
      box(clamp, [0.09, 0.4, 0.13], [finger * 0.14, -0.18, 0], accent, {
        rotation: [0, 0, finger * 0.18],
      })
      box(clamp, [0.14, 0.1, 0.19], [finger * 0.23, -0.38, 0], dark)
    }
    box(clamp, [0.42, 0.12, 0.22], [0, 0.02, 0], dark)
    wrist.add(clamp)
    elbow.add(wrist)
    shoulder.add(elbow)
    base.add(shoulder)
    const ring = mesh(new THREE.TorusGeometry(0.6, 0.055, 6, 24), material(0xdaa552, { roughness: 0.58 }), {
      castShadow: false,
    })
    ring.position.y = 0.36
    ring.rotation.x = Math.PI / 2
    base.add(ring)
    this.group.add(base)
    return { shoulder, elbow, wrist, side }
  }

  private buildLights(): void {
    const lampMat = material(0xffd9a2, { emissive: 0xffb96f, emissiveIntensity: 2.2, roughness: 0.4 })
    const casing = material(0x394447, { roughness: 0.55, metalness: 0.18 })
    for (const x of [-3.8, 3.8]) {
      cylinder(this.group, 0.06, 0.06, 2.2, [x, 7.8, 3.1], material(0x252b2d), { segments: 8, castShadow: false })
      const shade = mesh(new THREE.ConeGeometry(0.6, 0.35, 20), casing)
      shade.position.set(x, 6.65, 3.1)
      shade.rotation.x = Math.PI
      this.group.add(shade)
      sphere(this.group, 0.15, [x, 6.52, 3.1], lampMat, { segments: 12, castShadow: false })
      const light = new THREE.PointLight(0xffc888, 35, 11, 2)
      light.position.set(x, 6.2, 3.0)
      this.group.add(light)
    }
  }

  private buildPartModule(name: string, color: number, start: THREE.Vector3): THREE.Group {
    const partGroup = group([start.x, start.y, start.z])
    partGroup.name = name
    const skin = material(color, { roughness: 0.55 })
    const dark = material(0x30383a, { roughness: 0.6, metalness: 0.2 })
    rounded(partGroup, [0.52, 0.36, 0.42], 0.08, [0, 0, 0], dark)
    rounded(partGroup, [0.3, 0.12, 0.25], 0.04, [0, 0.22, 0], skin)
    box(partGroup, [0.18, 0.025, 0.03], [0, 0.2, 0.15], material(0xffffff, { emissive: color, emissiveIntensity: 0.8 }), {
      castShadow: false,
    })
    cylinder(partGroup, 0.06, 0.08, 0.12, [0.16, -0.23, 0], skin, { segments: 10 })
    this.group.add(partGroup)
    return partGroup
  }

  private buildFan(): THREE.Group {
    const fan = group([-6.15, 6.85, -6.08])
    const frame = material(0x2b3739, { roughness: 0.7 })
    const bladeMat = material(0x607372, { roughness: 0.55, metalness: 0.25 })
    const ring = mesh(new THREE.TorusGeometry(0.75, 0.1, 8, 24), frame)
    ring.rotation.x = Math.PI / 2
    fan.add(ring)
    const blades = group([0, 0, 0])
    for (let index = 0; index < 4; index += 1) {
      const blade = box(blades, [0.58, 0.1, 0.3], [0.32, 0, 0], bladeMat, { castShadow: false })
      blade.rotation.z = index * (Math.PI / 2)
    }
    fan.add(blades)
    fan.userData.blades = blades
    return fan
  }

  private buildStageRing(): THREE.Mesh {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.25, 2.7, 64),
      new THREE.MeshBasicMaterial({ color: 0x78d5c7, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set(0, 0.045, 0.25)
    ring.name = 'assembly-stage-light-ring'
    this.group.add(ring)
    return ring
  }

  play(spec: PrototypeSpec, onFinished: (() => void) | null, reducedMotion = false): void {
    this.killTimeline()
    this.onFinished = onFinished
    this.completed = false
    this.currentSpec = spec
    this.buildPrototype(spec)
    this.resetScene()
    if (reducedMotion) {
      this.applyFinalState()
      this.complete()
      return
    }
    const tl = gsap.timeline({
      onComplete: () => this.complete(),
    })
    this.timeline = tl

    tl.set(this.partA, { visible: true }, 0)
    tl.set(this.partB, { visible: true }, 0)
    tl.to(this.partA.position, { x: 0, y: 2.6, z: 0.35, duration: 1.15, ease: 'power2.inOut' }, 0.12)
    tl.to(this.partB.position, { x: 0, y: 2.6, z: 0.35, duration: 1.15, ease: 'power2.inOut' }, 0.25)
    tl.to(this.partA.rotation, { y: Math.PI, z: 0.35, duration: 1.15, ease: 'power2.inOut' }, 0.12)
    tl.to(this.partB.rotation, { y: -Math.PI, z: -0.35, duration: 1.2, ease: 'power2.inOut' }, 0.25)
    tl.to(this.partA.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25, ease: 'power2.in' }, 1.85)
    tl.to(this.partB.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25, ease: 'power2.in' }, 1.95)
    tl.set(this.partA, { visible: false }, 2.15)
    tl.set(this.partB, { visible: false }, 2.2)

    tl.to(this.leftArm.shoulder.rotation, { z: ARM_REACH, x: -0.2, duration: 0.9, ease: 'power2.inOut' }, 0.35)
    tl.to(this.rightArm.shoulder.rotation, { z: -ARM_REACH, x: -0.2, duration: 0.9, ease: 'power2.inOut' }, 0.45)
    tl.to(this.leftArm.elbow.rotation, { z: -0.68, x: 0.3, duration: 0.75, ease: 'power2.inOut' }, 0.55)
    tl.to(this.rightArm.elbow.rotation, { z: 0.68, x: 0.3, duration: 0.75, ease: 'power2.inOut' }, 0.62)
    tl.to(this.leftArm.wrist.rotation, { z: 0.22, y: 0.4, duration: 0.8, ease: 'power2.inOut' }, 1.1)
    tl.to(this.rightArm.wrist.rotation, { z: -0.22, y: -0.4, duration: 0.8, ease: 'power2.inOut' }, 1.16)
    tl.to(this.leftArm.shoulder.rotation, { z: ARM_REST, x: 0, duration: 0.8, ease: 'power2.inOut' }, 2.35)
    tl.to(this.rightArm.shoulder.rotation, { z: -ARM_REST, x: 0, duration: 0.8, ease: 'power2.inOut' }, 2.4)
    tl.to(this.leftArm.elbow.rotation, { z: 0, x: 0, duration: 0.7, ease: 'power2.inOut' }, 2.35)
    tl.to(this.rightArm.elbow.rotation, { z: 0, x: 0, duration: 0.7, ease: 'power2.inOut' }, 2.4)
    tl.to(this.leftArm.wrist.rotation, { z: 0, y: 0, duration: 0.5 }, 2.35)
    tl.to(this.rightArm.wrist.rotation, { z: 0, y: 0, duration: 0.5 }, 2.4)

    tl.to(this.press.position, { y: PRESS_DOWN, duration: 0.52, ease: 'power3.in' }, 3.45)
    tl.to(this.press.scale, { x: 1.035, y: 0.95, z: 1.035, duration: 0.09, ease: 'power2.out' }, 3.94)
    tl.to(this.press.scale, { x: 1, y: 1, z: 1, duration: 0.35, ease: 'elastic.out(1, 0.5)' }, 4.06)
    tl.to(this.glowState, { value: 1, duration: 0.65, ease: 'power2.out' }, 3.94)
    tl.to(this.press.position, { y: PRESS_UP, duration: 0.75, ease: 'back.out(1.4)' }, 4.25)

    tl.set(this.prototypeMount, { visible: true }, 4.58)
    tl.fromTo(
      this.prototypeMount.scale,
      { x: 0.01, y: 0.01, z: 0.01 },
      { x: 1, y: 1, z: 1, duration: 0.85, ease: 'back.out(1.8)' },
      4.58,
    )
    tl.fromTo(
      this.prototypeMount.rotation,
      { y: -0.7 },
      { y: 0.27, duration: 1.0, ease: 'power2.out' },
      4.58,
    )
    tl.fromTo(
      this.prototypeMount.position,
      { y: STAGE_Y - 0.12 },
      { y: STAGE_Y - 0.02, duration: 0.6, ease: 'power2.out' },
      4.58,
    )
    tl.to(this.glowState, { value: 1.45, duration: 0.7, ease: 'power2.out' }, 4.55)
    tl.to(this.boostState, { value: 1, duration: 0.75, ease: 'power2.out' }, 4.55)
    tl.to({}, { duration: 0.55 }, 5.55)
  }

  private buildPrototype(spec: PrototypeSpec): void {
    if (this.currentModel) {
      this.prototypeMount.remove(this.currentModel)
      disposeObject(this.currentModel)
      this.currentModel = null
    }
    const model = createPrototype(spec)
    this.currentModel = model
    this.prototypeMount.add(model)
    this.currentSpec = spec
  }

  private resetScene(): void {
    this.killTimeline()
    this.completed = false
    this.glowState.value = 0.2
    this.boostState.value = 0
    this.ringMaterial.opacity = 0.18
    this.prototypeMount.visible = false
    this.prototypeMount.scale.setScalar(0.01)
    this.prototypeMount.rotation.set(0, 0, 0)
    this.prototypeMount.position.set(0, STAGE_Y - 0.12, 0.35)
    this.press.position.set(0, PRESS_UP, 0.15)
    this.press.scale.set(1, 1, 1)
    this.leftArm.shoulder.rotation.set(0, 0, -ARM_REST)
    this.rightArm.shoulder.rotation.set(0, 0, ARM_REST)
    this.leftArm.elbow.rotation.set(0, 0, 0)
    this.rightArm.elbow.rotation.set(0, 0, 0)
    this.leftArm.wrist.rotation.set(0, 0, 0)
    this.rightArm.wrist.rotation.set(0, 0, 0)
    this.partA.visible = false
    this.partB.visible = false
    this.partA.position.copy(this.partStartA)
    this.partB.position.copy(this.partStartB)
    this.partA.rotation.set(0, 0, 0)
    this.partB.rotation.set(0, 0, 0)
    this.partA.scale.setScalar(1)
    this.partB.scale.setScalar(1)
    this.stageSpot.intensity = 130
  }

  skip(): void {
    if (this.completed) return
    if (this.timeline) {
      this.timeline.progress(1)
    }
    if (!this.completed) {
      this.applyFinalState()
      this.complete()
    }
  }

  replay(): void {
    if (!this.currentSpec) return
    const spec = this.currentSpec
    this.play(spec, null)
  }

  private applyFinalState(): void {
    this.partA.visible = false
    this.partB.visible = false
    this.leftArm.shoulder.rotation.set(0, 0, -ARM_REST)
    this.rightArm.shoulder.rotation.set(0, 0, ARM_REST)
    this.leftArm.elbow.rotation.set(0, 0, 0)
    this.rightArm.elbow.rotation.set(0, 0, 0)
    this.leftArm.wrist.rotation.set(0, 0, 0)
    this.rightArm.wrist.rotation.set(0, 0, 0)
    this.press.position.set(0, PRESS_UP, 0.15)
    this.press.scale.set(1, 1, 1)
    this.prototypeMount.visible = true
    this.prototypeMount.scale.setScalar(1)
    this.prototypeMount.rotation.set(0, 0.27, 0)
    this.prototypeMount.position.set(0, STAGE_Y - 0.02, 0.35)
    this.glowState.value = 1.45
    this.boostState.value = 1
    this.stageSpot.intensity = 350
    this.ringMaterial.opacity = 0.7
  }

  private complete(): void {
    if (this.completed) return
    this.completed = true
    const callback = this.onFinished
    this.onFinished = null
    callback?.()
  }

  private killTimeline(): void {
    if (this.timeline) {
      this.timeline.kill()
      this.timeline = null
    }
  }

  update(time: number, delta: number): void {
    const blades = this.fan.userData.blades as THREE.Group | undefined
    if (blades) blades.rotation.z += delta * 0.5
    this.beaconMaterial.emissiveIntensity = this.completed ? 2.4 : 1.2 + Math.sin(time * 3.4) * 0.55
    this.ringMaterial.opacity = 0.16 + Math.sin(time * 1.2) * 0.03 + this.glowState.value * 0.35
    this.stageSpot.intensity = 130 + this.boostState.value * 220 + Math.sin(time * 0.8) * 5
    if (this.completed && this.prototypeMount.visible) {
      this.prototypeMount.position.y = STAGE_Y - 0.02 + Math.sin(time * 1.3) * 0.025
      this.prototypeMount.rotation.y = 0.27 + Math.sin(time * 0.28) * 0.1
    }
  }

  dispose(): void {
    this.killTimeline()
    if (this.currentModel) {
      this.prototypeMount.remove(this.currentModel)
      disposeObject(this.currentModel)
      this.currentModel = null
    }
  }
}
