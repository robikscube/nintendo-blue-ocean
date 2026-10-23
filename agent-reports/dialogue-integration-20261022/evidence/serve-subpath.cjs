// Minimal static server for the isolated GitHub Pages subpath audit.
// Usage: node serve-subpath.cjs <dist-root> <base-path> <port>
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(process.argv[2] || 'dist-pages-dialogue')
const base = process.argv[3] || '/nintendo-next-blue-ocean/'
const port = Number(process.argv[4] || 4174)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
}

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname)
    if (!pathname.startsWith(base)) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('outside subpath')
      return
    }
    const relative = pathname.slice(base.length) || 'index.html'
    const file = path.resolve(root, relative)
    if (!file.startsWith(root)) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404, { 'content-type': 'text/plain' })
        res.end('not found')
        return
      }
      res.writeHead(200, {
        'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
      })
      res.end(data)
    })
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`serving ${root} at http://127.0.0.1:${port}${base}`)
  })
