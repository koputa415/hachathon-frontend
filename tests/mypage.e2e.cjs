const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { chromium } = require('playwright')
const base = process.env.MYPAGE_E2E_BASE_URL || 'http://localhost:5182'
if (!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname) || process.env.MYPAGE_E2E_ALLOW_WRITES !== '1') throw new Error('Local disposable DB only')
const output = process.env.MYPAGE_E2E_OUTPUT_DIR || path.resolve('test-results/mypage')
async function run() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await context.newPage(); page.setDefaultTimeout(20000)
  const errors = [], checks = []; page.on('pageerror', e => errors.push(e.message))
  const suffix = randomBytes(5).toString('hex'), password = randomBytes(24).toString('base64url')
  const auth = who => ({ Authorization: `Bearer ${who.access_token}` })
  async function identity(name) {
    const email = `mypage-${randomBytes(4).toString('hex')}-${suffix}@example.com`
    const r = await context.request.post(`${base}/api/auth/register`, { data: { email, password, display_name: name } }); assert.equal(r.status(), 201)
    return { ...await r.json(), email }
  }
  async function create(who, index, category) {
    const r = await context.request.post(`${base}/api/items`, { headers: auth(who), data: { title: `集計確認-${suffix}-${index}`, description: '複数ページの集計確認です。', category, condition: '未使用に近い', price: 1000+index } }); assert.equal(r.status(), 201); return r.json()
  }
  async function login(who) {
    await page.goto(`${base}/#/mypage`)
    await page.getByLabel('メールアドレス', { exact: true }).fill(who.email)
    await page.getByLabel('パスワード', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ログインして続ける', exact: true }).click()
    await page.getByRole('heading', { name: 'マイページ', exact: true }).waitFor()
  }
  const profile = page.getByRole('region', { name: 'プロフィール', exact: true })
  const stat = name => profile.locator('.mypage-stat').filter({ has: page.getByText(name, { exact: true }) })
  const map = page.getByRole('region', { name: 'あなたの趣味マップ', exact: true })
  const recent = page.getByRole('region', { name: '最近の購入', exact: true })
  try {
    const buyer = await identity('購入履歴の確認'), seller = await identity('出品者の確認'), purchases = []
    for (let start = 0; start < 101; start += 5) {
      await Promise.all(Array.from({ length: Math.min(5,101-start) }, async (_, offset) => {
        const index = start+offset, item = await create(seller, index, index % 2 ? 'その他' : 'カメラ')
        const r = await context.request.post(`${base}/api/purchases`, { headers: auth(buyer), data: { item_id: item.id } }); assert.equal(r.status(), 201); purchases.push({ ...await r.json(), item })
      }))
    }
    purchases.sort((a,b) => b.id-a.id)
    await create(buyer, 200, 'クラフト')
    for (const record of purchases.slice(0,4)) assert.equal((await context.request.post(`${base}/api/likes/${record.item.id}`, { headers: auth(buyer) })).status(), 200)
    let release, started
    const gate = new Promise(resolve => { release = resolve }), readingSecond = new Promise(resolve => { started = resolve })
    await page.route('**/api/purchases?**', async route => {
      const query = new URL(route.request().url()).searchParams
      if (query.get('limit') === '100' && query.has('before_id')) { started(); await gate }
      await route.continue()
    })
    await login(buyer); await readingSecond
    assert.equal(await stat('購入した道具').count(), 0)
    assert.equal(await stat('購入した趣味').count(), 0)
    release()
    await stat('購入した道具').getByText('101点', { exact: true }).waitFor()
    await stat('購入した趣味').getByText('1 / 5', { exact: true }).waitFor()
    await stat('いいね').getByText('4件', { exact: true }).waitFor()
    await page.unroute('**/api/purchases?**')
    await profile.getByText(buyer.email, { exact: true }).waitFor()
    assert.equal(await map.locator('.hobby-map__tile').count(), 5)
    assert.equal(await map.locator('.hobby-map__tile--tried').count(), 1)
    assert.match(await map.locator('.hobby-map__tile--tried').innerText(), /カメラ/)
    assert.match(await map.getByRole('link', { name: /^クラフト/ }).innerText(), /これから出会う趣味/)
    assert.equal(await map.getByRole('link', { name: /^その他/ }).count(), 0)
    checks.push('実購入101件を2ページで取得し、読取完了前は集計せず、購入101・趣味1/5・いいね4を表示。出品だけの趣味は購入済みにしない')
    assert.equal(await recent.locator('.recent-purchase').count(), 3)
    for (let i=0;i<3;i++) {
      const row = recent.locator('.recent-purchase').nth(i)
      await row.getByRole('link', { name: purchases[i].item.title, exact: true }).waitFor()
      assert.equal(await row.getByRole('link', { name: 'この道具を再出品する', exact: true }).getAttribute('href'), `#/purchases/${purchases[i].id}/relist`)
    }
    checks.push('最近の購入は新しい3件で、本人の各購入記録へ対応する再出品リンクがある')
    for (const width of [1280,375]) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await page.screenshot({ path: path.join(output, `mypage-connected-${width}.png`), fullPage: true })
    }
    await map.getByRole('link', { name: /^カメラ/ }).click()
    await page.waitForFunction(() => document.querySelector('#items-category')?.value === 'カメラ')
    checks.push('375px/1280pxに横はみ出しがなく、趣味タイルからカテゴリ検索へ移動できる')
    await page.route('**/api/purchases?**', async route => {
      if (new URL(route.request().url()).searchParams.has('before_id')) await route.fulfill({ status:503, json:{} })
      else await route.continue()
    })
    await page.goto(`${base}/#/mypage`)
    await map.getByRole('alert').waitFor(); assert.equal(await stat('購入した道具').count(),0)
    await page.unroute('**/api/purchases?**')
    await map.getByRole('button', { name:'趣味マップを再読み込み', exact:true }).click()
    await stat('購入した道具').getByText('101点', { exact:true }).waitFor()
    checks.push('2ページ目の取得失敗では不完全な集計を出さず、再試行で全件取得に復帰する')
    const first = await (await context.request.get(`${base}/api/purchases?limit=100`, { headers:auth(buyer) })).json()
    // StrictMode may abort and repeat the initial request; count distinct pages.
    const batches = new Set()
    await page.route('**/api/purchases?**', async route => {
      const cursor = new URL(route.request().url()).searchParams.get('before_id')
      const batch = cursor === null ? 0 : (100000-Number(cursor))/100
      batches.add(batch)
      await route.fulfill({ json:{ purchases:first.purchases, next_cursor:100000-(batch+1)*100 } })
    })
    await page.reload(); await map.getByText('購入履歴が多いため、新しい2,000件までを対象にしています。', { exact:false }).waitFor()
    assert.deepEqual([...batches].sort((a,b) => a-b), Array.from({ length:20 }, (_,i) => i)); assert.equal(await stat('購入した道具').count(),0); assert.equal(await stat('購入した趣味').count(),0)
    assert.equal(await map.getByText('これから出会う趣味', { exact:true }).count(),0)
    assert.equal(await map.getByText('未確認の趣味', { exact:true }).count(),4)
    await page.unroute('**/api/purchases?**')
    checks.push('上限に達した未完全集計では合計・趣味数を確定値で出さず、未知の趣味を未購入と断定しない')
    await page.getByRole('button', { name:'ログアウト', exact:true }).click()
    await login(seller)
    await stat('購入した道具').getByText('0点', { exact:true }).waitFor()
    assert.equal(await recent.locator('.recent-purchase').count(),0)
    assert.equal(await map.locator('.hobby-map__tile--tried').count(),0)
    checks.push('別アカウントへの切り替えで前の購入件数・趣味・最近の購入を残さない')
    assert.deepEqual(errors,[])
    await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({ checks,pageErrors:errors,productionChanged:false },null,2));console.log(JSON.stringify({ passed:checks.length,output }))
  } catch(e) { await page.screenshot({ path:path.join(output,'failure.png'),fullPage:true }).catch(()=>{});throw e }
  finally { await browser.close() }
}
run().catch(e=>{console.error(e);process.exitCode=1})
