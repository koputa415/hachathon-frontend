import { useSyncExternalStore } from 'react'

const routeEvent = 'hackathon:route-change'
const getSnapshot = () => window.location.hash || '#/'

function subscribe(listener) {
  window.addEventListener('hashchange', listener)
  window.addEventListener(routeEvent, listener)
  return () => {
    window.removeEventListener('hashchange', listener)
    window.removeEventListener(routeEvent, listener)
  }
}

function navigate(hash, replace = false) {
  if (replace) window.history.replaceState(null, '', hash)
  else window.location.hash = hash
  window.dispatchEvent(new Event(routeEvent))
}

export function useHashRoute() {
  return [useSyncExternalStore(subscribe, getSnapshot), navigate]
}
