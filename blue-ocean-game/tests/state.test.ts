import { describe, expect, it } from 'vitest'
import type { ChoiceId, GameState } from '../src/core/types'
import {
  createInitialState,
  getActiveDecision,
  getDialogueLines,
  isDialoguePhase,
  transition,
} from '../src/core/state'
import { normalizeRestoredState } from '../src/core/checkpoint'
import { buildPrototypeSpec } from '../src/scene/prototype-model'

function act(state: GameState, action: Parameters<typeof transition>[1]): GameState {
  return transition(state, action)
}

function drainDialogue(state: GameState): GameState {
  if (!isDialoguePhase(state.phase)) return state
  const startingPhase = state.phase
  let current = state
  let guard = 0
  while (current.phase === startingPhase && guard++ < 50) {
    current = act(current, { type: 'ADVANCE_DIALOGUE' })
  }
  if (guard >= 50) throw new Error('Dialogue did not terminate')
  return current
}

function clearChapterDialogue(state: GameState): GameState {
  let current = act(state, { type: 'BEGIN_CHAPTER' })
  current = drainDialogue(current)
  expect(current.phase).toBe('voting')
  return current
}

function commit(state: GameState, choice: ChoiceId): GameState {
  let current = act(state, { type: 'SELECT_CHOICE', choice })
  current = act(current, { type: 'COMMIT_CHOICE' })
  return current
}

function finishFactory(state: GameState): GameState {
  let current = state
  expect(current.phase).toBe('factory')
  current = act(current, { type: 'FACTORY_STARTED' })
  expect(current.factoryProgress).toBe('running')
  current = act(current, { type: 'FACTORY_FINISHED' })
  expect(current.factoryProgress).toBe('done')
  current = act(current, { type: 'LEAVE_FACTORY' })
  expect(current.phase).toBe('feedback')
  current = drainDialogue(current)
  expect(current.phase).toBe('boss')
  current = drainDialogue(current)
  expect(current.phase).toBe('transition')
  return current
}

function startAtVoting(): GameState {
  let state = createInitialState()
  state = act(state, { type: 'START' })
  state = drainDialogue(state)
  expect(state.phase).toBe('briefing')
  return clearChapterDialogue(state)
}

function startChapter2(d1: ChoiceId): GameState {
  let state = startAtVoting()
  state = commit(state, d1)
  state = finishFactory(state)
  state = act(state, { type: 'COMPLETE_TRANSITION' })
  expect(state.chapterIndex).toBe(1)
  expect(state.phase).toBe('briefing')
  return state
}

function startChapter3(d1: ChoiceId, d2: ChoiceId): GameState {
  let state = startChapter2(d1)
  state = clearChapterDialogue(state)
  state = commit(state, d2)
  state = finishFactory(state)
  state = act(state, { type: 'COMPLETE_TRANSITION' })
  expect(state.chapterIndex).toBe(2)
  expect(state.phase).toBe('briefing')
  return state
}

