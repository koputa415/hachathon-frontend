import { useEffect, useSyncExternalStore } from 'react'
import * as session from '../api/session.js'

export function useAuth() {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  useEffect(() => {
    void session.restoreSession()
    const checkExpiry = () => session.hasSession()
    window.addEventListener('focus', checkExpiry)
    return () => window.removeEventListener('focus', checkExpiry)
  }, [])
  return { ...state, ...session, isAuthenticated: state.status === 'authenticated' }
}
