import { useEffect, useState } from 'react'
import { Button, ItemCard } from '../components/index.js'
import { listItems } from '../api/items.js'
import { useHobbyClusters } from '../hooks/useHobbyClusters.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import { useRecommendations } from '../hooks/useRecommendations.js'
import './pages.css'
import './Home.css'

export default function Home({ onOpenItem, search, onSearch, userId, authStatus }) {
  const catalog = useHobbyClusters()
  const params = new URLSearchParams(search)
  const [filters, setFilters] = useState({ q: params.get('q') || '', category: params.get('category') || '' })
  const [request, setRequest] = useState({ cursor: null, q: filters.q, category: filters.category })
  const [page, setPage] = useState({ items: [], nextCursor: null, request: null, error: '' })
  const loading = page.request !== request
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
    <div className="page-stack">
      <section className="page-stack" aria-labelledby="home-title">
        <h1 id="home-title">まだ知らない趣味に、気軽に出会える。</h1>
        <p className="page-muted">趣味道具のフリマアプリ。試して合わなければ、また売れる。</p>
      </section>
      <section className="discovery-feature" aria-labelledby="discovery-title">
        <h2 id="discovery-title">まだ知らない趣味{recommendation ? `：${recommendation.target_cluster}` : 'との出会い'}</h2>
        {authStatus === 'checking' && <p role="status">ログイン状態を確認しています…</p>}
        {!userId && authStatus !== 'checking' && <>
          <p>ログインすると、購入・出品した趣味から新しい趣味の入口を提案します。</p>
          <Button className="discovery-feature__cta" onClick={() => { window.location.hash = '#/login' }}>ログインして趣味を見つける</Button>
        </>}
        {userId && (discovery.loading || catalog.loading) && <p role="status">近い趣味を探しています…</p>}
        {discovery.error && <div className="page-stack">
          <p>{discovery.error}</p><Button variant="secondary" onClick={discovery.retry}>提案を再取得</Button>
        </div>}
        {recommendation && <>
          <span className="discovery-feature__chip">{recommendation.reason_chip}</span>
          <p>購入・出品した趣味から、まだ扱っていない趣味を提案しています。</p>
          <p>{recommendation.item.title}</p>
          <p className="page-muted">商品特徴と閲覧傾向をもとにした参考の提案です。</p>
          <Button className="discovery-feature__cta" onClick={() => onOpenItem(recommendation.item.id)}>この道具を見てみる</Button>
        </>}
        {discovery.value?.reason_code === 'no_experience' && <p>購入・出品した趣味がまだありません。道具との出会いを重ねると、近い新しい趣味を提案します。</p>}
        {discovery.value?.reason_code === 'no_unseen_items' && <p>今は新しく提案できる道具がありません。また見に来てください。</p>}
        {suggested && !recommendation && !catalog.loading && !catalog.error && <p>今は新しく提案できる道具がありません。</p>}
      </section>
      <section className="page-stack" aria-labelledby="items-title">
        <h2 id="items-title">趣味の道具をさがす</h2>
        <form className="page-panel page-stack" role="search" onSubmit={(event) => {
          event.preventDefault()
          if (catalog.loading || catalog.error) return
          const nextFilters = { ...filters, q: filters.q.trim() }
          // 同じURLでの再検索もDBへ再問い合わせする。
          if (nextFilters.q === request.q && nextFilters.category === request.category) setRequest({ ...request, cursor: null })
          else onSearch(nextFilters)
        }}>
          <div className="form-field">
            <label htmlFor="items-search">キーワード</label>
            <input id="items-search" name="q" type="search" maxLength={100} placeholder="商品名・説明からさがす"
              value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
          </div>
          <div className="form-field">
            <label htmlFor="items-category">カテゴリで絞り込む</label>
            <select id="items-category" name="category" value={filters.category}
              disabled={catalog.loading || Boolean(catalog.error)}
              onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
              <option value="">すべてのカテゴリ</option>
              {catalog.clusters.map((cluster) => <option key={cluster.id} value={cluster.name}>{cluster.name}</option>)}
            </select>
          </div>
          {catalog.loading && <p role="status">カテゴリを読み込んでいます…</p>}
          {catalog.error && <div className="page-error page-stack" role="alert">
            <p>{catalog.error}</p><Button variant="secondary" onClick={catalog.retry}>カテゴリを再取得</Button>
          </div>}
          <div className="page-actions">
            <Button type="submit" disabled={catalog.loading || Boolean(catalog.error)}>検索する</Button>
            <a className="page-link" href="#/" onClick={() => {
              setFilters({ q: '', category: '' })
              setRequest({ cursor: null, q: '', category: '' })
            }}>条件をクリア</a>
          </div>
        </form>
        {loading && <p role="status">商品を読み込んでいます…</p>}
        {page.error && !loading && <div className="page-error page-stack" role="alert">
          <p>{page.error}</p>
          <Button variant="secondary" onClick={() => setRequest({ ...request })}>再試行</Button>
        </div>}
        {!loading && !page.error && page.items.length === 0 && <div className="page-panel page-stack">
          <p>{request.q || request.category ? '条件に合う商品が見つかりませんでした。' : 'まだ商品が出品されていません。'}</p>
          {!request.q && !request.category && <a className="page-link" href="#/listing">最初の道具を出品する</a>}
        </div>}
        <div className="item-grid">
          {page.items.map((item) => <ItemCard key={item.id} {...itemCardProps(item)} href={`#/items/${item.id}`} />)}
        </div>
        {page.nextCursor !== null && !page.error && <div className="page-actions">
          <Button variant="secondary" disabled={loading} onClick={() => setRequest({ ...request, cursor: page.nextCursor })}>もっと見る</Button>
        </div>}
      </section>
    </div>
  )
}
