import { ApiError } from './client.js'
import { readItem } from './items.js'
import { authenticatedRequest } from './session.js'

function readPurchase(record) {
  if (!record || !Number.isSafeInteger(record.id) || record.id <= 0
    || !Number.isSafeInteger(record.item_id) || record.item_id <= 0
    || !Number.isSafeInteger(record.buyer_id) || record.buyer_id <= 0
    || !Number.isSafeInteger(record.price) || record.price < 1
    || typeof record.created_at !== 'string' || !Number.isFinite(Date.parse(record.created_at))
    || (record.relisted_item_id !== undefined && record.relisted_item_id !== null
      && (!Number.isSafeInteger(record.relisted_item_id) || record.relisted_item_id <= 0))) {
    throw new ApiError(0, '購入記録の応答を確認できませんでした。購入履歴を確認してください。')
  }
  return record
}

/**
 * 再出品済みなら、再出品した商品のID（サーバーの購入記録 relisted_item_id）を返す。
 * 未再出品、または項目を返さない旧APIでは null。
 */
export function relistedItemId(purchase) {
  return purchase?.relisted_item_id ?? null
}

/** 購入記録の応答に relisted_item_id があれば、APIが再出品の記録に対応している。 */
export function supportsRelistLink(purchase) {
  return Boolean(purchase) && Object.hasOwn(purchase, 'relisted_item_id')
}

function readPurchaseWithItem(record) {
  readPurchase(record)
  const item = readItem(record.item)
  if (item.id !== record.item_id) throw new ApiError(0, '購入商品の応答を確認できませんでした。')
  return { ...record, item }
}

export async function createPurchase(itemId, signal) {
  try {
    const record = readPurchase(await authenticatedRequest('/purchases', {
      method: 'POST', body: { item_id: Number(itemId) }, signal,
    }))
    if (record.item_id !== Number(itemId)) throw new ApiError(0, '購入結果を確認できませんでした。購入履歴を確認してください。')
    return record
  } catch (error) {
    if (error.name !== 'AbortError' && (!error.status || error.status >= 500)) {
      error.outcomeUnknown = true
      error.message = '購入結果を確認できませんでした。購入履歴を確認してから、商品を再確認してください。'
    }
    throw error
  }
}

export async function listPurchases(cursor, signal) {
  const query = new URLSearchParams({ limit: '24' })
  if (cursor !== null) query.set('before_id', String(cursor))
  const page = await authenticatedRequest(`/purchases?${query}`, { signal })
  if (!page || !Array.isArray(page.purchases)
    || (page.next_cursor !== null && (!Number.isSafeInteger(page.next_cursor) || page.next_cursor <= 0))) {
    throw new ApiError(0, '購入履歴の応答を確認できませんでした。もう一度お試しください。')
  }
  return { purchases: page.purchases.map(readPurchaseWithItem), nextCursor: page.next_cursor }
}

export async function getPurchase(id, signal) {
  return readPurchaseWithItem(await authenticatedRequest(`/purchases/${encodeURIComponent(id)}`, { signal }))
}

/**
 * マイページの集計用。1回に最大100件ずつ購入履歴を読む（既存の listPurchases の形は変えない）。
 * 応答の検証は listPurchases と同じ。
 */
export async function listPurchasesBatch(cursor, signal) {
  const query = new URLSearchParams({ limit: '100' })
  if (cursor !== null) query.set('before_id', String(cursor))
  const page = await authenticatedRequest(`/purchases?${query}`, { signal })
  if (!page || !Array.isArray(page.purchases)
    || (page.next_cursor !== null && (!Number.isSafeInteger(page.next_cursor) || page.next_cursor <= 0))) {
    throw new ApiError(0, '購入履歴の応答を確認できませんでした。もう一度お試しください。')
  }
  return { purchases: page.purchases.map(readPurchaseWithItem), nextCursor: page.next_cursor }
}
