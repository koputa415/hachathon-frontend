import { useEffect, useState } from 'react'
import { getHobbyIntroduction } from '../api/gemini.js'

export function useHobbyIntroduction(itemId, category) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ key: '', value: null, error: '' })
  const key = JSON.stringify([itemId, category, attempt])
  const enabled = Boolean(category && category !== 'その他')
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    getHobbyIntroduction(itemId, category, controller.signal).then(value => {
      if (!controller.signal.aborted) setState({ key, value, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, value: null, error: error.message })
    })
    return () => controller.abort()
  }, [itemId, category, key, enabled])
  return {
    loading: enabled && state.key !== key, value: state.key === key ? state.value : null,
    error: state.key === key ? state.error : '', retry: () => setAttempt(value => value + 1),
  }
}
