const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { chromium } = require('playwright')
const base = process.env.CATALOG_E2E_BASE_URL || 'http://localhost:5182'
if (!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname) || process.env.CATALOG_E2E_ALLOW_WRITES !== '1') throw new Error('Local disposable DB only')
const output = process.env.CATALOG_E2E_OUTPUT_DIR || path.resolve('test-results/catalog')
async function run() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const context = await browser.newContext(); const page = await context.newPage(); page.setDefaultTimeout(15000)
  const errors = [], checks = []; page.on('pageerror', e => errors.push(e.message))
  const suffix = randomBytes(5).toString('hex'), password = randomBytes(24).toString('base64url')
  const auth = who => ({ Authorization: `Bearer ${who.access_token}` })
  async function identity(name) {
    const email = `${name}-${suffix}@example.com`
    const r = await context.request.post(`${base}/api/auth/register`, { data: { email, password, display_name: name } }); assert.equal(r.status(), 201)
    return { ...await r.json(), email }
  }
  try {
    const seller = await identity('catalog-seller'), buyer = await identity('catalog-buyer'), items = []
    for (let i = 0; i < 25; i++) {
      const r = await context.request.post(`${base}/api/items`, { headers: auth(seller), data: { title: `状態確認-${suffix}-${i}`, description: '売却済みページを越えた表示確認。', category: 'その他', condition: '未使用に近い', price: 1000+i } }); assert.equal(r.status(), 201); items.push(await r.json())
    }
    for (const item of items.slice(1)) {
      const r = await context.request.post(`${base}/api/purchases`, { headers: auth(buyer), data: { item_id: item.id } }); assert.equal(r.status(), 201)
    }
    const q = `状態確認-${suffix}`
    const raw = await (await context.request.get(`${base}/api/items?q=${encodeURIComponent(q)}&limit=24`)).json()
    assert.equal(raw.items.length, 24); assert.ok(raw.items.every(i => i.status === 'sold')); assert.ok(raw.next_cursor)
    for (const query of [new URLSearchParams({ q }), new URLSearchParams({ q, category: 'その他' })]) {
      await page.goto(`${base}/#/?${query}`)
      await page.getByRole('link', { name: items[0].title, exact: true }).waitFor()
      assert.equal(await page.locator('.item-grid .ui-item-card').count(), 1)
      assert.equal(await page.getByRole('link', { name: items[24].title, exact: true }).count(), 0)
    }
    checks.push('実DBの最新24件が売却済みでも、次ページの販売中商品を検索・カテゴリ絞り込みで表示する')
    await page.goto(`${base}/#/items/${items[24].id}`)
    await page.getByText('この商品は売却済みです。', { exact: true }).waitFor()
    assert.equal((await context.request.get(`${base}/api/items/${items[24].id}`)).status(), 200)
    await page.goto(`${base}/#/mypage`)
    await page.getByLabel('メールアドレス', { exact: true }).fill(buyer.email)
    await page.getByLabel('パスワード', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ログインして続ける', exact: true }).click()
    await page.getByRole('heading', { name: 'マイページ', exact: true }).waitFor()
    assert.equal((await context.request.post(`${base}/api/likes/${items[24].id}`, { headers: auth(buyer) })).status(), 200)
    await page.reload(); await page.locator('.mypage-likes').getByRole('link', { name: items[24].title, exact: true }).waitFor()
    await page.goto(`${base}/#/purchases`); await page.getByRole('link', { name: items[24].title, exact: true }).waitFor()
    checks.push('売却済みでも詳細・本人の購入履歴・いいね一覧で引き続き確認できる')
    await page.goto(`${base}/#/?${new URLSearchParams({ q: items[24].title })}`)
    await page.getByText('条件に合う商品が見つかりませんでした。', { exact: true }).waitFor()
    assert.equal(await page.locator('.item-grid .ui-item-card').count(), 0)
    checks.push('売却済みだけが検索に一致する場合は空状態を表示する')
    let reads = 0
    const template = raw.items[0]
    await page.route('**/api/items?**', async route => {
      reads++
      await route.fulfill({ json: { items: [{ ...template, status: 'sold' }], next_cursor: 100000 - reads } })
    })
    await page.goto(`${base}/#/?q=bounded-sold-pages`)
    const more = page.getByRole('button', { name: 'もっと見る', exact: true })
    await more.waitFor(); await page.waitForFunction(() => document.querySelector('.item-grid')?.getAttribute('aria-busy') === 'false')
    assert.equal(reads, 6)
    assert.equal(await page.getByText('条件に合う商品が見つかりませんでした。', { exact: true }).count(), 0)
    await more.click(); await page.waitForFunction(() => document.querySelector('.item-grid')?.getAttribute('aria-busy') === 'false')
    assert.equal(reads, 12)
    await page.unroute('**/api/items?**')
    checks.push('売却済みページが続いても自動読取は有界で、続きがある間は空結果と断定せず追加読取できる')
    assert.deepEqual(errors, [])
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ checks, pageErrors: errors, productionChanged: false }, null, 2))
    console.log(JSON.stringify({ passed: checks.length, output }))
  } catch (e) { await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {}); throw e }
  finally { await browser.close() }
}
run().catch(e => { console.error(e); process.exitCode = 1 })
