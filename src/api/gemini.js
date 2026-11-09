import { ApiError, apiRequest } from './client.js'
import { readItem } from './items.js'
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


export async function prepareRelisting(purchaseId, signal) {
  const result = await authenticatedRequest(`/items/relisting-draft/${encodeURIComponent(purchaseId)}`, { method: 'POST', signal, timeoutMs: 45000 })
  if (!result || result.purchase_id !== Number(purchaseId) || typeof result.source_image_available !== 'boolean') {
    throw new ApiError(0, '再出品の下書きを確認できませんでした。')
  }
  return { ...result, item: readItem(result.item), description: readDraft(result.description) }
}

export async function loadSourcePhoto(item, signal) {
  if (!item.image_path) return null
  const response = await fetch(item.imageUrl, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), cache: 'no-store', credentials: 'omit' })
  const type = response.headers.get('content-type')?.split(';')[0]
  if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('写真を取得できませんでした。')
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > 5 * 1024 * 1024) throw new Error('写真が大きすぎます。')
      chunks.push(value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  if (size === 0) throw new Error('写真を取得できませんでした。')
  return new File(chunks, `purchased-item.${type.split('/')[1]}`, { type })
}
