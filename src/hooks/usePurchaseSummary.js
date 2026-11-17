import { useEffect, useState } from 'react'
import { listPurchasesBatch } from '../api/purchases.js'

// 1ページ100件 × 20ページ（2,000件）を上限に、本人の購入履歴を最後まで読む。
// 上限に達したときは complete=false を返し、件数などの「全件」表示をしない。
const MAX_PAGES = 20

/** マイページの集計用に、本人の購入履歴を全ページ取得する。 */
export function usePurchaseSummary(userId) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ key: '', purchases: [], complete: false, error: '' })
  const key = JSON.stringify([userId, attempt])
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    ;(async () => {
      const purchases = []
      let cursor = null
      let complete = false
      for (let index = 0; index < MAX_PAGES; index += 1) {
        const page = await listPurchasesBatch(cursor, controller.signal)
        purchases.push(...page.purchases)
        if (page.nextCursor === null) { complete = true; break }
        cursor = page.nextCursor
      }
      return { purchases, complete }
    })().then(({ purchases, complete }) => {
      if (!controller.signal.aborted) setResult({ key, purchases, complete, error: '' })
    }).catch((error) => {
      if (!controller.signal.aborted && error.name !== 'AbortError') setResult({ key, purchases: [], complete: false, error: error.message })
    })
    return () => controller.abort()
  }, [userId, key])
  const loading = Boolean(userId) && result.key !== key
  return {
    loading,
    purchases: loading ? [] : result.purchases,
    complete: !loading && result.complete,
    error: loading ? '' : result.error,
    retry: () => setAttempt((value) => value + 1),
  }
}
