import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MuseumExhibit, museumSpecs } from '../src/scene/museum-exhibit'
import { buildPrototypeSpec } from '../src/scene/prototype-model'

describe('museum factory exhibits', () => {
  it('leaves unbuilt concepts empty when the presenter jumps ahead', () => {
    expect(museumSpecs({})).toEqual([null, null, null])
    expect(museumSpecs({ d3: 'B' })[2]).toBeNull()
  })

  it('displays the same three factory recipes for all 81 vote paths and fits them on their pedestals', () => {
    const exhibit = new MuseumExhibit()
    for (const d1 of ['A', 'B', 'C'] as const)
      for (const d2 of ['A', 'B', 'C'] as const)
        for (const d3 of ['A', 'B', 'C'] as const)
          for (const d4 of ['A', 'B', 'C'] as const) {
            const choices = { d1, d2, d3, d4 }
            exhibit.setChoices(choices)
            exhibit.group.updateMatrixWorld(true)
            exhibit.room.displaySlots.forEach((slot, index) => {
              expect(slot.children).toHaveLength(1)
              const model = slot.children[0]!
              expect(model.userData.key).toBe(buildPrototypeSpec(index, choices).key)
              const bounds = new THREE.Box3().setFromObject(model)
              const size = bounds.getSize(new THREE.Vector3())
              expect(size.x).toBeLessThanOrEqual(2.151)
              expect(size.z).toBeLessThanOrEqual(1.501)
              expect(size.y).toBeLessThanOrEqual(1.651)
              expect(bounds.min.y).toBeCloseTo(2.12)
            })
          }
    exhibit.setChoices({})
    expect(exhibit.room.displaySlots.every(slot => slot.children.length === 0)).toBe(true)
    exhibit.dispose()
    exhibit.dispose()
  })
})
