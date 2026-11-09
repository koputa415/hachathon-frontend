const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { chromium } = require('playwright')
const base = process.env.IMAGES_E2E_BASE_URL || 'http://localhost:5182'
const cdn = process.env.IMAGES_E2E_CDN_BASE_URL || 'http://localhost:8787/images'
if (![base, cdn].every(value => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname))
  || process.env.IMAGES_E2E_ALLOW_WRITES !== '1') throw new Error('Local disposable API/DB/CDN only; set IMAGES_E2E_ALLOW_WRITES=1')
const output = process.env.IMAGES_E2E_OUTPUT_DIR || path.resolve('test-results/images')

async function run() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const context = await browser.newContext()
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const suffix = randomBytes(6).toString('hex')
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFUlEQVR4nGPUCKhgYGBgYGBgYoABABDMAPTRO+Z7AAAAAElFTkSuQmCC', 'base64')
  const fields = { title: `CDN画像確認-${suffix}`, description: 'ローカルCDN実行環境の確認用です。', category: 'その他', condition: '未使用に近い', price: 2000 }
  try {
    const registered = await context.request.post(`${base}/api/auth/register`, { data: { email: `cdn-${suffix}@example.com`, display_name: 'CDN確認', password: randomBytes(24).toString('base64url') } })
    assert.equal(registered.status(), 201)
    const who = await registered.json()
    const uploaded = await context.request.post(`${base}/api/items/with-image`, { headers: { Authorization: `Bearer ${who.access_token}` }, multipart: {
      item: JSON.stringify(fields), image: { name: 'image.png', mimeType: 'image/png', buffer: png },
    } })
    assert.equal(uploaded.status(), 201)
    const item = await uploaded.json()
    const imageUrl = `${cdn}${item.image_path}`
    const seen = []
    page.on('response', response => { if (response.url() === imageUrl) seen.push(response.url()) })
    await page.goto(`${base}/#/items/${item.id}`)
    const ready = () => page.waitForFunction(({ title, url }) => {
      const image = [...document.images].find(image => image.alt === title)
      return image?.complete && image.naturalWidth === 3 && image.currentSrc === url
    }, { title: fields.title, url: imageUrl })
    await ready()
    await page.reload()
    await ready()
    await page.screenshot({ path: path.join(output, 'cdn-detail-reloaded.png'), fullPage: true })
    const first = await context.request.get(imageUrl)
    const next = await context.request.get(imageUrl)
    assert.equal(first.status(), 200)
    assert.equal(next.status(), 200)
    assert.equal(next.headers()['x-image-cache'], 'HIT')
    assert.equal(next.headers()['content-type'], 'image/png')
    assert.equal(next.headers()['access-control-allow-origin'], '*')
    assert.deepEqual(await first.body(), await next.body())
    const missing = await context.request.get(`${cdn}/items/9223372036854775807/image`)
    assert.equal(missing.status(), 404)
    assert.equal(missing.headers()['cache-control'], 'no-store')
    const invalid = await context.request.get(`${cdn}/items/1/image?url=https://example.com`)
    assert.equal(invalid.status(), 404)
    const cors = await page.evaluate(async url => {
      const response = await fetch(url, { credentials: 'omit' })
      const blob = await response.blob()
      return { status: response.status, type: blob.type, size: blob.size }
    }, imageUrl)
    assert.equal(cors.status, 200)
    assert.equal(cors.type, 'image/png')
    assert.ok(cors.size > 0)
    await page.goto(`${base}/#/`)
    await ready()
    assert.ok(seen.length >= 2)
    assert.deepEqual(errors, [])
    const result = { passed: true, itemId: item.id, currentSrc: imageUrl, edgeCache: next.headers()['x-image-cache'],
      checks: ['GCS互換環境へアップロードし、詳細と再読み込みでCDN URLの画像を表示', 'Cloudflare実行環境のキャッシュHITと画像バイトを確認', '画像以外のパス・404をキャッシュせず、一覧の画像と再出品用のCORS取得も成功'], pageErrors: errors, productionChanged: false }
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
