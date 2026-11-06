import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), '')
const base = process.env.AUTH_API_BASE_URL || env.VITE_API_BASE_URL
const required = [['/auth/register', 'post'], ['/auth/login', 'post'], ['/auth/me', 'get']]

try {
  const url = new URL(base)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    || url.username || url.password || url.search || url.hash) {
    throw new Error('HTTPS API URLを指定してください（認証情報やクエリは不可）。')
  }
  const response = await fetch(`${url.href.replace(/\/+$/, '')}/openapi.json`, { signal: AbortSignal.timeout(15000), redirect: 'error' })
  if (!response.ok) throw new Error(`OpenAPI取得失敗: HTTP ${response.status}`)
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('OpenAPIではなくHTML等が返されています。API接続先を確認してください。')
  const schema = await response.json()
  const missing = required.filter(([route, method]) => !schema.paths?.[route]?.[method])
  if (missing.length) throw new Error(`公開されていない認証API: ${missing.map(([route, method]) => `${method.toUpperCase()} ${route}`).join(', ')}`)
  console.log('認証API公開確認: 登録・ログイン・本人確認のルートが存在します（GET確認のみ、アカウント作成なし）。')
} catch (error) {
  console.error(`認証API公開確認に失敗: ${error.message}`)
  process.exitCode = 1
}
