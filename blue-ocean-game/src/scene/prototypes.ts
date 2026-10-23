import * as THREE from 'three'
import type { AccessoryVariant, PrototypeSpec } from '../core/types'
import { box, cylinder, group, material, mesh, rounded, sphere } from './primitives'

const COLORS = {
  charcoal: 0x292a32,
  ink: 0x1c1e26,
  slate: 0x46515f,
  cream: 0xe9dfcc,
  creamWarm: 0xf1e4cf,
  coral: 0xde7058,
  coralDeep: 0xa84538,
  mint: 0x66b9a6,
  mintDeep: 0x346c62,
  gold: 0xe1b863,
  lavender: 0x9792bf,
  blue: 0x66a9bf,
  screen: 0x7ac8c4,
  screenDeep: 0x2c777d,
  screenWarm: 0xf0b465,
  white: 0xf8f0df,
}

interface Palette {
  body: THREE.MeshStandardMaterial
  trim: THREE.MeshStandardMaterial
  screen: THREE.MeshStandardMaterial
  accent: THREE.MeshStandardMaterial
  glow: THREE.MeshStandardMaterial
  dark: THREE.MeshStandardMaterial
  metal: THREE.MeshStandardMaterial
}

function palette(): Palette {
  return {
    body: material(COLORS.cream, { roughness: 0.64 }),
    trim: material(COLORS.charcoal, { roughness: 0.52, metalness: 0.12 }),
    screen: material(COLORS.screenDeep, { emissive: COLORS.screen, emissiveIntensity: 1.2, roughness: 0.25 }),
    accent: material(COLORS.coral, { roughness: 0.58 }),
    glow: material(COLORS.gold, { emissive: COLORS.screenWarm, emissiveIntensity: 1.4, roughness: 0.35 }),
    dark: material(COLORS.ink, { roughness: 0.56 }),
    metal: material(0x909697, { roughness: 0.32, metalness: 0.58 }),
  }
}

function screenPanel(
  parent: THREE.Object3D,
  width: number,
  height: number,
  position: readonly [number, number, number],
  colors: Palette,
  rotation: readonly [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const screen = rounded(parent, [width, height, 0.035], 0.035, position, colors.screen, {
    rotation,
    castShadow: false,
  })
  screen.name = 'emissive-screen'
  const shine = box(parent, [width * 0.38, height * 0.07, 0.01], [position[0] - width * 0.22, position[1] + height * 0.28, position[2] + 0.03], material(0xd9ffff, {
    emissive: 0xb7ffff,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.35,
  }), { rotation, castShadow: false })
  shine.name = 'screen-glint'
  return screen
}

function dpad(parent: THREE.Object3D, position: readonly [number, number, number], color: THREE.Material, scale = 1): void {
  box(parent, [0.28 * scale, 0.055 * scale, 0.09 * scale], [position[0], position[1], position[2]], color, { castShadow: false })
  box(parent, [0.09 * scale, 0.055 * scale, 0.28 * scale], [position[0], position[1], position[2]], color, { castShadow: false })
}

function faceButtons(parent: THREE.Object3D, position: readonly [number, number, number], color: THREE.Material, scale = 1): void {
  const offsets: Array<[number, number]> = [
    [0, 0.09],
    [0, -0.09],
    [0.09, 0],
    [-0.09, 0],
  ]
  for (const [x, z] of offsets) {
    sphere(parent, 0.045 * scale, [position[0] + x * scale, position[1], position[2] + z * scale], color, {
      segments: 10,
      castShadow: false,
    })
  }
}

function addFeet(parent: THREE.Object3D, width: number, depth: number, color: THREE.Material): void {
  for (const x of [-width / 2, width / 2]) {
    for (const z of [-depth / 2, depth / 2]) {
      cylinder(parent, 0.08, 0.09, 0.12, [x, 0.06, z], color, { segments: 10 })
    }
  }
}

function buildPowerTower(parent: THREE.Group): void {
  const c = palette()
  addFeet(parent, 2.5, 1.15, c.dark)
  rounded(parent, [3.0, 0.92, 1.55], 0.12, [0, 0.59, 0], c.dark)
  rounded(parent, [2.72, 0.1, 1.4], 0.03, [0, 1.08, 0], material(0x51545c, { roughness: 0.38, metalness: 0.28 }))
  box(parent, [2.62, 0.62, 0.05], [0, 0.62, 0.79], material(0x1b1c22), { castShadow: false })
  for (let index = 0; index < 7; index += 1) {
    box(parent, [2.32, 0.026, 0.028], [0, 0.38 + index * 0.075, 0.82], material(0x4c5158, { metalness: 0.2 }), {
      castShadow: false,
    })
  }
  box(parent, [1.75, 0.045, 0.025], [0, 0.3, 0.84], c.screen, { castShadow: false })
  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index += 1) {
      box(parent, [0.07, 0.48, 0.11], [side * 1.55, 0.62, -0.48 + index * 0.32], material(COLORS.slate, { roughness: 0.55 }), {
        castShadow: false,
      })
    }
    cylinder(parent, 0.05, 0.05, 0.02, [side * 0.92, 0.72, 0.825], c.dark, {
      rotation: [Math.PI / 2, 0, 0],
      segments: 12,
      castShadow: false,
    })
  }
  box(parent, [0.58, 0.13, 0.13], [0, 0.93, -0.72], material(0x30323b), { castShadow: false })

  // Conventional two-handed controller.
  const controller = group([1.9, 0.17, 1.03])
  controller.rotation.y = -0.22
  rounded(controller, [1.2, 0.16, 0.52], 0.12, [0, 0, 0], c.dark)
  for (const side of [-1, 1]) {
    rounded(controller, [0.27, 0.18, 0.45], 0.1, [side * 0.47, 0.01, 0.09], c.dark, { rotation: [0.2, 0, side * 0.18] })
    cylinder(controller, 0.055, 0.055, 0.02, [side * 0.4, 0.095, 0.02], material(0x777c80, { metalness: 0.3 }), {
      rotation: [Math.PI / 2, 0, 0],
      segments: 12,
      castShadow: false,
    })
  }
  dpad(controller, [-0.3, 0.095, -0.02], c.metal, 0.8)
  faceButtons(controller, [0.28, 0.095, -0.02], c.metal, 0.75)
  parent.add(controller)
}

