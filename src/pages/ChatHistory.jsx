import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/index.js'
import './pages.css'

export default function ChatHistory({ loadHistory }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const controller = useRef()
  useEffect(() => () => controller.current?.abort(), [])

  async function getHistory() {
    controller.current?.abort()
    controller.current = new AbortController()
    setLoading(true)
    setMessage('')
    setError('')
    try {
      const data = await loadHistory(controller.current.signal)
      setHistory(data)
      setMessage(`履歴は${data.length}件です`)
    } catch (failure) {
      if (failure.name !== 'AbortError') setError(failure.message)
    } finally { setLoading(false) }
  }

  return <div className="page-stack">
    <h1>AIチャットの履歴</h1>
    <p>自分のチャット履歴を確認できます。</p>
    <Button onClick={getHistory} disabled={loading}>{loading ? '取得中…' : '履歴を取得'}</Button>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" className="page-error">{error}</p>}
    <section className="page-stack" aria-label="チャット履歴">
      {history.map((chat) => <article key={chat.id} className="page-panel page-stack">
        <h2>質問</h2><p className="page-preserve-lines">{chat.question}</p>
        <h2>回答</h2><p className="page-preserve-lines">{chat.answer}</p>
      </article>)}
    </section>
  </div>
}
