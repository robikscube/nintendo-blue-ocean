/** UTF-16 endpoints match the speech timeline without splitting visible graphemes. */
export function graphemeEnds(text: string): number[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  return [...segmenter.segment(text)].map(({ index, segment }) => index + segment.length)
}

/**
 * One immutable full-text node preserves native kerning, shaping and wrapping.
 * Moving a paint-only highlight range hides the suffix without changing layout.
 * The parent is aria-hidden; UI maintains the accessible revealed prefix.
 */
export class StationaryText {
  readonly canAnimate = typeof Highlight !== 'undefined' && Boolean(CSS.highlights)
  private node: Text | null = null
  private hiddenRange: Range | null = null
  private visibleRange: Range | null = null
  private ends: number[] = []
  private shown = 0

  constructor(private readonly element: HTMLElement) {}

  setText(text: string): void {
    this.ends = graphemeEnds(text)
    this.shown = 0
    this.node = document.createTextNode(text)
    this.element.replaceChildren(this.node)
    this.element.dataset.revealedCharacters = '0'
    this.element.classList.toggle('has-stationary-highlight', this.canAnimate)
    if (this.canAnimate) {
      this.hiddenRange = document.createRange()
      this.hiddenRange.selectNodeContents(this.node)
      CSS.highlights.set('dialogue-unrevealed', new Highlight(this.hiddenRange))
      this.visibleRange = document.createRange()
      this.visibleRange.setStart(this.node, 0)
      this.visibleRange.collapse(true)
      CSS.highlights.set('dialogue-revealed', new Highlight(this.visibleRange))
    }
  }

  /** Reveal only complete graphemes; return the accessible UTF-16 prefix end. */
  reveal(characterCount: number): number {
    while (this.shown < this.ends.length && this.ends[this.shown]! <= characterCount) this.shown += 1
    const end = this.ends[this.shown - 1] ?? 0
    if (this.node) this.hiddenRange?.setStart(this.node, end)
    if (this.node) this.visibleRange?.setEnd(this.node, end)
    this.element.dataset.revealedCharacters = String(end)
    return end
  }

  dispose(): void {
    if (this.canAnimate) {
      CSS.highlights.delete('dialogue-unrevealed')
      CSS.highlights.delete('dialogue-revealed')
    }
  }
}