function buildSocialBox(parent: THREE.Group): void {
  const c = palette()
  addFeet(parent, 1.85, 1.05, c.trim)
  rounded(parent, [2.22, 0.62, 1.5], 0.22, [0, 0.45, 0], material(COLORS.creamWarm, { roughness: 0.58 }))
  rounded(parent, [1.56, 0.17, 0.05], 0.06, [0, 0.49, 0.76], c.accent, { castShadow: false })
  box(parent, [0.7, 0.04, 0.02], [0, 0.67, 0.79], material(0x8b4d3c), { castShadow: false })
  for (const [index, color] of [COLORS.coral, COLORS.gold, COLORS.mint].entries()) {
    sphere(parent, 0.07, [-0.22 + index * 0.22, 0.83, 0.63], material(color, { roughness: 0.6 }), { segments: 12, castShadow: false })
  }
  cylinder(parent, 0.04, 0.04, 1.9, [-2.0, 0.95, -0.9], c.metal, {
    rotation: [0, 0, Math.PI / 2],
    segments: 10,
    castShadow: false,
  })
  rounded(parent, [0.1, 0.1, 0.34], 0.04, [-1.08, 0.95, -0.9], c.trim, { castShadow: false })

  const wand = group([1.86, 0.12, 0.67])
  wand.rotation.z = -0.28
  rounded(wand, [0.8, 0.13, 0.55], 0.12, [0, 0.05, 0], c.trim)
  cylinder(wand, 0.085, 0.11, 1.34, [0, 0.73, 0], material(COLORS.white, { roughness: 0.45 }), { segments: 16 })
  sphere(wand, 0.22, [0, 1.43, 0], c.accent, { scale: [0.9, 1.1, 0.9], segments: 18 })
  sphere(wand, 0.1, [-0.05, 1.47, 0.16], material(0xffc1a2, { emissive: 0xff9b77, emissiveIntensity: 0.9 }), {
    segments: 10,
    castShadow: false,
  })
  cylinder(wand, 0.1, 0.1, 0.05, [0, 0.42, 0], c.glow, { segments: 12, castShadow: false })
  parent.add(wand)
}

