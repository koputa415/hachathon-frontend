import { useState } from 'react'
import { Button, ItemCard } from '../components/index.js'
import './pages.css'

export default function ListingForm({ categories }) {
  const [preview, setPreview] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    for (const name of ['title', 'description']) {
      const field = event.currentTarget.elements.namedItem(name)
      if (!field.value.trim()) {
        field.setCustomValidity('空白以外の文字を入力してください。')
        field.reportValidity()
        return
      }
    }
    const data = new FormData(event.currentTarget)
    setPreview({
      title: data.get('title').trim(),
      categoryLabel: data.get('category'),
      priceLabel: new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Number(data.get('price'))),
      description: data.get('description').trim(),
      condition: data.get('condition'),
      status: 'draft',
    })
  }

  return (
    <div className="page-stack">
      <h1>道具を出品する</h1>
      <p className="page-muted">次の誰かの、新しい趣味のきっかけに。</p>
      <form className="page-panel page-stack listing-form" onSubmit={handleSubmit} onReset={() => setPreview(null)} onInput={(event) => {
        event.target.setCustomValidity('')
        setPreview(null)
      }}>
        <p>すべての項目を入力してください。ここでは入力内容のプレビューを確認できます。</p>
        <div className="form-field">
          <label htmlFor="listing-title">商品名</label>
          <input id="listing-title" name="title" required maxLength={100} placeholder="例：フィルムカメラ" />
        </div>
        <div className="form-field">
          <label htmlFor="listing-category">趣味</label>
          <select id="listing-category" name="category" required defaultValue="">
            <option value="" disabled>選んでください</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="listing-condition">商品の状態</label>
          <select id="listing-condition" name="condition" required defaultValue="">
            <option value="" disabled>選んでください</option>
            {['未使用に近い', '目立った傷や汚れなし', 'やや傷や汚れあり'].map((condition) => <option key={condition}>{condition}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="listing-price">価格（円）</label>
          <input id="listing-price" name="price" type="number" min="1" max="999999999" step="1" required inputMode="numeric" placeholder="例：12000" />
        </div>
        <div className="form-field">
          <label htmlFor="listing-description">商品の説明</label>
          <textarea id="listing-description" name="description" rows={5} maxLength={2000} required placeholder="道具の特徴や状態、付属品など" />
        </div>
        <div className="page-actions">
          <Button type="submit">入力内容を確認する</Button>
          <Button type="reset" variant="secondary">入力をクリア</Button>
        </div>
      </form>
      {preview && (
        <section className="page-stack" aria-labelledby="listing-preview-title">
          <h2 id="listing-preview-title">入力内容のプレビュー</h2>
          <p className="page-notice" role="status">内容を確認しました。実際の出品は行っていません。</p>
          <div className="listing-preview"><ItemCard {...preview} /></div>
          <p>{preview.condition}</p>
          <p className="page-preserve-lines">{preview.description}</p>
        </section>
      )}
    </div>
  )
}
