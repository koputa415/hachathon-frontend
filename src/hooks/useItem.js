import { useEffect, useState } from 'react'
import { getItem } from '../api/items.js'

export function useItem(itemId) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ attempt: -1, itemId: null, item: null, error: '', notFound: false })
  const loading = result.attempt !== attempt || result.itemId !== itemId
  useEffect(() => {
    const controller = new AbortController()
    getItem(itemId, controller.signal).then((item) => {
      if (!controller.signal.aborted) setResult({ attempt, itemId, item, error: '', notFound: false })
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ attempt, itemId, item: null, error: error.message, notFound: error.status === 404 })
    })
    return () => controller.abort()
  }, [itemId, attempt])
  return { ...result, item: loading ? null : result.item, loading,
    retry: () => setAttempt((value) => value + 1) }
}
