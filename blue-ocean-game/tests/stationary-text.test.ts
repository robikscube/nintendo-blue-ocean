import { describe, expect, it } from 'vitest'
import { graphemeEnds } from '../src/ui/stationary-text'

describe('speech timeline grapheme boundaries', () => {
  it('keeps authored whitespace and newlines in the final layout', () => {
    const text = 'A  B\nC\r\nD'
    let start = 0
    const segments = graphemeEnds(text).map(end => {
      const segment = text.slice(start, end); start = end; return segment
    })
    expect(segments.join('')).toBe(text)
    expect(segments).toEqual(['A', ' ', ' ', 'B', '\n', 'C', '\r\n', 'D'])
  })
  it('never reveals half a surrogate, accent or joined emoji', () => {
    const text = 'A👩🏽‍💻e\u0301Z'
    expect(graphemeEnds(text)).toEqual([1, 8, 10, 11])
  })
  it('handles empty lines and punctuation', () => {
    expect(graphemeEnds('')).toEqual([])
    expect(graphemeEnds('…!?')).toEqual([1, 2, 3])
  })
})
