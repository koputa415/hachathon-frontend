import { useEffect, useRef, useState } from 'react'
import { Button, ItemCard, LikeButton, LikesFeedback } from '../components/index.js'
import { listLikedItems } from '../api/likes.js'
import { useItemLikes } from '../hooks/useItemLikes.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import './pages.css'

export default function MyPage({ user, onRequireAuth }) {
  const [request, setRequest] = useState({ cursor: null })
  const [page, setPage] = useState({ likes: [], nextCursor: null, request: null, error: '' })
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
    <p>{user.display_name}さん</p>
    <a className="page-link" href="#/purchases">購入履歴を見る</a>
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
