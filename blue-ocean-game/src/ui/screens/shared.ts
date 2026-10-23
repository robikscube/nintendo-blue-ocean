import { MUSIC_CREDIT } from '../../audio/music'

/** Escape authored strings before interpolating them into screen HTML. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

/** Human-readable title list for the licensed music attribution. */
export function musicCreditTitles(): string {
  const titles = MUSIC_CREDIT.titles.map((title) => `“${escapeHtml(title)}”`)
  if (titles.length <= 1) return titles.join('')
  return `${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]}`
}

/** Local, original CSS silhouettes for the three archive products. */
export function productSilhouette(id: string): string {
  if (id === 'wii') {
    return `<span class="sil-wii-body"></span><span class="sil-wii-stand"></span><span class="sil-wii-slot"></span>`
  }
  if (id === 'wii-u') {
    return `<span class="sil-wiiu-console"></span><span class="sil-wiiu-gamepad"><span></span></span>`
  }
  return `<span class="sil-switch-console"><span></span></span><span class="sil-joycon sil-left"></span><span class="sil-joycon sil-right"></span>`
}
