import * as THREE from 'three'
import type { CharacterId, CharacterProfile, Mood } from '../core/types'
import { CHARACTERS } from '../core/story'
import { box, cylinder, material, mesh, rounded, sphere } from './primitives'

const DARK = 0x2b2526
const CREAM = 0xf4ead9
const PUPIL = 0x181716

interface EyeRig {
  group: THREE.Group
  lid: THREE.Group
}

export class AnimalAvatar {
  readonly id: CharacterId
  readonly group: THREE.Group
  readonly profile: CharacterProfile
  private readonly headPivot: THREE.Group
  private readonly eyes: EyeRig[] = []
  private readonly brows: THREE.Mesh[] = []
  private readonly mouthLeft: THREE.Mesh
  private readonly mouthRight: THREE.Mesh
  private readonly focusRing: THREE.Mesh
  private readonly body: THREE.Mesh
  private readonly phase: number
  private speaking = false
  private blinkUntil = 0
  private nextBlink: number
  private seed: number

  constructor(id: CharacterId, position: readonly [number, number, number], facing = 0) {
    this.id = id
    this.profile = CHARACTERS[id]
    this.seed = sumChars(id)
    this.phase = ((this.seed % 100) / 100) * Math.PI * 2
    this.nextBlink = 2 + (this.seed % 37) / 10
    this.group = new THREE.Group()
    this.group.position.set(...position)
    this.group.rotation.y = facing
    this.group.name = `advisor-${id}`

    const skin = material(this.profile.color, { roughness: 0.92, flatShading: true })
    const accent = material(this.profile.accent, { roughness: 0.9, flatShading: true })
    const cream = material(CREAM, { roughness: 0.96, flatShading: true })
    const dark = material(DARK, { roughness: 0.72 })
    const white = material(0xfffaf0, { roughness: 0.45 })
    const pupil = material(PUPIL, { roughness: 0.28 })
    const blouse = material(id === 'shell' ? 0x41594a : id === 'pip' ? 0xb25432 : id === 'grumble' ? 0x3b4a5c : 0x3e5157, {
      roughness: 0.9,
      flatShading: true,
    })

    const torsoScale: [number, number, number] =
      id === 'grumble' ? [1.06, 1.08, 0.86] : id === 'shell' ? [0.88, 0.92, 0.75] : id === 'mori' ? [0.88, 1, 0.72] : [0.82, 0.96, 0.7]
    this.body = sphere(this.group, 0.86, [0, 1.45, 0], skin, { scale: torsoScale, segments: 20 })
    sphere(this.group, 0.62, [0, 1.39, 0.37], blouse, { scale: [0.92, 0.83, 0.44], segments: 16 })
    sphere(this.group, 0.18, [0, 1.57, 0.6], accent, { scale: [0.5, 1.15, 0.3], segments: 12 })

    // Soft, abstract arms. Their lower halves sit behind the boardroom table.
    const armCapsule = new THREE.CapsuleGeometry(0.13, 0.5, 4, 8)
    const armMat = skin
    for (const side of [-1, 1]) {
      const arm = mesh(armCapsule, armMat)
      arm.position.set(side * 0.64, 1.55, 0.08)
      arm.rotation.z = side * 0.33
      arm.rotation.x = -0.35
      this.group.add(arm)
      sphere(this.group, 0.15, [side * 0.72, 1.32, 0.25], accent, { scale: [1, 0.82, 0.8], segments: 12 })
    }

    this.headPivot = new THREE.Group()
    this.headPivot.position.set(0, 2.44, 0.03)
    this.group.add(this.headPivot)

    let headScale: [number, number, number] = [1, 0.96, 0.94]
    let headRadius = 0.63
    let eyeSpacing = 0.205
    let eyeRadius = 0.125
    let eyeY = 0.1
    let eyeZ = 0.53

    if (id === 'grumble') {
      headRadius = 0.69
      headScale = [1.07, 0.95, 0.98]
      eyeSpacing = 0.225
      eyeRadius = 0.11
      eyeZ = 0.59
    }
    if (id === 'mori') {
      headRadius = 0.68
      headScale = [1.06, 1, 0.9]
      eyeSpacing = 0.22
      eyeRadius = 0.16
      eyeZ = 0.53
    }
    if (id === 'pip') {
      headRadius = 0.6
      headScale = [0.96, 0.9, 0.88]
      eyeSpacing = 0.19
      eyeRadius = 0.115
      eyeZ = 0.49
      eyeY = 0.11
    }
    if (id === 'bolt') {
      headRadius = 0.61
      headScale = [1, 0.94, 0.92]
      eyeSpacing = 0.195
      eyeRadius = 0.105
      eyeZ = 0.5
    }
    if (id === 'shell') {
      headRadius = 0.57
      headScale = [0.98, 0.9, 0.9]
      eyeSpacing = 0.19
      eyeRadius = 0.1
      eyeZ = 0.47
      eyeY = 0.12
    }

    sphere(this.headPivot, headRadius, [0, 0, 0], skin, { scale: headScale, segments: 22 })
    this.addSpeciesFeatures(id, skin, accent, cream, dark, headRadius)
    this.addEyes(eyeSpacing, eyeY, eyeZ, eyeRadius, white, pupil)

    const mouthY = id === 'pip' || id === 'grumble' ? -0.25 : -0.17
    const mouthZ = eyeZ + 0.09
    const mouthMaterial = id === 'pip' ? dark : material(0x3c2d2a, { roughness: 0.7 })
    this.mouthLeft = box(this.headPivot, [0.12, 0.026, 0.025], [-0.065, mouthY, mouthZ], mouthMaterial, { castShadow: false })
    this.mouthRight = box(this.headPivot, [0.12, 0.026, 0.025], [0.065, mouthY, mouthZ], mouthMaterial, { castShadow: false })

    this.addNeckwear(id, accent, dark)

    if (id === 'mori' || id === 'shell') {
      const glasses = material(0x9f7743, { metalness: 0.38, roughness: 0.4 })
      for (const side of [-1, 1]) {
        const frame = mesh(new THREE.TorusGeometry(eyeRadius * 1.32, 0.022, 6, 22), glasses, { castShadow: false })
        frame.position.set(side * eyeSpacing, eyeY, eyeZ + 0.115)
        this.headPivot.add(frame)
      }
      box(this.headPivot, [eyeSpacing * 2 - eyeRadius * 2.1, 0.025, 0.025], [0, eyeY + 0.02, eyeZ + 0.12], glasses, { castShadow: false })
    }

    if (id === 'bolt') {
      const pencilMat = material(0xe4b23f, { roughness: 0.7 })
      const pencil = cylinder(this.headPivot, 0.035, 0.035, 0.42, [0.46, 0.29, 0.08], pencilMat, {
        rotation: [0, 0, -0.45],
        segments: 8,
        castShadow: false,
      })
      pencil.name = 'pencil'
      const eraser = material(0xd97866)
      cylinder(this.headPivot, 0.038, 0.038, 0.08, [0.55, 0.47, 0.08], eraser, {
        rotation: [0, 0, -0.45],
        segments: 8,
        castShadow: false,
      })
    }

    if (id === 'shell') {
      const shellMat = material(0x526545, { roughness: 0.88, flatShading: true })
      const rimMat = material(0x9a874d, { roughness: 0.72, flatShading: true })
      const shell = sphere(this.group, 0.84, [0, 1.48, -0.43], shellMat, {
        scale: [1.25, 0.94, 0.68],
        segments: 18,
      })
      shell.name = 'tortoise-shell'
      const rim = mesh(new THREE.TorusGeometry(0.91, 0.09, 8, 24), rimMat)
      rim.rotation.x = Math.PI / 2
      rim.scale.set(1.0, 0.63, 1)
      rim.position.set(0, 1.5, -0.25)
      this.group.add(rim)
      for (let index = 0; index < 4; index += 1) {
        const plate = box(this.group, [0.38, 0.38, 0.07], [-0.48 + index * 0.32, 1.85 - Math.abs(1.5 - index) * 0.16, -0.63], rimMat, {
          rotation: [0.45, 0, 0.2],
        })
        plate.scale.setScalar(0.82)
      }
      cylinder(this.group, 0.24, 0.32, 0.5, [0, 2.04, 0.05], skin, { segments: 16 })
    }

    this.addTail(id, skin, accent)
    this.focusRing = this.createFocusRing(accent)
    this.applyMood('neutral')
  }

