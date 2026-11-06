import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BottomNav, Button, Header, ItemCard, StatusBadge } from '../index.js'
import './preview.css'

const items = [
  { title: 'はじめてのフィルムカメラ', categoryLabel: 'カメラ', priceLabel: '¥12,000', status: 'available', reason: 'アウトドアが好きなあなたに、景色を残す楽しみを。' },
  { title: '週末に持ち出したいソロテント', categoryLabel: 'アウトドア', priceLabel: '¥8,500', status: 'sold' },
  { title: 'おうちで楽しむアコースティックギター', categoryLabel: '楽器', priceLabel: '¥15,000', status: 'trading' },
]
const navItems = [
  { id: 'home', label: 'ホーム', href: '#home' },
  { id: 'search', label: 'さがす', href: '#search' },
  { id: 'listing', label: '出品', href: '#listing' },
  { id: 'account', label: 'マイページ', href: '#account' },
]

export default function ComponentsPreview() {
  const [message, setMessage] = useState('ボタンや下部ナビを選んで動作を確認できます。')
  const [currentId, setCurrentId] = useState('home')

  return (
    <div className="components-preview">
      <Header homeHref="#top">
        <Button variant="secondary" onClick={() => setMessage('ログインボタンを選択しました。')}>ログイン</Button>
      </Header>
      <main className="preview-main" id="top">
        <div>
          <p className="preview-eyebrow">T1-2 / 共通部品</p>
          <h1>共通部品のプレビュー</h1>
          <p>仮データによる表示確認です。API通信・購入・出品は行いません。</p>
        </div>
        <section aria-labelledby="buttons-title">
          <h2 id="buttons-title">ボタン</h2>
          <div className="preview-row">
            <Button onClick={() => setMessage('プライマリボタンを選択しました。')}>プライマリ</Button>
            <Button variant="secondary" onClick={() => setMessage('セカンダリボタンを選択しました。')}>セカンダリ</Button>
            <Button disabled>プライマリ（無効）</Button>
            <Button variant="secondary" disabled>セカンダリ（無効）</Button>
          </div>
        </section>
        <section aria-labelledby="badges-title">
          <h2 id="badges-title">状態バッジ</h2>
          <div className="preview-row">
            {['available', 'sold', 'trading', 'draft', 'unknown'].map((status) => <StatusBadge key={status} status={status} />)}
          </div>
        </section>
        <section aria-labelledby="cards-title" id="cards">
          <h2 id="cards-title">商品カード</h2>
          <div className="preview-grid">
            {items.map((item) => <ItemCard key={item.title} {...item} href="#cards" />)}
          </div>
        </section>
        <section aria-labelledby="nav-title">
          <h2 id="nav-title">下部ナビ</h2>
          <BottomNav
            items={navItems}
            currentId={currentId}
            onNavigate={(event, item) => {
              event.preventDefault()
              setCurrentId(item.id)
              setMessage(`下部ナビ：${item.label}を選択しました。`)
            }}
          />
        </section>
        <p className="preview-feedback" role="status">{message}</p>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode><ComponentsPreview /></StrictMode>,
)
