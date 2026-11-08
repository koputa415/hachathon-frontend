import { Button } from './Button.jsx'

export default function HobbyIntroCard({ category, loading, value, error, onRetry }) {
  if (!category || category === 'その他' || value?.status === 'excluded') return null
  return <section className="page-panel page-stack" aria-labelledby="hobby-intro-title">
    <h2 id="hobby-intro-title">{category}って？ 最初の一歩</h2>
    {loading && <p role="status">趣味の紹介を準備しています…</p>}
    {value && <>
      <p className="form-help">{value.ai_generated ? 'AIが生成した趣味の紹介です。' : '基本のヒント'}</p>
      <p className="page-preserve-lines">{value.text}</p>
    </>}
    {error && <>
      <p className="form-help">基本のヒント</p>
      <p>紹介を取得できませんでした。道具の使い方や必要な準備を調べ、小さな体験から始めてみましょう。</p>
      <Button variant="secondary" onClick={onRetry}>紹介を再取得</Button>
    </>}
  </section>
}
