const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { chromium } = require('playwright')

const base = process.env.ROLES_E2E_BASE_URL || 'http://localhost:5182'
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)
  || process.env.ROLES_E2E_ALLOW_WRITES !== '1') throw new Error('Local disposable API/DB only; set ROLES_E2E_ALLOW_WRITES=1')
const adminEmail = process.env.ROLES_E2E_ADMIN_EMAIL
const adminPassword = process.env.ROLES_E2E_ADMIN_PASSWORD
if (!adminEmail || !adminPassword) throw new Error('Provision a disposable admin with the operator CLI and provide ROLES_E2E_ADMIN_EMAIL / ROLES_E2E_ADMIN_PASSWORD')
const output = process.env.ROLES_E2E_OUTPUT_DIR || path.resolve('test-results/roles')

async function run() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  const context = await browser.newContext({ viewport: { width: 1280, height: 950 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const errors = []
  const checks = []
  page.on('pageerror', error => errors.push(error.message))
  const adminButton = () => page.getByRole('button', { name: '管理者権限を確認', exact: true })
  const adminTitle = () => page.getByRole('heading', { name: '管理者向けの確認', exact: true })
  const myPage = () => page.getByRole('heading', { name: 'マイページ', exact: true })
  let accessCalls = 0
  page.on('request', request => { if (request.url().endsWith('/api/admin/access')) accessCalls += 1 })
  async function login(email, password) {
    await page.goto(`${base}/#/mypage`)
    await page.getByLabel('メールアドレス', { exact: true }).fill(email)
    await page.getByLabel('パスワード', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'ログインして続ける', exact: true }).click()
    await myPage().waitFor()
  }
  async function denied(who) {
    const response = await context.request.get(`${base}/api/admin/access`, { headers: { Authorization: `Bearer ${who.access_token}`, 'X-Role': 'admin' } })
    assert.equal(response.status(), 403)
  }
  try {
    const password = randomBytes(24).toString('base64url')
    const email = `roles-ui-${randomBytes(6).toString('hex')}@example.com`
    const response = await context.request.post(`${base}/api/auth/register`, { data: { email, password, display_name: '一般ユーザー確認' } })
    assert.equal(response.status(), 201)
    const general = await response.json()
    assert.equal(general.user.role, 'user')
    await login(email, password)
    await page.getByText('まだいいねした商品はありません。', { exact: true }).waitFor()
    assert.equal(await adminButton().count(), 0)
    assert.equal(await adminTitle().count(), 0)
    assert.equal(accessCalls, 0)
    await denied(general)
    await page.reload()
    await myPage().waitFor()
    assert.equal(await adminButton().count(), 0)
    const savedKeys = await page.evaluate(() => Object.keys(JSON.parse(sessionStorage.getItem('hackathon.auth.session'))).sort())
    assert.deepEqual(savedKeys, ['expiresAt', 'token'])
    await page.screenshot({ path: path.join(output, 'general-mypage.png'), fullPage: true })
    checks.push('一般ユーザーでは管理者操作を非表示。直接APIは403で、再読み込み後も非表示。保存するのはトークンと期限だけ')

    // Browser storage cannot make the authenticated user an administrator.
    await page.evaluate(() => {
      const key = 'hackathon.auth.session'
      const saved = JSON.parse(sessionStorage.getItem(key))
      saved.role = 'admin'; saved.user = { role: 'admin' }
      sessionStorage.setItem(key, JSON.stringify(saved))
    })
    await page.reload()
    await myPage().waitFor()
    assert.equal(await adminButton().count(), 0)
    // Even a forged server-profile presentation cannot bypass the real API check.
    await page.route('**/api/auth/me', async route => {
      const upstream = await route.fetch()
      await route.fulfill({ response: upstream, json: { ...await upstream.json(), role: 'admin' } })
    })
    await page.reload()
    await adminButton().waitFor()
    await adminButton().click()
    await page.getByRole('alert').filter({ hasText: '管理者権限が必要です' }).waitFor()
    assert.equal(await adminButton().count(), 0)
    assert.equal(await page.getByText('管理者向けの確認が完了しました。', { exact: true }).count(), 0)
    await page.getByRole('button', { name: 'ログアウト', exact: true }).waitFor()
    await page.unroute('**/api/auth/me')
    await page.reload()
    await myPage().waitFor()
    assert.equal(await adminTitle().count(), 0)
    checks.push('保存データや表示用プロフィールを管理者に偽装しても実APIは403。成功表示せず操作を隠し、一般のログインは保持する')

    await page.route('**/api/auth/me', async route => {
      const upstream = await route.fetch()
      const user = await upstream.json()
      delete user.role
      await route.fulfill({ response: upstream, json: user })
    })
    await page.reload()
    await myPage().waitFor()
    assert.equal(await adminButton().count(), 0)
    await page.unroute('**/api/auth/me')
    checks.push('移行前APIがロールを返さない場合も一般として扱い、既存マイページを利用できる')

    await page.getByRole('button', { name: 'ログアウト', exact: true }).click()
    await login(adminEmail, adminPassword)
    await adminButton().waitFor()
    assert.equal(await page.getByText('管理者向けの確認が完了しました。', { exact: true }).count(), 0)
    const verified = page.waitForResponse(r => r.url().endsWith('/api/admin/access') && r.status() === 200)
    await adminButton().click()
    assert.deepEqual(await (await verified).json(), { allowed: true })
    await page.getByText('管理者向けの確認が完了しました。', { exact: true }).waitFor()
    await page.reload()
    await adminButton().waitFor()
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: path.join(output, 'admin-mypage-mobile.png'), fullPage: true })
    await page.setViewportSize({ width: 1280, height: 950 })
    checks.push('運用CLIで設定した実管理者ではボタンが表示され、実API200の後だけ成功を表示。再読み込み・390px表示も確認')

    await page.route('**/api/admin/access', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await adminButton().click()
    await page.getByRole('alert').filter({ hasText: '管理者向けの確認ができませんでした' }).waitFor()
    assert.equal(await page.getByText('管理者向けの確認が完了しました。', { exact: true }).count(), 0)
    await page.unroute('**/api/admin/access')
    await adminButton().click()
    await page.getByText('管理者向けの確認が完了しました。', { exact: true }).waitFor()
    await page.route('**/api/admin/access', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"allowed":false}' }))
    await adminButton().click()
    await page.getByRole('alert').filter({ hasText: '確認結果を取得できませんでした' }).waitFor()
    assert.equal(await page.getByText('管理者向けの確認が完了しました。', { exact: true }).count(), 0)
    await page.unroute('**/api/admin/access')
    checks.push('通信失敗や不正な成功応答を権限確認成功に見せず、再試行で復帰する')

    await page.getByRole('button', { name: 'ログアウト', exact: true }).click()
    await login(email, password)
    assert.equal(await adminButton().count(), 0)
    await page.getByRole('link', { name: '出品', exact: true }).click()
    await page.getByRole('heading', { name: '道具を出品する', exact: true }).waitFor()
    await page.getByRole('link', { name: 'マイページ', exact: true }).click()
    await myPage().waitFor()
    await page.route('**/api/auth/me', async route => {
      const upstream = await route.fetch()
      await route.fulfill({ response: upstream, json: { ...await upstream.json(), role: 'unknown' } })
    })
    await page.reload()
    await page.getByRole('heading', { name: 'ログイン状態の確認が必要です', exact: true }).waitFor()
    assert.equal(await adminButton().count(), 0)
    await page.unroute('**/api/auth/me')
    checks.push('管理者から一般への切り替えで操作を残さず、一般の出品導線を維持。未知のロールでは管理者表示にしない')
    assert.deepEqual(errors, [])
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ passed: checks, pageErrors: errors, productionChanged: false }, null, 2))
    console.log(JSON.stringify({ passed: checks.length, pageErrors: errors.length, output }))
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {})
    throw error
  } finally { await browser.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
