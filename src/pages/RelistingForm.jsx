import { useEffect, useState } from 'react'
import { Button } from '../components/index.js'
import { loadSourcePhoto, prepareRelisting } from '../api/gemini.js'
import ListingForm from './ListingForm.jsx'

export default function RelistingForm({ purchaseId, onRequireAuth }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ attempt: -1, value: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    async function prepare() {
      try {
        const value = await prepareRelisting(purchaseId, controller.signal)
        let imageFile = null
        if (value.source_image_available) {
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
    <a className="page-link" href="#/purchases">購入履歴に戻る</a>
  </div>
  if (state.error) return <div className="page-stack">
    <h1>再出品の準備</h1><p className="page-error" role="alert">{state.error}</p>
    <Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>準備を再試行</Button>
    <a className="page-link" href="#/purchases">購入履歴に戻る</a>
    <a className="page-link" href="#/listing">新しく入力して出品する</a>
  </div>
  return <ListingForm key={attempt} initialListing={state.value} onRequireAuth={onRequireAuth} />
}
