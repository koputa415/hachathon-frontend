import { Button } from './Button.jsx'

export function LikeButton({ title, state, pending = false, onClick }) {
  const liked = Boolean(state?.liked_by_me)
  return <Button variant="secondary" className="ui-like-button" aria-pressed={liked} aria-busy={pending}
    aria-label={`${title}を${liked ? 'いいね解除' : 'いいね'}${state ? `（${state.like_count}件）` : ''}`}
    disabled={!state || pending} onClick={onClick}>
    <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
    <span>いいね</span><span>{state ? state.like_count : '…'}</span>
  </Button>
}