function buildEarlyHandheld(parent: THREE.Group): void {
  const c = palette()
  const device = group([0, 0.12, 0])
  device.rotation.x = -0.1
  rounded(device, [3.1, 1.72, 0.22], 0.15, [0, 1.06, 0], material(0x76716a, { roughness: 0.62 }))
  rounded(device, [2.18, 1.18, 0.03], 0.08, [0.16, 1.16, 0.13], c.trim, { castShadow: false })
  screenPanel(device, 1.82, 0.9, [0.16, 1.17, 0.155], c)
  for (const side of [-1, 1]) {
    rounded(device, [0.27, 1.22, 0.24], 0.11, [side * 1.38, 1.08, 0], material(0x5f5a55, { roughness: 0.75 }), {
      castShadow: false,
    })
  }
  dpad(device, [-1.05, 0.56, 0.14], c.dark, 0.82)
  faceButtons(device, [1.15, 0.56, 0.14], c.accent, 0.8)
  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index += 1) {
      sphere(device, 0.02, [0.16 + side * 0.28 + (index % 2) * 0.07, 0.6 + Math.floor(index / 2) * 0.07, 0.16], c.dark, {
        segments: 6,
        castShadow: false,
      })
    }
  }
  rounded(parent, [1.15, 0.12, 0.7], 0.12, [0, 0.08, -0.42], c.trim, { castShadow: false })
  box(parent, [0.16, 0.14, 0.2], [0, 0.2, -0.62], c.glow, { castShadow: false })
  parent.add(device)
}

function buildHdConsole(parent: THREE.Group): void {
  const c = palette()
  addFeet(parent, 1.8, 1.05, c.dark)
  rounded(parent, [2.2, 1.58, 1.4], 0.1, [0, 0.91, 0], material(COLORS.slate, { roughness: 0.38, metalness: 0.18 }))
  rounded(parent, [2.05, 0.16, 1.28], 0.045, [0, 1.75, 0], material(0x667383, { roughness: 0.3, metalness: 0.34 }))
  for (let index = 0; index < 8; index += 1) {
    box(parent, [0.046, 0.74, 0.03], [-0.82 + index * 0.23, 1.09, 0.715], material(index % 2 ? 0x27303a : 0x3c4854), {
      castShadow: false,
    })
  }
  box(parent, [1.55, 0.05, 0.035], [0, 0.49, 0.72], c.screen, { castShadow: false })
  cylinder(parent, 0.08, 0.08, 0.02, [0.8, 0.58, 0.735], c.glow, {
    rotation: [Math.PI / 2, 0, 0],
    segments: 16,
    castShadow: false,
  })
  sphere(parent, 0.08, [-0.82, 1.53, 0.7], c.glow, { segments: 10, castShadow: false })

  const controller = group([1.83, 0.17, 1.14])
  controller.rotation.y = -0.18
  rounded(controller, [1.12, 0.17, 0.53], 0.12, [0, 0, 0], c.dark)
  for (const side of [-1, 1]) {
    rounded(controller, [0.32, 0.22, 0.51], 0.14, [side * 0.48, -0.015, 0.12], c.dark, {
      rotation: [0.14, 0, side * 0.24],
    })
    cylinder(controller, 0.085, 0.085, 0.06, [side * 0.32, 0.11, 0.0], c.metal, { segments: 14, castShadow: false })
  }
  dpad(controller, [-0.18, 0.11, -0.1], c.metal, 0.74)
  faceButtons(controller, [0.25, 0.11, -0.1], c.accent, 0.7)
  parent.add(controller)
}

