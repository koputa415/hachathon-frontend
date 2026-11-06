import { useState } from 'react'
import { Button, ItemCard } from '../components/index.js'
import './pages.css'

export default function ItemDetail({ item, onShowListing }) {
  const [message, setMessage] = useState('')

  return (
    <div className="page-stack">
      <a className="page-link" href="#/">ホームに戻る</a>
      <h1>商品詳細</h1>
      <div className="detail-grid">
        <section className="page-stack" aria-labelledby="product-title">
          <h2 id="product-title">商品情報</h2>
          <ItemCard {...item} />
        </section>
        <section className="page-panel page-stack" aria-labelledby="description-title">
          <h2 id="description-title">商品の説明</h2>
          <p>{item.description}</p>
          <dl className="detail-facts">
            <div><dt>趣味</dt><dd>{item.categoryLabel}</dd></div>
            <div><dt>商品の状態</dt><dd>{item.condition}</dd></div>
          </dl>
          <Button disabled={item.status !== 'available'} onClick={() => setMessage('サンプル表示のため、購入手続きは行いません。')}>
            {item.status === 'available' ? '購入手続きへ' : '売却済み'}
          </Button>
          <Button variant="secondary" onClick={onShowListing}>自分の道具も出品する</Button>
          {message && <p className="page-notice" role="status">{message}</p>}
        </section>
      </div>
    </div>
  )
}
