import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('./dist/', import.meta.url))
const API_URL = (process.env.API_URL || '').replace(/\/$/, '')
const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }

// Repassa /api/* para a API (sem o prefixo /api). Só rotas /v1/site/*: o resto da API não fica exposto aqui.
async function proxy(request, response, pathname, search) {
  const target = pathname.replace(/^\/api/, '')
  if (!API_URL || !target.startsWith('/v1/site/')) { response.writeHead(404); return response.end() }
  const chunks = []
  for await (const chunk of request) { chunks.push(chunk); if (Buffer.concat(chunks).length > 64_000) { response.writeHead(413); return response.end() } }
  const headers = { 'content-type': request.headers['content-type'] || 'application/json', 'x-forwarded-for': [request.headers['x-forwarded-for'], request.socket.remoteAddress].filter(Boolean).join(', ') }
  if (request.headers.cookie) headers.cookie = request.headers.cookie
  try {
    const upstream = await fetch(API_URL + target + search, { method: request.method, headers, body: ['GET', 'HEAD'].includes(request.method) ? undefined : Buffer.concat(chunks), signal: AbortSignal.timeout(10000) })
    const out = { 'Content-Type': upstream.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' }
    const cookies = upstream.headers.getSetCookie()
    if (cookies.length) out['Set-Cookie'] = cookies
    response.writeHead(upstream.status, out)
    response.end(Buffer.from(await upstream.arrayBuffer()))
  } catch {
    response.writeHead(502, { 'Content-Type': 'application/json' })
    response.end('{"error":"api_unavailable"}')
  }
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname.startsWith('/api/')) return proxy(request, response, url.pathname, url.search)
    const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '')
    const candidate = normalize(join(root, relative))
    const path = candidate.startsWith(root) && await stat(candidate).then(info => info.isFile() ? candidate : join(root, 'index.html')).catch(() => join(root, 'index.html'))
    response.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8` })
    createReadStream(path).pipe(response)
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Não foi possível carregar o site.')
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`Site em http://0.0.0.0:${process.env.PORT || 3000}`))
