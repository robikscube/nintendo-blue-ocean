import { escapeHtml } from '../screens/shared'

export type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ActionButtonOptions {
  /** Visible label. Kept exact — the UI copy contract is tested. */
  label: string
  /** Existing `data-action` value handled by UI. */
  action: string
  tone?: ButtonTone
  /** Trusted decorative HTML mark, always aria-hidden. */
  icon?: string
  large?: boolean
  disabled?: boolean
  id?: string
  className?: string
  attrs?: Record<string, string>
}

const TONE_CLASS: Record<ButtonTone, string> = {
  primary: 'primary-button',
  secondary: 'secondary-button',
  ghost: 'text-button',
  danger: 'danger-button',
}

/**
 * One markup path for every action button in the exhibit. The shared CSS class
 * owns the visual language; screens only choose a tone and an existing action.
 *
 * Security note: labels, IDs, action names and attribute values are escaped.
 * `icon` is an explicit trusted-HTML escape hatch for decorative marks only, so
 * it is always wrapped in an aria-hidden element.
 */
export function actionButton({
  label,
  action,
  tone = 'primary',
  icon = '',
  large = false,
  disabled = false,
  id,
  className,
  attrs,
}: ActionButtonOptions): string {
  const classes = [TONE_CLASS[tone], large ? 'large' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  const idAttr = id ? ` id="${escapeHtml(id)}"` : ''
  const disabledAttr = disabled ? ' disabled' : ''
  const extraAttrs = Object.entries(attrs ?? {})
    .filter(([name]) => /^[a-zA-Z0-9_:.-]+$/.test(name))
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join('')
  const decorativeIcon = icon
    ? `<span class="button-icon" aria-hidden="true">${icon}</span>`
    : ''
  return `<button class="${escapeHtml(classes)}"${idAttr} type="button" data-action="${escapeHtml(action)}"${disabledAttr}${extraAttrs}>${escapeHtml(label)}${decorativeIcon}</button>`
}