describe('gameflow', () => {
  it('starts at a title and requires a user gesture to enter the story', () => {
    const initial = createInitialState()
    expect(initial.phase).toBe('title')
    expect(initial.started).toBe(false)
    const started = act(initial, { type: 'START' })
    expect(started.phase).toBe('opening')
    expect(started.started).toBe(true)
    expect(act(initial, { type: 'ADVANCE_DIALOGUE' })).toBe(initial)
  })

  it.each<ChoiceId>(['A', 'B', 'C'])('D1 choice %s builds a concept and returns to Chapter 2', (choice) => {
    let state = startAtVoting()
    expect(getActiveDecision(state)).toBe('d1')
    state = commit(state, choice)
    expect(state.phase).toBe('factory')
    expect(state.choices.d1).toBe(choice)
    const spec = buildPrototypeSpec(0, state.choices)
    expect(spec.label).toBe('SIMULATED CONCEPT — NOT AN ACTUAL NINTENDO PRODUCT')
    state = finishFactory(state)
    state = act(state, { type: 'COMPLETE_TRANSITION' })
    expect(state.chapterIndex).toBe(1)
    expect(state.phase).toBe('briefing')
    expect(state.choices.d1).toBe(choice)
  })

  it.each<ChoiceId>(['A', 'B', 'C'])('D2 choice %s builds a concept and returns to Chapter 3', (choice) => {
    let state = startChapter2('B')
    state = clearChapterDialogue(state)
    expect(getActiveDecision(state)).toBe('d2')
    state = commit(state, choice)
    expect(state.phase).toBe('factory')
    const spec = buildPrototypeSpec(1, state.choices)
    expect(spec.title.length).toBeGreaterThan(0)
    state = finishFactory(state)
    state = act(state, { type: 'COMPLETE_TRANSITION' })
    expect(state.chapterIndex).toBe(2)
    expect(state.phase).toBe('briefing')
    expect(state.choices.d2).toBe(choice)
  })

  it('holds the factory until both Chapter 3 votes are committed', () => {
    let state = startChapter3('B', 'B')
    state = clearChapterDialogue(state)
    expect(getActiveDecision(state)).toBe('d3')
    state = commit(state, 'C')
    expect(state.phase).toBe('voting')
    expect(state.choices.d3).toBe('C')
    expect(state.choices.d4).toBeUndefined()
    expect(getActiveDecision(state)).toBe('d4')
    state = act(state, { type: 'SELECT_CHOICE', choice: 'B' })
    expect(state.phase).toBe('voting')
    state = act(state, { type: 'COMMIT_CHOICE' })
    expect(state.phase).toBe('factory')
    expect(state.choices.d3).toBe('C')
    expect(state.choices.d4).toBe('B')
    expect(state.factoryProgress).toBe('idle')
  })

  it('runs every D3 × D4 combination to a unique prototype and the sealed archive', () => {
    const keys = new Set<string>()
    const descriptions = new Set<string>()
    for (const d3 of ['A', 'B', 'C'] as const) {
      for (const d4 of ['A', 'B', 'C'] as const) {
        let state = startChapter3('B', 'C')
        state = clearChapterDialogue(state)
        state = commit(state, d3)
        expect(state.phase).toBe('voting')
        state = commit(state, d4)
        expect(state.phase).toBe('factory')
        const spec = buildPrototypeSpec(2, state.choices)
        keys.add(spec.key)
        descriptions.add(spec.description)
        expect(spec.label).toContain('SIMULATED CONCEPT')
        expect(spec.title).toContain('·')
        state = finishFactory(state)
        expect(state.phase).toBe('transition')
        state = act(state, { type: 'COMPLETE_TRANSITION' })
        expect(state.phase).toBe('finale')
        expect(state.chapterIndex).toBe(3)
        expect(state.choices).toEqual({ d1: 'B', d2: 'C', d3, d4 })
        expect(JSON.stringify(state)).not.toMatch(/Wii|Switch|13\.56|101\.63|156\.59/)
      }
    }
    expect(keys.size).toBe(9)
    expect(descriptions.size).toBe(9)
  })

  it('prevents overwriting an already committed vote', () => {
    let state = startAtVoting()
    state = act(state, { type: 'SELECT_CHOICE', choice: 'A' })
    state = act(state, { type: 'COMMIT_CHOICE' })
    const committed = state
    state = act(state, { type: 'SELECT_CHOICE', choice: 'C' })
    state = act(state, { type: 'COMMIT_CHOICE' })
    expect(state).toBe(committed)
    expect(state.choices.d1).toBe('A')
  })

  it('rewinds and restarts dialogue without changing votes', () => {
    let state = createInitialState()
    state = act(state, { type: 'START' })
    state = drainDialogue(state)
    expect(state.phase).toBe('briefing')
    state = act(state, { type: 'BEGIN_CHAPTER' })
    state = act(state, { type: 'ADVANCE_DIALOGUE' })
    expect(state.dialogueIndex).toBe(1)
    state = act(state, { type: 'REWIND_DIALOGUE' })
    expect(state.dialogueIndex).toBe(0)
    state = act(state, { type: 'RESTART_SCENE' })
    expect(state.phase).toBe('advisors')
    expect(state.dialogueIndex).toBe(0)
    expect(state.choices).toEqual({})
  })

  it('resets to a clean title while preserving mute preference', () => {
    let state = startAtVoting()
    state = commit(state, 'B')
    state = act(state, { type: 'SET_MUTED', muted: true })
    state = act(state, { type: 'RESET', muted: state.muted })
    expect(state.phase).toBe('title')
    expect(state.choices).toEqual({})
    expect(state.muted).toBe(true)
    expect(state.started).toBe(false)
  })

  it('supports a presenter jump without inventing placeholder votes', () => {
    const initial = createInitialState()
    const jumped = act(initial, { type: 'JUMP_CHAPTER', chapterIndex: 2 })
    expect(jumped.chapterIndex).toBe(2)
    expect(jumped.phase).toBe('briefing')
    expect(jumped.choices).toEqual({})
    const finale = act(jumped, { type: 'SHOW_FINALE' })
    expect(finale.chapterIndex).toBe(3)
    expect(finale.phase).toBe('finale')
  })

  it('re-opens a completed chapter after a presenter jump instead of stranding voting', () => {
    let state = startAtVoting()
    state = commit(state, 'B')
    state = finishFactory(state)
    state = act(state, { type: 'COMPLETE_TRANSITION' })
    expect(state.chapterIndex).toBe(1)
    expect(state.choices.d1).toBe('B')

    state = act(state, { type: 'JUMP_CHAPTER', chapterIndex: 0 })
    expect(state.phase).toBe('briefing')
    expect(state.choices).toEqual({})

    state = clearChapterDialogue(state)
    expect(state.phase).toBe('voting')
    expect(getActiveDecision(state)).toBe('d1')
    state = commit(state, 'C')
    expect(state.phase).toBe('factory')
    expect(state.choices.d1).toBe('C')
  })

  it('keeps earlier votes but clears the target chapter and later votes on a rewind jump', () => {
    let state = startChapter3('B', 'C')
    state = clearChapterDialogue(state)
    state = commit(state, 'A')
    state = commit(state, 'B')
    expect(state.choices).toEqual({ d1: 'B', d2: 'C', d3: 'A', d4: 'B' })

    state = act(state, { type: 'JUMP_CHAPTER', chapterIndex: 1 })
    expect(state.chapterIndex).toBe(1)
    expect(state.phase).toBe('briefing')
    expect(state.choices).toEqual({ d1: 'B' })
    state = clearChapterDialogue(state)
    expect(getActiveDecision(state)).toBe('d2')
  })

  it('rebuilds a completed factory from idle for a replay while preserving votes', () => {
    let state = startAtVoting()
    state = commit(state, 'B')
    state = finishFactory(state)
    expect(state.phase).toBe('transition')
    state = act(state, { type: 'JUMP_CHAPTER', chapterIndex: 0 })
    state = clearChapterDialogue(state)
    state = commit(state, 'B')
    expect(state.phase).toBe('factory')
    state = act(state, { type: 'FACTORY_STARTED' })
    state = act(state, { type: 'FACTORY_FINISHED' })
    state = act(state, { type: 'RESTART_SCENE' })
    expect(state.phase).toBe('factory')
    expect(state.factoryProgress).toBe('idle')
    expect(state.choices.d1).toBe('B')
    state = act(state, { type: 'FACTORY_STARTED' })
    state = act(state, { type: 'FACTORY_FINISHED' })
    expect(state.factoryProgress).toBe('done')
  })

  it('recovers a complete voting screen into the factory', () => {
    const raw: GameState = {
      ...startChapter2('B'),
      phase: 'voting',
      choices: { d1: 'B', d2: 'C' },
    }
    const recovered = act(raw, { type: 'CONTINUE_TO_FACTORY' })
    expect(recovered.phase).toBe('factory')
    expect(recovered.factoryProgress).toBe('idle')
    expect(recovered.choices).toEqual({ d1: 'B', d2: 'C' })
  })
})

