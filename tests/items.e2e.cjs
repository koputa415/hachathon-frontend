const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { chromium } = require('playwright')

const base = process.env.ITEMS_E2E_BASE_URL || 'http://localhost:5181'
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname) || process.env.ITEMS_E2E_ALLOW_WRITES !== '1') {
  throw new Error('Use a local frontend with disposable DB and GCS emulator; set ITEMS_E2E_ALLOW_WRITES=1')
}
const outputs = process.env.ITEMS_E2E_OUTPUT_DIR || path.resolve('test-results/items')
const suffix = randomBytes(6).toString('hex')
const email = `items-${suffix}@example.com`
const password = randomBytes(24).toString('base64url')
const title = `一覧詳細確認-${suffix}`
const description = 'ブラウザから出品した商品です。\n再読み込み後もこの説明を表示します。'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFUlEQVR4nGPUCKhgYGBgYGBgYoABABDMAPTRO+Z7AAAAAElFTkSuQmCC', 'base64')

async function run() {
  await fs.mkdir(outputs, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const checks = []
  const errors = []
  const reads = []
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const seedResponse = await context.request.post(`${base}/api/auth/register`, { data: { email: `seed-${suffix}@example.com`, display_name: 'ページ確認', password } })
    assert.equal(seedResponse.status(), 201)
    const seed = await seedResponse.json()
    for (let i = 0; i < 25; i++) {
      const response = await context.request.post(`${base}/api/items`, { data: {
        title: `追加読込用-${suffix}-${i}`, description: 'ページング確認用の出品', category: 'クラフト', condition: '未使用に近い', price: 100 + i,
      }, headers: { Authorization: `Bearer ${seed.access_token}` } })
      assert.equal(response.status(), 201)
    }
    const page = await context.newPage()
    page.setDefaultTimeout(12000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      if (request.method() === 'GET' && /\/api\/items(?:\?|\/\d+$)/.test(request.url())) reads.push({ url: request.url(), authorization: request.headers().authorization })
    })
    await page.goto(`${base}/#/listing`)
    await page.getByRole('button', { name: '新規登録に切り替える' }).click()
    await page.getByLabel('表示名', { exact: true }).fill('一覧詳細確認')
    await page.getByLabel('メールアドレス', { exact: true }).fill(email)
    await page.getByLabel('パスワード（8〜128文字）', { exact: true }).fill(password)
    await page.getByRole('button', { name: '登録して続ける', exact: true }).click()
    await page.getByRole('heading', { name: '道具を出品する', exact: true }).waitFor()
    await page.getByLabel('商品名', { exact: true }).fill(title)
    await page.getByLabel('商品の説明', { exact: true }).fill(description)
    await page.getByLabel('カテゴリ（趣味）', { exact: true }).selectOption('カメラ')
    await page.getByLabel('商品の状態', { exact: true }).selectOption('目立った傷や汚れなし')
    await page.getByLabel('価格（円）', { exact: true }).fill('12345')
    await page.getByLabel('商品画像', { exact: true }).setInputFiles({ name: 'camera.png', mimeType: 'image/png', buffer: png })
    const createdPromise = page.waitForResponse(response => response.url().endsWith('/items/with-image') && response.status() === 201)
    await page.locator('form').getByRole('button', { name: '出品する', exact: true }).click()
    const created = await (await createdPromise).json()
    await page.getByRole('heading', { name: '出品が完了しました', exact: true }).waitFor()
    await page.getByRole('link', { name: 'ホームに戻る', exact: true }).click()
    await page.getByRole('link', { name: title, exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: `追加読込用-${suffix}-0`, exact: true }).count(), 0)
    assert.equal(await page.getByText(/^[¥￥]12,345$/).count(), 1)
    await page.getByRole('button', { name: 'もっと見る', exact: true }).click()
    await page.getByRole('link', { name: `追加読込用-${suffix}-0`, exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: title, exact: true }).count(), 1)
    checks.push('ブラウザから出品した商品が実APIの一覧に表示され、追加読み込みでも重複しない')
    await page.getByRole('link', { name: title, exact: true }).click()
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
    await page.getByText(description, { exact: true }).waitFor()
    assert.equal(page.url(), `${base}/#/items/${created.id}`)
    await page.getByAltText(title, { exact: true }).scrollIntoViewIfNeeded()
    await page.waitForFunction(title => [...document.images].some(image => image.alt === title && image.complete && image.naturalWidth === 3), title)
    const detailReads = () => reads.filter(request => request.url.endsWith(`/items/${created.id}`)).length
    const beforeReload = detailReads()
    await page.reload()
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
    await page.getByText(description, { exact: true }).waitFor()
    assert.ok(detailReads() > beforeReload)
    checks.push('一覧から実商品の詳細を開き、再読み込み時もGETでDBの内容を再取得する')
    await page.setViewportSize({ width: 375, height: 812 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: path.join(outputs, 'item-detail-mobile.png'), fullPage: true })
    const anonymous = await browser.newContext()
    const guest = await anonymous.newPage()
    await guest.goto(`${base}/#/items/${created.id}`)
    await guest.getByRole('heading', { name: title, exact: true }).waitFor()
    await guest.getByRole('button', { name: '購入手続きへ', exact: true }).click()
    await guest.getByRole('heading', { name: 'ログイン', exact: true }).waitFor()
    await anonymous.close()
    assert.ok(reads.length > 0 && reads.every(request => request.authorization === undefined))
    checks.push('未ログインでも詳細を閲覧でき、購入入口はログインへ誘導する')

    const detailPattern = `**/api/items/${created.id}`
    await page.route(detailPattern, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await page.reload()
    await page.getByRole('alert').filter({ hasText: '商品を取得できませんでした' }).waitFor()
    assert.equal(await page.getByRole('heading', { name: title, exact: true }).count(), 0)
    await page.unroute(detailPattern)
    await page.getByRole('button', { name: '再試行', exact: true }).click()
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
    await page.goto(`${base}/#/items/999999999`)
    await page.getByRole('heading', { name: '商品が見つかりません', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '購入手続きへ', exact: true }).count(), 0)
    checks.push('詳細の取得失敗は再試行でき、存在しないIDでは購入ボタンを表示しない')

    const listPattern = '**/api/items?*'
    await page.route(listPattern, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"items":[],"next_cursor":null}' }))
    await page.goto(`${base}/#/`)
    await page.getByText('まだ商品が出品されていません。', { exact: true }).waitFor()
    assert.equal(await page.locator('.ui-item-card').count(), 0)
    await page.unroute(listPattern)
    await page.route(listPattern, route => route.abort('failed'))
    await page.reload()
    await page.getByRole('alert').filter({ hasText: '接続できませんでした' }).waitFor()
    assert.equal(await page.locator('.ui-item-card').count(), 0)
    await page.unroute(listPattern)
    await page.route(listPattern, async route => { await new Promise(resolve => setTimeout(resolve, 250)); await route.continue() })
    await page.getByRole('button', { name: '再試行', exact: true }).click()
    await page.getByRole('status').filter({ hasText: '商品を読み込んでいます' }).waitFor()
    await page.getByRole('link', { name: title, exact: true }).waitFor()
    await page.unroute(listPattern)
    checks.push('空の一覧・通信失敗・読み込み中を表示し、固定商品に置き換えず再試行で復帰する')
    assert.equal(await page.getByText('はじめてのフィルムカメラ', { exact: true }).count(), 0)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.screenshot({ path: path.join(outputs, 'items-home-desktop.png'), fullPage: true })
    assert.deepEqual(errors, [])
    const result = { passed: true, itemId: created.id, title, checks, itemReadRequests: reads.length, runtimeErrors: errors,
      backend: 'Real local FastAPI / PostgreSQL / GCS-compatible emulator; only empty and failure states are intercepted' }
    await fs.writeFile(path.join(outputs, 'items-verification.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result, null, 2))
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
