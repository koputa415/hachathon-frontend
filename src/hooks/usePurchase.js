import { useEffect, useState } from 'react'
import { getPurchase } from '../api/purchases.js'

export function usePurchase(purchaseId) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ attempt: -1, purchaseId: null, purchase: null, error: '', notFound: false })
  const loading = result.attempt !== attempt || result.purchaseId !== purchaseId
  useEffect(() => {
    const controller = new AbortController()
    getPurchase(purchaseId, controller.signal).then((purchase) => {
      if (!controller.signal.aborted) setResult({ attempt, purchaseId, purchase, error: '', notFound: false })
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ attempt, purchaseId, purchase: null, error: error.message, notFound: error.status === 404 })
    })
    return () => controller.abort()
  }, [purchaseId, attempt])
  return { ...result, purchase: loading ? null : result.purchase, loading,
    retry: () => setAttempt((value) => value + 1) }
}
