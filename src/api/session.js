import { authenticate, getCurrentUser } from './auth.js'

const storageKey = 'hackathon.auth.session'
const expiredMessage = 'ログインの有効期限が切れました。もう一度ログインしてください。'
const listeners = new Set()
let snapshot = { status: 'checking', user: null, notice: '' }
let session = readSession()
let generation = 0
let controller
let restorePromise
let expiryTimer

function readSession() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(storageKey))
    return value && typeof value.token === 'string' && value.token && Number.isFinite(value.expiresAt)
      ? { token: value.token, expiresAt: value.expiresAt } : null
  } catch { return null }
}

function saveSession(value) {
  try {
    if (value) window.sessionStorage.setItem(storageKey, JSON.stringify(value))
    else window.sessionStorage.removeItem(storageKey)
    return true
  } catch { return false }
}

function publish(value) {
  snapshot = value
  listeners.forEach((listener) => listener())
}

function cancelOperation() {
  generation += 1
  controller?.abort()
  restorePromise = undefined
  window.clearTimeout(expiryTimer)
}

export function logout(notice = '') {
  cancelOperation()
  session = null
  saveSession(null)
  publish({ status: 'anonymous', user: null, notice })
}

function beginOperation() {
  cancelOperation()
  controller = new AbortController()
  return { id: generation, signal: controller.signal }
}

function acceptSession(value, user, notice = '') {
  session = value
  expiryTimer = window.setTimeout(() => logout(expiredMessage), Math.min(value.expiresAt - Date.now(), 2147483647))
  publish({ status: 'authenticated', user, notice })
}

export function hasSession() {
  if (snapshot.status !== 'authenticated') return false
  if (!session || session.expiresAt <= Date.now()) {
    logout(expiredMessage)
    return false
  }
  return true
}

export function restoreSession() {
  if (restorePromise) return restorePromise
  if (!session || session.expiresAt <= Date.now()) {
    logout(session ? expiredMessage : '')
    return Promise.resolve(false)
  }
  const candidate = session
  const operation = beginOperation()
  publish({ status: 'checking', user: null, notice: '' })
  const promise = (async () => {
    try {
      const user = await getCurrentUser(candidate.token, operation.signal)
      if (operation.id !== generation) return false
      if (candidate.expiresAt <= Date.now()) { logout(expiredMessage); return false }
      acceptSession(candidate, user)
      return true
    } catch (error) {
      if (operation.id !== generation || error.name === 'AbortError') return false
      if (error.status === 401) logout(expiredMessage)
      else publish({ status: 'error', user: null, notice: 'ログイン状態を確認できませんでした。接続を確認して再試行してください。' })
      return false
    } finally {
      if (restorePromise === promise) restorePromise = undefined
    }
  })()
  restorePromise = promise
  return promise
}

async function signIn(mode, credentials) {
  logout()
  const operation = beginOperation()
  try {
    const value = await authenticate(mode, credentials, operation.signal)
    const user = await getCurrentUser(value.token, operation.signal)
    if (operation.id !== generation) return false
    const saved = saveSession(value)
    acceptSession(value, user, saved ? '' : 'この環境では、再読み込みするとログアウトします。')
    return true
  } catch (error) {
    if (operation.id !== generation || error.name === 'AbortError') return false
    logout()
    throw error
  }
}

export const login = (credentials) => signIn('login', credentials)
export const register = (credentials) => signIn('register', credentials)

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getSnapshot = () => snapshot
