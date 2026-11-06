import { useEffect } from 'react'
import { BottomNav, Button, Header } from './components/index.js'
import { useAuth } from './hooks/useAuth.js'
import { useHashRoute } from './hooks/useHashRoute.js'
import { loginHash, loginReturnTo } from './utils/authRedirect.js'
import Home from './pages/Home.jsx'
import ItemDetail from './pages/ItemDetail.jsx'
import ListingForm from './pages/ListingForm.jsx'
import Login from './pages/Login.jsx'
import { demoItems, hobbyCategories } from './pages/demoData.js'
import './App.css'

export default function App() {
  const [route, navigate] = useHashRoute()
  const auth = useAuth()
  const path = route.split('?')[0]
  const protectedRoute = path === '#/listing'
  const next = loginReturnTo(route)
  const navItems = [
    { id: 'home', label: 'ホーム', href: '#/' },
    { id: 'listing', label: '出品', href: '#/listing' },
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
    content = <Home items={demoItems} onOpenItem={(id) => navigate(`#/items/${id}`)} />
  } else if (path === '#/listing') {
    currentId = 'listing'
    content = <ListingForm key={auth.user.id} categories={hobbyCategories} onRequireAuth={() => requireAuth(path)} />
  } else {
    const item = demoItems.find((candidate) => path === `#/items/${candidate.id}`)
    content = item ? (
      <ItemDetail key={`${item.id}-${auth.user?.id || 'guest'}`} item={item}
        onRequirePurchase={() => requireAuth(path)} onShowListing={() => navigate('#/listing')} />
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
      {path !== '#/login' && <p className="app-sample-note">サンプル表示：商品・おすすめ・出品フォームは表示確認用です。</p>}
      <main className="app-main" id="page-content" tabIndex={-1}>{content}</main>
      <BottomNav items={navItems} currentId={currentId} />
    </div>
  )
}
