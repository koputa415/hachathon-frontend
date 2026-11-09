import { ApiError, apiRequest } from './client.js'
import { authenticatedRequest } from './session.js'
import { readItem } from './items.js'

function readState(value) {
  if (!value || !Number.isSafeInteger(value.item_id) || value.item_id < 1
    || !Number.isSafeInteger(value.like_count) || value.like_count < 0 || typeof value.liked_by_me !== 'boolean') {
    throw new ApiError(0, 'いいねの状態を確認できませんでした。')
  }
  return value
}

export async function getLikeStates(itemIds, signedIn, signal) {
  const ids = [...new Set(itemIds)]
  const groups = []
  for (let index = 0; index < ids.length; index += 100) groups.push(ids.slice(index, index + 100))
  const pages = await Promise.all(groups.map(async group => {
    const query = new URLSearchParams(group.map(id => ['item_ids', String(id)]))
    const response = await (signedIn ? authenticatedRequest : apiRequest)(`/likes/status?${query}`, { signal })
    if (!response || !Array.isArray(response.items)) throw new ApiError(0, 'いいね情報を取得できませんでした。')
    const seen = new Set()
    return response.items.map(value => {
      const row = readState(value)
      if (!group.includes(row.item_id) || seen.has(row.item_id)) throw new ApiError(0, 'いいね情報を確認できませんでした。')
      seen.add(row.item_id)
      return row
    })
  }))
  return pages.flat()
}

export async function setLiked(itemId, liked, signal) {
  const row = readState(await authenticatedRequest(`/likes/${encodeURIComponent(itemId)}`, { method: liked ? 'POST' : 'DELETE', signal }))
  if (row.item_id !== itemId) throw new ApiError(0, 'いいねの結果を確認できませんでした。')
  return row
}

export async function listLikedItems(cursor, signal) {
  const query = new URLSearchParams({ limit: '24' })
  if (cursor !== null) query.set('before_id', String(cursor))
  const page = await authenticatedRequest(`/likes?${query}`, { signal })
  if (!page || !Array.isArray(page.likes) || (page.next_cursor !== null && (!Number.isSafeInteger(page.next_cursor) || page.next_cursor < 1))) {
    throw new ApiError(0, 'いいね一覧を取得できませんでした。')
  }
  const seen = new Set()
  const likes = page.likes.map(row => {
    if (!row || !Number.isSafeInteger(row.id) || row.id < 1 || seen.has(row.id)
      || typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))) throw new ApiError(0, 'いいね一覧を確認できませんでした。')
    seen.add(row.id)
    return { ...row, item: readItem(row.item) }
  })
  return { likes, nextCursor: page.next_cursor }
}
