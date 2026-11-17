const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { deflateSync } = require('node:zlib')
const { chromium, webkit } = require('playwright')
const base = process.env.LIGHTBOX_E2E_BASE_URL || 'http://localhost:5182'
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname) || process.env.LIGHTBOX_E2E_ALLOW_WRITES !== '1') throw new Error('Local disposable DB only')
const output = process.env.LIGHTBOX_E2E_OUTPUT_DIR || path.resolve('test-results/lightbox')
const engine = process.env.PLAYWRIGHT_BROWSER === 'webkit' ? 'webkit' : 'chromium'
function picture() {
  const width = 1200, height = 900, raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = y * (width * 3 + 1) + 1 + x * 3
    raw[offset] = Math.round(x / width * 210); raw[offset + 1] = Math.round(y / height * 190); raw[offset + 2] = 120
  }
  function chunk(type, data) {
    const bytes = Buffer.concat([Buffer.from(type), data]); let crc = 0xffffffff
    for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0) }
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
    const check = Buffer.alloc(4); check.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
    return Buffer.concat([length, bytes, check])
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
async function run() {
  await fs.mkdir(output, { recursive: true })
  const browser = await (engine === 'webkit' ? webkit : chromium).launch({ headless: true, ...(engine === 'chromium' ? { channel: process.env.PLAYWRIGHT_CHANNEL || undefined } : {}) })
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, hasTouch: true })
  const page = await context.newPage(); page.setDefaultTimeout(15000)
  const errors = [], checks = []; page.on('pageerror', e => errors.push(e.message))
  const title = `拡大表示の実画像-${randomBytes(5).toString('hex')}`
  try {
    const whoResponse = await context.request.post(`${base}/api/auth/register`, { data: { email: `lightbox-${randomBytes(6).toString('hex')}@example.com`, display_name: '拡大表示確認', password: randomBytes(24).toString('base64url') } })
    assert.equal(whoResponse.status(), 201); const who = await whoResponse.json()
    const response = await context.request.post(`${base}/api/items/with-image`, { headers: { Authorization: `Bearer ${who.access_token}` }, multipart: {
      item: JSON.stringify({ title, description: '画像拡大の検証用です。', category: 'その他', condition: '未使用に近い', price: 2400 }), image: { name: 'large.png', mimeType: 'image/png', buffer: picture() },
    } })
    assert.equal(response.status(), 201); const item = await response.json()
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 960 })
      await page.goto(`${base}/#/items/${item.id}`)
      const trigger = page.getByRole('button', { name: '写真を拡大表示', exact: true })
      const dialog = page.getByRole('dialog', { name: `${title}の写真を拡大表示`, exact: true })
      async function open() {
        await trigger.scrollIntoViewIfNeeded(); await trigger.click(); await dialog.waitFor()
        await dialog.locator('img').evaluate(img => img.decode())
        assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden')
        const image = await dialog.locator('img').boundingBox()
        assert.ok(image.width <= width && image.height <= (width === 375 ? 812 : 960))
        assert.equal(await dialog.locator('img').evaluate(img => img.naturalWidth), 1200)
      }
      async function closed() {
        await dialog.waitFor({ state: 'detached' })
        await page.waitForFunction(() => document.body.style.overflow !== 'hidden')
        assert.equal(await trigger.evaluate(el => document.activeElement === el), true)
      }
      await open()
      await dialog.locator('img').click(); assert.equal(await dialog.isVisible(), true)
      await page.screenshot({ path: path.join(output, `${engine}-${width}-open.png`) })
      await page.keyboard.press('Tab'); assert.equal(await dialog.getByRole('button', { name: '閉じる', exact: true }).evaluate(el => document.activeElement === el), true)
      await dialog.getByRole('button', { name: '閉じる', exact: true }).click(); await closed()
      await open(); await page.mouse.click(4, 4); await closed()
      await open(); await page.keyboard.press('Escape'); await closed()
      await trigger.focus(); await page.keyboard.press('Enter'); await dialog.waitFor()
      await page.goto(`${base}/#/`); await dialog.waitFor({ state: 'detached' })
      await page.waitForFunction(() => document.body.style.overflow !== 'hidden')
      checks.push(`${width}px：実画像・閉じる・背景・Esc・画像内クリック・フォーカス復帰・ページ移動後のスクロール復帰`)
    }
    assert.deepEqual(errors, [])
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ checks, engine, pageErrors: errors, physicalIOSDevice: false }, null, 2))
    console.log(JSON.stringify({ passed: checks.length, engine, output }))
  } catch (error) { await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); throw error }
  finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