function buildSecondScreen(parent: THREE.Group): void {
  const c = palette()
  rounded(parent, [2.0, 0.43, 1.1], 0.11, [-0.2, 0.3, -0.72], c.trim)
  box(parent, [1.7, 0.04, 0.035], [-0.2, 0.36, -0.15], c.screen, { castShadow: false })
  cylinder(parent, 0.06, 0.06, 0.02, [0.45, 0.37, -0.15], c.glow, {
    rotation: [Math.PI / 2, 0, 0],
    segments: 12,
    castShadow: false,
  })
  for (const side of [-1, 1]) {
    rounded(parent, [0.22, 1.15, 0.48], 0.08, [side * 1.35, 1.22, 0.52], c.dark, { rotation: [0.28, 0, 0] })
    dpad(parent, [side * 1.35, 1.18, 0.79], c.metal, 0.7)
  }
  rounded(parent, [2.66, 1.5, 0.2], 0.15, [0, 1.3, 0.52], material(0x41444c, { roughness: 0.48 }), {
    rotation: [0.28, 0, 0],
  })
  screenPanel(parent, 2.17, 1.17, [0, 1.32, 0.645], c, [0.28, 0, 0])
  // Asymmetric play is suggested by two different screen halves.
  box(parent, [0.82, 0.6, 0.025], [-0.55, 1.34, 0.68], material(0x405a72, { roughness: 0.6 }), {
    rotation: [0.28, 0, 0],
    castShadow: false,
  })
  box(parent, [0.3, 0.08, 0.01], [0.5, 1.44, 0.69], material(0xffdc99, { emissive: 0xd49143, emissiveIntensity: 0.5 }), {
    rotation: [0.28, 0, 0],
    castShadow: false,
  })
  rounded(parent, [0.18, 0.07, 0.18], 0.02, [0, 0.55, 0.42], c.metal, { castShadow: false })
}

function buildPortable(parent: THREE.Group): void {
  const c = palette()
  rounded(parent, [1.1, 0.13, 0.7], 0.07, [0, 0.1, -0.2], c.trim, { castShadow: false })
  const device = group([0, 0.1, 0])
  device.rotation.x = -0.16
  rounded(device, [3.5, 1.58, 0.23], 0.2, [0, 1.02, 0], material(0x675f76, { roughness: 0.58 }))
  rounded(device, [2.38, 1.16, 0.04], 0.08, [0, 1.04, 0.135], c.trim, { castShadow: false })
  screenPanel(device, 2.08, 0.92, [0, 1.05, 0.16], c)
  for (const side of [-1, 1]) {
    rounded(device, [0.48, 1.24, 0.25], 0.13, [side * 1.45, 1.02, 0], material(side < 0 ? COLORS.lavender : 0x8479a3, {
      roughness: 0.64,
    }), { castShadow: false })
    cylinder(device, 0.09, 0.09, 0.05, [side * 1.45, 0.83, 0.15], c.metal, { segments: 14, castShadow: false })
  }
  dpad(device, [-1.45, 1.3, 0.15], c.dark, 0.7)
  faceButtons(device, [1.45, 1.3, 0.15], c.glow, 0.7)
  parent.add(device)
}

function buildTv(parent: THREE.Group): void {
  const c = palette()
  // A slim display makes the TV-first proposition readable at a distance.
  const tvStand = rounded(parent, [1.2, 0.14, 0.7], 0.08, [0, 0.08, -0.55], c.trim)
  tvStand.name = 'tv-stand'
  box(parent, [0.16, 0.65, 0.14], [0, 0.41, -0.55], c.trim)
  rounded(parent, [3.15, 1.75, 0.16], 0.09, [0, 1.5, -0.62], c.dark)
  screenPanel(parent, 2.78, 1.44, [0, 1.51, -0.53], c)
  box(parent, [0.8, 0.06, 0.03], [0, 0.66, -0.5], c.accent, { castShadow: false })
  rounded(parent, [2.65, 0.56, 1.14], 0.1, [0, 0.42, 0.55], c.trim)
  box(parent, [2.0, 0.035, 0.03], [0, 0.49, 1.14], c.screen, { castShadow: false })
  cylinder(parent, 0.07, 0.07, 0.025, [0.98, 0.58, 1.14], c.glow, {
    rotation: [Math.PI / 2, 0, 0],
    segments: 12,
    castShadow: false,
  })
}

function buildHandheld(parent: THREE.Group): void {
  const c = palette()
  rounded(parent, [1.6, 0.13, 0.82], 0.07, [0, 0.09, -0.1], c.trim, { castShadow: false })
  const device = group([0, 0.1, 0])
  device.rotation.x = -0.12
  rounded(device, [3.55, 1.88, 0.25], 0.22, [0, 1.08, 0], material(0x495a56, { roughness: 0.62 }))
  rounded(device, [2.52, 1.34, 0.04], 0.085, [0, 1.1, 0.145], c.trim, { castShadow: false })
  screenPanel(device, 2.2, 1.06, [0, 1.11, 0.17], c)
  for (const side of [-1, 1]) {
    rounded(device, [0.47, 1.5, 0.27], 0.16, [side * 1.48, 1.05, 0], material(side < 0 ? COLORS.mintDeep : 0x466e64, {
      roughness: 0.66,
    }), { castShadow: false })
    cylinder(device, 0.1, 0.1, 0.055, [side * 1.48, 0.78, 0.17], c.metal, { segments: 14, castShadow: false })
  }
  dpad(device, [-1.48, 1.38, 0.17], c.dark, 0.76)
  faceButtons(device, [1.48, 1.38, 0.17], c.glow, 0.75)
  parent.add(device)
}