describe('checkpoint restoration', () => {
  it('restores a voting checkpoint with committed votes intact', () => {
    let state = startChapter2('C')
    state = clearChapterDialogue(state)
    state = act(state, { type: 'SELECT_CHOICE', choice: 'B' })
    const restored = normalizeRestoredState(JSON.parse(JSON.stringify(state)))
    expect(restored).not.toBeNull()
    expect(restored?.phase).toBe('voting')
    expect(restored?.chapterIndex).toBe(1)
    expect(restored?.selectedChoice).toBe('B')
    expect(restored?.choices).toEqual({ d1: 'C' })
  })

  it('never resumes mid-factory; it restarts safely at idle with both votes', () => {
    let state = startChapter3('A', 'A')
    state = clearChapterDialogue(state)
    state = commit(state, 'C')
    state = commit(state, 'B')
    state = act(state, { type: 'FACTORY_STARTED' })
    expect(state.factoryProgress).toBe('running')
    const restored = normalizeRestoredState(JSON.parse(JSON.stringify(state)))
    expect(restored?.phase).toBe('factory')
    expect(restored?.factoryProgress).toBe('idle')
    expect(restored?.choices).toEqual({ d1: 'A', d2: 'A', d3: 'C', d4: 'B' })
  })

  it('repairs a factory restore whose votes are missing', () => {
    const raw = {
      ...createInitialState(),
      phase: 'factory',
      chapterIndex: 0,
      started: true,
    }
    const restored = normalizeRestoredState(raw)
    expect(restored?.phase).toBe('voting')
    expect(restored?.chapterIndex).toBe(0)
  })

  it('rejects incompatible or corrupt saved sessions', () => {
    expect(normalizeRestoredState(null)).toBeNull()
    expect(normalizeRestoredState({ version: 1, phase: 'voting' })).toBeNull()
    expect(normalizeRestoredState({ version: 2, phase: 'nonsense' })).toBeNull()
  })

  it('cannot restore a mid-game phase into the finale chapter', () => {
    const raw = {
      ...createInitialState(),
      chapterIndex: 3,
      phase: 'voting',
      started: true,
      choices: { d1: 'A', d2: 'A', d3: 'A', d4: 'A' },
    }
    const restored = normalizeRestoredState(raw)
    expect(restored?.phase).toBe('finale')
    expect(restored?.chapterIndex).toBe(3)
  })

  it('clamps restored dialogue indices and discards unknown choices', () => {
    const raw = {
      ...createInitialState(),
      phase: 'advisors',
      chapterIndex: 0,
      started: true,
      dialogueIndex: 999,
      choices: { d1: 'Z', d2: 'B' },
    }
    const restored = normalizeRestoredState(raw)
    if (!restored) throw new Error('Expected checkpoint to restore')
    expect(restored?.phase).toBe('advisors')
    expect(restored.dialogueIndex).toBe(getDialogueLines(restored).length - 1)
    expect(restored?.choices.d1).toBeUndefined()
    expect(restored?.choices.d2).toBe('B')
  })
})
