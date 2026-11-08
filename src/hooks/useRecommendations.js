import { useEffect, useState } from 'react'
import { getRecommendations } from '../api/recommendations.js'

export function useRecommendations(userId) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ key: '', value: null, error: '' })
  const key = JSON.stringify([userId, attempt])
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    getRecommendations(controller.signal).then((value) => {
      if (!controller.signal.aborted) setState({ key, value, error: '' })
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ key, value: null, error: error.message })
    })
    return () => controller.abort()
  }, [userId, key])
  return {
    loading: Boolean(userId) && state.key !== key,
    value: userId && state.key === key ? state.value : null,
    error: userId && state.key === key ? state.error : '',
    retry: () => setAttempt((value) => value + 1),
  }
}
