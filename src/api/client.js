const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, { method = 'GET', body, token, signal } = {}) {
  let response
  const timeout = AbortSignal.timeout(15000)
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout
  try {
    response = await fetch(`${apiBase}${path}`, {
      method, signal: requestSignal, cache: 'no-store', credentials: 'omit',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(0, '接続できませんでした。通信環境を確認して、もう一度お試しください。')
  }
  if (!response.ok) {
    const message = response.status === 401 ? 'メールアドレスまたはパスワードが正しくありません。'
      : response.status === 409 ? 'このメールアドレスは登録済みです。ログインしてください。'
      : response.status === 422 ? '入力内容を確認してください。'
      : '処理を完了できませんでした。時間をおいて、もう一度お試しください。'
    // サーバー本文や入力パスワードをエラー表示・ログへ流さない。
    throw new ApiError(response.status, message)
  }
  try {
    return await response.json()
  } catch {
    throw new ApiError(0, '応答を確認できませんでした。もう一度お試しください。')
  }
}
