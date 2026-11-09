import assert from 'node:assert/strict'
import { test } from 'node:test'
import { serveImage } from '../cloudflare-worker.js'
import { imageUrl } from '../src/utils/imageUrl.js'

const env = { IMAGE_ORIGIN_BASE_URL: 'https://api.example.com' }
const request = (path = '/images/items/12/image', options) => new Request(`https://cdn.example.com${path}`, options)
function fixture(respond = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png', 'Set-Cookie': 'private=no', 'X-Internal': 'no' } })) {
  const entries = new Map()
  const calls = []
  const writes = []
  return {
    calls, writes,
    ctx: { waitUntil: promise => writes.push(promise) },
    dependencies: {
      cache: { match: async key => entries.get(key.url)?.clone(), put: async (key, value) => { entries.set(key.url, value.clone()) } },
      fetcher: async (...args) => { calls.push(args); return respond() },
    },
  }
}

test('a public image is fetched once, cached, then shared without caller credentials', async () => {
  const f = fixture()
  const first = await serveImage(request(undefined, { headers: { Authorization: 'Bearer private', Cookie: 'private=yes', Range: 'bytes=0-0' } }), env, f.ctx, f.dependencies)
  assert.equal(first.status, 200)
  assert.equal(first.headers.get('X-Image-Cache'), 'MISS')
  assert.deepEqual([...new Uint8Array(await first.arrayBuffer())], [1, 2, 3])
  await Promise.all(f.writes)
  const second = await serveImage(request(), env, f.ctx, f.dependencies)
  assert.equal(second.headers.get('X-Image-Cache'), 'HIT')
  assert.equal(second.headers.get('Cache-Control'), 'public, max-age=3600')
  assert.equal(second.headers.get('Access-Control-Allow-Origin'), '*')
  assert.equal(second.headers.get('Set-Cookie'), null)
  assert.equal(second.headers.get('X-Internal'), null)
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0][0], 'https://api.example.com/items/12/image')
  assert.deepEqual(f.calls[0][1].headers, { Accept: 'image/jpeg,image/png,image/webp' })
  const head = await serveImage(request(undefined, { method: 'HEAD' }), env, f.ctx, f.dependencies)
  assert.equal(head.headers.get('X-Image-Cache'), 'HIT')
  assert.equal(await head.text(), '')
})

test('missing, failing, redirecting, HTML, empty and oversized responses are never cached', async () => {
  const responses = [
    [() => new Response('missing', { status: 404 }), 404],
    [() => new Response('private diagnostic', { status: 503 }), 502],
    [() => new Response(null, { status: 302, headers: { Location: 'https://other.example/image' } }), 502],
    [() => new Response('<html>', { headers: { 'Content-Type': 'text/html' } }), 502],
    [() => new Response(null, { headers: { 'Content-Type': 'image/png' } }), 502],
    [() => new Response(new Uint8Array(5 * 1024 * 1024 + 1), { headers: { 'Content-Type': 'image/png' } }), 502],
    [() => { throw new Error('secret upstream details') }, 502],
  ]
  for (const [respond, code] of responses) {
    const f = fixture(respond)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await serveImage(request(), env, f.ctx, f.dependencies)
      assert.equal(result.status, code)
      assert.equal(result.headers.get('Cache-Control'), 'no-store')
      assert.doesNotMatch(await result.text(), /private|secret|html/)
    }
    assert.equal(f.calls.length, 2)
    assert.equal(f.writes.length, 0)
  }
})

test('cache failures still allow a public image to be read', async () => {
  const f = fixture()
  f.dependencies.cache = { match: async () => { throw new Error() }, put: async () => { throw new Error() } }
  const result = await serveImage(request(), env, f.ctx, f.dependencies)
  assert.equal(result.status, 200)
  await Promise.all(f.writes)
})

test('arbitrary URLs, invalid IDs, query strings and mutations never reach the origin', async () => {
  const f = fixture()
  for (const path of ['/images', '/images/https://evil.test', '/images/items/0/image', '/images/items/9223372036854775808/image', '/images/items/1/image?url=https://evil.test', '/images/auth/me', '/images/items/1/image/extra']) {
    assert.equal((await serveImage(request(path), env, f.ctx, f.dependencies)).status, 404)
  }
  assert.equal((await serveImage(request(undefined, { method: 'POST' }), env, f.ctx, f.dependencies)).status, 405)
  assert.equal(f.calls.length, 0)
})

test('missing or unsafe origin is a noncacheable configuration failure', async () => {
  const f = fixture()
  for (const value of [undefined, '', 'http://public.test', 'https://user:pass@api.test', 'https://api.test?token=secret', 'https://cdn.example.com']) {
    const result = await serveImage(request(), { IMAGE_ORIGIN_BASE_URL: value }, f.ctx, f.dependencies)
    assert.equal(result.status, 503)
    assert.equal(result.headers.get('Cache-Control'), 'no-store')
  }
  assert.equal(f.calls.length, 0)
})

test('image URL configuration supports API fallback, same-site CDN, and separate CDN domain', () => {
  const path = '/items/12/image'
  assert.equal(imageUrl(path, undefined, 'https://api.test/items/12/image'), 'https://api.test/items/12/image')
  assert.equal(imageUrl(path, '/images', 'unused'), '/images/items/12/image')
  assert.equal(imageUrl(path, ' https://cdn.test/images/ ', 'unused'), 'https://cdn.test/images/items/12/image')
  assert.equal(imageUrl(path, 'http://localhost:8787/images', 'unused'), 'http://localhost:8787/images/items/12/image')
  for (const base of ['//evil.test', 'javascript:alert(1)', 'http://public.test', 'https://user:pass@cdn.test', 'https://cdn.test?token=x', '/images?token=x', '/images#x', '/images/../escape']) {
    assert.throws(() => imageUrl(path, base, 'unused'))
  }
  assert.throws(() => imageUrl('/auth/me', '/images', 'unused'))
})


test('switching the configured origin cannot reuse images from a different database', async () => {
  const f = fixture()
  await serveImage(request(), env, f.ctx, f.dependencies)
  await Promise.all(f.writes)
  const result = await serveImage(request(), { IMAGE_ORIGIN_BASE_URL: 'https://staging.example.com' }, f.ctx, f.dependencies)
  assert.equal(result.headers.get('X-Image-Cache'), 'MISS')
  assert.equal(f.calls.length, 2)
  assert.equal(f.calls[1][0], 'https://staging.example.com/items/12/image')
})
