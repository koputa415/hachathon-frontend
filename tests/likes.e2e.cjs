const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { chromium } = require('playwright')

const base = process.env.LIKES_E2E_BASE_URL || 'http://localhost:5181'
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)
  || process.env.LIKES_E2E_ALLOW_WRITES !== '1') throw new Error('Use a local disposable DB; set LIKES_E2E_ALLOW_WRITES=1')
const output = process.env.LIKES_E2E_OUTPUT_DIR || path.resolve('test-results/likes')
const suffix = randomBytes(6).toString('hex')
const password = randomBytes(24).toString('base64url')
const checks = []

async function run() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const context = await browser.newContext({ viewport: { width: 1280, height: 950 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.setDefaultTimeout(15000)
  const auth = who => ({ Authorization: `Bearer ${who.access_token}` })
  const card = (target, item) => target.locator('.ui-item-card').filter({ has: target.getByRole('link', { name: item.title, exact: true }) })
  const button = (target, item) => target.getByRole('button', { name: new RegExp(`^${item.title}をいいね`) })
  async function state(target, item, count, liked) {
    await target.getByRole('button', { name: `${item.title}を${liked ? 'いいね解除' : 'いいね'}（${count}件）`, exact: true }).waitFor()
    await button(target, item).evaluate((element, pressed) => {
      if (element.getAttribute('aria-pressed') !== String(pressed)) throw new Error('Wrong pressed state')
    }, liked)
  }
  async function identity(name) {
    const email = `${name}-${suffix}@example.com`
    const response = await context.request.post(`${base}/api/auth/register`, { data: { email, password, display_name: name } })
    assert.equal(response.status(), 201)
    return { ...await response.json(), email }
  }
  async function item(who, index) {
    const response = await context.request.post(`${base}/api/items`, { headers: auth(who), data: {
      title: `いいね確認${index}-${suffix}`, description: 'いいねのブラウザ確認用です。', category: 'その他', condition: '未使用に近い', price: 2000 + index,
    } })
    assert.equal(response.status(), 201)
    return response.json()
  }
  async function login(target, who) {
    await target.getByRole('heading', { name: 'ログイン', exact: true }).waitFor()
    await target.getByLabel('メールアドレス', { exact: true }).fill(who.email)
    await target.getByLabel('パスワード', { exact: true }).fill(password)
    await target.getByRole('button', { name: 'ログインして続ける', exact: true }).click()
  }
  async function likedItems(who) {
    const response = await context.request.get(`${base}/api/likes`, { headers: auth(who) })
    assert.equal(response.status(), 200)
    return (await response.json()).likes
  }
  try {
    const seller = await identity('likes-seller')
    const first = await identity('likes-first')
    const second = await identity('likes-second')
    const normal = await item(seller, 1)
    const delayed = await item(seller, 2)
    await page.goto(`${base}/#/`)
    await state(page, normal, 0, false)
    await card(page, normal).getByRole('button').click()
    await login(page, first)
    await state(page, normal, 0, false)
    assert.equal(page.url(), `${base}/#/items/${normal.id}`)
    assert.equal((await likedItems(first)).length, 0)
    await page.getByRole('button', { name: 'ログアウト', exact: true }).click()
    await page.goto(`${base}/#/mypage`)
    await login(page, first)
    await page.getByText('まだいいねした商品はありません。', { exact: true }).waitFor()
    assert.equal(page.url(), `${base}/#/mypage`)
    checks.push('ゲストのいいね・マイページはログインへ誘導し、戻り先を保持。ログインだけでは登録しない')

    await page.goto(`${base}/#/`)
    await state(page, normal, 0, false)
    let writes = 0
    page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith(`/api/likes/${normal.id}`)) writes += 1 })
    await page.route(`**/api/likes/${normal.id}`, async route => {
      if (route.request().method() === 'POST') await new Promise(resolve => setTimeout(resolve, 250))
      await route.continue()
    })
    await button(page, normal).click()
    assert.equal(await button(page, normal).isDisabled(), true)
    await button(page, normal).evaluate(element => { element.click(); element.click() })
    await state(page, normal, 1, true)
    assert.equal(writes, 1)
    await page.unroute(`**/api/likes/${normal.id}`)
    await card(page, normal).getByRole('link', { name: normal.title, exact: true }).click()
    await state(page, normal, 1, true)
    await page.reload()
    await state(page, normal, 1, true)
    await page.goto(`${base}/#/mypage`)
    await state(page, normal, 1, true)
    await page.screenshot({ path: path.join(output, 'likes-mypage-desktop.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: path.join(output, 'likes-mypage-mobile.png'), fullPage: true })
    await page.setViewportSize({ width: 1280, height: 950 })
    checks.push('一覧で登録し、詳細・再読み込み・マイページで件数と本人の状態を実APIから表示。連打は1送信。スマートフォンで横はみ出しなし')

    const otherContext = await browser.newContext()
    const otherPage = await otherContext.newPage()
    otherPage.setDefaultTimeout(15000)
    await otherPage.goto(`${base}/#/mypage`)
    await login(otherPage, second)
    await otherPage.getByText('まだいいねした商品はありません。', { exact: true }).waitFor()
    await otherPage.goto(`${base}/#/items/${normal.id}`)
    await state(otherPage, normal, 1, false)
    await button(otherPage, normal).click()
    await state(otherPage, normal, 2, true)
    await page.reload()
    await state(page, normal, 2, true)
    await button(page, normal).click()
    await page.getByText('まだいいねした商品はありません。', { exact: true }).waitFor()
    assert.equal((await likedItems(first)).length, 0)
    assert.equal((await likedItems(second)).length, 1)
    await page.goto(`${base}/#/items/${normal.id}`)
    await state(page, normal, 1, false)
    await otherContext.close()
    checks.push('複数ユーザーの件数を集計し、一覧と解除は本人分だけに限定。他人のいいねを残してマイページから消える')

    await page.route(`**/api/likes/${normal.id}`, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await button(page, normal).click()
    await page.getByText('いいねの結果を確認できませんでした。いいね情報を再取得してください。', { exact: true }).waitFor()
    await state(page, normal, 1, false)
    assert.equal((await likedItems(first)).length, 0)
    await page.unroute(`**/api/likes/${normal.id}`)
    await page.getByRole('button', { name: 'いいね情報を再取得', exact: true }).click()
    await button(page, normal).click()
    await state(page, normal, 2, true)
    // The server commits but the response is lost: refresh reads the DB, without retrying a write.
    await page.route(`**/api/likes/${normal.id}`, async route => {
      await route.fetch()
      await route.abort('failed')
    })
    await button(page, normal).click()
    await page.getByText('接続できませんでした。通信環境を確認して、もう一度お試しください。', { exact: true }).waitFor()
    await state(page, normal, 1, false)
    await page.unroute(`**/api/likes/${normal.id}`)
    await page.getByRole('button', { name: 'いいね情報を再取得', exact: true }).click()
    checks.push('送信失敗を理由付きで表示し、成功に見せない。結果不明でも読取でDBへ同期し、自動で再送しない')

    await page.route('**/api/likes/status?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await page.reload()
    await page.getByRole('heading', { name: normal.title, exact: true }).waitFor()
    await page.getByText('いいね情報を取得できませんでした。時間をおいてお試しください。', { exact: true }).waitFor()
    assert.equal(await button(page, normal).isDisabled(), true)
    await page.unroute('**/api/likes/status?**')
    await page.getByRole('button', { name: 'いいね情報を再取得', exact: true }).click()
    await state(page, normal, 1, false)
    checks.push('いいね読取失敗でも商品は閲覧でき、未確認のボタンを無効化し再取得で復帰')

    await page.goto(`${base}/#/items/${delayed.id}`)
    await state(page, delayed, 0, false)
    let release
    const wait = new Promise(resolve => { release = resolve })
    await page.route(`**/api/likes/${delayed.id}`, async route => { await wait; await route.continue() })
    const submitted = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith(`/api/likes/${delayed.id}`))
    await button(page, delayed).click()
    await submitted
    await page.getByRole('link', { name: 'ホーム', exact: true }).click()
    await state(page, delayed, 0, false)
    release()
    await state(page, delayed, 1, true)
    await page.unroute(`**/api/likes/${delayed.id}`)
    checks.push('登録中に画面を移動しても、完了後の画面でDBの状態に更新する')

    for (let index = 3; index <= 27; index += 1) {
      const next = await item(seller, index)
      const response = await context.request.post(`${base}/api/likes/${next.id}`, { headers: auth(first) })
      assert.equal(response.status(), 200)
    }
    await page.route('**/api/likes?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await page.goto(`${base}/#/mypage`)
    await page.getByRole('alert').waitFor()
    await page.unroute('**/api/likes?**')
    await page.getByRole('button', { name: '再試行', exact: true }).click()
    await page.locator('.ui-item-card').nth(23).waitFor()
    assert.equal(await page.locator('.ui-item-card').count(), 24)
    await page.getByRole('button', { name: 'もっと見る', exact: true }).click()
    await page.locator('.ui-item-card').nth(25).waitFor()
    assert.equal(await page.locator('.ui-item-card').count(), 26)
    assert.equal(await page.getByRole('button', { name: 'もっと見る', exact: true }).count(), 0)
    await page.reload()
    await page.locator('.ui-item-card').nth(23).waitFor()
    assert.equal(await page.locator('.ui-item-card').count(), 24)
    checks.push('マイページの通信失敗から再試行し、24件ずつの追加読取と再読み込みを実DBで確認')

    await page.getByRole('button', { name: 'ログアウト', exact: true }).click()
    await page.goto(`${base}/#/mypage`)
    await login(page, second)
    await state(page, normal, 1, true)
    assert.equal(await page.locator('.ui-item-card').count(), 1)
    await page.getByRole('button', { name: 'ログアウト', exact: true }).click()
    await page.goto(`${base}/#/items/${normal.id}`)
    await state(page, normal, 1, false)
    assert.deepEqual(errors, [])
    checks.push('同じブラウザでログアウト・別ユーザーへ切り替えても、前のユーザーのいいね一覧や状態を引き継がない')
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ passed: checks, pageErrors: errors, productionChanged: false }, null, 2))
    console.log(JSON.stringify({ passed: checks.length, pageErrors: errors.length, output }))
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {})
    throw error
  } finally {
    await browser.close()
  }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
