import { ApiError } from './client.js'
import { authenticatedRequest } from './session.js'

export async function checkAdminAccess(signal) {
  const result = await authenticatedRequest('/admin/access', { signal })
  if (!result || result.allowed !== true) throw new ApiError(0, '管理者向けの確認結果を取得できませんでした。')
  return result
}
