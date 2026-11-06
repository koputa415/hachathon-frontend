import { ApiError, apiRequest, apiUrl } from './client.js'
import { authenticatedRequest } from './session.js'

const fieldMessages = {
  title: '商品名は空白以外の1〜100文字で入力してください。',
  description: '説明は空白以外の1〜2000文字で入力してください。',
  category: 'カテゴリ一覧から選んでください。',
  condition: '商品の状態を選んでください。',
  price: '価格は1〜999999999円の整数で入力してください。',
  image: '画像を読み取れませんでした。壊れていないJPEG・PNG・WebP画像を選んでください。',
}

export async function createItem(fields, image, signal) {
  const body = new FormData()
  body.set('item', JSON.stringify(fields))
  body.set('image', image)
  try {
    const item = await authenticatedRequest('/items/with-image', { method: 'POST', body, signal })
    if (!item || !Number.isSafeInteger(item.id) || item.id <= 0 || item.title !== fields.title) {
      throw new ApiError(0, '出品結果を確認できませんでした。重ねて送信する前に保存状況を確認してください。')
    }
    if (item.image_path !== `/items/${item.id}/image`) {
      throw new ApiError(0, '出品画像の応答を確認できませんでした。保存状況を確認してください。')
    }
    return { ...item, imageUrl: apiUrl(item.image_path) }
  } catch (error) {
    if (error.issues?.length) {
      error.fieldErrors = Object.fromEntries(error.issues.map(({ field }) => [field, fieldMessages[field]]))
    }
    throw error
  }
}


function readItem(item) {
  if (!item || !Number.isSafeInteger(item.id) || item.id <= 0
    || typeof item.title !== 'string' || typeof item.description !== 'string'
    || typeof item.category !== 'string' || typeof item.condition !== 'string'
    || !Number.isSafeInteger(item.price) || item.price < 1
    || (item.image_path !== null && item.image_path !== `/items/${item.id}/image`)) {
    throw new ApiError(0, '商品データを確認できませんでした。もう一度お試しください。')
  }
  return { ...item, imageUrl: item.image_path ? apiUrl(item.image_path) : null }
}

export async function listItems(cursor, signal, filters = {}) {
  const query = new URLSearchParams({ limit: '24' })
  if (cursor !== null) query.set('before_id', String(cursor))
  if (filters.q) query.set('q', filters.q)
  if (filters.category) query.set('category', filters.category)
  const page = await apiRequest(`/items?${query}`, { signal })
  if (!page || !Array.isArray(page.items)
    || (page.next_cursor !== null && (!Number.isSafeInteger(page.next_cursor) || page.next_cursor <= 0))) {
    throw new ApiError(0, '商品一覧を確認できませんでした。もう一度お試しください。')
  }
  return { items: page.items.map(readItem), nextCursor: page.next_cursor }
}

export async function getItem(id, signal) {
  return readItem(await apiRequest(`/items/${encodeURIComponent(id)}`, { signal }))
}
