import type {
  ChapterId,
  ChoiceId,
  DecisionId,
  FactoryProgress,
  GameState,
  Phase,
} from './types'
import {
  CHAPTER_IDS,
  SCHEMA_VERSION,
  chapterDecisionsComplete,
  createInitialState,
  getActiveDecision,
  getDialogueLines,
} from './state'

export const SESSION_KEY = 'nintendo-next-blue-ocean:session:v2'
export const MUTED_KEY = 'nintendo-next-blue-ocean:muted'

const PHASES: readonly Phase[] = [
  'title',
  'opening',
  'briefing',
  'advisors',
  'voting',
  'factory',
  'feedback',
  'boss',
  'transition',
  'finale',
]
const DECISION_IDS: readonly DecisionId[] = ['d1', 'd2', 'd3', 'd4']
const CHOICE_IDS: readonly ChoiceId[] = ['A', 'B', 'C']
const FACTORY_PROGRESS: readonly FactoryProgress[] = ['idle', 'running', 'done']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function intOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback
}

function parseChoices(value: unknown): Partial<Record<DecisionId, ChoiceId>> {
  if (!isRecord(value)) return {}
  const choices: Partial<Record<DecisionId, ChoiceId>> = {}
  for (const decision of DECISION_IDS) {
    const raw = value[decision]
    if (typeof raw === 'string' && CHOICE_IDS.includes(raw as ChoiceId)) {
      choices[decision] = raw as ChoiceId
    }
  }
  return choices
}

/**
 * Restores only safe checkpoints. A refresh during an animation never resumes
 * halfway through it: factory scenes restart from their idle state, while
 * already-committed votes remain intact.
 */
export function normalizeRestoredState(raw: unknown): GameState | null {
  if (!isRecord(raw) || raw.version !== SCHEMA_VERSION) return null

  const phase = PHASES.includes(raw.phase as Phase) ? (raw.phase as Phase) : null
  if (!phase) return null

  const choices = parseChoices(raw.choices)
  const chapterIndex = Math.max(0, Math.min(3, intOr(raw.chapterIndex, 0)))
  const muted = raw.muted === true
  const presenterMode = raw.presenterMode === true
  const factoryProgress = FACTORY_PROGRESS.includes(raw.factoryProgress as FactoryProgress)
    ? (raw.factoryProgress as FactoryProgress)
    : 'idle'
  const selected = CHOICE_IDS.includes(raw.selectedChoice as ChoiceId)
    ? (raw.selectedChoice as ChoiceId)
    : null

  let normalizedChapter = chapterIndex
  let normalizedPhase: Phase = phase
  const started = normalizedPhase !== 'title'

  if (normalizedPhase === 'title') {
    normalizedChapter = 0
  }

  if (normalizedPhase === 'finale') {
    normalizedChapter = 3
  }

  if (normalizedChapter === 3 && normalizedPhase !== 'finale' && normalizedPhase !== 'title') {
    normalizedPhase = 'finale'
  }

  if (normalizedChapter < 3 && ['opening', 'briefing', 'advisors', 'voting', 'factory', 'feedback', 'boss', 'transition'].includes(normalizedPhase)) {
    const chapterId: ChapterId | undefined = CHAPTER_IDS[normalizedChapter]
    if (!chapterId) {
      normalizedChapter = 0
      normalizedPhase = 'briefing'
    }
  }

  if (normalizedPhase === 'transition' && normalizedChapter > 2) {
    normalizedChapter = 2
  }

  let draft: GameState = {
    ...createInitialState(muted),
    chapterIndex: normalizedChapter,
    phase: normalizedPhase,
    dialogueIndex: Math.max(0, intOr(raw.dialogueIndex, 0)),
    selectedChoice: selected,
    choices,
    factoryProgress,
    muted,
    presenterMode,
    started,
    sceneRevision: Math.max(0, intOr(raw.sceneRevision, 0)),
  }

  if (!['voting', 'factory', 'feedback', 'boss', 'transition', 'finale', 'title'].includes(draft.phase)) {
    draft = { ...draft, factoryProgress: 'idle' }
  }

  if (draft.phase === 'factory') {
    // Never resume an interrupted choreography. Rebuild safely from idle.
    if (!chapterDecisionsComplete(draft)) {
      draft = { ...draft, phase: 'voting', factoryProgress: 'idle', dialogueIndex: 0 }
    } else {
      draft = { ...draft, factoryProgress: 'idle', dialogueIndex: 0 }
    }
  } else if (draft.phase === 'feedback' || draft.phase === 'boss') {
    if (!chapterDecisionsComplete(draft)) {
      draft = { ...draft, phase: 'voting', factoryProgress: 'idle', dialogueIndex: 0 }
    } else {
      draft = { ...draft, factoryProgress: 'done' }
    }
  } else if (draft.phase === 'voting') {
    const active = getActiveDecision(draft)
    if (!active) {
      draft = { ...draft, phase: 'factory', factoryProgress: 'idle', selectedChoice: null }
    }
  } else if (draft.phase === 'transition') {
    if (!chapterDecisionsComplete(draft)) {
      draft = { ...draft, phase: 'voting', factoryProgress: 'idle', dialogueIndex: 0 }
    } else {
      draft = { ...draft, factoryProgress: 'done' }
    }
  }

  if (draft.phase === 'title') {
    draft = { ...draft, started: false, chapterIndex: 0, dialogueIndex: 0, selectedChoice: null, factoryProgress: 'idle' }
  }

  if (draft.phase === 'voting') {
    const active = getActiveDecision(draft)
    if (!active || !draft.selectedChoice) {
      draft = { ...draft, selectedChoice: null }
    } else if (!['A', 'B', 'C'].includes(draft.selectedChoice)) {
      draft = { ...draft, selectedChoice: null }
    }
  } else {
    draft = { ...draft, selectedChoice: null }
  }

  if (!['opening', 'advisors', 'feedback', 'boss'].includes(draft.phase)) {
    draft = { ...draft, dialogueIndex: 0 }
  } else {
    const lines = getDialogueLines(draft)
    const max = Math.max(0, lines.length - 1)
    draft = { ...draft, dialogueIndex: Math.min(draft.dialogueIndex, max) }
  }

  return draft
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function loadSession(): GameState | null {
  const storage = getSessionStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(SESSION_KEY)
    if (!raw) return null
    return normalizeRestoredState(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function saveSession(state: GameState): void {
  const storage = getSessionStorage()
  if (!storage) return
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(state))
  } catch {
    // Classroom reliability: inability to save must never block the story.
  }
}

export function clearSession(): void {
  try {
    getSessionStorage()?.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage restrictions.
  }
}

export function loadMutedPreference(): boolean {
  try {
    return getLocalStorage()?.getItem(MUTED_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveMutedPreference(muted: boolean): void {
  try {
    getLocalStorage()?.setItem(MUTED_KEY, muted ? 'true' : 'false')
  } catch {
    // Ignore storage restrictions.
  }
}
