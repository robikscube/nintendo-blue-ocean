import type {
  ChapterId,
  ChoiceId,
  DecisionId,
  DialogueLine,
  GameState,
  Phase,
} from './types'
import {
  CHAPTERS,
  DECISIONS,
  OPENING_LINES,
  getBossLines,
  getFeedbackLines,
} from './story'

export const SCHEMA_VERSION = 2 as const

export type GameAction =
  | { type: 'START' }
  | { type: 'ADVANCE_DIALOGUE' }
  | { type: 'BEGIN_CHAPTER' }
  | { type: 'SELECT_CHOICE'; choice: ChoiceId }
  | { type: 'COMMIT_CHOICE' }
  | { type: 'FACTORY_STARTED' }
  | { type: 'FACTORY_FINISHED' }
  | { type: 'LEAVE_FACTORY' }
  | { type: 'CONTINUE_TO_FACTORY' }
  | { type: 'COMPLETE_TRANSITION' }
  | { type: 'RESTART_SCENE' }
  | { type: 'REWIND_DIALOGUE' }
  | { type: 'JUMP_CHAPTER'; chapterIndex: number }
  | { type: 'SHOW_FINALE' }
  | { type: 'SET_MUTED'; muted: boolean }
  | { type: 'SET_PRESENTER_MODE'; enabled: boolean }
  | { type: 'RESET'; muted?: boolean }

export const CHAPTER_IDS: readonly ChapterId[] = CHAPTERS.map((chapter) => chapter.id)

export function createInitialState(muted = false): GameState {
  return {
    version: SCHEMA_VERSION,
    chapterIndex: 0,
    phase: 'title',
    dialogueIndex: 0,
    selectedChoice: null,
    choices: {},
    factoryProgress: 'idle',
    muted,
    presenterMode: false,
    started: false,
    sceneRevision: 0,
  }
}

export function getChapter(state: GameState) {
  return CHAPTERS[state.chapterIndex]
}

export function getActiveDecision(state: GameState): DecisionId | null {
  if (state.phase !== 'voting') return null
  if (state.chapterIndex === 0) return state.choices.d1 ? null : 'd1'
  if (state.chapterIndex === 1) return state.choices.d2 ? null : 'd2'
  if (state.chapterIndex === 2) {
    if (!state.choices.d3) return 'd3'
    if (!state.choices.d4) return 'd4'
    return null
  }
  return null
}

export function chapterDecisionsComplete(state: GameState): boolean {
  if (state.chapterIndex === 0) return Boolean(state.choices.d1)
  if (state.chapterIndex === 1) return Boolean(state.choices.d2)
  if (state.chapterIndex === 2) return Boolean(state.choices.d3 && state.choices.d4)
  return true
}

export function getDialogueLines(state: GameState): readonly DialogueLine[] {
  if (state.phase === 'opening') return OPENING_LINES
  const chapter = getChapter(state)
  if (!chapter) return []
  if (state.phase === 'advisors') return chapter.advisorLines
  if (state.phase === 'feedback') return getFeedbackLines(state.chapterIndex, state.choices)
  if (state.phase === 'boss') return getBossLines(state.chapterIndex, state.choices)
  return []
}

export function getCurrentLine(state: GameState): DialogueLine | undefined {
  return getDialogueLines(state)[state.dialogueIndex]
}

export function isDialoguePhase(phase: Phase): boolean {
  return phase === 'opening' || phase === 'advisors' || phase === 'feedback' || phase === 'boss'
}

function clampedDialogueIndex(state: GameState, index: number): number {
  const length = getDialogueLines(state).length
  if (length === 0) return 0
  return Math.max(0, Math.min(index, length - 1))
}

function atEndOfDialogue(state: GameState): boolean {
  const lines = getDialogueLines(state)
  return lines.length === 0 || state.dialogueIndex >= lines.length - 1
}

function advanceDialogue(state: GameState): GameState {
  if (!isDialoguePhase(state.phase)) return state
  if (!atEndOfDialogue(state)) {
    return { ...state, dialogueIndex: state.dialogueIndex + 1 }
  }

  switch (state.phase) {
    case 'opening':
      return { ...state, phase: 'briefing', dialogueIndex: 0 }
    case 'advisors':
      return { ...state, phase: 'voting', dialogueIndex: 0, selectedChoice: null }
    case 'feedback':
      return { ...state, phase: 'boss', dialogueIndex: 0 }
    case 'boss':
      return { ...state, phase: 'transition', dialogueIndex: 0 }
    default:
      return state
  }
}

function toggleChoicesForFactory(
  state: GameState,
  choices: Partial<Record<DecisionId, ChoiceId>>,
): GameState {
  if (state.chapterIndex === 2 && !choices.d4) {
    return {
      ...state,
      choices,
      phase: 'voting',
      dialogueIndex: 0,
      selectedChoice: null,
    }
  }
  return {
    ...state,
    choices,
    phase: 'factory',
    dialogueIndex: 0,
    selectedChoice: null,
    factoryProgress: 'idle',
  }
}

