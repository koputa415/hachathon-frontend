const apiBase = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(status, message, issues = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.issues = issues
  }
}

export async function apiRequest(path, { method = 'GET', body, token, signal } = {}) {
  let response
  const multipart = body instanceof FormData
  const timeout = AbortSignal.timeout(multipart ? 45000 : 15000)
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout
  try {
    response = await fetch(`${apiBase}${path}`, {
      method, signal: requestSignal, cache: 'no-store', credentials: 'omit',
      headers: {
        Accept: 'application/json',
        ...(body === undefined || multipart ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(0, '接続できませんでした。通信環境を確認して、もう一度お試しください。')
  }
  const authPath = /^\/auth\/(register|login|me)$/.test(path)
  const configurationMessage = '認証サービスに接続できません。公開設定の確認が必要です。'
  if (!response.ok) {
    if (path.startsWith('/items')) {
      let issues = []
      if (response.status === 422) {
        try {
          const data = await response.json()
          const allowed = ['title', 'description', 'category', 'condition', 'price', 'image']
          issues = Array.isArray(data.detail) ? data.detail.flatMap((entry) => {
            const field = entry.loc?.at(-1)
            return allowed.includes(field) && typeof entry.type === 'string' ? [{ field, type: entry.type }] : []
          }) : []
        } catch { /* 検証形式以外の本文は表示しない。 */ }
      }
      const message = response.status === 401 ? 'ログインの有効期限が切れました。もう一度ログインしてください。'
        : response.status === 413 ? '画像は5MB以下のファイルを選んでください。'
        : response.status === 415 ? 'JPEG・PNG・WebP形式の画像を選んでください。'
        : response.status === 422 ? '入力内容を確認してください。'
        : response.status === 503 ? '画像の保存先に接続できませんでした。時間をおいて、もう一度お試しください。'
        : [404, 405].includes(response.status) ? '出品サービスに接続できません。APIの公開設定を確認してください。'
        : 'サーバーで出品を完了できませんでした。時間をおいて、もう一度お試しください。'
      throw new ApiError(response.status, message, issues)
    }
    const message = authPath && [404, 405].includes(response.status) ? configurationMessage
      : response.status === 401 ? 'メールアドレスまたはパスワードが正しくありません。'
      : response.status === 409 ? 'このメールアドレスは登録済みです。ログインしてください。'
      : response.status === 422 ? '入力内容を確認してください。'
      : '処理を完了できませんでした。時間をおいて、もう一度お試しください。'
    // サーバー本文や入力パスワードをエラー表示・ログへ流さない。
    throw new ApiError(response.status, message)
  }
  if (authPath && response.headers.get('content-type')?.includes('text/html')) {
    throw new ApiError(response.status, configurationMessage)
  }
  try {
    return await response.json()
  } catch {
    throw new ApiError(0, '応答を確認できませんでした。もう一度お試しください。')
  }
}


export function apiUrl(path) {
  return `${apiBase}${path}`
}
