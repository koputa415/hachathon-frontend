import { useState } from 'react'
import './App.css'

const API_URL =
  'https://curriculum-10-oki-hashimoto-6taoulgp3q-uc.a.run.app'

function App() {
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
    <main>
      <h1>AIチャットの履歴</h1>
      <p>CloudflareからFastAPIに接続して、履歴を取得します。</p>

      <button
        type="button"
        onClick={getHistory}
        disabled={loading}
      >
        {loading ? '取得中…' : '履歴を取得'}
      </button>

      {message && <p role="status">{message}</p>}

      {error && (
        <p role="alert" style={{ color: 'crimson' }}>
          {error}
        </p>
      )}

      <section aria-label="チャット履歴">
        {history.map((chat) => (
          <article
            key={chat.id}
            style={{
              border: '1px solid #888',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '16px',
              textAlign: 'left',
            }}
          >
            <h2>質問</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {chat.question}
            </p>

            <h2>回答</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {chat.answer}
            </p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
