import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import {
  ADVISOR_ASSETS,
  ADVISOR_IDS,
  clearAdvisorCache,
  configureAdvisorMeshShadows,
  getAdvisorAssetUrl,
  normalizeBaseUrl,
  resolveAdvisorClipMap,
  stripNonVisualObjects,
  validateAdvisorScene,
  type AdvisorAssetSpec,
} from '../src/scene/character-loader'
import {
  createAdvisor,
  moodToAdvisorEmotion,
  type AdvisorHandle,
} from '../src/scene/character-adapter'

// The production loader is exercised through a fake GLTFLoader: no network,
// no real GLB, but the full validate -> clone -> normalize -> install path runs.
const loaderState = vi.hoisted(() => ({
  mode: 'reject' as 'reject' | 'resolve',
  calls: 0,
  scene: null as object | null,
  animations: [] as object[],
}))

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    async loadAsync(_url: string): Promise<unknown> {
      loaderState.calls += 1
      if (loaderState.mode === 'reject') throw new Error('404 Not Found')
      return {
        scene: loaderState.scene,
        scenes: [loaderState.scene],
        animations: loaderState.animations,
        cameras: [],
        asset: {},
        parser: {},
        userData: {},
      }
    }
  },
}))

const PIP_SPEC: AdvisorAssetSpec = ADVISOR_ASSETS.pip

function clip(name: string): THREE.AnimationClip {
  return new THREE.AnimationClip(name, 1, [])
}

interface RiggedFixture {
  scene: THREE.Group
  skinned: THREE.SkinnedMesh
}

function withSkinAttributes(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const position = geometry.getAttribute('position')
  const indices = new Uint16Array(position.count * 4)
  const weights = new Float32Array(position.count * 4)
  for (let index = 0; index < position.count; index += 1) weights[index * 4] = 1
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4))
  return geometry
}

function riggedScene(height = 2): RiggedFixture {
  const scene = new THREE.Group()
  const bone = new THREE.Bone()
  bone.name = 'root-bone'
  const geometry = withSkinAttributes(new THREE.BoxGeometry(1, height, 1))
  const skinned = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial())
  skinned.name = 'body'
  skinned.add(bone)
  skinned.bind(new THREE.Skeleton([bone]))
  scene.add(skinned)
  return { scene, skinned }
}

function countMeshes(root: THREE.Object3D): number {
  let count = 0
  root.traverse((object) => {
    if ((object as THREE.Mesh).isMesh === true) count += 1
  })
  return count
}

describe('advisor asset URLs', () => {
  it('normalizes trailing slashes without introducing a leading asset slash', () => {
    expect(normalizeBaseUrl('')).toBe('/')
    expect(normalizeBaseUrl('/')).toBe('/')
    expect(normalizeBaseUrl('/game')).toBe('/game/')
    expect(normalizeBaseUrl('/game/')).toBe('/game/')
    expect(normalizeBaseUrl(' nintendo-next-blue-ocean ')).toBe('nintendo-next-blue-ocean/')
    expect(normalizeBaseUrl('./')).toBe('./')
  })

  it('builds GitHub-Pages-safe URLs under the active Vite base', () => {
    expect(getAdvisorAssetUrl('pip', '/nintendo-next-blue-ocean')).toBe(
      '/nintendo-next-blue-ocean/assets/characters/fox/fox.glb',
    )
    expect(getAdvisorAssetUrl('mori', '/')).toBe('/assets/characters/owl/owl.glb')
    expect(getAdvisorAssetUrl('bolt', './')).toBe('./assets/characters/beaver/beaver.glb')
  })

  it('defaults to a slash-terminated Vite base', () => {
    const url = getAdvisorAssetUrl('grumble')
    expect(url.startsWith('/') || url.startsWith('./')).toBe(true)
    expect(url.endsWith('/assets/characters/bear/bear.glb')).toBe(true)
    expect(url).not.toMatch(/\/\/assets/)
  })

  it('registers exactly five unique advisors with pipeline filenames', () => {
    expect(ADVISOR_IDS).toHaveLength(5)
    const folders = new Set<string>()
    const files = new Set<string>()
    for (const id of ADVISOR_IDS) {
      const spec = ADVISOR_ASSETS[id]
      expect(spec.file.endsWith('.glb')).toBe(true)
      expect(spec.folder.length).toBeGreaterThan(0)
      expect(spec.targetHeight).toBeGreaterThan(1)
      folders.add(spec.folder)
      files.add(spec.file)
    }
    expect(folders.size).toBe(5)
    expect(files.size).toBe(5)
  })
})

