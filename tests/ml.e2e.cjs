const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { chromium } = require('playwright')
const base = process.env.ML_E2E_BASE_URL || 'http://localhost:5182'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname) || process.env.ML_E2E_ALLOW_WRITES !== '1') {
  throw new Error('Use only a local frontend with a disposable database and ML_E2E_ALLOW_WRITES=1')
}
const output = process.env.ML_E2E_OUTPUT_DIR || path.resolve('test-results/ml')
const suffix = randomBytes(6).toString('hex')
const password = randomBytes(24).toString('base64url')
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFUlEQVR4nGPUCKhgYGBgYGBgYoABABDMAPTRO+Z7AAAAAElFTkSuQmCC', 'base64')
async function run() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const checks = [], errors = []
  page.on('pageerror', error => errors.push(error.message))
  const authorization = who => ({ Authorization: `Bearer ${who.access_token}` })
  async function identity(name) {
    const email = `${name}-${suffix}@example.com`
    const response = await context.request.post(`${base}/api/auth/register`, { data: { email, display_name: name, password } })
    assert.equal(response.status(), 201)
    return { ...await response.json(), email }
  }
  async function item(who, category) {
    const response = await context.request.post(`${base}/api/items`, { headers: authorization(who), data: {
      title: `${category}の道具-${suffix}`, description: 'ML表示接続の確認用です。', category,
      condition: '目立った傷や汚れなし', price: 2500,
    } })
    assert.equal(response.status(), 201)
    return response.json()
  }
  async function login(who) {
    await page.goto(`${base}/#/login`)
    await page.getByLabel('メールアドレス', { exact: true }).fill(who.email)
    await page.getByLabel('パスワード', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ログインして続ける', exact: true }).click()
    await page.getByRole('heading', { name: 'まだ知らない趣味に、気軽に出会える。', exact: true }).waitFor()
  }
  const discovery = page.locator('.discovery-feature')
  const priceBox = page.getByRole('region', { name: 'AIによる表示価格の予測', exact: true })
  async function priceInputs(category = 'その他') {
    await page.getByLabel('商品名', { exact: true }).fill(`画像付きの道具-${suffix}`)
    await page.getByLabel('カテゴリ（趣味）', { exact: true }).selectOption(category)
    await page.getByLabel('商品の状態', { exact: true }).selectOption('目立った傷や汚れなし')
  }
  try {
    const user = await identity('ml-user'), seller = await identity('ml-seller'), cold = await identity('ml-cold')
    await item(user, 'アウトドア')
    const sports = await item(seller, 'スポーツ')
    const craft = await item(seller, 'クラフト')
    await item(seller, 'その他')
    await page.goto(`${base}/#/`)
    await discovery.getByRole('button', { name: 'ログインして趣味を見つける', exact: true }).waitFor()
    assert.equal((await context.request.get(`${base}/api/recommendations`)).status(), 401)
    checks.push('ゲストにはログイン導線を表示し、本人用APIは401で拒否')
    await login(cold)
    await discovery.getByText('購入・出品した趣味がまだありません。', { exact: false }).waitFor()
    assert.equal(await discovery.locator('.discovery-feature__chip').count(), 0)
    await item(cold, 'その他')
    await page.reload()
    await discovery.getByText('購入・出品した趣味がまだありません。', { exact: false }).waitFor()
    checks.push('履歴なし・その他だけの履歴では架空のおすすめを表示しない')
    await page.getByRole('button', { name: 'ログアウト', exact: true }).click()
    await login(user)
    await discovery.getByRole('heading', { name: 'まだ知らない趣味：スポーツ', exact: true }).waitFor()
    await discovery.getByText('アウトドアと一緒に見られる傾向', { exact: true }).waitFor()
    assert.equal((await discovery.innerText()).includes('その他'), false)
    await page.reload()
    await discovery.getByRole('heading', { name: 'まだ知らない趣味：スポーツ', exact: true }).waitFor()
    await page.screenshot({ path: path.join(output, 'unseen-hobby.png'), fullPage: true })
    await discovery.getByRole('button', { name: 'この道具を見てみる', exact: true }).click()
    await page.waitForURL(`${base}/#/items/${sports.id}`)
    await page.getByRole('heading', { name: sports.title, exact: true }).waitFor()
    checks.push('実履歴を起点にスポーツを理由付きで提案し、再読込と実商品の詳細を確認')

    await page.goto(`${base}/#/listing`)
    let count = 0, lastFields
    page.on('request', request => {
      if (request.url().endsWith('/api/ml/price-prediction')) { count += 1; lastFields = request.postDataJSON() }
    })
    await page.getByLabel('価格（円）', { exact: true }).fill('7777')
    const predictionResponse = page.waitForResponse(response => response.url().endsWith('/api/ml/price-prediction') && response.status() === 200)
    await priceInputs()
    const actual = await (await predictionResponse).json()
    await priceBox.locator('strong').waitFor()
    assert.equal((await priceBox.locator('strong').innerText()).replace(/[^0-9]/g, ''), String(actual.predicted_price))
    assert.equal(actual.currency, 'JPY')
    assert.equal(actual.calibration_seed_count, 10)
    assert.equal(await page.getByLabel('価格（円）', { exact: true }).inputValue(), '7777')
    assert.deepEqual(Object.keys(lastFields).sort(), ['category', 'condition', 'title'])
    await page.screenshot({ path: path.join(output, 'other-price.png'), fullPage: true })
    const before = count
    await page.getByLabel('価格（円）', { exact: true }).fill('8888')
    await page.waitForTimeout(700)
    assert.equal(count, before)
    checks.push('その他でも実モデルの円予測を表示し、手入力価格を保持。価格自体はモデル入力に含めない')
    const corePrediction = page.waitForResponse(response => response.url().endsWith('/api/ml/price-prediction') && response.status() === 200)
    await page.getByLabel('カテゴリ（趣味）', { exact: true }).selectOption('楽器')
    assert.equal((await (await corePrediction).json()).calibration_seed_count, 2)
    await priceBox.locator('strong').waitFor()
    checks.push('5趣味側では趣味別のシード分布で較正した予測を表示')

    await page.route('**/api/ml/price-prediction', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await page.getByLabel('カテゴリ（趣味）', { exact: true }).selectOption('その他')
    await priceBox.getByText('予測価格を取得できませんでした。', { exact: false }).waitFor()
    assert.equal(await page.locator('form').getByRole('button', { name: '出品する', exact: true }).isDisabled(), false)
    await page.unroute('**/api/ml/price-prediction')
    await priceBox.getByRole('button', { name: '予測を再取得', exact: true }).click()
    await priceBox.locator('strong').waitFor()
    await page.getByRole('button', { name: '入力をクリア', exact: true }).click()
    await priceBox.getByText('商品名・カテゴリ・状態を入力すると、参考の表示価格を予測します。', { exact: true }).waitFor()
    assert.equal(await priceBox.locator('strong').count(), 0)
    checks.push('予測失敗時も出品を妨げず、再試行とクリアで表示を回復')

    await priceInputs()
    await priceBox.locator('strong').waitFor()
    // Two responses finish out of order. Only the latest input may remain visible.
    let finishOld, startedOld
    const oldStarted = new Promise(resolve => { startedOld = resolve })
    const oldGate = new Promise(resolve => { finishOld = resolve })
    await page.route('**/api/ml/price-prediction', async route => {
      const title = route.request().postDataJSON().title
      if (title === '古い商品') { startedOld(); await oldGate }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        predicted_price: title === '古い商品' ? 1110 : 2220, currency: 'JPY', label: '表示価格の予測', calibration_seed_count: 10,
      }) }).catch(() => {})
    })
    await page.getByLabel('商品名', { exact: true }).fill('古い商品')
    await oldStarted
    await page.getByLabel('商品名', { exact: true }).fill('新しい商品')
    await priceBox.getByText('￥2,220', { exact: true }).waitFor()
    finishOld()
    await page.waitForTimeout(300)
    assert.equal((await priceBox.locator('strong').innerText()).replace(/[^0-9]/g, ''), '2220')
    await page.unroute('**/api/ml/price-prediction')
    checks.push('遅れて届く古い入力の予測を破棄する（応答順を制御した検証）')

    await priceInputs()
    await priceBox.locator('strong').waitFor()
    await page.getByLabel('商品の説明', { exact: true }).fill('その他の商品も、予測表示と画像付き出品に対応します。')
    await page.getByLabel('価格（円）', { exact: true }).fill('7777')
    await page.getByLabel('商品画像', { exact: true }).setInputFiles({ name: 'item.png', mimeType: 'image/png', buffer: png })
    const createdResponse = page.waitForResponse(response => response.url().endsWith('/api/items/with-image') && response.status() === 201)
    await page.locator('form').getByRole('button', { name: '出品する', exact: true }).click()
    const created = await (await createdResponse).json()
    await page.getByRole('heading', { name: '出品が完了しました', exact: true }).waitFor()
    assert.equal(created.category, 'その他')
    assert.equal(created.price, 7777)
    await page.goto(`${base}/#/items/${created.id}`)
    await page.reload()
    await page.getByRole('heading', { name: created.title, exact: true }).waitFor()
    const saved = await (await context.request.get(`${base}/api/items/${created.id}`)).json()
    assert.equal(saved.category, 'その他')
    assert.equal(saved.price, 7777)
    checks.push('予測を見ながらその他を画像付き出品し、入力価格とカテゴリが再読込後もDBに残る')

    await page.route('**/api/recommendations', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await page.goto(`${base}/#/`)
    await discovery.getByText('趣味の提案を取得できませんでした。', { exact: false }).waitFor()
    await page.unroute('**/api/recommendations')
    await discovery.getByRole('button', { name: '提案を再取得', exact: true }).click()
    await discovery.getByRole('heading', { name: 'まだ知らない趣味：スポーツ', exact: true }).waitFor()
    // Acquiring sports makes it experienced; it must disappear as a destination.
    const purchase = await context.request.post(`${base}/api/purchases`, { headers: authorization(user), data: { item_id: sports.id } })
    assert.equal(purchase.status(), 201)
    await page.reload()
    await discovery.getByRole('heading', { name: 'まだ知らない趣味：クラフト', exact: true }).waitFor()
    await discovery.getByText(craft.title, { exact: true }).waitFor()
    assert.equal((await discovery.innerText()).includes('その他'), false)
    checks.push('提案エラーの再試行に対応し、購入済み趣味を次の提案から除外する')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: path.join(output, 'mobile-discovery.png'), fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
    await page.getByRole('button', { name: 'ログアウト', exact: true }).click()
    await discovery.getByRole('button', { name: 'ログインして趣味を見つける', exact: true }).waitFor()
    assert.equal(await discovery.locator('.discovery-feature__chip').count(), 0)
    assert.deepEqual(errors, [])
    checks.push('モバイル表示で横はみ出しがなく、ログアウトで本人の提案を消す。ブラウザ例外なし')
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ passed: checks.length, checks, browser_errors: errors }, null, 2))
    console.log(JSON.stringify({ passed: checks.length, checks }, null, 2))
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {})
    throw error
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
