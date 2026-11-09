import { useEffect, useRef, useState } from 'react'
import { Button, ItemCard } from '../components/index.js'
import { createItem } from '../api/items.js'
import { useHobbyClusters } from '../hooks/useHobbyClusters.js'
import { usePricePrediction } from '../hooks/usePricePrediction.js'
import { useDescriptionDraft } from '../hooks/useDescriptionDraft.js'
import './pages.css'

const maxImageSize = 5 * 1024 * 1024
const imageTypes = ['image/jpeg', 'image/png', 'image/webp']

export default function ListingForm({ onRequireAuth, initialListing }) {
  const catalog = useHobbyClusters()
  const [predictionInput, setPredictionInput] = useState({ title: initialListing?.item.title || '', category: initialListing?.item.category || '', condition: '' })
  const prediction = usePricePrediction(predictionInput)
  const [sourcePurchaseId, setSourcePurchaseId] = useState(initialListing?.purchase_id || null)
  const [image, setImage] = useState(initialListing?.imageFile || null)
  const [description, setDescription] = useState(initialListing?.description.text || initialListing?.item.description || '')
  const [descriptionFromAI, setDescriptionFromAI] = useState(initialListing?.description.ai_generated || false)
  const descriptionField = useRef(null)
  const draft = useDescriptionDraft({ ...predictionInput, source_purchase_id: sourcePurchaseId }, image)
  const previewImage = useRef(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [created, setCreated] = useState(null)
  const request = useRef(null)
  const submitting = useRef(false)
  const result = useRef(null)

  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    if (!image || !previewImage.current) return
    const url = URL.createObjectURL(image)
    previewImage.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [image])
  useEffect(() => { if (created) result.current?.focus() }, [created])

  function updateImage(file) {
    setImage(file)
  }

  function resetFeedback() {
    setError('')
    setFieldErrors({})
  }

  function chooseImage(event) {
    const input = event.currentTarget
    const file = input.files[0]
    input.setCustomValidity('')
    updateImage(null)
    resetFeedback()
    if (!file) return
    const message = !imageTypes.includes(file.type) ? 'JPEG・PNG・WebP形式の画像を選んでください。'
      : file.size > maxImageSize ? '画像は5MB以下のファイルを選んでください。'
      : file.size === 0 ? '空のファイルは使えません。別の画像を選んでください。' : ''
    if (message) {
      input.setCustomValidity(message)
      setFieldErrors({ image: message })
      input.reportValidity()
      return
    }
    updateImage(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting.current || catalog.loading || catalog.error || !onRequireAuth()) return
    const form = event.currentTarget
    for (const name of ['title', 'description']) {
      const field = form.elements.namedItem(name)
      if (!field.value.trim()) {
        field.setCustomValidity('空白以外の文字を入力してください。')
        field.reportValidity()
        return
      }
    }
    if (!image) { setFieldErrors({ image: '画像を1枚選んでください。' }); return }
    const data = new FormData(form)
    const fields = {
      title: data.get('title').trim(), description: data.get('description').trim(),
      category: data.get('category'), condition: data.get('condition'), price: Number(data.get('price')),
    }
    resetFeedback()
    submitting.current = true
    setPending(true)
    request.current = new AbortController()
    try {
      const item = await createItem(fields, image, request.current.signal)
      setDescription('')
      setDescriptionFromAI(false)
      setSourcePurchaseId(null)
      setCreated(item)
      setPredictionInput({ title: '', category: '', condition: '' })
      updateImage(null)
    } catch (failure) {
      if (failure.name !== 'AbortError') {
        setError(failure.message)
        setFieldErrors(failure.fieldErrors || {})
      }
    } finally {
      submitting.current = false
      if (!request.current.signal.aborted) setPending(false)
    }
  }

  function fieldProps(name) {
    return { 'aria-invalid': Boolean(fieldErrors[name]), 'aria-describedby': fieldErrors[name] ? `listing-${name}-error` : undefined }
  }
  function fieldError(name) {
    return fieldErrors[name] && <p className="form-help" id={`listing-${name}-error`}>{fieldErrors[name]}</p>
  }

  return (
    <div className="page-stack">
      <h1>{sourcePurchaseId ? '購入した道具を再出品する' : '道具を出品する'}</h1>
      {sourcePurchaseId && <div className="page-notice page-stack">
        <p>以前の情報から下書きを用意しました。現在の状態と写真を確認し、説明・状態・価格を編集して出品してください。</p>
        {initialListing.description.status === 'unavailable' && <p>AIの再生成ができなかったため、以前の説明を表示しています。手入力で修正して出品できます。</p>}
        {!image && <p>以前の写真を引き継げませんでした。現在の写真を選んでください。</p>}
        {image === initialListing.imageFile && image && <p>以前の商品写真を引き継いでいます。現在の状態に合わせて差し替えられます。</p>}
        <a className="page-link" href="#/purchases">購入履歴に戻る</a>
      </div>}
      <p className="page-muted">次の誰かの、新しい趣味のきっかけに。</p>
      {created ? (
        <section className="page-stack" aria-labelledby="listing-result-title" ref={result} tabIndex={-1}>
          <h2 id="listing-result-title">出品が完了しました</h2>
          <p className="page-notice" role="status">商品番号：{created.id}。商品と画像を保存しました。</p>
          <div className="listing-preview"><ItemCard title={created.title} categoryLabel={created.category}
            priceLabel={new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(created.price)}
            imageSrc={created.imageUrl} imageAlt={created.title} status="available" /></div>
          <p>{created.condition}</p>
          <p className="page-preserve-lines">{created.description}</p>
          <div className="page-actions">
            <Button onClick={() => { setCreated(null); resetFeedback() }}>続けて出品する</Button>
            <a className="page-link" href={`#/items/${created.id}`}>商品詳細を見る</a>
            <a className="page-link" href="#/">ホームに戻る</a>
          </div>
        </section>
      ) : (
        <form className="page-panel page-stack listing-form" onSubmit={handleSubmit} aria-busy={pending}
          onReset={() => { updateImage(null); resetFeedback(); setSourcePurchaseId(null); setDescription(''); setDescriptionFromAI(false); setPredictionInput({ title: '', category: '', condition: '' }) }} onInput={(event) => {
            if (event.target.name !== 'image') event.target.setCustomValidity('')
          }}>
          <p>すべての項目を入力してください。画像は1枚、5MB以下のJPEG・PNG・WebPに対応しています。</p>
          <fieldset className="auth-fields page-stack" disabled={pending}>
            <legend className="auth-legend">出品する商品の情報</legend>
            <div className="form-field">
              <label htmlFor="listing-title">商品名</label>
              <input id="listing-title" name="title" value={predictionInput.title} onChange={(event) => setPredictionInput(previous => ({ ...previous, title: event.target.value }))} required maxLength={100} placeholder="例：フィルムカメラ" {...fieldProps('title')} />
              {fieldError('title')}
            </div>
            <div className="form-field">
              <label htmlFor="listing-description">商品の説明</label>
              <textarea id="listing-description" name="description" ref={descriptionField} value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={2000} required placeholder="道具の特徴や状態、付属品など" {...fieldProps('description')} />
              {descriptionFromAI && <p className="form-help">AIが生成した下書きを反映しました。内容を確認し、現在の状態に合わせて編集してください。</p>}
              {fieldError('description')}
            </div>
            <div className="form-field">
              <label htmlFor="listing-category">カテゴリ（趣味）</label>
              <select id="listing-category" name="category" value={predictionInput.category} onChange={(event) => setPredictionInput(previous => ({ ...previous, category: event.target.value }))} required disabled={catalog.loading || Boolean(catalog.error)} {...fieldProps('category')}>
                <option value="" disabled>選んでください</option>
                {catalog.clusters.map((cluster) => <option key={cluster.id} value={cluster.name}>{cluster.name}</option>)}
              </select>
              {catalog.loading && <p role="status">カテゴリを読み込んでいます…</p>}
              {catalog.error && <div className="page-error page-stack" role="alert">
                <p>{catalog.error}</p>
                <Button variant="secondary" onClick={catalog.retry}>カテゴリを再取得</Button>
              </div>}
              {fieldError('category')}
            </div>
            <div className="form-field">
              <label htmlFor="listing-condition">商品の状態</label>
              <select id="listing-condition" name="condition" value={predictionInput.condition} onChange={(event) => setPredictionInput(previous => ({ ...previous, condition: event.target.value }))} required {...fieldProps('condition')}>
                <option value="" disabled>選んでください</option>
                {['未使用に近い', '目立った傷や汚れなし', 'やや傷や汚れあり'].map((condition) => <option key={condition}>{condition}</option>)}
              </select>
              {fieldError('condition')}
            </div>
            <section className="page-notice page-stack" aria-labelledby="prediction-title" aria-live="polite">
              <h2 id="prediction-title">AIによる表示価格の予測</h2>
              {!prediction.ready && <p>商品名・カテゴリ・状態を入力すると、参考の表示価格を予測します。</p>}
              {prediction.loading && <p role="status">表示価格を予測しています…</p>}
              {prediction.value && <>
                <p><strong>{new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(prediction.value.predicted_price)}</strong></p>
                <p className="form-help">少数のデモ商品の円価格に合わせた参考値です。成約価格を保証するものではありません。出品価格はご自身で入力してください。</p>
              </>}
              {prediction.error && <div className="page-stack">
                <p>{prediction.error}</p>
                <Button variant="secondary" onClick={prediction.retry}>予測を再取得</Button>
              </div>}
            </section>
            <div className="form-field">
              <label htmlFor="listing-price">価格（円）</label>
              <input id="listing-price" name="price" type="number" min="1" max="999999999" step="1" required inputMode="numeric" placeholder="例：12000" {...fieldProps('price')} />
              {fieldError('price')}
            </div>
            <div className="form-field">
              <label htmlFor="listing-image">商品画像</label>
              <input id="listing-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!image} onChange={chooseImage} {...fieldProps('image')} />
              {fieldError('image')}
              {image && <img className="listing-image-preview" ref={previewImage} alt="選択した商品画像のプレビュー" onError={() => {
                updateImage(null)
                setFieldErrors({ image: '画像を読み取れませんでした。別の画像を選んでください。' })
              }} />}
            </div>
            <section className="page-notice page-stack" aria-labelledby="description-draft-title">
              <h2 id="description-draft-title">AIで商品説明を下書き</h2>
              <p className="form-help">写真・商品名・カテゴリをGeminiへ送って、説明文の下書きを作ります。生成後に内容を確認・編集できます。</p>
              <Button variant="secondary" disabled={!draft.ready || draft.loading} onClick={draft.generate}>
                {draft.loading ? '下書きを作っています…' : '説明文の下書きを生成'}
              </Button>
              {!draft.ready && <p className="form-help">写真・商品名・カテゴリを入力すると使えます。</p>}
              {draft.error && <p role="status">{draft.error}</p>}
              {draft.value?.status === 'unavailable' && <p role="status">現在、AIの下書きを生成できません。説明文を手入力して出品できます。</p>}
              {draft.value?.status === 'generated' && <div className="page-stack form-field" aria-live="polite">
                <label htmlFor="description-draft-preview">AIが生成した説明文の下書き</label>
                <textarea id="description-draft-preview" rows={6} readOnly value={draft.value.text} />
                <Button variant="secondary" onClick={() => {
                  setDescription(draft.value.text)
                  setDescriptionFromAI(true)
                  descriptionField.current?.setCustomValidity('')
                  descriptionField.current?.focus()
                }}>この下書きを説明欄に反映</Button>
                <p className="form-help">反映すると説明欄の文章が置き換わります。傷・付属品・動作などをご自身で確認して編集してください。</p>
              </div>}
            </section>
            <div className="page-actions">
              <Button type="submit" disabled={catalog.loading || Boolean(catalog.error)}>{pending ? '出品しています…' : '出品する'}</Button>
              <Button type="reset" variant="secondary">入力をクリア</Button>
            </div>
          </fieldset>
          {error && <p className="page-error" role="alert">{error}</p>}
        </form>
      )}
    </div>
  )
}