describe('advisory clip aliases', () => {
  it('maps common Tripo/BVH export names to semantic actions', () => {
    const map = resolveAdvisorClipMap([
      'Armature|Breathing',
      'Speak_Gesture',
      'Ponder',
      'Celebration',
      'Concerned',
    ])
    expect(map).toEqual({
      idle: 'Armature|Breathing',
      talk: 'Speak_Gesture',
      think: 'Ponder',
      celebrate: 'Celebration',
      disappointed: 'Concerned',
    })
  })

  it('prefers an explicit manifest name over an alias', () => {
    const map = resolveAdvisorClipMap(['Idle', 'Stand_Loop'], {
      clips: { idle: 'stand_loop' },
    })
    expect(map.idle).toBe('Stand_Loop')
  })

  it('is case-insensitive and uses exact token matching for short aliases', () => {
    expect(resolveAdvisorClipMap(['IDLE_LOOP']).idle).toBe('IDLE_LOOP')
    expect(resolveAdvisorClipMap(['Saddle_Wiggle']).disappointed).toBeUndefined()
    expect(resolveAdvisorClipMap(['Sad_Face']).disappointed).toBe('Sad_Face')
  })

  it('never assigns the same clip to two semantic actions', () => {
    const map = resolveAdvisorClipMap(['Idle_Talk', 'Talk'])
    expect(map.idle).toBe('Idle_Talk')
    expect(map.talk).toBe('Talk')
  })

  it('returns an empty map when nothing matches', () => {
    expect(resolveAdvisorClipMap(['Wave_01', 'Spin'])).toEqual({})
  })
})

describe('GLB validation gates', () => {
  it('accepts a rigged scene with an idle clip and reports metrics', () => {
    const { scene } = riggedScene(2)
    const result = validateAdvisorScene(scene, [clip('Idle')], PIP_SPEC)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.metrics.skinnedMeshCount).toBe(1)
    expect(result.metrics.meshCount).toBe(1)
    expect(result.metrics.height).toBeCloseTo(2, 4)
    expect(result.metrics.triangleCount).toBe(12)
    expect(result.clipMap.idle).toBe('Idle')
    expect(result.idleClip.name).toBe('Idle')
  })

  it('rejects an empty scene', () => {
    const result = validateAdvisorScene(new THREE.Group(), [clip('Idle')], PIP_SPEC)
    expect(result).toMatchObject({ ok: false, code: 'no-mesh' })
  })

  it('rejects a static mesh with no rig', () => {
    const scene = new THREE.Group()
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial()))
    const result = validateAdvisorScene(scene, [clip('Idle')], PIP_SPEC)
    expect(result).toMatchObject({ ok: false, code: 'no-rig' })
  })

  it('rejects zero-height or absurdly scaled bounds', () => {
    const zero = riggedScene(2)
    zero.skinned.scale.y = 0
    expect(validateAdvisorScene(zero.scene, [clip('Idle')], PIP_SPEC)).toMatchObject({
      ok: false,
      code: 'invalid-bounds',
    })

    const giant = riggedScene(2)
    giant.skinned.scale.setScalar(5000)
    expect(validateAdvisorScene(giant.scene, [clip('Idle')], PIP_SPEC)).toMatchObject({
      ok: false,
      code: 'invalid-bounds',
    })
  })

  it('requires an idle clip even when other clips exist', () => {
    const { scene } = riggedScene(2)
    const result = validateAdvisorScene(scene, [clip('Talk'), clip('Celebrate')], PIP_SPEC)
    expect(result).toMatchObject({ ok: false, code: 'missing-idle' })
  })

  it('strips cameras and lights and configures shadows safely', () => {
    const { scene, skinned } = riggedScene(2)
    scene.add(new THREE.DirectionalLight())
    scene.add(new THREE.PerspectiveCamera())
    const transparent = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.4 }),
    )
    scene.add(transparent)

    stripNonVisualObjects(scene)
    configureAdvisorMeshShadows(scene)

    let lights = 0
    let cameras = 0
    scene.traverse((object) => {
      if ((object as THREE.Light).isLight) lights += 1
      if ((object as THREE.Camera).isCamera) cameras += 1
    })
    expect(lights).toBe(0)
    expect(cameras).toBe(0)
    expect(scene.getObjectByName('body')).toBe(skinned)
    expect(skinned.castShadow).toBe(true)
    expect(skinned.frustumCulled).toBe(false)
    expect(transparent.castShadow).toBe(false)
  })
})