function jumpChapter(state: GameState, target: number): GameState {
  const chapterIndex = Math.max(0, Math.min(3, Math.trunc(target)))
  if (chapterIndex === 3) {
    return {
      ...state,
      chapterIndex: 3,
      phase: 'finale',
      dialogueIndex: 0,
      selectedChoice: null,
      factoryProgress: 'idle',
      sceneRevision: state.sceneRevision + 1,
    }
  }

  // Presenter jumps are rehearsal shortcuts that re-open the target chapter.
  // Clear that chapter's decisions (and every later one) so the presenter can
  // actually vote again instead of landing on a voting screen with nothing to
  // decide. Earlier chapters keep their real votes. Never invent a placeholder
  // vote: the archive must show "Not voted" for chapters the class skipped.
  const choices = { ...state.choices }
  const decisionsByChapter: readonly (readonly DecisionId[])[] = [['d1'], ['d2'], ['d3', 'd4']]
  for (let index = chapterIndex; index < decisionsByChapter.length; index += 1) {
    for (const decision of decisionsByChapter[index] ?? []) delete choices[decision]
  }

  return {
    ...state,
    chapterIndex,
    phase: 'briefing',
    dialogueIndex: 0,
    selectedChoice: null,
    choices,
    factoryProgress: 'idle',
    sceneRevision: state.sceneRevision + 1,
  }
}

export function transition(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      if (state.phase !== 'title') return state
      return { ...state, phase: 'opening', dialogueIndex: 0, started: true }

    case 'ADVANCE_DIALOGUE':
      return advanceDialogue(state)

    case 'BEGIN_CHAPTER':
      if (state.phase !== 'briefing') return state
      return { ...state, phase: 'advisors', dialogueIndex: 0 }

    case 'SELECT_CHOICE': {
      if (state.phase !== 'voting') return state
      const decision = getActiveDecision(state)
      if (!decision) return state
      if (!DECISIONS[decision].options.some((option) => option.id === action.choice)) return state
      return { ...state, selectedChoice: action.choice }
    }

    case 'COMMIT_CHOICE': {
      if (state.phase !== 'voting' || !state.selectedChoice) return state
      const decision = getActiveDecision(state)
      if (!decision || state.choices[decision]) return state
      const choices = { ...state.choices, [decision]: state.selectedChoice }
      return toggleChoicesForFactory(state, choices)
    }

    case 'FACTORY_STARTED':
      if (state.phase !== 'factory' || state.factoryProgress !== 'idle') return state
      return { ...state, factoryProgress: 'running' }

    case 'FACTORY_FINISHED':
      if (state.phase !== 'factory' || state.factoryProgress !== 'running') return state
      return { ...state, factoryProgress: 'done' }

    case 'LEAVE_FACTORY':
      if (state.phase !== 'factory' || state.factoryProgress !== 'done') return state
      return { ...state, phase: 'feedback', dialogueIndex: 0 }

    case 'CONTINUE_TO_FACTORY':
      // Defensive recovery for an already-complete voting screen (for example
      // a hand-edited checkpoint). Normal flow never needs it, but the
      // presenter must never be stranded on a blank vote screen.
      if (state.phase !== 'voting' || !chapterDecisionsComplete(state)) return state
      return {
        ...state,
        phase: 'factory',
        dialogueIndex: 0,
        selectedChoice: null,
        factoryProgress: 'idle',
      }

    case 'COMPLETE_TRANSITION': {
      if (state.phase !== 'transition') return state
      if (state.chapterIndex >= 2) {
        return {
          ...state,
          chapterIndex: 3,
          phase: 'finale',
          dialogueIndex: 0,
          selectedChoice: null,
          factoryProgress: 'idle',
          sceneRevision: state.sceneRevision + 1,
        }
      }
      return {
        ...state,
        chapterIndex: state.chapterIndex + 1,
        phase: 'briefing',
        dialogueIndex: 0,
        selectedChoice: null,
        factoryProgress: 'idle',
        sceneRevision: state.sceneRevision + 1,
      }
    }

    case 'RESTART_SCENE': {
      if (state.phase === 'title') return state
      if (state.phase === 'finale') {
        return { ...state, sceneRevision: state.sceneRevision + 1 }
      }
      if (state.phase === 'factory') {
        return {
          ...state,
          factoryProgress: 'idle',
          selectedChoice: null,
          sceneRevision: state.sceneRevision + 1,
        }
      }
      const phase = state.phase === 'transition' ? 'transition' : state.phase
      return {
        ...state,
        phase,
        dialogueIndex: 0,
        selectedChoice: null,
        sceneRevision: state.sceneRevision + 1,
      }
    }

    case 'REWIND_DIALOGUE':
      if (!isDialoguePhase(state.phase) || state.dialogueIndex === 0) return state
      return { ...state, dialogueIndex: clampedDialogueIndex(state, state.dialogueIndex - 1) }

    case 'JUMP_CHAPTER':
      return jumpChapter(state, action.chapterIndex)

    case 'SHOW_FINALE':
      return {
        ...state,
        chapterIndex: 3,
        phase: 'finale',
        dialogueIndex: 0,
        selectedChoice: null,
        factoryProgress: 'idle',
        sceneRevision: state.sceneRevision + 1,
      }

    case 'SET_MUTED':
      return { ...state, muted: action.muted }

    case 'SET_PRESENTER_MODE':
      return { ...state, presenterMode: action.enabled }

    case 'RESET':
      return createInitialState(action.muted ?? state.muted)

    default:
      return state
  }
}
