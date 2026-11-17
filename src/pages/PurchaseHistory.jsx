import { useEffect, useState } from 'react'
import { Button, ItemCard, StatusBadge } from '../components/index.js'
import { listPurchases, relistedItemId } from '../api/purchases.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import { formatPrice, formatDate } from '../utils/format.js'
import './pages.css'
import './Purchase.css'

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
    <div className="purchase-list">
      {page.purchases.map((purchase) => <section className="purchase-row" key={purchase.id} aria-label={`購入番号 ${purchase.id}`}>
        <ItemCard {...itemCardProps(purchase.item)} status="purchased"
          priceLabel={formatPrice(purchase.price)}
          href={`#/items/${purchase.item_id}`} />
        <p className="purchase-date">購入日：{formatDate(purchase.created_at)}　購入番号：{purchase.id}</p>
        <div className="purchase-actions">
          {relistedItemId(purchase) !== null ? <div className="purchase-relisted">
            <StatusBadge status="relisted" />
            <p className="purchase-relisted__text">この道具は再出品しました。</p>
            <a className="page-link" href={`#/items/${relistedItemId(purchase)}`}>再出品した商品を見る</a>
          </div> : <>
            <Button as="a" href={`#/purchases/${purchase.id}/relist`}>この道具を再出品する</Button>
            <p className="purchase-actions__help">合わなかったら、ワンタップで再出品。説明文はAIが作り直します。</p>
          </>}
          <a className="page-link" href={`#/purchases/${purchase.id}`}>購入結果を見る</a>
        </div>
      </section>)}
    </div>
    {page.nextCursor !== null && !page.error && <div className="page-actions">
      <Button variant="secondary" disabled={loading} onClick={() => setRequest({ cursor: page.nextCursor })}>もっと見る</Button>
    </div>}
  </div>
}
