import { useEffect, useState } from 'react'
import { Button } from '../components/index.js'
import { loadSourcePhoto, prepareRelisting } from '../api/gemini.js'
import ListingForm from './ListingForm.jsx'
import './pages.css'
import './ListingForm.css'

const steps = [
  { id: 'info', label: '購入情報の読み込み' },
  { id: 'photo', label: '写真の引き継ぎ' },
  { id: 'draft', label: 'Geminiが説明文を再生成' },
]
// 購入情報の取得とGeminiの再生成は1回のAPI呼び出しで行われ、その後に写真を読み込む。
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
        const value = await prepareRelisting(purchaseId, controller.signal)
        let imageFile = null
        if (value.source_image_available) {
          setPhase('photo')
          try { imageFile = await loadSourcePhoto(value.item, controller.signal) }
          catch (error) { if (controller.signal.aborted) throw error }
        }
        if (!controller.signal.aborted) setState({ attempt, value: { ...value, imageFile }, error: '' })
      } catch (error) {
        if (!controller.signal.aborted) setState({ attempt, value: null, error: error.message })
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
