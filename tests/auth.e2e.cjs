const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { chromium } = require('playwright')

const base = process.env.AUTH_E2E_BASE_URL || 'http://localhost:5181'
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)
  || process.env.AUTH_E2E_ALLOW_REGISTRATION !== '1') {
  throw new Error('Use a local frontend backed by a disposable DB and set AUTH_E2E_ALLOW_REGISTRATION=1')
}
const outputs = process.env.AUTH_E2E_OUTPUT_DIR || path.resolve('test-results/auth')
const storageKey = 'hackathon.auth.session'
const suffix = randomBytes(6).toString('hex')
const email = `frontend-${suffix}@example.com`
const password = randomBytes(24).toString('base64url')
const displayName = `認証確認-${suffix}`
const checks = []

async function run() {
  await fs.mkdir(outputs, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const errors = []
  let chatRequests = 0
  page.on('request', request => {
    if (/\/(?:api\/)?chats(?:\/|$)/.test(new URL(request.url()).pathname)) chatRequests += 1
  })
  page.on('pageerror', error => errors.push(error.message))
  const loginTitle = () => page.getByRole('heading', { name: 'ログイン', exact: true })
  const listingTitle = () => page.getByRole('heading', { name: '道具を出品する', exact: true })
  const privateField = () => page.getByLabel('商品名', { exact: true })
  const stored = () => page.evaluate(key => sessionStorage.getItem(key), storageKey)
  async function fillLogin(loginEmail = email, loginPassword = password) {
    await page.getByLabel('メールアドレス', { exact: true }).fill(loginEmail)
    await page.getByLabel('パスワード', { exact: true }).fill(loginPassword)
    await page.getByRole('button', { name: 'ログインして続ける', exact: true }).click()
  }
  async function signOut() {
    await page.getByRole('button', { name: 'ログアウト', exact: true }).click()
    await page.getByRole('heading', { name: 'まだ知らない趣味に、気軽に出会える。', exact: true }).waitFor()
  }
  try {
    // 商品IDの固定値に依存せず、実APIで閲覧用の商品を用意する。
    const fixtureAccountResponse = await context.request.post(`${base}/api/auth/register`, { data: {
      email: `fixture-${suffix}@example.com`, display_name: '閲覧フィクスチャ', password,
    } })
    assert.equal(fixtureAccountResponse.status(), 201)
    const fixtureAccount = await fixtureAccountResponse.json()
    const fixtureItemResponse = await context.request.post(`${base}/api/items`, { data: {
      title: `認証導線用カメラ-${suffix}`, description: '認証テスト用の出品です。', category: 'カメラ', condition: '未使用に近い', price: 12000,
    }, headers: { Authorization: `Bearer ${fixtureAccount.access_token}` } })
    assert.equal(fixtureItemResponse.status(), 201)
    const fixtureItem = await fixtureItemResponse.json()
    await page.goto(`${base}/#/`)
    await page.getByRole('heading', { name: 'まだ知らない趣味に、気軽に出会える。', exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: 'チャット履歴', exact: true }).count(), 0)
    await page.goto(`${base}/#/chat-history`)
    await page.getByRole('heading', { name: 'ページが見つかりません', exact: true }).waitFor()
    checks.push('チャット履歴の導線がなく、旧URLにも画面を表示しない')
    await page.goto(`${base}/#/listing`)
    await loginTitle().waitFor()
    assert.equal(await privateField().count(), 0)
    assert.match(page.url(), /#\/login\?next=/)
    checks.push('未ログインの出品URLをログインへ誘導し、フォームを描画しない')

    await page.goto(`${base}/#/items/${fixtureItem.id}`)
    await page.getByRole('button', { name: '購入手続きへ', exact: true }).click()
    await loginTitle().waitFor()
    assert.equal(await page.getByRole('heading', { name: '購入内容の確認', exact: true }).count(), 0)
    await page.screenshot({ path: path.join(outputs, 'auth-without-history-desktop.png'), fullPage: true })
    checks.push('未ログインの購入操作をログインへ誘導する')

    await page.getByRole('button', { name: '新規登録に切り替える' }).click()
    await page.getByLabel('表示名', { exact: true }).fill(displayName)
    await page.getByLabel('メールアドレス', { exact: true }).fill(email)
    await page.getByLabel('パスワード（8〜128文字）', { exact: true }).fill(password)
    await page.getByRole('button', { name: '登録して続ける', exact: true }).click()
    await page.getByRole('heading', { name: '購入内容の確認', exact: true }).waitFor()
    await page.getByText(`${displayName}さん`, { exact: true }).waitFor()
    assert.equal(await page.evaluate(({ key, password }) => {
      const value = JSON.parse(sessionStorage.getItem(key))
      return Object.keys(value).sort().join(',') === 'expiresAt,token'
        && !JSON.stringify(value).includes(password) && localStorage.length === 0
    }, { key: storageKey, password }), true)
    await page.getByRole('button', { name: '購入を確定する', exact: true }).waitFor()
    checks.push('実APIで新規登録し、元の購入確認へ戻ってログイン後だけ購入入口を通す')

    await page.getByRole('button', { name: '出品する', exact: true }).click()
    await listingTitle().waitFor()
    await privateField().waitFor()
    await page.screenshot({ path: path.join(outputs, 'auth-without-history-authenticated.png'), fullPage: true })
    let releaseMe
    const meGate = new Promise(resolve => { releaseMe = resolve })
    await page.route('**/api/auth/me', async route => { await meGate; await route.continue() })
    const meRequested = page.waitForRequest(request => request.url().endsWith('/api/auth/me'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await meRequested
    assert.equal(await privateField().count(), 0)
    await page.getByRole('status').filter({ hasText: 'ログイン状態を確認中' }).waitFor()
    releaseMe()
    await listingTitle().waitFor()
    await page.unroute('**/api/auth/me')
    checks.push('再読み込み後は実APIの本人確認が終わるまでフォームを隠し、その後ログインを復元する')

    await signOut()
    assert.equal(await stored(), null)
    await page.goto(`${base}/#/listing`)
    await loginTitle().waitFor()
    await page.getByLabel('メールアドレス', { exact: true }).fill(email)
    await page.getByLabel('パスワード', { exact: true }).fill('intentionally-wrong-password')
    await page.getByRole('button', { name: 'ログインして続ける', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'メールアドレスまたはパスワード' }).waitFor()
    assert.equal(await stored(), null)
    assert.equal(await page.getByLabel('パスワード', { exact: true }).inputValue(), '')
    checks.push('ログアウトで保持情報を消し、実APIの不正パスワードを表示して未ログインを維持する')

    await page.getByRole('button', { name: '新規登録に切り替える' }).click()
    await page.getByLabel('表示名', { exact: true }).fill(displayName)
    await page.getByLabel('メールアドレス', { exact: true }).fill(email)
    await page.getByLabel('パスワード（8〜128文字）', { exact: true }).fill(password)
    await page.getByRole('button', { name: '登録して続ける', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: '登録済み' }).waitFor()
    await page.getByRole('button', { name: 'ログインに切り替える' }).click()
    await fillLogin()
    await listingTitle().waitFor()
    checks.push('重複登録を拒否し、既存アカウントの実APIログインで元の出品画面へ戻る')

    const beforeOffline = await stored()
    await page.route('**/api/auth/me', route => route.abort('failed'))
    await page.reload()
    await page.getByRole('alert').filter({ hasText: 'ログイン状態を確認できませんでした' }).waitFor()
    assert.equal(await privateField().count(), 0)
    assert.equal((await stored()) === beforeOffline, true)
    await page.unroute('**/api/auth/me')
    await page.getByRole('button', { name: '再試行', exact: true }).click()
    await listingTitle().waitFor()
    checks.push('本人確認の通信失敗では保護画面を出さず、トークンを保持して再試行で復帰する')

    await page.route('**/api/auth/me', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"Invalid credentials"}' }))
    await page.reload()
    await loginTitle().waitFor()
    assert.equal(await stored(), null)
    await page.unroute('**/api/auth/me')
    checks.push('本人確認APIの401で保持状態を破棄してログインへ戻す')

    await fillLogin()
    await listingTitle().waitFor()
    await page.evaluate(key => sessionStorage.setItem(key, JSON.stringify({ token: 'forged.token.value', expiresAt: Date.now() + 60000, user: { display_name: 'forged' } })), storageKey)
    await page.reload()
    await loginTitle().waitFor()
    assert.equal(await stored(), null)
    checks.push('保存情報を偽造してもサーバーの本人確認に失敗し、ログイン状態を復元しない')

    await page.evaluate(key => sessionStorage.setItem(key, '{not-json'), storageKey)
    await page.goto(`${base}/#/listing`)
    await page.reload()
    await loginTitle().waitFor()
    assert.equal(await stored(), null)
    checks.push('破損した保持情報から安全に未ログイン状態へ戻る')

    await page.route('**/api/auth/login', async route => {
      const response = await route.fetch()
      const body = await response.json()
      await route.fulfill({ response, json: { ...body, expires_in: 1 } })
    })
    await fillLogin()
    await listingTitle().waitFor()
    await loginTitle().waitFor({ timeout: 5000 })
    assert.equal(await stored(), null)
    await page.unroute('**/api/auth/login')
    checks.push('UIの有効期限到達時に自動ログアウトし、出品フォームを閉じる（期限短縮のみ注入）')

    await page.goto(`${base}/#/login?next=${encodeURIComponent('https://example.com/unsafe')}`)
    await loginTitle().waitFor()
    await fillLogin()
    await page.getByRole('heading', { name: 'まだ知らない趣味に、気軽に出会える。', exact: true }).waitFor()
    assert.equal(new URL(page.url()).origin, new URL(base).origin)
    checks.push('外部URLの戻り先を拒否してホームへ戻る')

    await signOut()
    await page.goto(`${base}/#/login`)
    await loginTitle().waitFor()
    await page.setViewportSize({ width: 375, height: 812 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: path.join(outputs, 'auth-without-history-mobile.png'), fullPage: true })
    assert.equal(chatRequests, 0)
    checks.push('履歴APIへのリクエストが発生しない')
    assert.deepEqual(errors, [])
    const result = { passed: true, backend: 'real local T2-2 API and isolated PostgreSQL', checks, runtimeErrors: errors }
    await fs.writeFile(path.join(outputs, 'auth-without-history-verification.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result, null, 2))
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
