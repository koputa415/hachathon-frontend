import { Button, ItemCard } from '../components/index.js'
import { usePurchase } from '../hooks/usePurchase.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import './pages.css'

export default function PurchaseComplete({ purchaseId }) {
  const { purchase, loading, error, notFound, retry } = usePurchase(purchaseId)
  return <div className="page-stack">
    <h1>購入結果</h1>
    {loading && <p role="status">購入記録を確認しています…</p>}
    {!loading && error && <div className="page-error page-stack" role="alert">
      <p>{notFound ? '購入記録が見つかりません。購入履歴を確認してください。' : error}</p>
      {!notFound && <Button variant="secondary" onClick={retry}>再試行</Button>}
    </div>}
    {!loading && purchase && <section className="page-panel page-stack" aria-labelledby="purchase-complete-title">
      <h2 id="purchase-complete-title">購入が完了しました</h2>
      <p>購入記録を保存しました。実際の決済は行われていません。</p>
      <p>購入番号：{purchase.id}</p>
      <div className="listing-preview"><ItemCard {...itemCardProps(purchase.item)}
        priceLabel={new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(purchase.price)}
        href={`#/items/${purchase.item_id}`} /></div>
    </section>}
    <div className="page-actions">
      <a className="page-link" href="#/purchases">購入履歴を見る</a>
      <a className="page-link" href="#/">ホームに戻る</a>
    </div>
  </div>
}
