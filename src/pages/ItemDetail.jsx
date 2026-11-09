import { Button, ItemCard, HobbyIntroCard, LikeButton, LikesFeedback } from '../components/index.js'
import { useItem } from '../hooks/useItem.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import { useHobbyIntroduction } from '../hooks/useHobbyIntroduction.js'
import { useItemLikes } from '../hooks/useItemLikes.js'
import './pages.css'

export default function ItemDetail({ itemId, userId, onShowListing, onPurchase, onRequireAuth }) {
  const { item, loading, error, notFound, retry } = useItem(itemId)
  const likes = useItemLikes(item ? [item.id] : [], userId, onRequireAuth)
  const introduction = useHobbyIntroduction(itemId, item?.category)
  return (
    <div className="page-stack">
      <a className="page-link" href="#/">ホームに戻る</a>
      <h1>商品詳細</h1>
      {loading && <p role="status">商品を読み込んでいます…</p>}
      {!loading && notFound && <section className="page-panel page-stack">
        <h2>商品が見つかりません</h2>
        <p>URLを確認するか、ホームから商品を探してください。</p>
      </section>}
      {!loading && error && !notFound && <div className="page-error page-stack" role="alert">
        <p>{error}</p>
        <Button variant="secondary" onClick={retry}>再試行</Button>
      </div>}
      {!loading && item && <div className="detail-grid">
        <section className="page-stack" aria-labelledby="product-title">
          <h2 id="product-title">商品情報</h2>
          <ItemCard {...itemCardProps(item)} likeControl={<LikeButton title={item.title} state={likes.values[item.id]} pending={likes.busy[item.id]} onClick={() => likes.toggle(item.id)} />} />
          <LikesFeedback error={likes.error} onRetry={likes.retry} />
        </section>
        <section className="page-panel page-stack" aria-labelledby="description-title">
          <h2 id="description-title">商品の説明</h2>
          <p className="page-preserve-lines">{item.description}</p>
          <dl className="detail-facts">
            <div><dt>趣味</dt><dd>{item.category}</dd></div>
            <div><dt>商品の状態</dt><dd>{item.condition}</dd></div>
            <div><dt>商品番号</dt><dd>{item.id}</dd></div>
          </dl>
          {item.status === 'sold' ? <p className="page-notice">この商品は売却済みです。</p>
            : item.seller_id === userId ? <p className="page-notice">自分が出品した商品は購入できません。</p>
            : <Button onClick={onPurchase}>購入手続きへ</Button>}
          <Button variant="secondary" onClick={onShowListing}>自分の道具も出品する</Button>
        </section>
      </div>}
      {!loading && item && <HobbyIntroCard category={item.category} {...introduction} onRetry={introduction.retry} />}
    </div>
  )
}
