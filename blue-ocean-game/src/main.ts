import './style.css'
import './styles/universal.css'
import './styles/welcome.css'
import './styles/dialogue-buttons.css'
import './styles/screens-responsive.css'
import { GameStore } from './core/store'
import { getCurrentLine } from './core/state'
import type { GameState } from './core/types'
import { AudioEngine } from './audio/audio'
import { SceneDirector } from './scene/scene-director'
import { UI } from './ui/ui'

declare global {
  interface Window {
    __GAME__?: {
      store: GameStore
      scene: SceneDirector | null
      audio: AudioEngine
      ui: UI
      version: string
    }
    __GAME_STATE__?: GameState
    __GAME_READY__?: boolean
    render_game_to_text?: () => string
    advanceTime?: (milliseconds: number) => Promise<void>
  }
}

const root = document.getElementById('ui')
const canvas = document.getElementById('scene')

if (!root || !(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Presentation shell failed to load.')
}

const store = new GameStore()
const audio = new AudioEngine(store.state.muted)

let scene: SceneDirector | null = null
try {
  scene = new SceneDirector(canvas)
} catch (error) {
  console.error('3D preview unavailable; continuing in story mode.', error)
  document.documentElement.classList.add('no-webgl')
}

const ui = new UI({ store, scene, audio, root })
const version = '0.1.0'

window.__GAME__ = { store, scene, audio, ui, version }
window.__GAME_STATE__ = store.state
store.subscribe((state) => {
  window.__GAME_STATE__ = state
})

window.render_game_to_text = (): string => {
  const state = store.state
  const line = getCurrentLine(state)
  const debugScene = scene?.getDebugInfo() ?? null
  const visibleScreen = document.querySelector<HTMLElement>('.screen')
  return JSON.stringify({
    mode: state.phase,
    chapter: state.chapterIndex + 1,
    phase: state.phase,
    dialogueIndex: state.dialogueIndex,
    speaker: line?.speaker ?? null,
    line: line?.text ?? null,
    selectedChoice: state.selectedChoice,
    choices: state.choices,
    factoryProgress: state.factoryProgress,
    muted: state.muted,
    presenterMode: state.presenterMode,
    archiveVisible: Boolean(document.querySelector('.archive-screen')),
    visibleHeading: visibleScreen?.querySelector('h1, h2')?.textContent?.trim() ?? null,
    scene: debugScene,
    version,
  })
}

window.advanceTime = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) => {
    const start = performance.now()
    const step = (): void => {
      if (performance.now() - start >= milliseconds) {
        resolve()
        return
      }
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

window.__GAME_READY__ = true
