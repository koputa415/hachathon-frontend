import { useEffect, useMemo, useRef, useState } from 'react'
import { generateDescription } from '../api/gemini.js'

export function useDescriptionDraft({ title, category, condition, source_purchase_id }, image) {
  const input = useMemo(() => ({ fields: { title: title.trim(), category, ...(condition ? { condition } : {}), ...(source_purchase_id ? { source_purchase_id } : {}) }, image }), [title, category, condition, source_purchase_id, image])
  const [state, setState] = useState({ input: null, loading: false, value: null, error: '' })
  const request = useRef(null)
  useEffect(() => () => request.current?.abort(), [input])
  const ready = Boolean(input.fields.title && category && image)
  const current = state.input === input
  async function generate() {
    if (!ready || (current && state.loading)) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState({ input, loading: true, value: null, error: '' })
    try {
      const value = await generateDescription(input.fields, image, controller.signal)
      if (!controller.signal.aborted) setState({ input, loading: false, value, error: '' })
    } catch (error) {
      if (!controller.signal.aborted) setState({ input, loading: false, value: null, error: error.message })
    }
  }
  return { ready, loading: current && state.loading, value: current ? state.value : null, error: current ? state.error : '', generate }
}
