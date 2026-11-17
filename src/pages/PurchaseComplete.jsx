import { Button, ItemCard, StatusBadge } from '../components/index.js'
import { usePurchase } from '../hooks/usePurchase.js'
import { relistedItemId } from '../api/purchases.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import { formatPrice } from '../utils/format.js'
import './pages.css'
import './Purchase.css'

export default function PurchaseComplete({ purchaseId }) {
  const { purchase, loading, error, notFound, retry } = usePurchase(purchaseId)
  return <div className="page-stack">
    {loading && <p role="status">購入記録を確認しています…</p>}
    {!loading && error && <div className="page-error page-stack" role="alert">
      <p>{notFound ? '購入記録が見つかりません。購入履歴を確認してください。' : error}</p>
      {!notFound && <Button variant="secondary" onClick={retry}>再試行</Button>}
    </div>}
    {!loading && purchase && <>
      <section className="purchase-success" aria-labelledby="purchase-complete-title">
        <svg className="purchase-success__icon" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-7" />
        </svg>
        <h1 id="purchase-complete-title">購入が完了しました</h1>
        <p>購入記録を保存しました。実際の決済は行われていません。</p>
        <p className="purchase-number">購入番号：{purchase.id}</p>
      </section>
      <div className="listing-preview"><ItemCard {...itemCardProps(purchase.item)}
        priceLabel={formatPrice(purchase.price)}
        href={`#/items/${purchase.item_id}`} /></div>
      {relistedItemId(purchase) !== null ? <section className="purchase-relisted-notice" aria-labelledby="purchase-relisted-title">
        <h2 id="purchase-relisted-title">この道具は再出品済みです</h2>
        <StatusBadge status="relisted" />
        <a className="page-link" href={`#/items/${relistedItemId(purchase)}`}>再出品した商品を見る</a>
      </section> : <section className="purchase-relist" aria-labelledby="purchase-relist-title">
        <h2 id="purchase-relist-title">試して合わなければ、また売れる。</h2>
        <p>使ってみて合わなかったら購入履歴からワンタップで再出品できます。</p>
        <Button as="a" variant="secondary" href={`#/purchases/${purchase.id}/relist`}>この道具を再出品する</Button>
      </section>}
    </>}
    <div className="page-actions">
      <a className="page-link" href="#/purchases">購入履歴を見る</a>
      <a className="page-link" href="#/">次の趣味をさがす</a>
    </div>
  </div>
}
