// ===================================================================
// MediCare — local dev server for the AI Assistant
// ===================================================================
// Serves the static site AND the rule-based /api/chat endpoint on one
// port, so typed chat works locally without deploying anything.
//
//   node dev-server.mjs          ->  http://localhost:3001/caremate.html
//   node dev-server.mjs 4000     ->  http://localhost:4000/caremate.html
//
// Deployed, the real endpoint is the Vercel relay (/api/chat). This file
// is for local development only and is not needed in production.
// ===================================================================

import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import chatHandler from './vercel-api/api/chat.js'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const PORT = Number(process.argv[2] || process.env.PORT || 3001)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg'
}

// Adapt Node's ServerResponse into the minimal Vercel-style API the
// serverless function expects (setHeader/status/json/send/end).
function vercelResponse(res) {
  return {
    headers: {},
    statusCode: 200,
    setHeader(key, value) { this.headers[key] = value },
    status(code) { this.statusCode = code; return this },
    json(obj) {
      res.writeHead(this.statusCode, { ...this.headers, 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(obj))
      return this
    },
    send(body) {
      res.writeHead(this.statusCode, { ...this.headers, 'Content-Type': this.headers['Content-Type'] || 'text/plain; charset=utf-8' })
      res.end(body)
      return this
    },
    end() {
      res.writeHead(this.statusCode, this.headers)
      res.end()
      return this
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)


  if (url.pathname === '/api/chat') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks).toString('utf8')
    await chatHandler({ method: req.method, headers: req.headers, body }, vercelResponse(res))
    return
  }

  let reqPath = decodeURIComponent(url.pathname)
  if (reqPath === '/') reqPath = '/caremate.html'

  const filePath = normalize(join(ROOT, reqPath))
  if (!filePath.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  try {
    const data = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  }
})

server.listen(PORT, () => {
  console.log(`MediCare AI Assistant dev server running:`)
  console.log(`  http://localhost:${PORT}/caremate.html`)
  console.log(`  POST http://localhost:${PORT}/api/chat`)
})
