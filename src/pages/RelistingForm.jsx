import { useEffect, useState } from 'react'
import { Button } from '../components/index.js'
import { loadSourcePhoto, prepareRelisting } from '../api/gemini.js'
import { getPurchase, relistedItemId, supportsRelistLink } from '../api/purchases.js'
import ListingForm from './ListingForm.jsx'
import './pages.css'
import './ListingForm.css'
import './Purchase.css'

const steps = [
  { id: 'info', label: '購入情報の読み込み' },
  { id: 'photo', label: '写真の引き継ぎ' },
  { id: 'draft', label: 'Geminiが説明文を再生成' },
]
// 購入情報で再出品済みか確認してから下書きを生成し、その後に写真を読み込む。
function stepState(id, phase) {
  if (phase === 'photo') return id === 'photo' ? 'active' : 'done'
  return id === 'photo' ? 'pending' : 'active'
}

export default function RelistingForm({ purchaseId, onRequireAuth }) {
  const [attempt, setAttempt] = useState(0)
  const [phase, setPhase] = useState('prepare')
  const [state, setState] = useState({ attempt: -1, value: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    async function prepare() {
      setPhase('prepare')
      try {
        // 再出品済みの購入は下書き（Gemini）を作らず、案内だけを表示する。
        let purchase
        try { purchase = await getPurchase(purchaseId, controller.signal) }
        catch (error) {
          if (error.status === 404) error.message = '再出品できる購入記録が見つかりません。'
          throw error
        }
        if (relistedItemId(purchase) !== null) {
          if (!controller.signal.aborted) setState({ attempt, value: null, error: '', relistedItemId: relistedItemId(purchase) })
          return
        }
        const value = await prepareRelisting(purchaseId, controller.signal)
        // 旧APIは再出品元の指定を受け付けないため、購入記録が relisted_item_id を返す場合だけ送る。
        value.linkPurchase = supportsRelistLink(purchase)
        let imageFile = null
        if (value.source_image_available) {
          setPhase('photo')
          try { imageFile = await loadSourcePhoto(value.item, controller.signal) }
          catch (error) { if (controller.signal.aborted) throw error }
        }
        if (!controller.signal.aborted) setState({ attempt, value: { ...value, imageFile }, error: '' })
      } catch (error) {
        if (!controller.signal.aborted) setState({ attempt, value: null, error: error.message, errorCode: error.code || '' })
      }
    }
    const timer = setTimeout(() => { void prepare() }, 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [purchaseId, attempt])
  if (state.attempt !== attempt) return <div className="page-stack">
    <h1>再出品の下書きを準備しています</h1>
    <p role="status">購入した道具の情報から、新しい説明文を作っています…</p>
    <p className="page-muted">最大で1分ほどかかることがあります。このままお待ちください。</p>
    <ol className="listing-steps" aria-live="polite" aria-label="準備の進み具合">
      {steps.map((step, index) => {
        const status = stepState(step.id, phase)
        return <li key={step.id} className="listing-step" data-state={status}>
          <span className="listing-step-mark" aria-hidden="true">{status === 'done' ? '✓' : index + 1}</span>
          <span>{step.label}{status === 'active' ? '（進行中）' : status === 'done' ? '（完了）' : ''}</span>
        </li>
      })}
    </ol>
    <div className="listing-skeleton" aria-hidden="true" />
    <a className="page-link" href="#/purchases">購入履歴に戻る</a>
  </div>
  if (state.relistedItemId || state.errorCode === 'purchase_already_relisted') return <div className="page-stack">
    <h1>再出品の準備</h1>
    <section className="purchase-relisted-notice" aria-labelledby="relisted-notice-title">
      <h2 id="relisted-notice-title">この道具は再出品済みです</h2>
      <p>同じ購入から再出品できるのは1回だけです。再出品した商品の内容は商品ページで確認できます。</p>
      <div className="listing-secondary-links">
        {state.relistedItemId && <a className="page-link" href={`#/items/${state.relistedItemId}`}>再出品した商品を見る</a>}
        <a className="page-link" href="#/purchases">購入履歴に戻る</a>
      </div>
    </section>
  </div>
  if (state.error) return <div className="page-stack">
    <h1>再出品の準備</h1><p className="page-error" role="alert">{state.error}</p>
    <div className="page-actions">
      <Button onClick={() => setAttempt(value => value + 1)}>準備を再試行</Button>
    </div>
    <div className="listing-secondary-links">
      <a className="page-link" href="#/purchases">購入履歴に戻る</a>
      <a className="page-link" href="#/listing">新しく入力して出品する</a>
    </div>
  </div>
  return <ListingForm key={attempt} initialListing={state.value} onRequireAuth={onRequireAuth} />
}
