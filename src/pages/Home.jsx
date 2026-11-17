import { useEffect, useState } from 'react'
import { Button, ItemCard, LikeButton, LikesFeedback } from '../components/index.js'
import { listItems } from '../api/items.js'
import { DiscoveryCard } from '../components/DiscoveryCard.jsx'
import { HobbyClusterChips } from '../components/HobbyClusterChips.jsx'
import { useHobbyClusters } from '../hooks/useHobbyClusters.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import { useRecommendations } from '../hooks/useRecommendations.js'
import { useItemLikes } from '../hooks/useItemLikes.js'
import './pages.css'
import './Home.css'

export default function Home({ onOpenItem, search, onSearch, userId, authStatus, onRequireAuth }) {
  const catalog = useHobbyClusters()
  const params = new URLSearchParams(search)
  const [filters, setFilters] = useState({ q: params.get('q') || '', category: params.get('category') || '' })
  const [request, setRequest] = useState({ cursor: null, q: filters.q, category: filters.category })
  const [syncedSearch, setSyncedSearch] = useState(search)
  // App が Home を再マウントしなくても、URL（例: #/?category=カメラ）の変更をフォームと一覧に反映する。
  // 提案（useRecommendations）は userId だけに依存するため、検索の変更では再取得しない。
  if (search !== syncedSearch) {
    const next = new URLSearchParams(search)
    const q = next.get('q') || '', category = next.get('category') || ''
    setSyncedSearch(search)
    setFilters({ q, category })
    setRequest((previous) => previous.q === q && previous.category === category ? previous : { cursor: null, q, category })
  }
  const [page, setPage] = useState({ items: [], nextCursor: null, request: null, error: '' })
  const likes = useItemLikes(page.items.map(item => item.id), userId, onRequireAuth)
  const loading = page.request !== request
  // 新しい条件の読み込み中は古い結果の代わりにスケルトンを出す。追加読み込み中は既存の商品を残す。
  const showSkeleton = loading && request.cursor === null
  const discovery = useRecommendations(userId)
  const suggested = discovery.value?.recommendation
  const allowed = (name) => name !== 'その他' && catalog.clusters.some((cluster) => cluster.name === name && cluster.recommendation_enabled)
  const recommendation = suggested && allowed(suggested.source_cluster) && allowed(suggested.target_cluster) ? suggested : null

  useEffect(() => {
    const controller = new AbortController()
    listItems(request.cursor, controller.signal, request).then((result) => {
      if (controller.signal.aborted) return
      setPage((previous) => ({
        items: request.cursor === null ? result.items : [...previous.items, ...result.items],
        nextCursor: result.nextCursor, request, error: '',
      }))
    }).catch((error) => {
      if (!controller.signal.aborted) setPage((previous) => ({ ...previous, request, error: error.message }))
    })
    return () => controller.abort()
  }, [request])

  return (
    <div className="page-stack home">
      <section className="home-hero" aria-labelledby="home-title">
        <h1 id="home-title" className="home-hero__title">まだ知らない趣味に、気軽に出会える。</h1>
        <p className="home-hero__sub">趣味道具のフリマアプリ。試して合わなければ、また売れる。</p>
      </section>
      <DiscoveryCard userId={userId} authStatus={authStatus} discovery={discovery} catalog={catalog}
        recommendation={recommendation} suggested={suggested} onOpenItem={onOpenItem} />
      <section className="page-stack" aria-labelledby="items-title">
        <h2 id="items-title">趣味の道具をさがす</h2>
        <HobbyClusterChips clusters={catalog.clusters} titleId="hobby-chips-title" current={request.category} />
        <form className="page-panel home-search" role="search" onSubmit={(event) => {
          event.preventDefault()
          if (catalog.loading || catalog.error) return
          const nextFilters = { ...filters, q: filters.q.trim() }
          // 同じURLでの再検索もDBへ再問い合わせする。
          if (nextFilters.q === request.q && nextFilters.category === request.category) setRequest({ ...request, cursor: null })
          else onSearch(nextFilters)
        }}>
          <div className="form-field home-search__field">
            <label htmlFor="items-search">キーワード</label>
            <input id="items-search" name="q" type="search" maxLength={100} placeholder="商品名・説明からさがす"
              value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
          </div>
          <div className="form-field home-search__field">
            <label htmlFor="items-category">カテゴリで絞り込む</label>
            <select id="items-category" name="category" value={filters.category}
              disabled={catalog.loading || Boolean(catalog.error)}
              onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
              <option value="">すべてのカテゴリ</option>
              {catalog.clusters.map((cluster) => <option key={cluster.id} value={cluster.name}>{cluster.name}</option>)}
            </select>
          </div>
          <div className="page-actions home-search__actions">
            <Button type="submit" disabled={catalog.loading || Boolean(catalog.error)}>検索する</Button>
            <a className="page-link" href="#/" onClick={() => {
              setFilters({ q: '', category: '' })
              setRequest({ cursor: null, q: '', category: '' })
            }}>条件をクリア</a>
          </div>
          {catalog.loading && <p className="home-search__note" role="status">カテゴリを読み込んでいます…</p>}
          {catalog.error && <div className="page-error page-stack home-search__note" role="alert">
            <p>{catalog.error}</p><Button variant="secondary" onClick={catalog.retry}>カテゴリを再取得</Button>
          </div>}
        </form>
        {loading && <p className="page-muted" role="status">商品を読み込んでいます…</p>}
        {page.error && !loading && <div className="page-error page-stack" role="alert">
          <p>{page.error}</p>
          <Button variant="secondary" onClick={() => setRequest({ ...request })}>再試行</Button>
        </div>}
        {!loading && !page.error && page.items.length === 0 && page.nextCursor === null && <div className="page-panel page-stack">
          <p>{request.q || request.category ? '条件に合う商品が見つかりませんでした。' : 'まだ商品が出品されていません。'}</p>
          {!request.q && !request.category && <a className="page-link" href="#/listing">最初の道具を出品する</a>}
        </div>}
        <LikesFeedback error={likes.error} onRetry={likes.retry} />
        <div className="item-grid" aria-busy={loading}>
          {showSkeleton && Array.from({ length: 6 }, (_, index) => <div key={index} className="home-skeleton" aria-hidden="true">
            <div className="home-skeleton__image" /><div className="home-skeleton__line" /><div className="home-skeleton__line home-skeleton__line--short" />
          </div>)}
          {!showSkeleton && page.items.map((item) => <ItemCard key={item.id} {...itemCardProps(item)} href={`#/items/${item.id}`} likeControl={
            <LikeButton title={item.title} state={likes.values[item.id]} pending={likes.busy[item.id]} onClick={() => likes.toggle(item.id)} />
          } />)}
        </div>
        {page.nextCursor !== null && !page.error && <div className="page-actions">
          <Button variant="secondary" disabled={loading} onClick={() => setRequest({ ...request, cursor: page.nextCursor })}>もっと見る</Button>
        </div>}
      </section>
    </div>
  )
}
