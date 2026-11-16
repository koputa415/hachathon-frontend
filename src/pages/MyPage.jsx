import { useEffect, useRef, useState } from 'react'
import { AdminAccessPanel, Button, ItemCard, LikeButton, LikesFeedback } from '../components/index.js'
import { checkAdminAccess } from '../api/admin.js'
import { listLikedItems } from '../api/likes.js'
import { useItemLikes } from '../hooks/useItemLikes.js'
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
    <div className="mypage-profile">
      <span className="mypage-avatar" aria-hidden="true">{[...(user.display_name || '')][0] || ''}</span>
      <p className="mypage-name">{user.display_name}さん</p>
    </div>
    <nav className="mypage-nav" aria-label="マイページのメニュー">
      <Button as="a" variant="secondary" href="#/purchases">購入履歴を見る</Button>
      <Button as="a" variant="secondary" href="#/listing">出品する</Button>
    </nav>
    <AdminAccessPanel role={user.role} phase={adminCheck.phase} error={adminCheck.error} onCheck={checkPermission} />
    <h2 tabIndex={-1} ref={heading}>いいねした商品</h2>
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
  </div>
}
