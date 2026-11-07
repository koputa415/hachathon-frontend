import { useEffect, useState } from 'react'
import { Button, ItemCard } from '../components/index.js'
import { listPurchases } from '../api/purchases.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import './pages.css'

export default function PurchaseHistory() {
  const [request, setRequest] = useState({ cursor: null })
  const [page, setPage] = useState({ purchases: [], nextCursor: null, request: null, error: '' })
  const loading = page.request !== request
  useEffect(() => {
    const controller = new AbortController()
    listPurchases(request.cursor, controller.signal).then((result) => {
      if (!controller.signal.aborted) setPage((previous) => ({
        purchases: request.cursor === null ? result.purchases : [...previous.purchases, ...result.purchases],
        nextCursor: result.nextCursor, request, error: '',
      }))
    }).catch((error) => {
      if (!controller.signal.aborted) setPage((previous) => ({ ...previous, request, error: error.message }))
    })
    return () => controller.abort()
  }, [request])
  return <div className="page-stack">
    <h1>購入履歴</h1>
    <p className="page-muted">購入時の価格を表示しています。実際の決済は行われていません。</p>
    {loading && <p role="status">購入履歴を読み込んでいます…</p>}
    {!loading && page.error && <div className="page-error page-stack" role="alert">
      <p>{page.error}</p><Button variant="secondary" onClick={() => setRequest({ ...request })}>再試行</Button>
    </div>}
    {!loading && !page.error && page.purchases.length === 0 && <section className="page-panel page-stack">
      <p>まだ購入した商品はありません。</p><a className="page-link" href="#/">道具をさがす</a>
    </section>}
    <div className="item-grid">
      {page.purchases.map((purchase) => <section className="page-stack" key={purchase.id} aria-label={`購入番号 ${purchase.id}`}>
        <ItemCard {...itemCardProps(purchase.item)}
          priceLabel={new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(purchase.price)}
          href={`#/items/${purchase.item_id}`} />
        <p className="page-muted">購入番号：{purchase.id}</p>
        <a className="page-link" href={`#/purchases/${purchase.id}`}>購入結果を見る</a>
      </section>)}
    </div>
    {page.nextCursor !== null && !page.error && <div className="page-actions">
      <Button variant="secondary" disabled={loading} onClick={() => setRequest({ cursor: page.nextCursor })}>もっと見る</Button>
    </div>}
  </div>
}
