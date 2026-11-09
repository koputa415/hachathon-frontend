const imageRoute = /^\/images(\/items\/[1-9]\d*\/image)$/
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxBytes = 5 * 1024 * 1024
const ttl = 3600

function failure(status) {
  return new Response(status === 404 ? 'Image not found' : 'Image unavailable', {
    status, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' },
  })
}

function originUrl(value, path) {
  const url = new URL(value)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    || url.username || url.password || url.search || url.hash) throw new Error('Invalid image origin')
  return `${url.href.replace(/\/+$/, '')}${path}`
}

async function imageBytes(body) {
  if (!body) throw new Error('Empty image')
  const reader = body.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) throw new Error('Image too large')
      chunks.push(value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  if (!size) throw new Error('Empty image')
  return new Blob(chunks)
}

export async function serveImage(request, env, ctx, { fetcher = fetch, cache = caches.default } = {}) {
  const url = new URL(request.url)
  const match = url.pathname.match(imageRoute)
  if (!match || url.search || BigInt(match[1].split('/')[2]) > 9223372036854775807n) return failure(404)
  if (!['GET', 'HEAD'].includes(request.method)) return failure(405)
  let upstreamUrl
  try {
    upstreamUrl = originUrl(env.IMAGE_ORIGIN_BASE_URL, match[1])
    if (new URL(upstreamUrl).origin === url.origin) throw new Error('Recursive image origin')
  } catch { return failure(503) }
  // The cache key never carries cookies, tokens, conditional headers, or user-controlled URLs.
  const keyUrl = new URL(url.href)
  keyUrl.searchParams.set('source', upstreamUrl)
  const key = new Request(keyUrl, { method: 'GET' })
  let cached
  try { cached = await cache.match(key) } catch { /* Cache failure must not prevent image viewing. */ }
  if (cached) {
    const headers = new Headers(cached.headers)
    headers.set('X-Image-Cache', 'HIT')
    return new Response(request.method === 'HEAD' ? null : cached.body, { headers, status: 200 })
  }
  try {
    const upstream = await fetcher(upstreamUrl, {
      method: 'GET', headers: { Accept: 'image/jpeg,image/png,image/webp' },
      redirect: 'manual', signal: AbortSignal.timeout(15000),
    })
    if (upstream.status === 404) return failure(404)
    const type = upstream.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()
    if (upstream.status !== 200 || !imageTypes.has(type) || Number(upstream.headers.get('Content-Length')) > maxBytes) {
      await upstream.body?.cancel()
      return failure(502)
    }
    const body = await imageBytes(upstream.body)
    // Only sanitized, public image bytes and our own response headers enter the shared cache.
    const response = new Response(body, { headers: {
      'Content-Type': type, 'Content-Length': String(body.size), 'Cache-Control': `public, max-age=${ttl}`,
      'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff',
    } })
    ctx.waitUntil(cache.put(key, response.clone()).catch(() => {}))
    const headers = new Headers(response.headers)
    headers.set('X-Image-Cache', 'MISS')
    return new Response(request.method === 'HEAD' ? null : response.body, { headers })
  } catch { return failure(502) }
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname
    if (path === '/images' || path.startsWith('/images/')) return serveImage(request, env, ctx)
    return env.ASSETS.fetch(request)
  },
}
