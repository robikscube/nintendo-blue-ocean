import type {
  AccessoryVariant,
  ChoiceId,
  DecisionId,
  PrototypeSpec,
  PrototypeVariant,
} from '../core/types'
import {
  DECISIONS,
  PROTOTYPE_PRIORITIES,
  SIMULATED_LABEL,
  getOption,
} from '../core/story'

function getVariant(
  decision: DecisionId,
  choice: ChoiceId | undefined,
): { variant?: PrototypeVariant; accessory?: AccessoryVariant; title: string; description: string } {
  const option = getOption(decision, choice)
  if (!option) return { title: 'Unresolved Concept', description: 'The board has not supplied this input.' }
  return {
    variant: option.prototypeVariant,
    accessory: option.accessoryVariant,
    title: option.conceptTitle,
    description: option.conceptDescription,
  }
}

function chassisPhrase(variant: PrototypeVariant): string {
  switch (variant) {
    case 'tv':
      return 'A living-room-first chassis'
    case 'handheld':
      return 'A self-contained handheld screen'
    case 'hybrid':
      return 'A dockable screen that can leave the television'
    default:
      return 'A modular chassis'
  }
}

function accessoryPhrase(accessory: AccessoryVariant): string {
  switch (accessory) {
    case 'performance':
      return 'a high-output controller and performance module'
    case 'split-controls':
      return 'two detachable side controllers for instant two-player play'
    case 'motion':
      return 'a motion-first wand and a wide play space'
  }
}

export function buildPrototypeSpec(
  chapterIndex: number,
  choices: Partial<Record<DecisionId, ChoiceId>>,
): PrototypeSpec {
  if (chapterIndex === 2) {
    const d3 = getVariant('d3', choices.d3)
    const d4 = getVariant('d4', choices.d4)
    const variant = d3.variant ?? 'tv'
    const accessory = d4.accessory ?? 'performance'
    const focus = PROTOTYPE_PRIORITIES[variant]
    const accessoryFocus = PROTOTYPE_PRIORITIES[accessory]
    return {
      key: `${variant}:${accessory}`,
      title: `${d3.title} · ${d4.title}`,
      description: `${chassisPhrase(variant)} combined with ${accessoryPhrase(accessory)}.`,
      variant,
      accessory,
      label: SIMULATED_LABEL,
      priorities: `${focus?.priorities ?? ''} ${accessoryFocus?.priorities ?? ''}`.trim(),
      risks: `${focus?.risks ?? ''} ${accessoryFocus?.risks ?? ''}`.trim(),
    }
  }

  const decision: DecisionId = chapterIndex === 0 ? 'd1' : 'd2'
  const option = getVariant(decision, choices[decision])
  const variant = option.variant ?? 'power-tower'
  const focus = PROTOTYPE_PRIORITIES[variant]
  return {
    key: `${chapterIndex}:${variant}`,
    title: option.title,
    description: option.description,
    variant,
    accessory: null,
    label: SIMULATED_LABEL,
    priorities: focus?.priorities ?? '',
    risks: focus?.risks ?? '',
  }
}

export function allPrototypeKeys(): string[] {
  const d1 = DECISIONS.d1.options.map((option) => option.prototypeVariant)
  const d2 = DECISIONS.d2.options.map((option) => option.prototypeVariant)
  const d3 = DECISIONS.d3.options.map((option) => option.prototypeVariant)
  const d4 = DECISIONS.d4.options.map((option) => option.accessoryVariant)
  return [
    ...d1.map((variant) => `0:${variant}`),
    ...d2.map((variant) => `1:${variant}`),
    ...d3.flatMap((chassis) => d4.map((accessory) => `2:${chassis}:${accessory}`)),
  ]
}
