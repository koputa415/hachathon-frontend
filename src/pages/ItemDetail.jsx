import { useEffect, useState } from 'react'
import { Button, ItemCard } from '../components/index.js'
import { getItem } from '../api/items.js'
import { itemCardProps } from '../utils/itemPresentation.js'
import './pages.css'

export default function ItemDetail({ itemId, onShowListing, onRequirePurchase }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ attempt: -1, item: null, error: '', notFound: false })
  const [message, setMessage] = useState('')
  const loading = result.attempt !== attempt
  const item = result.item

  useEffect(() => {
    const controller = new AbortController()
    getItem(itemId, controller.signal).then((item) => {
      if (!controller.signal.aborted) setResult({ attempt, item, error: '', notFound: false })
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ attempt, item: null, error: error.message, notFound: error.status === 404 })
    })
    return () => controller.abort()
  }, [itemId, attempt])

  return (
    <div className="page-stack">
      <a className="page-link" href="#/">ホームに戻る</a>
      <h1>商品詳細</h1>
      {loading && <p role="status">商品を読み込んでいます…</p>}
      {!loading && result.notFound && <section className="page-panel page-stack">
        <h2>商品が見つかりません</h2>
        <p>URLを確認するか、ホームから商品を探してください。</p>
      </section>}
      {!loading && result.error && !result.notFound && <div className="page-error page-stack" role="alert">
        <p>{result.error}</p>
        <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>再試行</Button>
      </div>}
      {!loading && item && <div className="detail-grid">
        <section className="page-stack" aria-labelledby="product-title">
          <h2 id="product-title">商品情報</h2>
          <ItemCard {...itemCardProps(item)} />
        </section>
        <section className="page-panel page-stack" aria-labelledby="description-title">
          <h2 id="description-title">商品の説明</h2>
          <p className="page-preserve-lines">{item.description}</p>
          <dl className="detail-facts">
            <div><dt>趣味</dt><dd>{item.category}</dd></div>
            <div><dt>商品の状態</dt><dd>{item.condition}</dd></div>
            <div><dt>商品番号</dt><dd>{item.id}</dd></div>
          </dl>
          <Button onClick={() => {
            if (onRequirePurchase()) setMessage('サンプル表示のため、購入手続きは行いません。')
          }}>購入手続きへ</Button>
          <Button variant="secondary" onClick={onShowListing}>自分の道具も出品する</Button>
          {message && <p className="page-notice" role="status">{message}</p>}
        </section>
      </div>}
    </div>
  )
}