  private addSpeciesFeatures(
    id: CharacterId,
    skin: THREE.Material,
    accent: THREE.Material,
    cream: THREE.Material,
    dark: THREE.Material,
    headRadius: number,
  ): void {
    const earMat = skin
    if (id === 'mori') {
      // Owl facial discs, tufts, and a tiny beak.
      for (const side of [-1, 1]) {
        sphere(this.headPivot, 0.27, [side * 0.205, 0.09, 0.45], cream, { scale: [1, 1.08, 0.32], segments: 16, castShadow: false })
        const tuft = mesh(new THREE.ConeGeometry(0.13, 0.42, 7), earMat)
        tuft.position.set(side * 0.38, 0.51, -0.02)
        tuft.rotation.z = side * -0.25
        this.headPivot.add(tuft)
      }
      const beak = mesh(new THREE.ConeGeometry(0.12, 0.26, 7), material(0xd9a64e, { roughness: 0.76 }))
      beak.rotation.x = Math.PI / 2
      beak.position.set(0, -0.13, headRadius * 0.9)
      this.headPivot.add(beak)
    } else if (id === 'pip') {
      for (const side of [-1, 1]) {
        const ear = mesh(new THREE.ConeGeometry(0.21, 0.62, 5), earMat)
        ear.position.set(side * 0.35, 0.54, 0)
        ear.rotation.z = side * 0.2
        this.headPivot.add(ear)
        const inner = mesh(new THREE.ConeGeometry(0.1, 0.33, 5), cream)
        inner.position.set(side * 0.35, 0.52, 0.08)
        inner.rotation.z = side * 0.2
        this.headPivot.add(inner)
      }
      sphere(this.headPivot, 0.31, [0, -0.14, 0.45], cream, { scale: [1.22, 0.56, 0.75], segments: 16 })
      sphere(this.headPivot, 0.07, [0, -0.09, 0.7], dark, { scale: [1.15, 0.8, 0.8], segments: 10 })
    } else if (id === 'bolt') {
      for (const side of [-1, 1]) {
        sphere(this.headPivot, 0.14, [side * 0.43, 0.38, 0], earMat, { scale: [1, 1, 0.5], segments: 12 })
      }
      sphere(this.headPivot, 0.27, [0, -0.14, 0.43], cream, { scale: [1.12, 0.72, 0.7], segments: 16 })
      sphere(this.headPivot, 0.065, [0, -0.04, 0.66], dark, { scale: [1.1, 0.8, 0.8], segments: 10 })
      const toothMat = material(0xfff6dc, { roughness: 0.55 })
      box(this.headPivot, [0.1, 0.15, 0.04], [-0.055, -0.3, 0.58], toothMat, { castShadow: false })
      box(this.headPivot, [0.1, 0.15, 0.04], [0.055, -0.3, 0.58], toothMat, { castShadow: false })
    } else if (id === 'grumble') {
      for (const side of [-1, 1]) {
        sphere(this.headPivot, 0.2, [side * 0.46, 0.42, 0], earMat, { scale: [1, 1, 0.55], segments: 12 })
        sphere(this.headPivot, 0.11, [side * 0.46, 0.42, 0.06], accent, { scale: [1, 1, 0.25], segments: 10 })
      }
      sphere(this.headPivot, 0.36, [0, -0.15, 0.43], cream, { scale: [1.13, 0.76, 0.72], segments: 18 })
      sphere(this.headPivot, 0.09, [0, -0.06, 0.73], dark, { scale: [1.1, 0.72, 0.7], segments: 10 })
    } else {
      // Shelldon the tortoise: a calm, beaky face with a little collar.
      sphere(this.headPivot, 0.22, [0, -0.15, 0.45], cream, { scale: [1.1, 0.66, 0.66], segments: 14 })
      sphere(this.headPivot, 0.05, [0, -0.12, 0.6], dark, { segments: 8 })
      const beak = mesh(new THREE.ConeGeometry(0.09, 0.18, 6), material(0xc9a35c, { roughness: 0.75 }))
      beak.rotation.x = Math.PI / 2
      beak.position.set(0, -0.25, 0.56)
      this.headPivot.add(beak)
    }
  }

