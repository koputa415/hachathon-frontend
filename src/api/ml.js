import { ApiError } from './client.js'
import { authenticatedRequest } from './session.js'

export async function predictPrice(fields, signal) {
  const result = await authenticatedRequest('/ml/price-prediction', { method: 'POST', body: fields, signal })
  if (!result || !Number.isSafeInteger(result.predicted_price) || result.predicted_price < 1
    || result.currency !== 'JPY' || result.label !== '表示価格の予測'
    || !Number.isSafeInteger(result.calibration_seed_count) || result.calibration_seed_count < 2) {
    throw new ApiError(0, '予測価格の応答を確認できませんでした。')
  }
  return result
}
