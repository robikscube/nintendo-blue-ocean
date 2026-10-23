import type { GameState } from './types'
import {
  clearSession,
  loadMutedPreference,
  loadSession,
  saveMutedPreference,
  saveSession,
} from './checkpoint'
import {
  createInitialState,
  transition,
  type GameAction,
} from './state'

type Listener = (state: GameState, previous: GameState) => void

export class GameStore {
  private current: GameState
  private listeners = new Set<Listener>()

  constructor(initial?: GameState) {
    const muted = initial?.muted ?? loadMutedPreference()
    this.current = initial ?? loadSession() ?? createInitialState(muted)
    this.current = { ...this.current, muted: initial?.muted ?? muted }
    saveSession(this.current)
  }

  get state(): GameState {
    return this.current
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispatch(action: GameAction): GameState {
    const previous = this.current
    const next = transition(previous, action)
    if (next === previous) return previous

    this.current = next
    if (next.muted !== previous.muted) saveMutedPreference(next.muted)
    if (action.type === 'RESET') clearSession()
    saveSession(next)
    for (const listener of this.listeners) {
      listener(next, previous)
    }
    return next
  }

  reset(): GameState {
    const muted = this.current.muted
    return this.dispatch({ type: 'RESET', muted })
  }
}