function buildHybrid(parent: THREE.Group): void {
  const c = palette()
  rounded(parent, [1.52, 0.14, 0.9], 0.08, [0, 0.08, -0.1], c.trim)
  rounded(parent, [1.9, 1.52, 0.3], 0.1, [0, 0.9, -0.72], material(0x3c4647, { roughness: 0.48 }))
  box(parent, [1.24, 0.055, 0.035], [0, 0.92, -0.55], c.screen, { castShadow: false })
  box(parent, [0.7, 0.035, 0.025], [0, 0.34, -0.55], c.glow, { castShadow: false })
  const tablet = group([0, 0.12, 0.03])
  tablet.rotation.x = -0.08
  rounded(tablet, [2.62, 1.62, 0.23], 0.18, [0, 1.08, 0.15], material(0x434c4e, { roughness: 0.55 }))
  rounded(tablet, [2.1, 1.26, 0.035], 0.07, [0, 1.09, 0.28], c.trim, { castShadow: false })
  screenPanel(tablet, 1.86, 1.0, [0, 1.1, 0.305], c)
  cylinder(tablet, 0.05, 0.05, 0.016, [0.83, 0.48, 0.28], c.glow, {
    rotation: [Math.PI / 2, 0, 0],
    segments: 10,
    castShadow: false,
  })
  parent.add(tablet)
}

function buildPerformanceAccessory(parent: THREE.Group, variant: PrototypeSpec['variant']): void {
  const c = palette()
  const y = variant === 'tv' ? 0.1 : 0.1
  const controller = group([1.78, y + 0.07, variant === 'hybrid' ? 1.06 : 1.13])
  controller.rotation.y = -0.2
  rounded(controller, [1.46, 0.22, 0.64], 0.14, [0, 0, 0], material(0x363943, { roughness: 0.48 }))
  for (const side of [-1, 1]) {
    rounded(controller, [0.34, 0.31, 0.53], 0.16, [side * 0.61, -0.03, 0.12], material(0x2b2e37, { roughness: 0.5 }), {
      rotation: [0.12, 0, side * 0.22],
    })
    cylinder(controller, 0.085, 0.085, 0.055, [side * 0.42, 0.14, -0.03], c.metal, { segments: 14, castShadow: false })
  }
  box(controller, [0.82, 0.045, 0.026], [0, 0.13, 0.33], material(0xe4844c, { emissive: 0xb84e25, emissiveIntensity: 0.85 }), {
    castShadow: false,
  })
  for (const side of [-1, 1]) {
    box(controller, [0.1, 0.08, 0.03], [side * 0.28, 0.06, 0.35], c.glow, { castShadow: false })
  }
  parent.add(controller)
  // Auxiliary power module, reinforcing the "performance" priority.
  const module = rounded(parent, [0.5, 0.3, 0.52], 0.08, [-1.75, 0.24, 1.02], material(0x2d3039, { roughness: 0.5 }))
  module.name = 'performance-module'
  for (let index = 0; index < 3; index += 1) {
    box(parent, [0.3, 0.028, 0.03], [-1.75, 0.18 + index * 0.07, 1.29], c.glow, { castShadow: false })
  }
}

