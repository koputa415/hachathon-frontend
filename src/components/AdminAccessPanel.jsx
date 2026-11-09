import { Button } from './Button.jsx'

// Presentation only. Every operation is independently authorized by the API.
export function AdminAccessPanel({ role, phase, error, onCheck }) {
  if (role !== 'admin') return null
  return <section className="page-panel page-stack" aria-labelledby="admin-access-title" aria-busy={phase === 'loading'}>
    <h2 id="admin-access-title">管理者向けの確認</h2>
    <p>管理者向け機能へのアクセスを確認できます。</p>
    {phase !== 'forbidden' && <div className="page-actions">
      <Button variant="secondary" disabled={phase === 'loading'} onClick={onCheck}>
        {phase === 'loading' ? '確認しています…' : '管理者権限を確認'}
      </Button>
    </div>}
    {phase === 'allowed' && <p role="status">管理者向けの確認が完了しました。</p>}
    {error && <p className="page-error" role="alert">{error}</p>}
  </section>
}
