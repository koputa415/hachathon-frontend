import { Button } from './Button.jsx'
import { StatusBadge } from './StatusBadge.jsx'
import { formatDate, formatPrice } from '../utils/format.js'
import { relistedItemId } from '../api/purchases.js'

/**
 * マイページの「最近の購入」。新しい購入を数件だけ並べ、各行から再出品（試して合わなければ、また売れる）へつなぐ。
 * 再出品済みの購入は再出品の導線を出さず、「再出品済み」と再出品した商品へのリンクを示す。
 * 表示だけを担い、取得は親が行う。.ui-item-card は使わない（マイページのいいね一覧の件数と区別するため）。
 */
export function RecentPurchases({ purchases, loading, error, onRetry }) {
  return (
    <section className="mypage-card" aria-labelledby="recent-purchases-title" aria-busy={loading}>
      <div className="mypage-card__head">
        <h2 id="recent-purchases-title" className="mypage-card__title">最近の購入</h2>
        <p className="mypage-card__lead">合わなかったら、ワンタップで再出品。説明文はAIが作り直します。</p>
      </div>
      {loading && <p role="status" className="page-muted">最近の購入を読み込んでいます…</p>}
      {!loading && error && <div className="page-error mypage-error" role="alert">
        <p>{error}</p>
        <Button variant="secondary" onClick={onRetry}>最近の購入を再読み込み</Button>
      </div>}
      {!loading && !error && purchases.length === 0 && <div className="mypage-empty">
        <p className="mypage-card__text">まだ購入した道具はありません。</p>
        <a className="page-link" href="#/">気になる趣味の道具をさがす</a>
      </div>}
      {!loading && !error && purchases.length > 0 && <>
        <ul className="recent-purchases">
          {purchases.map((purchase) => {
            const titleId = `recent-purchase-${purchase.id}`
            const relistedId = relistedItemId(purchase)
            return <li className="recent-purchase" key={purchase.id}>
              <div className="recent-purchase__thumb">
                {purchase.item.imageUrl
                  ? <img src={purchase.item.imageUrl} alt="" loading="lazy" />
                  : <span className="recent-purchase__placeholder">画像準備中</span>}
              </div>
              <div className="recent-purchase__body">
                <div className="recent-purchase__meta">
                  <span>{purchase.item.category}</span>
                  <StatusBadge status={relistedId !== null ? 'relisted' : 'purchased'} />
                </div>
                <a id={titleId} className="recent-purchase__title" href={`#/items/${purchase.item_id}`}>{purchase.item.title}</a>
                <p className="recent-purchase__facts">
                  <span className="recent-purchase__price">{formatPrice(purchase.price)}</span>
                  <span>購入日 {formatDate(purchase.created_at)}</span>
                </p>
                {relistedId !== null
                  ? <a className="page-link recent-purchase__relisted" href={`#/items/${relistedId}`}
                    aria-describedby={titleId}>再出品した商品を見る</a>
                  : <Button as="a" className="recent-purchase__relist" href={`#/purchases/${purchase.id}/relist`}
                    aria-describedby={titleId}>この道具を再出品する</Button>}
              </div>
            </li>
          })}
        </ul>
        <a className="page-link mypage-card__more" href="#/purchases">購入履歴をすべて見る</a>
      </>}
    </section>
  )
}
