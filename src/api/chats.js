import { ApiError, apiRequest } from './client.js'

export async function getChatHistory(token, signal) {
  const data = await apiRequest('/chats', { token, signal })
  if (!Array.isArray(data)) throw new ApiError(0, '履歴を確認できませんでした。')
  return data
}
