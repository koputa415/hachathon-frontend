const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { chromium } = require('playwright')
const base = process.env.HOME_E2E_BASE_URL || 'http://localhost:5182'
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname) || process.env.HOME_E2E_ALLOW_WRITES !== '1') throw new Error('Use a local disposable DB with HOME_E2E_ALLOW_WRITES=1')
const output = process.env.HOME_E2E_OUTPUT_DIR || path.resolve('test-results/home')
const categories = ['楽器', 'カメラ', 'アウトドア', 'スポーツ', 'クラフト']
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFUlEQVR4nGPUCKhgYGBgYGBgYoABABDMAPTRO+Z7AAAAAElFTkSuQmCC', 'base64')

async function run() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const suffix = randomBytes(5).toString('hex')
  const password = randomBytes(24).toString('base64url')
  const errors = [], checks = []
  page.on('pageerror', error => errors.push(error.message))
  const headers = who => ({ Authorization: `Bearer ${who.access_token}` })
  async function identity(name) {
    const email = `${name}-${suffix}@example.com`
    const response = await context.request.post(`${base}/api/auth/register`, { data: { email, display_name: '表示確認用ユーザー', password } })
    assert.equal(response.status(), 201)
    return { ...await response.json(), email }
  }
  async function item(who, category) {
    const response = await context.request.post(`${base}/api/items/with-image`, { headers: headers(who), multipart: {
      item: JSON.stringify({ title: `${category}を気軽に始める道具セット-${suffix}`, description: '画面とAPIの接続を確認するための検証データです。', category, condition: '未使用に近い', price: 12345 }),
      image: { name: 'fixture.png', mimeType: 'image/png', buffer: png },
    } })
    assert.equal(response.status(), 201)
    return response.json()
  }
  try {
    const user = await identity('home-ui'), seller = await identity('home-seller')
    await item(user, 'アウトドア')
    for (const category of [...categories, 'その他']) await item(seller, category)
    const response = await context.request.get(`${base}/api/recommendations`, { headers: headers(user) })
    assert.equal(response.status(), 200)
    const expected = (await response.json()).recommendation
    assert.ok(expected && expected.item.image_path)
    assert.equal(expected.source_cluster, 'アウトドア')
    assert.ok(categories.includes(expected.target_cluster))
    await page.goto(`${base}/#/login`)
    await page.getByLabel('メールアドレス', { exact: true }).fill(user.email)
    await page.getByLabel('パスワード', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ログインして続ける', exact: true }).click()
    const discovery = page.locator('.discovery-feature')
    await discovery.getByText(expected.item.title, { exact: true }).waitFor()
    await discovery.getByText(expected.reason_chip, { exact: true }).waitFor()
    await discovery.locator('img').evaluate(image => image.decode())
    const appearance = await discovery.evaluate(element => {
      const style = selector => getComputedStyle(element.querySelector(selector))
      return { line: getComputedStyle(element).borderTopColor, chip: style('.discovery-feature__chip').backgroundColor,
        cta: style('.discovery-feature__cta').backgroundColor, price: style('.discovery-feature__price').color,
        chipText: style('.discovery-feature__chip').color }
    })
    assert.equal(appearance.line, appearance.chip)
    assert.equal(appearance.cta, appearance.chip)
    assert.notEqual(appearance.price, appearance.chip)
    assert.notEqual(appearance.chipText, appearance.chip)
    checks.push('実際の出品・本人履歴からの推薦に商品名・画像・理由チップ・価格が表示され、コーラルを限定して使用する')
    const chips = page.getByRole('navigation', { name: '5つの趣味からさがす', exact: true })
    assert.deepEqual((await chips.getByRole('link').allTextContents()).sort(), [...categories].sort())
    let recommendations = 0
    page.on('request', request => { if (request.url().endsWith('/api/recommendations')) recommendations += 1 })
    await chips.getByRole('link', { name: 'カメラ', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('#items-category')?.value === 'カメラ')
    await page.waitForFunction(() => document.querySelector('.item-grid[aria-busy="false"] .ui-item-card'))
    assert.equal(await chips.getByRole('link', { name: 'カメラ', exact: true }).getAttribute('aria-current'), 'page')
    assert.ok((await page.locator('.item-grid .ui-item-card').allTextContents()).every(text => text.includes('カメラ')))
    await discovery.getByText(expected.item.title, { exact: true }).waitFor()
    assert.equal(recommendations, 0)
    await page.goBack()
    await page.waitForFunction(() => document.querySelector('#items-category')?.value === '')
    checks.push('5趣味チップでURL・選択状態・DB一覧が同期し、戻る操作も反映。絞り込みで本人の推薦を再取得しない')
    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 })
      await discovery.getByText(expected.item.title, { exact: true }).waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      const cta = discovery.getByRole('button', { name: 'この道具を見てみる', exact: true })
      await cta.scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(output, `home-connected-${width}.png`), fullPage: true })
      await page.screenshot({ path: path.join(output, `home-connected-${width}-viewport.png`) })
    }
    checks.push('1280・768・390・320pxで実データ入りの目玉カードと趣味チップに横はみ出しがない')
    await page.setViewportSize({ width: 1280, height: 1000 })
    await discovery.getByRole('button', { name: 'この道具を見てみる', exact: true }).click()
    await page.waitForURL(`${base}/#/items/${expected.item.id}`)
    await page.getByRole('heading', { name: expected.item.title, exact: true }).waitFor()
    await page.reload()
    await page.getByRole('heading', { name: expected.item.title, exact: true }).waitFor()
    assert.deepEqual(errors, [])
    checks.push('目玉カードから取得した実商品詳細を開け、再読み込み後も表示。ブラウザ例外なし')
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ checks, appearance, pageErrors: errors, mockedRecommendations: false, productionChanged: false }, null, 2))
    console.log(JSON.stringify({ passed: checks.length, output }))
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {})
    throw error
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
