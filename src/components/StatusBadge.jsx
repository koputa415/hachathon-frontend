import './components.css'

const labels = {
  available: '販売中',
  sold: '売却済み',
  trading: '取引中',
  draft: '下書き',
}

/** API の状態値との対応付けは呼び出し側で行う。 */
export function StatusBadge({ status = 'available', className = '' }) {
  const appearance = Object.hasOwn(labels, status) ? status : 'unknown'

  return (
    <span className={`ui-status-badge ui-status-badge--${appearance} ${className}`.trim()}>
      {labels[appearance] ?? '状態未設定'}
    </span>
  )
}
