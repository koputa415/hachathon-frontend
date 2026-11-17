import { useEffect, useRef, useState } from 'react'
import { AdminAccessPanel, Button, ItemCard, LikeButton, LikesFeedback } from '../components/index.js'
import { HobbyMap } from '../components/HobbyMap.jsx'
import { RecentPurchases } from '../components/RecentPurchases.jsx'
import { checkAdminAccess } from '../api/admin.js'
import { listLikedItems } from '../api/likes.js'
import { useItemLikes } from '../hooks/useItemLikes.js'
import { useHobbyClusters } from '../hooks/useHobbyClusters.js'
import { usePurchaseSummary } from '../hooks/usePurchaseSummary.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import './pages.css'
import './MyPage.css'

export default function MyPage({ user, onRequireAuth }) {
  const [request, setRequest] = useState({ cursor: null })
  const [page, setPage] = useState({ likes: [], nextCursor: null, request: null, error: '' })
  const [adminCheck, setAdminCheck] = useState({ phase: 'idle', error: '' })
  const adminRequest = useRef(null)
  const adminPending = useRef(false)
  useEffect(() => () => adminRequest.current?.abort(), [])
  async function checkPermission() {
    if (user.role !== 'admin' || adminPending.current) return
    adminPending.current = true
    const controller = new AbortController()
    adminRequest.current = controller
    setAdminCheck({ phase: 'loading', error: '' })
    try {
      await checkAdminAccess(controller.signal)
      if (!controller.signal.aborted) setAdminCheck({ phase: 'allowed', error: '' })
    } catch (error) {
      if (!controller.signal.aborted && error.name !== 'AbortError') setAdminCheck({ phase: error.status === 403 ? 'forbidden' : 'error', error: error.message })
    } finally {
      adminPending.current = false
    }
  }
  const heading = useRef(null)
  const likes = useItemLikes(page.likes.map(row => row.item.id), user.id, onRequireAuth, itemId => {
    setPage(previous => ({ ...previous, likes: previous.likes.filter(row => row.item.id !== itemId) }))
    heading.current?.focus()
  })
  const loading = page.request !== request
  const purchases = usePurchaseSummary(user.id)
  const hobbies = useHobbyClusters()
  const purchasedNames = new Set(purchases.purchases.map(purchase => purchase.item.category))
  const enabledClusters = hobbies.clusters.filter(cluster => cluster.recommendation_enabled && cluster.name !== 'その他')
  const mapReady = purchases.complete && !purchases.loading && !purchases.error && !hobbies.loading && !hobbies.error
  // 件数は全件を読み終えたときだけ表示する（1ページ目の件数を合計に見せない）。
  const stats = [
    purchases.complete && !purchases.error && { label: '購入した道具', value: `${purchases.purchases.length}点` },
    mapReady && enabledClusters.length > 0 && { label: '購入した趣味', value: `${enabledClusters.filter(cluster => purchasedNames.has(cluster.name)).length} / ${enabledClusters.length}` },
    !loading && !page.error && page.nextCursor === null && { label: 'いいね', value: `${page.likes.length}件` },
  ].filter(Boolean)
  useEffect(() => {
    const controller = new AbortController()
    listLikedItems(request.cursor, controller.signal).then(value => {
      if (!controller.signal.aborted) setPage(previous => ({
        likes: request.cursor === null ? value.likes : [...previous.likes, ...value.likes],
        nextCursor: value.nextCursor, request, error: '',
      }))
    }).catch(error => {
      if (!controller.signal.aborted) setPage(previous => ({ ...previous, request, error: error.message }))
    })
    return () => controller.abort()
  }, [request])
  return <div className="page-stack">
    <h1>マイページ</h1>
    <section className="mypage-profile" aria-label="プロフィール">
      <div className="mypage-profile__identity">
        <span className="mypage-avatar" aria-hidden="true">{[...(user.display_name || '')][0] || ''}</span>
        <div className="mypage-profile__text">
          <p className="mypage-name">{user.display_name}さん</p>
          {user.email && <p className="mypage-email">{user.email}</p>}
        </div>
      </div>
      {stats.length > 0 && <dl className="mypage-stats">
        {stats.map(stat => <div className="mypage-stat" key={stat.label}>
          <dt>{stat.label}</dt><dd>{stat.value}</dd>
        </div>)}
      </dl>}
    </section>
    <nav className="mypage-nav" aria-label="マイページのメニュー">
      <Button as="a" variant="secondary" href="#/purchases">購入履歴を見る</Button>
      <Button as="a" variant="secondary" href="#/listing">出品する</Button>
    </nav>
    <div className="mypage-grid">
      <HobbyMap clusters={hobbies.clusters} purchasedNames={purchasedNames} complete={purchases.complete}
        loading={purchases.loading || hobbies.loading} error={purchases.error || hobbies.error}
        onRetry={() => { if (purchases.error) purchases.retry(); if (hobbies.error) hobbies.retry() }} />
      <RecentPurchases purchases={purchases.purchases.slice(0, 3)} loading={purchases.loading}
        error={purchases.error} onRetry={purchases.retry} />
    </div>
    <AdminAccessPanel role={user.role} phase={adminCheck.phase} error={adminCheck.error} onCheck={checkPermission} />
    <section className="mypage-likes page-stack" aria-labelledby="mypage-likes-title">
      <h2 id="mypage-likes-title" className="mypage-card__title" tabIndex={-1} ref={heading}>いいねした商品</h2>
      {loading && <p role="status">いいね一覧を読み込んでいます…</p>}
      {!loading && page.error && <div className="page-error page-stack" role="alert">
        <p>{page.error}</p><Button variant="secondary" onClick={() => setRequest({ ...request })}>再試行</Button>
      </div>}
      {!loading && !page.error && page.likes.length === 0 && page.nextCursor === null && <div className="page-panel page-stack">
        <p>まだいいねした商品はありません。</p><a className="page-link" href="#/">道具をさがす</a>
      </div>}
      <LikesFeedback error={likes.error} onRetry={likes.retry} />
      <div className="item-grid">
        {page.likes.map(row => <ItemCard key={row.id} {...itemCardProps(row.item)} href={`#/items/${row.item.id}`} likeControl={
          <LikeButton title={row.item.title} state={likes.values[row.item.id]} pending={likes.busy[row.item.id]} onClick={() => likes.toggle(row.item.id)} />
        } />)}
      </div>
      {page.nextCursor !== null && !page.error && <div className="page-actions">
        <Button variant="secondary" disabled={loading} onClick={() => setRequest({ cursor: page.nextCursor })}>もっと見る</Button>
      </div>}
    </section>
  </div>
}