describe('synchronous procedural advisor fallback', () => {
  it('mounts the procedural avatar immediately under a stable seat root', async () => {
    const handle: AdvisorHandle = createAdvisor('pip', {
      position: [2.28, 0, -2.16],
      facing: -0.18,
      loadModel: false,
    })

    try {
      expect(handle.id).toBe('pip')
      expect(handle.profile.name).toBe('Slyvester')
      expect(handle.source).toBe('procedural')
      expect(handle.root.name).toBe('advisor-pip')
      expect(handle.root.position.toArray()).toEqual([2.28, 0, -2.16])
      expect(handle.root.rotation.y).toBeCloseTo(-0.18, 6)
      expect(handle.root.userData.characterId).toBe('pip')
      expect(handle.root.userData.advisorSource).toBe('procedural')
      expect(handle.headAnchor.position.y).toBeCloseTo(ADVISOR_ASSETS.pip.targetHeight * 0.82, 6)
      expect(countMeshes(handle.root)).toBeGreaterThan(20)
      await expect(handle.ready).resolves.toBe('procedural')
    } finally {
      handle.dispose()
    }
  })

  it('keeps repeated presenter state updates idempotent and disposes cleanly', () => {
    const handle = createAdvisor('mori', { position: [-2.28, 0, -2.16], loadModel: false })
    try {
      const childrenBefore = handle.root.children.length
      handle.setSpeaking(true)
      handle.setSpeaking(true)
      handle.setMood('pleased')
      handle.setMood('pleased')
      handle.setMood('thoughtful')
      handle.setMood('neutral')
      handle.update(1, 0.016)
      handle.update(2, 10) // oversized delta must not throw or mutate root
      handle.focus(true)
      handle.focus(true)
      handle.focus(false)
      handle.resetPerformance()
      expect(handle.root.children.length).toBe(childrenBefore)
      expect(handle.source).toBe('procedural')
      expect(handle.root.position.x).toBeCloseTo(-2.28, 6)
    } finally {
      handle.dispose()
    }
    expect(handle.root.children).toHaveLength(0)
    expect(countMeshes(handle.root)).toBe(0)
  })

  it('constructs all five advisors headlessly', () => {
    for (const id of ADVISOR_IDS) {
      const handle = createAdvisor(id, { position: [0, 0, 0], loadModel: false })
      expect(handle.profile.name.length).toBeGreaterThan(0)
      expect(countMeshes(handle.root)).toBeGreaterThan(20)
      handle.setSpeaking(true)
      handle.update(0.5, 0.016)
      handle.dispose()
    }
  })

  it('maps legacy moods onto the adapter emotion vocabulary', () => {
    expect(moodToAdvisorEmotion('neutral')).toBe('idle')
    expect(moodToAdvisorEmotion('thoughtful')).toBe('think')
    expect(moodToAdvisorEmotion('pleased')).toBe('excited')
    expect(moodToAdvisorEmotion('concerned')).toBe('disappointed')
  })
})

describe('optional GLB upgrade', () => {
  beforeEach(() => {
    clearAdvisorCache()
    loaderState.mode = 'reject'
    loaderState.calls = 0
    loaderState.scene = null
    loaderState.animations = []
  })

  afterEach(() => {
    clearAdvisorCache()
  })

  it('keeps the procedural visual when the asset is missing and remembers the attempt', async () => {
    const handle = createAdvisor('bolt', { position: [4.22, 0, -1.18] })
    await expect(handle.ready).resolves.toBe('procedural')
    expect(handle.source).toBe('procedural')
    expect(loaderState.calls).toBe(1)
    expect(countMeshes(handle.root)).toBeGreaterThan(20)

    // A second advisor of the same id must not retry the failed fetch.
    const second = createAdvisor('bolt', { position: [0, 0, 0] })
    await expect(second.ready).resolves.toBe('procedural')
    expect(loaderState.calls).toBe(1)

    handle.dispose()
    second.dispose()
  })

  it('installs a validated rigged GLB under the unchanged stable root', async () => {
    const rig = riggedScene(2)
    loaderState.mode = 'resolve'
    loaderState.scene = rig.scene
    loaderState.animations = [clip('Idle'), clip('Talk'), clip('Celebrate')]

    const handle = createAdvisor('pip', {
      position: [2.28, 0, -2.16],
      facing: -0.18,
    })
    await expect(handle.ready).resolves.toBe('glb')

    expect(handle.source).toBe('glb')
    expect(handle.root.name).toBe('advisor-pip')
    expect(handle.root.position.toArray()).toEqual([2.28, 0, -2.16])
    expect(handle.root.rotation.y).toBeCloseTo(-0.18, 6)
    expect(handle.root.userData.advisorSource).toBe('glb')

    const wrapper = handle.root.getObjectByName('advisor-model-pip') as THREE.Group | undefined
    expect(wrapper).toBeTruthy()
    expect(wrapper?.scale.x).toBeCloseTo(ADVISOR_ASSETS.pip.targetHeight / 2, 5)

    // Presenter controls remain safe regardless of which clips exist.
    handle.setMood('pleased')
    handle.setSpeaking(true)
    handle.setMood('concerned')
    handle.setSpeaking(false)
    handle.setMood('neutral')
    handle.update(1, 0.05)
    handle.update(2, 5)
    handle.resetPerformance()

    // Disposing one handle must not dispose geometry shared with the cache.
    let sourceDisposed = false
    rig.skinned.geometry.addEventListener('dispose', () => {
      sourceDisposed = true
    })
    handle.dispose()
    expect(sourceDisposed).toBe(false)

    clearAdvisorCache()
    expect(sourceDisposed).toBe(true)
  })
})