  private addEyes(
    spacing: number,
    y: number,
    z: number,
    radius: number,
    white: THREE.Material,
    pupil: THREE.Material,
  ): void {
    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group()
      eyeGroup.position.set(side * spacing, y, z)
      const eye = sphere(eyeGroup, radius, [0, 0, 0], white, {
        scale: [0.88, 1.08, 0.5],
        segments: 14,
        castShadow: false,
      })
      eye.name = 'eye-white'
      const iris = sphere(eyeGroup, radius * 0.55, [0, 0, 0.07], pupil, {
        scale: [1, 1.12, 0.4],
        segments: 12,
        castShadow: false,
      })
      iris.name = 'pupil'
      const glint = sphere(eyeGroup, radius * 0.18, [-0.025, 0.045, 0.115], material(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.4 }), {
        segments: 6,
        castShadow: false,
      })
      glint.name = 'eye-glint'
      this.headPivot.add(eyeGroup)
      this.eyes.push({ group: eyeGroup, lid: eyeGroup })

      const brow = box(this.headPivot, [0.18, 0.025, 0.03], [side * spacing, y + radius * 1.45, z + 0.035], material(0x534137), {
        castShadow: false,
      })
      this.brows.push(brow)
    }
  }

  private addNeckwear(id: CharacterId, accent: THREE.Material, dark: THREE.Material): void {
    if (id === 'pip') {
      const scarf = mesh(new THREE.TorusGeometry(0.38, 0.085, 7, 20), accent)
      scarf.rotation.x = Math.PI / 2
      scarf.position.set(0, 1.98, 0)
      this.group.add(scarf)
      box(this.group, [0.16, 0.45, 0.06], [0.28, 1.78, 0.35], accent, { rotation: [0.22, 0, -0.18] })
    } else if (id === 'shell') {
      const bowMat = material(0xb28b48, { roughness: 0.6 })
      box(this.group, [0.2, 0.14, 0.05], [-0.12, 1.99, 0.42], bowMat, { rotation: [0, 0, 0.38] })
      box(this.group, [0.2, 0.14, 0.05], [0.12, 1.99, 0.42], bowMat, { rotation: [0, 0, -0.38] })
      sphere(this.group, 0.05, [0, 1.99, 0.45], dark, { segments: 8 })
    } else if (id === 'grumble') {
      const tie = mesh(new THREE.ConeGeometry(0.11, 0.38, 4), material(0x42566b, { roughness: 0.7 }), { castShadow: false })
      tie.position.set(0, 1.53, 0.62)
      tie.rotation.z = Math.PI
      this.group.add(tie)
    } else if (id === 'mori') {
      const collar = mesh(new THREE.TorusGeometry(0.33, 0.035, 6, 20), accent, { castShadow: false })
      collar.rotation.x = Math.PI / 2
      collar.position.set(0, 2.02, 0)
      this.group.add(collar)
    }
  }

  private addTail(id: CharacterId, skin: THREE.Material, accent: THREE.Material): void {
    if (id === 'pip') {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.52, 1.15, -0.35),
        new THREE.Vector3(0.95, 1.03, -0.7),
        new THREE.Vector3(1.05, 1.2, -0.9),
        new THREE.Vector3(0.92, 1.45, -1.02),
      ])
      const tail = mesh(new THREE.TubeGeometry(curve, 18, 0.19, 8, false), skin)
      this.group.add(tail)
      sphere(this.group, 0.2, [0.92, 1.45, -1.02], accent, { scale: [1, 1.15, 1], segments: 12 })
    } else if (id === 'bolt') {
      const tailMat = material(0x5c4333, { roughness: 0.86, flatShading: true })
      rounded(this.group, [0.6, 0.1, 0.72], 0.18, [0.7, 1.08, -0.58], tailMat, { rotation: [0.1, 0.3, 0.12] })
      for (let line = -1; line <= 1; line += 1) {
        box(this.group, [0.02, 0.02, 0.6], [0.7 + line * 0.15, 1.14, -0.58], accent, {
          rotation: [0.1, 0.3, 0.12],
          castShadow: false,
        })
      }
    }
  }

  private createFocusRing(accent: THREE.Material): THREE.Mesh {
    const color = new THREE.Color((accent as THREE.MeshStandardMaterial).color)
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.84, 40), ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.055
    ring.visible = false
    this.group.add(ring)
    return ring
  }

  setSpeaking(speaking: boolean): void {
    this.speaking = speaking
    this.focusRing.visible = speaking
  }

  setMood(mood: Mood): void {
    this.applyMood(mood)
  }

  private applyMood(mood: Mood): void {
    const browLeft = this.brows[0]
    const browRight = this.brows[1]
    let mouthL = 0
    let mouthR = 0
    let browL = 0
    let browR = 0
    let browY = 0

    switch (mood) {
      case 'pleased':
        mouthL = -0.32
        mouthR = 0.32
        browL = -0.08
        browR = 0.08
        browY = 0.02
        break
      case 'concerned':
        mouthL = 0.28
        mouthR = -0.28
        browL = 0.24
        browR = -0.24
        browY = 0.015
        break
      case 'thoughtful':
        mouthL = -0.05
        mouthR = 0.14
        browL = 0.13
        browR = -0.02
        browY = 0.035
        break
      default:
        mouthL = 0
        mouthR = 0
    }
    this.mouthLeft.rotation.z = mouthL
    this.mouthRight.rotation.z = mouthR
    if (browLeft) browLeft.rotation.z = browL
    if (browRight) browRight.rotation.z = browR
    if (browLeft) browLeft.position.y += (browY - (browLeft.userData.browY as number | undefined ?? 0))
    if (browRight) browRight.position.y += (browY - (browRight.userData.browY as number | undefined ?? 0))
    if (browLeft) browLeft.userData.browY = browY
    if (browRight) browRight.userData.browY = browY
  }

  update(time: number, delta: number): void {
    const breathe = Math.sin(time * 1.05 + this.phase)
    this.body.scale.y = (this.id === 'grumble' ? 1.08 : 1) * (1 + breathe * 0.005)
    this.headPivot.position.y = 2.44 + breathe * 0.008

    if (this.speaking) {
      this.headPivot.rotation.x = Math.sin(time * 5.2 + this.phase) * 0.035
      this.headPivot.rotation.y = Math.sin(time * 3.2 + this.phase) * 0.05
      this.headPivot.rotation.z = Math.sin(time * 2.8 + this.phase) * 0.014
      this.mouthLeft.scale.y = 1 + (Math.sin(time * 17) + 1) * 0.65
      this.mouthRight.scale.y = 1 + (Math.sin(time * 17 + 0.4) + 1) * 0.65
      this.focusRing.scale.setScalar(1 + Math.sin(time * 2.6) * 0.04)
    } else {
      this.headPivot.rotation.x += (0 - this.headPivot.rotation.x) * Math.min(1, delta * 5)
      this.headPivot.rotation.y += (Math.sin(time * 0.42 + this.phase) * 0.025 - this.headPivot.rotation.y) * Math.min(1, delta * 2.5)
      this.headPivot.rotation.z += (0 - this.headPivot.rotation.z) * Math.min(1, delta * 4)
      this.mouthLeft.scale.y += (1 - this.mouthLeft.scale.y) * Math.min(1, delta * 8)
      this.mouthRight.scale.y += (1 - this.mouthRight.scale.y) * Math.min(1, delta * 8)
    }

    if (time > this.nextBlink) {
      this.blinkUntil = time + 0.115
      this.nextBlink = time + 2.2 + (((this.seed + Math.floor(time * 10)) % 43) / 10)
    }
    const blink = time < this.blinkUntil
    for (const eye of this.eyes) {
      eye.lid.scale.y = blink ? 0.12 : 1
      eye.lid.scale.x = blink ? 1.06 : 1
      eye.group.name = blink ? 'eye-blinking' : 'eye-open'
    }
  }

  resetPerformance(): void {
    this.speaking = false
    this.focusRing.visible = false
    this.applyMood('neutral')
    this.headPivot.rotation.set(0, 0, 0)
  }
}

function sumChars(value: string): number {
  let sum = 0
  for (let index = 0; index < value.length; index += 1) sum += value.charCodeAt(index) * (index + 3)
  return sum
}
