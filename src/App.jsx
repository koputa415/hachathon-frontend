import { useEffect, useState } from 'react'
import { BottomNav, Button, Header } from './components/index.js'
import Home from './pages/Home.jsx'
import ItemDetail from './pages/ItemDetail.jsx'
import ListingForm from './pages/ListingForm.jsx'
import ChatHistory from './pages/ChatHistory.jsx'
import { demoItems, hobbyCategories } from './pages/demoData.js'
import './App.css'

const navItems = [
  { id: 'home', label: 'ホーム', href: '#/' },
  { id: 'listing', label: '出品', href: '#/listing' },
  { id: 'history', label: 'チャット履歴', href: '#/chat-history' },
]

function navigate(hash) {
  window.location.hash = hash
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || '#/')

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  useEffect(() => {
    document.getElementById('page-content')?.focus()
    window.scrollTo(0, 0)
  }, [route])

  let content
  let currentId
  if (route === '#/') {
    currentId = 'home'
    content = <Home items={demoItems} onOpenItem={(id) => navigate(`#/items/${id}`)} />
  } else if (route === '#/listing') {
    currentId = 'listing'
    content = <ListingForm categories={hobbyCategories} />
  } else if (route === '#/chat-history') {
    currentId = 'history'
    content = <ChatHistory />
  } else {
    const item = demoItems.find((candidate) => route === `#/items/${candidate.id}`)
    content = item ? (
      <ItemDetail key={item.id} item={item} onShowListing={() => navigate('#/listing')} />
    ) : (
      <div className="page-stack"><h1>ページが見つかりません</h1><a className="page-link" href="#/">ホームに戻る</a></div>
    )
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#page-content" onClick={(event) => {
        event.preventDefault()
        document.getElementById('page-content')?.focus()
      }}>本文へ移動</a>
      <Header homeHref="#/">
        <Button variant="secondary" onClick={() => navigate('#/listing')}>出品する</Button>
      </Header>
      {route !== '#/chat-history' && <p className="app-sample-note">サンプル表示：商品・おすすめ・出品フォームは表示確認用です。</p>}
      <main className="app-main" id="page-content" tabIndex={-1}>{content}</main>
      <BottomNav items={navItems} currentId={currentId} />
    </div>
  )
}
