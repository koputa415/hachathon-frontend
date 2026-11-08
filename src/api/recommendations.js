import { ApiError } from './client.js'
import { readItem } from './items.js'
import { authenticatedRequest } from './session.js'

export async function getRecommendations(signal) {
  const result = await authenticatedRequest('/recommendations', { signal })
  const fail = () => { throw new ApiError(0, '趣味の提案を確認できませんでした。') }
  if (!result || !['ready', 'no_experience', 'no_unseen_items'].includes(result.reason_code)
    || result.experience_basis !== 'purchases_and_listings') fail()
  if (result.recommendation === null) {
    if (result.reason_code === 'ready') fail()
    return result
  }
  const rec = result.recommendation
  if (!rec || result.reason_code !== 'ready' || typeof rec.source_cluster !== 'string'
    || typeof rec.target_cluster !== 'string' || rec.source_cluster === 'その他' || rec.target_cluster === 'その他'
    || rec.source_cluster === rec.target_cluster || typeof rec.reason_chip !== 'string' || !rec.reason_chip.trim()
    || !Number.isFinite(rec.score) || rec.score < 0 || rec.score > 1) fail()
  const item = readItem(rec.item)
  if (item.category !== rec.target_cluster || item.status !== 'available') fail()
  return { ...result, recommendation: { ...rec, item } }
}
