import * as THREE from 'three'
import type { GameState, PrototypeSpec } from '../core/types'
import { buildPrototypeSpec } from './prototype-model'
import { createPrototype } from './prototypes'
import { disposeObject } from './primitives'
import { MuseumRoom } from './museum-room'

/** Rebuild the factory's exact concepts from saved votes, never historical products. */
export function museumSpecs(choices: GameState['choices']): (PrototypeSpec | null)[] {
  return [
    choices.d1 ? buildPrototypeSpec(0, choices) : null,
    choices.d2 ? buildPrototypeSpec(1, choices) : null,
    choices.d3 && choices.d4 ? buildPrototypeSpec(2, choices) : null,
  ]
}

export class MuseumExhibit {
  readonly room = new MuseumRoom()
  readonly group = this.room.group
  specs: (PrototypeSpec | null)[] = []
  private models: THREE.Group[] = []
  private key = ''

  setChoices(choices: GameState['choices']): void {
    const specs = museumSpecs(choices)
    const key = specs.map(spec => spec?.key ?? '-').join('|')
    if (key === this.key) return
    this.clearModels()
    this.key = key
    this.specs = specs
    specs.forEach((spec, index) => {
      const slot = this.room.displaySlots[index]
      if (!spec || !slot) return
      const model = createPrototype(spec)
      model.rotation.y = -0.12
      let bounds = new THREE.Box3().setFromObject(model)
      const size = bounds.getSize(new THREE.Vector3())
      model.scale.multiplyScalar(Math.min(2.15 / size.x, 1.5 / size.z, 1.65 / size.y))
      bounds = new THREE.Box3().setFromObject(model)
      const center = bounds.getCenter(new THREE.Vector3())
      model.position.x -= center.x
      model.position.y -= bounds.min.y
      model.position.z -= center.z
      slot.add(model)
      this.models.push(model)
    })
  }

  private clearModels(): void {
    for (const model of this.models) {
      model.removeFromParent()
      disposeObject(model)
    }
    this.models = []
  }

  dispose(): void {
    this.clearModels()
    this.room.dispose()
  }
}
