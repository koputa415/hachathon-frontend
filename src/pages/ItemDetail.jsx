import { useRef, useState } from 'react'
import { Button, StatusBadge, HobbyIntroCard, LikeButton, LikesFeedback, ImageLightbox } from '../components/index.js'
import { useItem } from '../hooks/useItem.js'
import { useHobbyIntroduction } from '../hooks/useHobbyIntroduction.js'
import { useItemLikes } from '../hooks/useItemLikes.js'
import { formatPrice } from '../utils/format.js'
import './pages.css'
import './ItemDetail.css'

export default function ItemDetail({ itemId, userId, onPurchase, onRequireAuth }) {
  const { item, loading, error, notFound, retry } = useItem(itemId)
  const likes = useItemLikes(item ? [item.id] : [], userId, onRequireAuth)
  const introduction = useHobbyIntroduction(itemId, item?.category)
  const [zoomed, setZoomed] = useState(false)
  const trigger = useRef(null)
  const sold = item?.status === 'sold'
  const own = item?.seller_id === userId
  return (
    <div className="page-stack" aria-busy={loading}>
      <a className="page-link" href="#/">ホームに戻る</a>
      {loading && <p role="status">商品を読み込んでいます…</p>}
      {!loading && notFound && <section className="page-panel page-stack">
        <h1>商品が見つかりません</h1>
        <p>URLを確認するか、ホームから商品を探してください。</p>
      </section>}
      {!loading && error && !notFound && <div className="page-error page-stack" role="alert">
        <p>{error}</p>
        <Button variant="secondary" onClick={retry}>再試行</Button>
      </div>}
      {!loading && item && <article className="detail-layout">
        <figure className="detail-figure">
          {item.imageUrl
            ? <button type="button" ref={trigger} className="detail-figure__zoom" aria-label="写真を拡大表示" onClick={() => setZoomed(true)}>
              <img src={item.imageUrl} alt={item.title} />
            </button>
            : <span className="detail-figure__placeholder">画像準備中</span>}
          {zoomed && item.imageUrl && <ImageLightbox src={item.imageUrl} title={item.title} onClose={() => { setZoomed(false); trigger.current?.focus() }} />}
        </figure>
        <div className="detail-main">
          <div className="detail-meta">
            <StatusBadge status={item.status} />
            <span className="detail-category">{item.category}</span>
          </div>
          <h1 className="detail-title">{item.title}</h1>
          <p className="detail-price">{formatPrice(item.price)}</p>
          <div className="detail-cta">
            {sold ? <>
              <p className="page-notice">この商品は売却済みです。</p>
              <Button as="a" block href={`#/?category=${encodeURIComponent(item.category)}`}>似た趣味の道具をさがす</Button>
            </> : own ? <p className="page-notice">自分が出品した商品は購入できません。</p>
              : <Button size="lg" block onClick={onPurchase}>購入手続きへ</Button>}
            <LikeButton title={item.title} state={likes.values[item.id]} pending={likes.busy[item.id]} onClick={() => likes.toggle(item.id)} />
            <LikesFeedback error={likes.error} onRetry={likes.retry} />
          </div>
        </div>
        <div className="detail-body">
          <section className="detail-section" aria-labelledby="description-title">
            <h2 id="description-title">商品の説明</h2>
            <p className="page-preserve-lines">{item.description}</p>
          </section>
          <HobbyIntroCard category={item.category} {...introduction} onRetry={introduction.retry} />
          <dl className="detail-facts">
            <div><dt>趣味</dt><dd>{item.category}</dd></div>
            <div><dt>商品の状態</dt><dd>{item.condition}</dd></div>
          </dl>
          <p className="detail-number">商品番号 {item.id}</p>
          <Button as="a" variant="secondary" href="#/listing">自分の道具も出品する</Button>
        </div>
      </article>}
    </div>
  )
}
