import { ApiError, apiRequest } from './client.js'

export async function getHobbyClusters(signal) {
  let clusters
  try {
    clusters = await apiRequest('/hobby-clusters', { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(error.status || 0, 'カテゴリを取得できませんでした。接続先を確認して、もう一度お試しください。')
  }
  if (!Array.isArray(clusters) || clusters.length === 0
    || clusters.some((cluster) => !cluster || !Number.isSafeInteger(cluster.id) || cluster.id <= 0
      || typeof cluster.name !== 'string' || !cluster.name.trim() || cluster.name.length > 20
      || typeof cluster.recommendation_enabled !== 'boolean')
    || new Set(clusters.map(({ id }) => id)).size !== clusters.length
    || new Set(clusters.map(({ name }) => name)).size !== clusters.length) {
    throw new ApiError(0, 'カテゴリの応答を確認できませんでした。もう一度お試しください。')
  }
  return clusters
}
