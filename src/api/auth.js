import { ApiError, apiRequest } from './client.js'

export function validateUser(user) {
  if (!user || typeof user.id !== 'number' || !Number.isInteger(user.id) || user.id <= 0
    || typeof user.email !== 'string' || typeof user.display_name !== 'string') {
    throw new ApiError(0, 'ユーザー情報を確認できませんでした。もう一度ログインしてください。')
  }
  return { id: user.id, email: user.email, display_name: user.display_name }
}

export async function authenticate(mode, credentials, signal) {
  const data = await apiRequest(`/auth/${mode}`, { method: 'POST', body: credentials, signal })
  if (!data || typeof data.access_token !== 'string' || !data.access_token
    || data.token_type !== 'bearer' || !Number.isFinite(data.expires_in)
    || data.expires_in <= 0 || data.expires_in > 86400) {
    throw new ApiError(0, 'ログイン応答を確認できませんでした。もう一度お試しください。')
  }
  return { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
}

export async function getCurrentUser(token, signal) {
  return validateUser(await apiRequest('/auth/me', { token, signal }))
}
