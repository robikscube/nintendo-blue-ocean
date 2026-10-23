import * as THREE from 'three'

const SLOT_X = [-3.7, 0, 3.7] as const
const BACK_WALL_Z = -3.8

/** A quiet, original gallery built entirely from reusable low-poly geometry. */
export class MuseumRoom {
  readonly group = new THREE.Group()
  readonly displaySlots: readonly THREE.Group[]

  private readonly geometries = new Set<THREE.BufferGeometry>()
  private readonly materials = new Set<THREE.Material>()
  private disposed = false

  constructor() {
    this.group.name = 'museum-gallery'
    this.buildRoom()
    this.buildAlcoves()
    this.buildPedestals()
    this.buildLighting()
    this.displaySlots = SLOT_X.map((x, index) => {
      const anchor = new THREE.Group()
      anchor.name = `museum-display-slot-${index + 1}`
      anchor.position.set(x, 2.12, 0.05)
      this.group.add(anchor)
      return anchor
    })
  }

  private ownMaterial(color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
    const result = new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...options })
    this.materials.add(result)
    return result
  }

  private ownGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.add(geometry)
    return geometry
  }

  private addMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: readonly [number, number, number],
    name?: string,
    rotation?: readonly [number, number, number],
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    if (rotation) mesh.rotation.set(...rotation)
    if (name) mesh.name = name
    mesh.castShadow = false
    mesh.receiveShadow = false
    this.group.add(mesh)
    return mesh
  }

  private boxGeometry(x: number, y: number, z: number): THREE.BoxGeometry {
    return this.ownGeometry(new THREE.BoxGeometry(x, y, z))
  }

  private box(
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    material: THREE.Material,
    name?: string,
  ): THREE.Mesh {
    return this.addMesh(this.boxGeometry(...size), material, position, name)
  }

  private buildRoom(): void {
    const floor = this.ownMaterial(0x453027, { roughness: 0.95 })
    const wall = this.ownMaterial(0x24463d, { roughness: 0.96 })
    const sideWall = this.ownMaterial(0x1d3b34, { roughness: 0.97 })
    const darkWood = this.ownMaterial(0x39271f, { roughness: 0.9 })
    const gold = this.ownMaterial(0xb88f4d, { metalness: 0.55, roughness: 0.38 })

    this.box([14.6, 0.22, 10.2], [0, -0.12, 0.15], floor, 'gallery-floor-base')
    // One merged vertex-color mesh gives a parquet rhythm without one draw call per tile.
    this.addMesh(this.makeParquetGeometry(), this.ownMaterial(0xffffff, { vertexColors: true, roughness: 0.94 }), [0, 0.002, 0.15], 'parquet-floor')
    this.box([14.6, 0.18, 0.25], [0, 0.04, -4.94], darkWood, 'back-floor-border')
    this.box([0.18, 0.12, 9.8], [-7.12, 0.035, 0.12], darkWood, 'left-floor-border')
    this.box([0.18, 0.12, 9.8], [7.12, 0.035, 0.12], darkWood, 'right-floor-border')

    // Back wall is deliberately fixed at the scene contract's z = -3.8.
    this.box([14.6, 7.35, 0.34], [0, 3.675, BACK_WALL_Z], wall, 'forest-green-back-wall')
    this.box([0.34, 7.35, 9.95], [-7.13, 3.675, 0.12], sideWall, 'left-gallery-wall')
    this.box([0.34, 7.35, 9.95], [7.13, 3.675, 0.12], sideWall, 'right-gallery-wall')
    this.box([14.45, 0.32, 0.13], [0, 0.28, -3.56], darkWood, 'back-wainscot')
    this.box([14.45, 0.09, 0.19], [0, 0.49, -3.53], gold, 'back-wainscot-gilt')
    this.box([14.5, 0.12, 0.2], [0, 6.88, -3.55], darkWood, 'upper-picture-rail')
    this.box([14.5, 0.045, 0.22], [0, 6.79, -3.48], gold, 'upper-picture-rail-gilt')

    for (const side of [-1, 1] as const) {
      const x = side * 6.92
      this.box([0.17, 0.34, 9.7], [x, 0.28, 0.12], darkWood, `side-wainscot-${side}`)
      this.box([0.18, 0.08, 9.68], [x, 0.49, 0.12], gold, `side-wainscot-gilt-${side}`)
      this.box([0.13, 0.12, 9.7], [x, 6.86, 0.12], darkWood, `side-upper-rail-${side}`)
    }

    // Narrow pilasters and gold capitals add gallery architecture with a few meshes.
    for (const x of [-6.62, -2.52, 2.52, 6.62]) {
      this.box([0.12, 6.2, 0.14], [x, 3.58, -3.54], darkWood, `wall-pilaster-${x}`)
      this.box([0.2, 0.11, 0.22], [x, 6.58, -3.5], gold, `pilaster-cap-${x}`)
      this.box([0.2, 0.11, 0.22], [x, 0.66, -3.5], gold, `pilaster-base-${x}`)
    }
  }

  private makeParquetGeometry(): THREE.BufferGeometry {
    const positions: number[] = []
    const colors: number[] = []
    const palette = [0x684a35, 0x76543c, 0x5e402f, 0x805b40, 0x6d4b34].map((hex) => new THREE.Color(hex))
    const width = 0.78
    const depth = 0.62
    const gap = 0.018
    const left = -7.08
    const front = 5.0
    const columns = 18
    const rows = 15
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        // Alternating half-plank offset evokes a restrained herringbone/parquet grid.
        const offset = row % 2 === 0 ? 0 : width * 0.5
        const x0 = left + col * width + offset + gap
        const x1 = x0 + width - gap * 2
        const z1 = front - row * depth - gap
        const z0 = z1 - depth + gap * 2
        const vertices = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] as const
        const color = palette[(row * 7 + col * 3) % palette.length]!
        // Counter-clockwise from above: the floor face normal points +Y.
        for (const vertexIndex of [0, 2, 1, 0, 3, 2]) {
          const vertex = vertices[vertexIndex]!
          positions.push(vertex[0], 0, vertex[1])
          colors.push(color.r, color.g, color.b)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.computeVertexNormals()
    return this.ownGeometry(geometry)
  }

  private buildAlcoves(): void {
    const inset = this.ownMaterial(0x17362f, { roughness: 0.94 })
    const insetEdge = this.ownMaterial(0x2d5146, { roughness: 0.9 })
    const gold = this.ownMaterial(0xc49a57, { metalness: 0.48, roughness: 0.36 })
    const paleGold = this.ownMaterial(0xd3b875, { metalness: 0.38, roughness: 0.42 })
    const geometry = this.boxGeometry(2.85, 4.7, 0.11)
    const innerGeometry = this.boxGeometry(2.58, 4.42, 0.08)
    const railH = this.boxGeometry(2.97, 0.12, 0.14)
    const railV = this.boxGeometry(0.12, 4.7, 0.14)
    const insetGeom = this.boxGeometry(2.45, 4.28, 0.035)

    for (let i = 0; i < SLOT_X.length; i += 1) {
      const x = SLOT_X[i]!
      this.addMesh(geometry, insetEdge, [x, 3.55, -3.56], `alcove-surround-${i + 1}`)
      this.addMesh(innerGeometry, gold, [x, 3.55, -3.48], `gilt-alcove-frame-${i + 1}`)
      this.addMesh(insetGeom, inset, [x, 3.55, -3.42], `blank-gallery-recess-${i + 1}`)
      // Double rails and small corner blocks make the frames read as carved ornament.
      for (const y of [1.2, 5.9]) {
        this.addMesh(railH, gold, [x, y, -3.39], `alcove-horizontal-rail-${i}-${y}`)
        this.addMesh(railH, paleGold, [x, y + (y < 2 ? 0.16 : -0.16), -3.39], `alcove-inner-rail-${i}-${y}`)
      }
      for (const side of [-1, 1]) {
        this.addMesh(railV, gold, [x + side * 1.425, 3.55, -3.39], `alcove-vertical-rail-${i}-${side}`)
        for (const y of [1.2, 5.9]) {
          const rosette = this.ownGeometry(new THREE.OctahedronGeometry(0.11, 0))
          this.addMesh(rosette, paleGold, [x + side * 1.425, y, -3.3], `frame-rosette-${i}-${side}-${y}`)
        }
      }
      // Small fan-shaped reliefs above and below are abstract ornament, not imagery.
      const medallion = this.ownGeometry(new THREE.TorusGeometry(0.2, 0.035, 5, 16))
      for (const y of [0.78, 6.32]) {
        this.addMesh(medallion, paleGold, [x, y, -3.31], `frame-medallion-${i}-${y}`, [0, 0, 0])
      }
    }
  }

  private buildPedestals(): void {
    const marble = this.ownMaterial(0xd8c9ad, { roughness: 0.72 })
    const ivory = this.ownMaterial(0xe8dbc2, { roughness: 0.7 })
    const gold = this.ownMaterial(0xc5a05d, { metalness: 0.56, roughness: 0.32 })
    const shadowGreen = this.ownMaterial(0x18382f, { roughness: 0.93 })
    const profile = this.ownGeometry(new THREE.LatheGeometry([
      new THREE.Vector2(0.56, 0.0),
      new THREE.Vector2(0.63, 0.08),
      new THREE.Vector2(0.61, 0.16),
      new THREE.Vector2(0.48, 0.23),
      new THREE.Vector2(0.42, 0.34),
      new THREE.Vector2(0.4, 1.42),
      new THREE.Vector2(0.46, 1.52),
      new THREE.Vector2(0.62, 1.6),
      new THREE.Vector2(0.66, 1.68),
      new THREE.Vector2(0.66, 1.76),
      new THREE.Vector2(0.57, 1.84),
      new THREE.Vector2(0.0, 1.84),
    ], 12))
    const foot = this.ownGeometry(new THREE.CylinderGeometry(0.68, 0.73, 0.1, 12))
    const band = this.ownGeometry(new THREE.CylinderGeometry(0.428, 0.428, 0.075, 12))
    const cap = this.ownGeometry(new THREE.CylinderGeometry(1.03, 0.62, 0.11, 12))
    const inlay = this.ownGeometry(new THREE.CylinderGeometry(0.21, 0.21, 0.012, 24))

    SLOT_X.forEach((x, index) => {
      const z = 0.05
      this.addMesh(foot, marble, [x, 0.06, z], `pedestal-foot-${index + 1}`)
      this.addMesh(profile, marble, [x, 0.11, z], `sculptural-pedestal-${index + 1}`)
      this.addMesh(band, gold, [x, 1.02, z], `pedestal-gilt-band-${index + 1}`)
      this.addMesh(cap, gold, [x, 1.825, z], `pedestal-cap-gilt-${index + 1}`)
      this.box([2.28, 0.12, 1.65], [x, 1.94, z], ivory, `pedestal-plinth-${index + 1}`)
      this.addMesh(inlay, shadowGreen, [x, 2.005, z], `plinth-inlay-${index + 1}`)
      this.box([2.4, 0.12, 1.75], [x, 2.06, z], marble, `display-top-${index + 1}`)
    })
  }

  private buildLighting(): void {
    const ambient = new THREE.HemisphereLight(0xf5dfb8, 0x243b32, 1.05)
    ambient.name = 'gallery-ambient-light'
    this.group.add(ambient)

    const fill = new THREE.DirectionalLight(0xffe2b6, 1.25)
    fill.name = 'gallery-warm-key-light'
    fill.position.set(-4.5, 7.4, 4.0)
    this.group.add(fill)

    SLOT_X.forEach((x, index) => {
      const target = new THREE.Object3D()
      target.name = `gallery-spot-target-${index + 1}`
      target.position.set(x, 2.05, 0.05)
      this.group.add(target)
      const spot = new THREE.SpotLight(0xffd28a, 72, 8.2, Math.PI / 6.2, 0.72, 1.35)
      spot.name = `gallery-warm-spot-${index + 1}`
      spot.position.set(x, 6.55, -1.05)
      spot.target = target
      this.group.add(spot)
    })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const geometry of this.geometries) geometry.dispose()
    for (const material of this.materials) material.dispose()
    this.geometries.clear()
    this.materials.clear()
  }
}
