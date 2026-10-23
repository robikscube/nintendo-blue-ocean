import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export interface MaterialOptions {
  roughness?: number
  metalness?: number
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
  transparent?: boolean
  opacity?: number
  flatShading?: boolean
}

export function material(
  color: THREE.ColorRepresentation,
  options: MaterialOptions = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.78,
    metalness: options.metalness ?? 0.04,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    flatShading: options.flatShading ?? false,
  })
}

export function mesh(
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  options: { castShadow?: boolean; receiveShadow?: boolean } = {},
): THREE.Mesh {
  const object = new THREE.Mesh(geometry, mat)
  object.castShadow = options.castShadow ?? true
  object.receiveShadow = options.receiveShadow ?? true
  return object
}

export function box(
  parent: THREE.Object3D,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  mat: THREE.Material,
  options: { rotation?: readonly [number, number, number]; castShadow?: boolean; receiveShadow?: boolean } = {},
): THREE.Mesh {
  const object = mesh(new THREE.BoxGeometry(...size), mat, options)
  object.position.set(...position)
  if (options.rotation) object.rotation.set(...options.rotation)
  parent.add(object)
  return object
}

export function rounded(
  parent: THREE.Object3D,
  size: readonly [number, number, number],
  radius: number,
  position: readonly [number, number, number],
  mat: THREE.Material,
  options: { rotation?: readonly [number, number, number]; segments?: number; castShadow?: boolean } = {},
): THREE.Mesh {
  const geometry = new RoundedBoxGeometry(size[0], size[1], size[2], options.segments ?? 3, radius)
  const object = mesh(geometry, mat, { castShadow: options.castShadow ?? true })
  object.position.set(...position)
  if (options.rotation) object.rotation.set(...options.rotation)
  parent.add(object)
  return object
}

export function sphere(
  parent: THREE.Object3D,
  radius: number,
  position: readonly [number, number, number],
  mat: THREE.Material,
  options: {
    scale?: readonly [number, number, number]
    segments?: number
    castShadow?: boolean
  } = {},
): THREE.Mesh {
  const object = mesh(
    new THREE.SphereGeometry(radius, options.segments ?? 18, Math.max(8, (options.segments ?? 18) - 4)),
    mat,
    { castShadow: options.castShadow ?? true },
  )
  object.position.set(...position)
  if (options.scale) object.scale.set(...options.scale)
  parent.add(object)
  return object
}

export function cylinder(
  parent: THREE.Object3D,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  position: readonly [number, number, number],
  mat: THREE.Material,
  options: {
    segments?: number
    rotation?: readonly [number, number, number]
    sides?: number
    castShadow?: boolean
  } = {},
): THREE.Mesh {
  const object = mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments ?? 20, 1),
    mat,
    { castShadow: options.castShadow ?? true },
  )
  object.position.set(...position)
  if (options.rotation) object.rotation.set(...options.rotation)
  parent.add(object)
  return object
}

export function group(position: readonly [number, number, number] = [0, 0, 0]): THREE.Group {
  const object = new THREE.Group()
  object.position.set(...position)
  return object
}

export function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry)
      if (Array.isArray(object.material)) {
        for (const mat of object.material) materials.add(mat)
      } else {
        materials.add(object.material)
      }
    }
  })
  for (const geometry of geometries) geometry.dispose()
  for (const mat of materials) mat.dispose()
}

export function damp(current: number, target: number, smoothing: number, delta: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * delta))
}
