import { Button } from './Button.jsx'

export function LikesFeedback({ error, onRetry }) {
  if (!error) return null
  return <div className="page-notice page-stack" role="status">
    <p>{error}</p><Button variant="secondary" onClick={onRetry}>いいね情報を再取得</Button>
  </div>
}
