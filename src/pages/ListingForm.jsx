import { useEffect, useRef, useState } from 'react'
import { Button, ItemCard } from '../components/index.js'
import { createItem } from '../api/items.js'
import './pages.css'

const maxImageSize = 5 * 1024 * 1024
const imageTypes = ['image/jpeg', 'image/png', 'image/webp']

export default function ListingForm({ categories, onRequireAuth }) {
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [created, setCreated] = useState(null)
  const request = useRef(null)
  const submitting = useRef(false)
  const result = useRef(null)

  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])
  useEffect(() => { if (created) result.current?.focus() }, [created])

  function updateImage(file) {
    setImage(file)
    setImagePreview(file ? URL.createObjectURL(file) : '')
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
    if (submitting.current || !onRequireAuth()) return
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
      setCreated(item)
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
      <h1>道具を出品する</h1>
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
            <a className="page-link" href="#/">ホームに戻る</a>
          </div>
        </section>
      ) : (
        <form className="page-panel page-stack listing-form" onSubmit={handleSubmit} aria-busy={pending}
          onReset={() => { updateImage(null); resetFeedback() }} onInput={(event) => {
            if (event.target.name !== 'image') event.target.setCustomValidity('')
          }}>
          <p>すべての項目を入力してください。画像は1枚、5MB以下のJPEG・PNG・WebPに対応しています。</p>
          <fieldset className="auth-fields page-stack" disabled={pending}>
            <legend className="auth-legend">出品する商品の情報</legend>
            <div className="form-field">
              <label htmlFor="listing-title">商品名</label>
              <input id="listing-title" name="title" required maxLength={100} placeholder="例：フィルムカメラ" {...fieldProps('title')} />
              {fieldError('title')}
            </div>
            <div className="form-field">
              <label htmlFor="listing-description">商品の説明</label>
              <textarea id="listing-description" name="description" rows={5} maxLength={2000} required placeholder="道具の特徴や状態、付属品など" {...fieldProps('description')} />
              {fieldError('description')}
            </div>
            <div className="form-field">
              <label htmlFor="listing-category">カテゴリ（趣味）</label>
              <select id="listing-category" name="category" required defaultValue="" {...fieldProps('category')}>
                <option value="" disabled>選んでください</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
              {fieldError('category')}
            </div>
            <div className="form-field">
              <label htmlFor="listing-condition">商品の状態</label>
              <select id="listing-condition" name="condition" required defaultValue="" {...fieldProps('condition')}>
                <option value="" disabled>選んでください</option>
                {['未使用に近い', '目立った傷や汚れなし', 'やや傷や汚れあり'].map((condition) => <option key={condition}>{condition}</option>)}
              </select>
              {fieldError('condition')}
            </div>
            <div className="form-field">
              <label htmlFor="listing-price">価格（円）</label>
              <input id="listing-price" name="price" type="number" min="1" max="999999999" step="1" required inputMode="numeric" placeholder="例：12000" {...fieldProps('price')} />
              {fieldError('price')}
            </div>
            <div className="form-field">
              <label htmlFor="listing-image">商品画像</label>
              <input id="listing-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required onChange={chooseImage} {...fieldProps('image')} />
              {fieldError('image')}
              {imagePreview && <img className="listing-image-preview" src={imagePreview} alt="選択した商品画像のプレビュー" onError={() => {
                updateImage(null)
                setFieldErrors({ image: '画像を読み取れませんでした。別の画像を選んでください。' })
              }} />}
            </div>
            <div className="page-actions">
              <Button type="submit">{pending ? '出品しています…' : '出品する'}</Button>
              <Button type="reset" variant="secondary">入力をクリア</Button>
            </div>
          </fieldset>
          {error && <p className="page-error" role="alert">{error}</p>}
        </form>
      )}
    </div>
  )
}
