import { ApiError, apiRequest } from './client.js'
import { authenticatedRequest } from './session.js'

export function readDraft(result) {
  if (!result || !['generated', 'unavailable'].includes(result.status)
    || result.ai_generated !== (result.status === 'generated')
    || (result.status === 'generated' && (typeof result.text !== 'string' || !result.text.trim() || result.text.length > 2000))
    || (result.status === 'unavailable' && result.text !== null)) {
    throw new ApiError(0, '下書きの応答を確認できませんでした。手入力して出品できます。')
  }
  return result
}

export async function generateDescription(fields, image, signal) {
  const body = new FormData()
  body.set('item', JSON.stringify(fields))
  body.set('image', image)
  return readDraft(await authenticatedRequest('/items/description-draft', { method: 'POST', body, signal }))
}


export async function getHobbyIntroduction(itemId, category, signal) {
  const result = await apiRequest(`/items/${encodeURIComponent(itemId)}/hobby-introduction`, { signal })
  if (!result || result.category !== category || !['generated', 'fallback', 'excluded'].includes(result.status)
    || result.ai_generated !== (result.status === 'generated')
    || (result.status !== 'excluded' && (typeof result.text !== 'string' || !result.text.trim() || result.text.length > 600))
    || (result.status === 'excluded' && result.text !== null)) {
    throw new ApiError(0, '趣味の紹介を取得できませんでした。')
  }
  return result
}