function buildSplitControls(parent: THREE.Group, variant: PrototypeSpec['variant']): void {
  const attached = variant === 'handheld' || variant === 'hybrid'
  const x = attached ? 1.7 : 1.88
  const y = attached ? 1.0 : 0.5
  const z = attached ? 0.18 : 0.92
  for (const side of [-1, 1]) {
    const grip = group([side * x, 0.1 + y, z])
    grip.rotation.z = side * (attached ? 0.03 : 0.15)
    // Lavender/gold distinguishes the simulated split controllers from the
    // archive's coral/mint Switch silhouette. The form can echo history; the
    // colour should not pre-announce the answer before the finale.
    const color = side < 0 ? COLORS.lavender : COLORS.gold
    rounded(grip, [0.38, 1.28, 0.28], 0.13, [0, 0.5, 0], material(color, { roughness: 0.6 }))
    rounded(grip, [0.28, 0.17, 0.24], 0.07, [0, 1.16, 0.01], material(side < 0 ? 0x6f6a95 : 0xb08a3f, { roughness: 0.55 }))
    cylinder(grip, 0.09, 0.09, 0.055, [0, 0.97, 0.16], c_from(0x30333a), { segments: 14, castShadow: false })
    if (side < 0) {
      dpad(grip, [0, 0.34, 0.16], c_from(0x2b2a2c), 0.65)
    } else {
      faceButtons(grip, [0, 0.34, 0.16], c_from(0xf3d28e), 0.62)
    }
    sphere(grip, 0.055, [0, 0.58, 0.16], c_from(0x222328), { segments: 10, castShadow: false })
    if (!attached) {
      box(parent, [0.34, 0.08, 0.18], [side * x, 0.16, z + 0.02], material(0x3a3940, { roughness: 0.6 }), {
        castShadow: false,
      })
    }
    parent.add(grip)
  }
  if (variant === 'hybrid') {
    box(parent, [0.72, 0.045, 0.025], [0, 0.47, 1.05], material(COLORS.lavender, { emissive: 0x5d5880, emissiveIntensity: 0.2 }), {
      castShadow: false,
    })
  }
}

function buildMotionAccessory(parent: THREE.Group): void {
  const c = palette()
  const wand = group([1.72, 0.1, 1.04])
  wand.rotation.z = -0.18
  rounded(wand, [0.72, 0.12, 0.5], 0.1, [0, 0.05, 0], c.trim)
  cylinder(wand, 0.085, 0.13, 1.48, [0, 0.78, 0], material(0xf3ebdd, { roughness: 0.4 }), { segments: 16 })
  sphere(wand, 0.24, [0, 1.57, 0], material(COLORS.screenDeep, { emissive: COLORS.screen, emissiveIntensity: 0.85 }), {
    scale: [0.9, 1.05, 0.9],
    segments: 18,
  })
  const band = mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 20), c.accent, { castShadow: false })
  band.position.set(0, 1.12, 0)
  band.rotation.x = Math.PI / 2
  wand.add(band)
  for (let index = 0; index < 3; index += 1) {
    sphere(wand, 0.042, [-0.11 + index * 0.11, 0.86, 0.12], c.glow, { segments: 8, castShadow: false })
  }
  parent.add(wand)
  const sensor = rounded(parent, [1.1, 0.12, 0.26], 0.05, [-1.47, 0.18, 0.99], c.trim)
  sensor.name = 'motion-sensor'
  box(parent, [0.72, 0.035, 0.02], [-1.47, 0.22, 1.13], c.screen, { castShadow: false })
}

function c_from(color: number): THREE.MeshStandardMaterial {
  return material(color, { roughness: 0.55 })
}

function addAccessory(parent: THREE.Group, accessory: AccessoryVariant, variant: PrototypeSpec['variant']): void {
  if (accessory === 'performance') buildPerformanceAccessory(parent, variant)
  else if (accessory === 'split-controls') buildSplitControls(parent, variant)
  else buildMotionAccessory(parent)
}

export function createPrototype(spec: PrototypeSpec): THREE.Group {
  const root = new THREE.Group()
  root.name = `prototype-${spec.key.replace(/[^a-z0-9]+/gi, '-')}`
  root.userData = {
    key: spec.key,
    title: spec.title,
    label: spec.label,
    description: spec.description,
  }

  switch (spec.variant) {
    case 'power-tower':
      buildPowerTower(root)
      break
    case 'social-box':
      buildSocialBox(root)
      break
    case 'early-handheld':
      buildEarlyHandheld(root)
      break
    case 'hd-console':
      buildHdConsole(root)
      break
    case 'second-screen':
      buildSecondScreen(root)
      break
    case 'portable':
      buildPortable(root)
      break
    case 'tv':
      buildTv(root)
      break
    case 'handheld':
      buildHandheld(root)
      break
    case 'hybrid':
      buildHybrid(root)
      break
  }

  if (spec.accessory) addAccessory(root, spec.accessory, spec.variant)
  root.scale.setScalar(0.9)
  root.position.y = 0.02
  return root
}
