import { useEffect, useState } from 'react'
import { getHobbyClusters } from '../api/hobbyClusters.js'

export function useHobbyClusters() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ attempt: -1, clusters: [], error: '' })
  const loading = result.attempt !== attempt
  useEffect(() => {
    const controller = new AbortController()
    getHobbyClusters(controller.signal).then((clusters) => {
      if (!controller.signal.aborted) setResult({ attempt, clusters, error: '' })
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ attempt, clusters: [], error: error.message })
    })
    return () => controller.abort()
  }, [attempt])
  return { clusters: loading ? [] : result.clusters, loading, error: loading ? '' : result.error,
    retry: () => setAttempt((previous) => previous + 1) }
}
