import { useEffect, useState } from 'react'
import { Button, ItemCard } from '../components/index.js'
import { listItems } from '../api/items.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import './pages.css'
import './Home.css'

export default function Home({ onOpenItem }) {
  const [request, setRequest] = useState({ cursor: null })
  const [page, setPage] = useState({ items: [], nextCursor: null, request: null, error: '' })
  const loading = page.request !== request
  const featuredItem = page.items[0]

  useEffect(() => {
    const controller = new AbortController()
    listItems(request.cursor, controller.signal).then((result) => {
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
      {featuredItem && (
        <section className="discovery-feature" aria-labelledby="discovery-title">
          <span className="discovery-feature__chip">趣味の入口：{featuredItem.category}</span>
          <h2 id="discovery-title">趣味の道具との出会いを、ここから。</h2>
          <p>出品された道具を見ながら、次に楽しみたい趣味を探してみませんか。</p>
          <p className="page-muted">{featuredItem.title}</p>
          <Button className="discovery-feature__cta" onClick={() => onOpenItem(featuredItem.id)}>
            この道具を見てみる
          </Button>
        </section>
      )}
      <section className="page-stack" aria-labelledby="items-title">
        <h2 id="items-title">趣味の道具をさがす</h2>
        {loading && <p role="status">商品を読み込んでいます…</p>}
        {page.error && !loading && <div className="page-error page-stack" role="alert">
          <p>{page.error}</p>
          <Button variant="secondary" onClick={() => setRequest({ ...request })}>再試行</Button>
        </div>}
        {!loading && !page.error && page.items.length === 0 && <div className="page-panel page-stack">
          <p>まだ商品が出品されていません。</p>
          <a className="page-link" href="#/listing">最初の道具を出品する</a>
        </div>}
        <div className="item-grid">
          {page.items.map((item) => <ItemCard key={item.id} {...itemCardProps(item)} href={`#/items/${item.id}`} />)}
        </div>
        {page.nextCursor !== null && !page.error && <div className="page-actions">
          <Button variant="secondary" disabled={loading} onClick={() => setRequest({ cursor: page.nextCursor })}>もっと見る</Button>
        </div>}
      </section>
    </div>
  )
}
