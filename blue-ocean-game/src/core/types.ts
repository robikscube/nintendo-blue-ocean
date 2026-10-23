export type ChapterId = 'c2005' | 'c2011' | 'c2016'
export type DecisionId = 'd1' | 'd2' | 'd3' | 'd4'
export type ChoiceId = 'A' | 'B' | 'C'
export type Phase =
  | 'title'
  | 'opening'
  | 'briefing'
  | 'advisors'
  | 'voting'
  | 'factory'
  | 'feedback'
  | 'boss'
  | 'transition'
  | 'finale'
export type FactoryProgress = 'idle' | 'running' | 'done'
export type CharacterId = 'mori' | 'pip' | 'bolt' | 'grumble' | 'shell' | 'narrator'
export type Mood = 'neutral' | 'thoughtful' | 'pleased' | 'concerned'

export interface CharacterProfile {
  id: CharacterId
  name: string
  species: string
  role: string
  color: string
  accent: string
  detail: string
  voice: {
    wave: OscillatorType
    base: number
    range: number
    pace: number
  }
}

export interface DialogueLine {
  speaker: CharacterId
  text: string
  mood?: Mood
}

export type PrototypeVariant =
  | 'power-tower'
  | 'social-box'
  | 'early-handheld'
  | 'hd-console'
  | 'second-screen'
  | 'portable'
  | 'tv'
  | 'handheld'
  | 'hybrid'

export type AccessoryVariant = 'performance' | 'split-controls' | 'motion'

export interface DecisionOption {
  id: ChoiceId
  title: string
  shortTitle: string
  detail: string
  benefit: string
  tradeoff: string
  conceptTitle: string
  conceptDescription: string
  prototypeVariant?: PrototypeVariant
  accessoryVariant?: AccessoryVariant
  feedback: DialogueLine
  boss: string
}

export interface Decision {
  id: DecisionId
  prompt: string
  context: string
  options: readonly [DecisionOption, DecisionOption, DecisionOption]
}

export interface Chapter {
  id: ChapterId
  number: 1 | 2 | 3
  year: number
  eyebrow: string
  title: string
  lead: string
  brief: string
  watchFor: readonly string[]
  decisions: readonly DecisionId[]
  advisorLines: readonly DialogueLine[]
  bossClosing: string
  transition: {
    eyebrow: string
    title: string
    text: string
    nextLabel: string
  }
}

export interface HistoricalProduct {
  id: string
  name: string
  launchYear: number
  proposition: string
  detail: string
  units: string
  unitsNote: string
  comparison: string
  caution: string
}

export interface GameState {
  version: 2
  chapterIndex: number
  phase: Phase
  dialogueIndex: number
  selectedChoice: ChoiceId | null
  choices: Partial<Record<DecisionId, ChoiceId>>
  factoryProgress: FactoryProgress
  muted: boolean
  presenterMode: boolean
  started: boolean
  sceneRevision: number
}

export interface PrototypeSpec {
  key: string
  title: string
  description: string
  variant: PrototypeVariant
  accessory: AccessoryVariant | null
  label: string
  priorities: string
  risks: string
}
