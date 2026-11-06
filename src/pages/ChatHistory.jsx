import { useState } from 'react'
import { Button } from '../components/index.js'
import './pages.css'

const API_URL =
  'https://curriculum-10-oki-hashimoto-6taoulgp3q-uc.a.run.app'

function ChatHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // FastAPIから、DBに保存されている履歴を取得する
  const getHistory = async () => {
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(`${API_URL}/chats`)

      if (!response.ok) {
        throw new Error(`履歴の取得に失敗しました：HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        throw new Error('受け取ったデータが想定した形式ではありません')
      }

      setHistory(data)
      setMessage(`接続成功！ 履歴は${data.length}件です`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <h1>AIチャットの履歴</h1>
      <p>CloudflareからFastAPIに接続して、履歴を取得します。</p>

      <Button
        type="button"
        onClick={getHistory}
        disabled={loading}
      >
        {loading ? '取得中…' : '履歴を取得'}
      </Button>

      {message && <p role="status">{message}</p>}

      {error && (
        <p role="alert" className="page-error">
          {error}
        </p>
      )}

      <section className="page-stack" aria-label="チャット履歴">
        {history.map((chat) => (
          <article
            key={chat.id}
            className="page-panel page-stack"
          >
            <h2>質問</h2>
            <p className="page-preserve-lines">
              {chat.question}
            </p>

            <h2>回答</h2>
            <p className="page-preserve-lines">
              {chat.answer}
            </p>
          </article>
        ))}
      </section>
    </div>
  )
}

export default ChatHistory
