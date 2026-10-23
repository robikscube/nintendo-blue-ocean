/* P4 one-off: compact summary of p4-measure-results.json. */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const results = JSON.parse(readFileSync(join(dir, 'p4-measure-results.json'), 'utf8'))

for (const entry of results) {
  if (!entry.avatars) {
    console.log(`META ${entry.size}: pageErrors=${JSON.stringify(entry.pageErrors)} consoleErrors=${JSON.stringify(entry.consoleErrors)} speakers=${JSON.stringify(entry.seenSpeakers)}`)
    continue
  }
  if (entry.label.endsWith('wide')) {
    console.log(`\n=== ${entry.size} / ${entry.label} ===`)
    console.log(`camera=${JSON.stringify(entry.camera)} fov=${entry.cameraFov} overlayTop=${entry.overlayTop} drawCalls=${entry.drawCalls} triangles=${entry.triangles}`)
    console.log('gaps:', entry.gaps.map((g) => `${g.pair}=${g.gapPx}px/${g.gapInBodyWidths}bw`).join(' '))
    console.log('bodies:', entry.avatars.map((a) => `${a.id}=x${a.bbox.minX}..${a.bbox.maxX}/y${a.bbox.minY}..${a.bbox.maxY} frame=${a.inFrame}`).join(' '))
    console.log('faces:', entry.faces.map((f) => `${f.id}=y${f.headY}${f.aboveOverlay === null ? '/overlay?' : f.aboveOverlay ? '/above' : '/UNDER'}`).join(' '))
    console.log('tableAvatarIntersections:', entry.avatars.map((a) => `${a.id}:${a.tableIntersections}`).join(' '), 'chair:', entry.chairs.map((c) => `${c.id}:${c.tableIntersections}`).join(' '), 'propOverlaps:', JSON.stringify(entry.propOverlaps))
    continue
  }
  const speaker = entry.label.replace('speaker-', '')
  const avatar = entry.avatars.find((a) => a.id === speaker)
  const face = entry.faces.find((f) => f.id === speaker)
  console.log(`speaker ${entry.size}/${speaker}: camera=${JSON.stringify(entry.camera)} fov=${entry.cameraFov} body=${avatar ? `x${avatar.bbox.minX}..${avatar.bbox.maxX}/y${avatar.bbox.minY}..${avatar.bbox.maxY}` : 'missing'} inFrame=${avatar?.inFrame} faceY=${face?.headY} overlayTop=${entry.overlayTop} aboveOverlay=${face?.aboveOverlay} note=${entry.note}`)
}
