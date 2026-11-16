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
import RelistingForm from './pages/RelistingForm.jsx'
import MyPage from './pages/MyPage.jsx'
import './App.css'

/* ナビゲーション用の単色アイコン。色は currentColor で文字色に追従する。 */
const iconPaths = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  listing: 'M12 5v14M5 12h14',
  purchases: 'M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0',
  mypage: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  login: 'M10 17l5-5-5-5M15 12H3M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5',
}

function NavIcon({ name }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={iconPaths[name]} />
    </svg>
  )
}

export default function App() {
  const [route, navigate] = useHashRoute()
  const auth = useAuth()
  const path = route.split('?')[0]
  const purchaseMatch = path.match(/^#\/items\/([1-9]\d*)\/purchase$/)
  const relistMatch = path.match(/^#\/purchases\/([1-9]\d*)\/relist$/)
  const receiptMatch = path.match(/^#\/purchases\/([1-9]\d*)$/)
  const protectedRoute = path === '#/listing' || path === '#/mypage' || path === '#/purchases' || Boolean(purchaseMatch || receiptMatch || relistMatch)
  const next = loginReturnTo(route)
  const primaryNavItems = [
    { id: 'home', label: 'ホーム', href: '#/', icon: <NavIcon name="home" /> },
    { id: 'listing', label: '出品', href: '#/listing', icon: <NavIcon name="listing" /> },
    { id: 'purchases', label: '購入履歴', href: '#/purchases', icon: <NavIcon name="purchases" /> },
    { id: 'mypage', label: 'マイページ', href: '#/mypage', icon: <NavIcon name="mypage" /> },
  ]
  const navItems = [
    ...primaryNavItems,
    ...(!auth.isAuthenticated ? [{ id: 'login', label: 'ログイン', href: '#/login', icon: <NavIcon name="login" /> }] : []),
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
    content = <Home key={`home-${auth.user?.id || 'guest'}`} userId={auth.user?.id} authStatus={auth.status} onRequireAuth={(id) => requireAuth(`#/items/${id}`)} search={route.split('?')[1] || ''}
      onSearch={({ q, category }) => {
        const query = new URLSearchParams()
        if (q) query.set('q', q)
        if (category) query.set('category', category)
        navigate(query.size ? `#/?${query}` : '#/')
      }} onOpenItem={(id) => navigate(`#/items/${id}`)} />
  } else if (path === '#/mypage') {
    currentId = 'mypage'
    content = <MyPage key={auth.user.id} user={auth.user} onRequireAuth={() => requireAuth(path)} />
  } else if (relistMatch) {
    currentId = 'listing'
    content = <RelistingForm key={`${relistMatch[1]}-${auth.user.id}`} purchaseId={relistMatch[1]} onRequireAuth={() => requireAuth(path)} />
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
        onShowListing={() => navigate('#/listing')} onRequireAuth={() => requireAuth(path)} />
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
      {/* ヘッダーのナビゲーションは 761px 以上、下部ナビは 760px 以下で表示する（App.css）。 */}
      <Header homeHref="#/" navItems={primaryNavItems} currentId={currentId}>
        {auth.isAuthenticated ? <>
          <span className="app-user-name">{auth.user.display_name}さん</span>
          <Button variant="secondary" onClick={() => { navigate('#/'); auth.logout() }}>ログアウト</Button>
        </> : <Button as="a" variant="secondary" href={loginHash(path)}
          aria-disabled={auth.status === 'checking' || undefined}
          onClick={auth.status === 'checking' ? (event) => event.preventDefault() : undefined}>ログイン</Button>}
        {/* モバイルでは下部ナビの「出品」に集約する。e2e がボタンとして操作するため button のまま残す。 */}
        <Button className="app-header-listing" onClick={() => navigate('#/listing')}>出品する</Button>
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
