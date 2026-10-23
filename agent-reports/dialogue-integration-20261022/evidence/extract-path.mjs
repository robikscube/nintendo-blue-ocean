import fs from 'node:fs'

const previewHtml = fs.readFileSync(
  'C:/Users/robwa/Desktop/Nintendo/previews/dialogue-bubble-prototype/index.html',
  'utf8',
)
const match = previewHtml.match(/<path d="([^"]+)"/)
if (!match) throw new Error('No approved name-tag path found in preview index.html')
const path = match[1]

const source = [
  '// Approved dialogue artwork metadata.',
  "// The tag path is copied verbatim from the final approved preview's inline",
  '// SVG fill layer (previews/dialogue-bubble-prototype/index.html). It covers',
  "// only the source artwork's pink name-tag pixels, so recolouring it never",
  '// redraws the ivory tag edge, striped rim, silhouette, or chevron.',
  'export const DIALOGUE_ART_WIDTH = 3872',
  'export const DIALOGUE_ART_HEIGHT = 1552',
  'export const NAME_TAG_PATH =',
  `  '${path}'`,
  '',
].join('\n')

fs.writeFileSync('C:/Users/robwa/Desktop/Nintendo/blue-ocean-game/src/ui/dialogue-art.ts', source)
console.log(JSON.stringify({ pathLength: path.length, fileBytes: source.length }))
