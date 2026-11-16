import { useEffect, useRef, useState } from 'react'
import { Button, StatusBadge } from '../components/index.js'
import { createPurchase } from '../api/purchases.js'
import { useItem } from '../hooks/useItem.js'
import { formatPrice } from '../utils/format.js'
import './pages.css'
import './Purchase.css'

export default function PurchaseConfirm({ itemId, userId, onRequireAuth, onComplete }) {
  const { item, loading, error, notFound, retry } = useItem(itemId)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState(null)
  const submitting = useRef(false)
  const request = useRef(null)
  useEffect(() => () => request.current?.abort(), [])
  const canPurchase = item?.status === 'available' && item.seller_id !== userId
    && !failure?.outcomeUnknown && ![403, 404, 409].includes(failure?.status)

  async function submit(event) {
    event.preventDefault()
    if (submitting.current || !canPurchase || !onRequireAuth()) return
    submitting.current = true
    setPending(true)
    setFailure(null)
    request.current = new AbortController()
    try {
      const purchase = await createPurchase(itemId, request.current.signal)
      if (!request.current.signal.aborted) onComplete(purchase.id)
    } catch (error) {
      if (error.name !== 'AbortError') {
        setFailure(error)
        if ([403, 404, 409].includes(error.status)) retry()
      }
    } finally {
      submitting.current = false
      if (!request.current.signal.aborted) setPending(false)
    }
  }

  return <div className="page-stack">
    <h1>購入内容の確認</h1>
    <p className="purchase-info">実際の決済は行われません。購入を確定すると商品は売却済みになり、購入履歴に記録されます。</p>
    {loading && <p role="status">商品を読み込んでいます…</p>}
    {!loading && error && <div className="page-error page-stack" role="alert">
      <p>{notFound ? '商品が見つかりません。' : error}</p>
      {!notFound && <Button variant="secondary" onClick={retry}>再試行</Button>}
    </div>}
    {!loading && item && <form className="page-panel purchase-form" onSubmit={submit} aria-busy={pending}>
      <div className="purchase-summary">
        <div className="purchase-thumb">
          {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>画像準備中</span>}
        </div>
        <div className="purchase-summary__body">
          <StatusBadge status={item.status} />
          <p className="purchase-summary__title">{item.title}</p>
        </div>
      </div>
      <div className="purchase-amount">
        <span className="purchase-amount__label">購入金額</span>
        <strong className="purchase-amount__value">{formatPrice(item.price)}</strong>
      </div>
      <p className="purchase-reassure">合わなければ購入履歴からワンタップで再出品できます。</p>
      {item.status === 'sold' && <p className="page-notice">この商品は売却済みのため購入できません。</p>}
      {item.seller_id === userId && <p className="page-notice">自分が出品した商品は購入できません。</p>}
      {failure && <div className="page-error page-stack" role="alert">
        <p>{failure.message}</p>
        {failure.outcomeUnknown && <Button variant="secondary" onClick={() => { setFailure(null); retry() }}>商品を再確認</Button>}
      </div>}
      <Button type="submit" size="lg" block disabled={pending || !canPurchase}>{pending ? '購入を記録しています…' : '購入を確定する'}</Button>
    </form>}
    {!loading && !item && failure && <div className="page-error page-stack" role="alert"><p>{failure.message}</p></div>}
    <div className="page-actions">
      <a className="page-link" href={`#/items/${itemId}`}>商品詳細に戻る</a>
      <a className="page-link" href="#/purchases">購入履歴を確認する</a>
    </div>
  </div>
}
