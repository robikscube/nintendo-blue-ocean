import { describe, expect, it } from 'vitest'
import type { ChoiceId } from '../src/core/types'
import { DECISIONS, SIMULATED_LABEL } from '../src/core/story'
import { buildPrototypeSpec } from '../src/scene/prototype-model'
import { createPrototype } from '../src/scene/prototypes'
import { disposeObject } from '../src/scene/primitives'

const choices = ['A', 'B', 'C'] as const satisfies readonly ChoiceId[]

describe('procedural prototype recipes', () => {
  it('produces three distinct D1 concepts', () => {
    const specs = choices.map((d1) => buildPrototypeSpec(0, { d1 }))
    expect(new Set(specs.map((spec) => spec.key)).size).toBe(3)
    expect(new Set(specs.map((spec) => spec.title)).size).toBe(3)
    expect(new Set(specs.map((spec) => spec.variant)).size).toBe(3)
    for (const spec of specs) {
      expect(spec.label).toBe(SIMULATED_LABEL)
      expect(spec.description.length).toBeGreaterThan(40)
      expect(spec.priorities.length).toBeGreaterThan(20)
      expect(spec.risks.length).toBeGreaterThan(20)
    }
  })

  it('produces three distinct D2 concepts', () => {
    const specs = choices.map((d2) => buildPrototypeSpec(1, { d2 }))
    expect(new Set(specs.map((spec) => spec.key)).size).toBe(3)
    expect(new Set(specs.map((spec) => spec.variant)).size).toBe(3)
  })

  it('produces nine distinct, specific D3 × D4 concepts', () => {
    const keys = new Set<string>()
    const combinations = new Set<string>()
    for (const d3 of choices) {
      for (const d4 of choices) {
        const spec = buildPrototypeSpec(2, { d3, d4 })
        keys.add(spec.key)
        combinations.add(`${spec.variant}+${spec.accessory}`)
        expect(spec.title).toContain('·')
        expect(spec.priorities.length).toBeGreaterThan(50)
        expect(spec.risks.length).toBeGreaterThan(40)
        expect(spec.label).toBe(SIMULATED_LABEL)
        expect(spec.description).toContain(accessoryWord(spec.accessory))
      }
    }
    expect(keys.size).toBe(9)
    expect(combinations.size).toBe(9)
  })

  it('uses only the three predefined chassis and accessories for Chapter 3', () => {
    const chassis = new Set(DECISIONS.d3.options.map((option) => option.prototypeVariant))
    const accessories = new Set(DECISIONS.d4.options.map((option) => option.accessoryVariant))
    expect([...chassis].sort()).toEqual(['handheld', 'hybrid', 'tv'])
    expect([...accessories].sort()).toEqual(['motion', 'performance', 'split-controls'])
  })

  it('never introduces quantitative market claims into concept copy', () => {
    const text = [
      ...choices.map((d1) => buildPrototypeSpec(0, { d1 })),
      ...choices.map((d2) => buildPrototypeSpec(1, { d2 })),
      ...choices.flatMap((d3) => choices.map((d4) => buildPrototypeSpec(2, { d3, d4 }))),
    ].map((spec) => `${spec.title} ${spec.description} ${spec.priorities} ${spec.risks}`).join(' ')
    expect(text).not.toMatch(/\d+(\.\d+)?\s*(million|billion|%|percent)/i)
    expect(text).not.toMatch(/Wii|Switch|Joy-Con|GamePad/i)
  })

  it('constructs every procedural mesh recipe without relying on a WebGL context', () => {
    const specs = [
      ...choices.map((d1) => buildPrototypeSpec(0, { d1 })),
      ...choices.map((d2) => buildPrototypeSpec(1, { d2 })),
      ...choices.flatMap((d3) => choices.map((d4) => buildPrototypeSpec(2, { d3, d4 }))),
    ]
    expect(specs).toHaveLength(15)
    for (const spec of specs) {
      const model = createPrototype(spec)
      let meshes = 0
      model.traverse((object) => {
        if ('isMesh' in object && object.isMesh) meshes += 1
      })
      expect(meshes, spec.key).toBeGreaterThan(8)
      expect(model.userData.label).toBe(SIMULATED_LABEL)
      disposeObject(model)
    }
  })
})

function accessoryWord(accessory: string | null): string {
  if (accessory === 'performance') return 'high-output controller'
  if (accessory === 'split-controls') return 'detachable side controllers'
  if (accessory === 'motion') return 'motion-first wand'
  return ''
}
