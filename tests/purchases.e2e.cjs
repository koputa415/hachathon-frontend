const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { chromium } = require('playwright')

const base = process.env.PURCHASES_E2E_BASE_URL || 'http://localhost:5181'
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)
  || process.env.PURCHASES_E2E_ALLOW_WRITES !== '1') {
  throw new Error('Use a local frontend with disposable DB; set PURCHASES_E2E_ALLOW_WRITES=1')
}
const outputs = process.env.PURCHASES_E2E_OUTPUT_DIR || path.resolve('test-results/purchases')
const suffix = randomBytes(6).toString('hex')
const password = randomBytes(24).toString('base64url')
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFUlEQVR4nGPUCKhgYGBgYGBgYoABABDMAPTRO+Z7AAAAAElFTkSuQmCC', 'base64')

async function run() {
  await fs.mkdir(outputs, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const checks = []
  const errors = []
  const context = await browser.newContext({ viewport: { width: 1280, height: 950 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  let posts = 0
  let receiptReads = 0
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().endsWith('/api/purchases')) posts += 1
    if (request.method() === 'GET' && /\/api\/purchases\/\d+$/.test(request.url())) receiptReads += 1
  })
  const confirmTitle = target => target.getByRole('heading', { name: '購入内容の確認', exact: true })
  const completeTitle = target => target.getByRole('heading', { name: '購入が完了しました', exact: true })
  const submit = target => target.getByRole('button', { name: '購入を確定する', exact: true })
  const auth = who => ({ Authorization: `Bearer ${who.access_token}` })
  async function identity(name) {
    const email = `${name}-${suffix}@example.com`
    const response = await context.request.post(`${base}/api/auth/register`, { data: { email, display_name: name, password } })
    assert.equal(response.status(), 201)
    return { ...await response.json(), email }
  }
  async function item(who, name, price, withImage = false) {
    const fields = { title: `${name}-${suffix}`, description: 'ブラウザの購入フロー確認用です。', category: 'その他', condition: '未使用に近い', price }
    const response = withImage
      ? await context.request.post(`${base}/api/items/with-image`, { headers: auth(who), multipart: {
        item: JSON.stringify(fields), image: { name: 'item.png', mimeType: 'image/png', buffer: png },
      } })
      : await context.request.post(`${base}/api/items`, { headers: auth(who), data: fields })
    assert.equal(response.status(), 201)
    return response.json()
  }
  async function login(target, who) {
    await target.getByRole('heading', { name: 'ログイン', exact: true }).waitFor()
    await target.getByLabel('メールアドレス', { exact: true }).fill(who.email)
    await target.getByLabel('パスワード', { exact: true }).fill(password)
    await target.getByRole('button', { name: 'ログインして続ける', exact: true }).click()
  }
  try {
    const seller = await identity('seller')
    const buyer = await identity('buyer')
    const other = await identity('other-buyer')
    const normal = await item(seller, '画像付き購入確認', 12345, true)
    const racing = await item(seller, '競合確認', 2300)
    const ambiguous = await item(seller, '結果不明確認', 3400)
    const own = await item(buyer, '自分の出品', 1500)

    await page.goto(`${base}/#/purchases`)
    await login(page, buyer)
    await page.getByText('まだ購入した商品はありません。', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'ログアウト', exact: true }).click()
    await page.goto(`${base}/#/items/${normal.id}`)
    await page.getByRole('button', { name: '購入手続きへ', exact: true }).click()
    await login(page, buyer)
    await confirmTitle(page).waitFor()
    assert.equal(page.url(), `${base}/#/items/${normal.id}/purchase`)
    assert.equal(posts, 0)
    await page.getByText('実際の決済は行われません。', { exact: false }).waitFor()
    await page.goto(`${base}/#/items/${own.id}/purchase`)
    await page.getByText('自分が出品した商品は購入できません。', { exact: true }).waitFor()
    assert.equal(await submit(page).isDisabled(), true)
    await page.locator('form').evaluate(form => form.requestSubmit())
    assert.equal(posts, 0)
    await page.goto(`${base}/#/items/${normal.id}/purchase`)
    await submit(page).waitFor()
    await page.setViewportSize({ width: 375, height: 812 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: path.join(outputs, 'purchase-confirm-mobile.png'), fullPage: true })
    await page.setViewportSize({ width: 1280, height: 950 })
    checks.push('未ログインはログインへ誘導し、ログイン後に購入確認へ戻る。自己購入は送信できない')

    await page.route('**/api/purchases', async route => {
      if (route.request().method() === 'POST') await new Promise(resolve => setTimeout(resolve, 300))
      await route.continue()
    })
    const createdResponse = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/api/purchases') && response.status() === 201)
    await submit(page).click()
    await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit() })
    const receipt = await (await createdResponse).json()
    await completeTitle(page).waitFor()
    assert.equal(posts, 1)
    assert.equal(page.url(), `${base}/#/purchases/${receipt.id}`)
    await page.getByText('売却済み', { exact: true }).waitFor()
    await page.getByText('購入記録を保存しました。実際の決済は行われていません。', { exact: true }).waitFor()
    assert.equal(await page.getByText(/^[¥￥]12,345$/).count(), 1)
    const readsBefore = receiptReads
    await page.reload()
    await completeTitle(page).waitFor()
    assert.ok(receiptReads > readsBefore)
    assert.equal(posts, 1)
    await page.screenshot({ path: path.join(outputs, 'purchase-complete-desktop.png'), fullPage: true })
    await page.unroute('**/api/purchases')
    await page.getByRole('link', { name: '購入履歴を見る', exact: true }).click()
    await page.getByRole('link', { name: normal.title, exact: true }).waitFor()
    await page.reload()
    await page.getByRole('link', { name: normal.title, exact: true }).waitFor()
    await page.getByRole('link', { name: normal.title, exact: true }).click()
    await page.getByText('この商品は売却済みです。', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '購入手続きへ', exact: true }).count(), 0)
    await page.goto(`${base}/#/`)
    const soldCard = page.locator('.ui-item-card').filter({ has: page.getByRole('link', { name: normal.title, exact: true }) })
    await soldCard.getByText('売却済み', { exact: true }).waitFor()
    checks.push('実APIで購入し、重複送信は1回に抑止。完了と履歴は再読み込みでも残り、一覧と詳細が売却済みになる')

    const otherContext = await browser.newContext()
    const contender = await otherContext.newPage()
    contender.setDefaultTimeout(15000)
    contender.on('pageerror', error => errors.push(error.message))
    await contender.goto(`${base}/#/purchases/${receipt.id}`)
    await login(contender, other)
    await contender.getByRole('alert').filter({ hasText: '購入記録が見つかりません' }).waitFor()
    assert.equal(await completeTitle(contender).count(), 0)
    await contender.goto(`${base}/#/purchases`)
    await contender.getByText('まだ購入した商品はありません。', { exact: true }).waitFor()
    await contender.goto(`${base}/#/items/${normal.id}/purchase`)
    await contender.getByText('この商品は売却済みのため購入できません。', { exact: true }).waitFor()
    assert.equal(await submit(contender).isDisabled(), true)
    checks.push('他人の購入結果は404となり履歴に出ない。売却済み商品の直接URLからも再購入できない')

    await page.goto(`${base}/#/items/${racing.id}/purchase`)
    await submit(page).waitFor()
    await contender.goto(`${base}/#/items/${racing.id}/purchase`)
    await submit(contender).click()
    await completeTitle(contender).waitFor()
    await submit(page).click()
    await page.getByRole('alert').filter({ hasText: 'この商品は売却済みです' }).waitFor()
    await page.getByText('この商品は売却済みのため購入できません。', { exact: true }).waitFor()
    assert.equal(await completeTitle(page).count(), 0)
    assert.equal(await submit(page).isDisabled(), true)
    await otherContext.close()
    checks.push('確認後に別の購入者が買った場合は実APIの409を表示し、購入成功に見せない')

    await page.goto(`${base}/#/items/${ambiguous.id}/purchase`)
    await submit(page).waitFor()
    await page.route('**/api/purchases', route => route.request().method() === 'POST'
      ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }) : route.continue())
    await submit(page).click()
    await page.getByRole('alert').filter({ hasText: '購入結果を確認できませんでした' }).waitFor()
    assert.equal(await completeTitle(page).count(), 0)
    assert.equal(await submit(page).isDisabled(), true)
    await page.unroute('**/api/purchases')
    await page.getByRole('button', { name: '商品を再確認', exact: true }).click()
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === '購入を確定する' && !button.disabled))
    await page.route('**/api/purchases', async route => {
      if (route.request().method() !== 'POST') return route.continue()
      const saved = await route.fetch()
      assert.equal(saved.status(), 201)
      await route.abort('failed')
    })
    const beforeLostResponse = posts
    await submit(page).click()
    await page.getByRole('alert').filter({ hasText: '購入結果を確認できませんでした' }).waitFor()
    assert.equal(await completeTitle(page).count(), 0)
    assert.equal(posts, beforeLostResponse + 1)
    await page.unroute('**/api/purchases')
    await page.getByRole('link', { name: '購入履歴を確認する', exact: true }).click()
    await page.getByRole('link', { name: ambiguous.title, exact: true }).waitFor()
    await page.reload()
    await page.getByRole('link', { name: ambiguous.title, exact: true }).waitFor()
    checks.push('サーバー障害と確定後の応答消失を成功扱いせず、自動再送せず、実際の購入履歴で結果を確認できる')

    for (let index = 0; index < 25; index++) {
      const extra = await item(seller, `履歴ページ確認${index}`, 500 + index)
      const response = await context.request.post(`${base}/api/purchases`, { headers: auth(buyer), data: { item_id: extra.id } })
      assert.equal(response.status(), 201)
    }
    await page.reload()
    await page.getByRole('button', { name: 'もっと見る', exact: true }).waitFor()
    assert.equal(await page.locator('.ui-item-card').count(), 24)
    await page.getByRole('button', { name: 'もっと見る', exact: true }).click()
    await page.getByRole('link', { name: normal.title, exact: true }).waitFor()
    assert.equal(await page.locator('.ui-item-card').count(), 27)
    const links = await page.locator('.ui-item-card__title a').evaluateAll(elements => elements.map(element => element.href))
    assert.equal(new Set(links).size, 27)
    assert.equal(await page.getByRole('link', { name: racing.title, exact: true }).count(), 0)
    await page.setViewportSize({ width: 375, height: 812 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: path.join(outputs, 'purchase-history-mobile.png'), fullPage: true })
    checks.push('購入履歴を追加取得でき、重複や他人の購入を混ぜず、375pxでも横スクロールがない')

    const historyPattern = '**/api/purchases?*'
    await page.route(historyPattern, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await page.reload()
    await page.getByRole('alert').filter({ hasText: '購入記録を取得できませんでした' }).waitFor()
    assert.equal(await page.locator('.ui-item-card').count(), 0)
    await page.unroute(historyPattern)
    await page.getByRole('button', { name: '再試行', exact: true }).click()
    await page.getByRole('button', { name: 'もっと見る', exact: true }).waitFor()
    const receiptPattern = `**/api/purchases/${receipt.id}`
    await page.route(receiptPattern, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await page.goto(`${base}/#/purchases/${receipt.id}`)
    await page.getByRole('alert').filter({ hasText: '購入記録を取得できませんでした' }).waitFor()
    assert.equal(await completeTitle(page).count(), 0)
    await page.unroute(receiptPattern)
    await page.getByRole('button', { name: '再試行', exact: true }).click()
    await completeTitle(page).waitFor()
    await page.goto(`${base}/#/purchases/999999999`)
    await page.getByRole('alert').filter({ hasText: '購入記録が見つかりません' }).waitFor()
    assert.equal(await completeTitle(page).count(), 0)
    checks.push('履歴・完了の通信失敗は再試行でき、架空の購入番号では完了を表示しない')
    await page.route(historyPattern, route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }))
    await page.goto(`${base}/#/purchases`)
    await page.getByRole('heading', { name: 'ログイン', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => sessionStorage.getItem('hackathon.auth.session')), null)
    await page.unroute(historyPattern)
    checks.push('履歴APIの401でログイン状態を破棄し、ログインへ戻す')
    assert.deepEqual(errors, [])
    const result = { passed: true, purchaseId: receipt.id, itemId: normal.id, checks, runtimeErrors: errors,
      backend: 'Real local FastAPI / PostgreSQL / GCS emulator; fault cases only are intercepted' }
    await fs.writeFile(path.join(outputs, 'purchases-verification.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result, null, 2))
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
