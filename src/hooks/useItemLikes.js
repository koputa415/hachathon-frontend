import { useEffect, useMemo, useRef, useState } from 'react'
import { getLikeStates, setLiked } from '../api/likes.js'

const changedEvent = 'hackathon:likes-changed'

export function useItemLikes(itemIds, userId, onRequireAuth, onUnliked) {
  const idsKey = JSON.stringify([...new Set(itemIds)])
  const ids = useMemo(() => JSON.parse(idsKey), [idsKey])
  const identity = userId || 'guest'
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ identity: null, values: {}, error: '' })
  const [writeError, setWriteError] = useState({ identity: null, message: '' })
  const [busy, setBusy] = useState({ identity: null, ids: {} })
  const pending = useRef(new Set())
  const revisions = useRef(new Map())
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    const changed = () => setAttempt(value => value + 1)
    window.addEventListener(changedEvent, changed)
    return () => {
      active.current = false
      window.removeEventListener(changedEvent, changed)
      // A submitted write is allowed to finish; its completion refreshes the next screen.
    }
  }, [])
  useEffect(() => {
    if (!ids.length) return
    const controller = new AbortController()
    const before = new Map(revisions.current)
    getLikeStates(ids, Boolean(userId), controller.signal).then(rows => {
      if (controller.signal.aborted) return
      const received = Object.fromEntries(rows.map(row => [row.item_id, row]))
      const missing = ids.some(id => !received[id])
      setState(previous => {
        const values = previous.identity === identity ? { ...previous.values } : {}
        for (const row of rows) {
          if (!pending.current.has(row.item_id) && (revisions.current.get(row.item_id) || 0) === (before.get(row.item_id) || 0)) values[row.item_id] = row
        }
        return { identity, values, error: missing ? '一部のいいね情報を取得できませんでした。' : '' }
      })
    }).catch(error => {
      if (!controller.signal.aborted) setState(previous => ({ identity, values: previous.identity === identity ? previous.values : {}, error: error.message }))
    })
    return () => controller.abort()
  }, [ids, userId, identity, attempt])

  async function toggle(itemId) {
    if (!onRequireAuth(itemId) || pending.current.has(itemId)) return
    const value = state.identity === identity ? state.values[itemId] : null
    if (!value) return
    setWriteError({ identity, message: '' })
    pending.current.add(itemId)
    revisions.current.set(itemId, (revisions.current.get(itemId) || 0) + 1)
    setBusy(previous => ({ identity, ids: { ...(previous.identity === identity ? previous.ids : {}), [itemId]: true } }))
    try {
      const result = await setLiked(itemId, !value.liked_by_me)
      if (active.current) {
        setState(previous => ({ identity, values: { ...(previous.identity === identity ? previous.values : {}), [itemId]: result }, error: '' }))
        if (!result.liked_by_me) onUnliked?.(itemId)
      }
    } catch (error) {
      if (active.current && error.name !== 'AbortError') setWriteError({ identity, message: error.message })
    } finally {
      pending.current.delete(itemId)
      revisions.current.set(itemId, (revisions.current.get(itemId) || 0) + 1)
      if (active.current) setBusy(previous => ({ ...previous, ids: { ...previous.ids, [itemId]: false } }))
      window.dispatchEvent(new Event(changedEvent))
    }
  }
  return {
    values: state.identity === identity ? state.values : {},
    busy: busy.identity === identity ? busy.ids : {},
    error: (writeError.identity === identity && writeError.message) || (state.identity === identity ? state.error : ''),
    toggle, retry: () => { setWriteError({ identity, message: '' }); setAttempt(value => value + 1) },
  }
}
