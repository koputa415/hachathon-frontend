import { useEffect } from 'react'
import { BottomNav, Button, Header } from './components/index.js'
import { useAuth } from './hooks/useAuth.js'
import { useHashRoute } from './hooks/useHashRoute.js'
import { loginHash, loginReturnTo } from './utils/authRedirect.js'
import Home from './pages/Home.jsx'
import ItemDetail from './pages/ItemDetail.jsx'
import ListingForm from './pages/ListingForm.jsx'
import Login from './pages/Login.jsx'
import PurchaseConfirm from './pages/PurchaseConfirm.jsx'
import PurchaseComplete from './pages/PurchaseComplete.jsx'
import PurchaseHistory from './pages/PurchaseHistory.jsx'
import './App.css'

export default function App() {
  const [route, navigate] = useHashRoute()
  const auth = useAuth()
  const path = route.split('?')[0]
  const purchaseMatch = path.match(/^#\/items\/([1-9]\d*)\/purchase$/)
  const receiptMatch = path.match(/^#\/purchases\/([1-9]\d*)$/)
  const protectedRoute = path === '#/listing' || path === '#/purchases' || Boolean(purchaseMatch || receiptMatch)
  const next = loginReturnTo(route)
  const navItems = [
    { id: 'home', label: 'ホーム', href: '#/' },
    { id: 'listing', label: '出品', href: '#/listing' },
    { id: 'purchases', label: '購入履歴', href: '#/purchases' },
    ...(!auth.isAuthenticated ? [{ id: 'login', label: 'ログイン', href: '#/login' }] : []),
  ]

  useEffect(() => {
    document.getElementById('page-content')?.focus()
    window.scrollTo(0, 0)
  }, [route])

  useEffect(() => {
    if ((window.location.hash || '#/') !== route) return
    if (protectedRoute && auth.status === 'anonymous') navigate(loginHash(path), true)
    if (path === '#/login' && auth.isAuthenticated) navigate(next, true)
  }, [route, path, next, protectedRoute, auth.status, auth.isAuthenticated, navigate])

  function requireAuth(returnTo) {
    if (auth.hasSession()) return true
    navigate(loginHash(returnTo))
    return false
  }

  let content
  let currentId
  if ((protectedRoute || path === '#/login') && auth.status === 'checking') {
    content = <p role="status">ログイン状態を確認中…</p>
  } else if (protectedRoute && auth.status === 'error') {
    content = <div className="page-stack"><h1>ログイン状態の確認が必要です</h1><Button onClick={() => navigate(loginHash(path))}>ログイン画面へ</Button></div>
  } else if ((protectedRoute && !auth.isAuthenticated) || path === '#/login') {
    currentId = 'login'
    content = auth.isAuthenticated ? <p role="status">移動しています…</p>
      : <Login key={protectedRoute ? path : next} auth={auth} returnTo={protectedRoute ? path : next} />
  } else if (path === '#/') {
    currentId = 'home'
    content = <Home key={`${route}-${auth.user?.id || 'guest'}`} userId={auth.user?.id} authStatus={auth.status} search={route.split('?')[1] || ''}
      onSearch={({ q, category }) => {
        const query = new URLSearchParams()
        if (q) query.set('q', q)
        if (category) query.set('category', category)
        navigate(query.size ? `#/?${query}` : '#/')
      }} onOpenItem={(id) => navigate(`#/items/${id}`)} />
  } else if (path === '#/listing') {
    currentId = 'listing'
    content = <ListingForm key={auth.user.id} onRequireAuth={() => requireAuth(path)} />
  } else if (purchaseMatch) {
    content = <PurchaseConfirm key={`${purchaseMatch[1]}-${auth.user.id}`} itemId={purchaseMatch[1]} userId={auth.user.id}
      onRequireAuth={() => requireAuth(path)} onComplete={(id) => navigate(`#/purchases/${id}`)} />
  } else if (path === '#/purchases') {
    currentId = 'purchases'
    content = <PurchaseHistory key={auth.user.id} />
  } else if (receiptMatch) {
    currentId = 'purchases'
    content = <PurchaseComplete key={`${receiptMatch[1]}-${auth.user.id}`} purchaseId={receiptMatch[1]} />
  } else {
    const match = path.match(/^#\/items\/([1-9]\d*)$/)
    content = match ? (
      <ItemDetail key={`${match[1]}-${auth.user?.id || 'guest'}`} itemId={match[1]} userId={auth.user?.id}
        onPurchase={() => { if (requireAuth(`${path}/purchase`)) navigate(`${path}/purchase`) }}
        onShowListing={() => navigate('#/listing')} />
    ) : (
      <div className="page-stack"><h1>ページが見つかりません</h1><a className="page-link" href="#/">ホームに戻る</a></div>
    )
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#page-content" onClick={(event) => {
        event.preventDefault()
        document.getElementById('page-content')?.focus()
      }}>本文へ移動</a>
      <Header homeHref="#/">
        {auth.isAuthenticated ? <>
          <span className="app-user-name">{auth.user.display_name}さん</span>
          <Button variant="secondary" onClick={() => { navigate('#/'); auth.logout() }}>ログアウト</Button>
        </> : <Button variant="secondary" disabled={auth.status === 'checking'} onClick={() => navigate(loginHash(path))}>ログイン</Button>}
        <Button variant="secondary" onClick={() => navigate('#/listing')}>出品する</Button>
      </Header>
      {auth.notice && <div className="app-auth-feedback page-stack" role={auth.status === 'error' ? 'alert' : 'status'}>
        <p>{auth.notice}</p>
        {auth.status === 'error' && <Button variant="secondary" onClick={() => { void auth.restoreSession() }}>再試行</Button>}
      </div>}
      <main className="app-main" id="page-content" tabIndex={-1}>{content}</main>
      <BottomNav items={navItems} currentId={currentId} />
    </div>
  )
}
