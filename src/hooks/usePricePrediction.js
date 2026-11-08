import { useEffect, useState } from 'react'
import { predictPrice } from '../api/ml.js'

export function usePricePrediction({ title, category, condition }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ key: '', value: null, error: '' })
  const key = JSON.stringify([title.trim(), category, condition, attempt])
  const ready = Boolean(title.trim() && category && condition)
  useEffect(() => {
    if (!ready) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      predictPrice({ title: title.trim(), category, condition }, controller.signal).then((value) => {
        if (!controller.signal.aborted) setState({ key, value, error: '' })
      }).catch((error) => {
        if (!controller.signal.aborted) setState({ key, value: null, error: error.message })
      })
    }, 500)
    return () => { clearTimeout(timer); controller.abort() }
  }, [title, category, condition, key, ready])
  return {
    ready, loading: ready && state.key !== key,
    value: ready && state.key === key ? state.value : null,
    error: ready && state.key === key ? state.error : '',
    retry: () => setAttempt((value) => value + 1),
  }
}
