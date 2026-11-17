import { Button } from './Button.jsx'

/**
 * マイページの「あなたの趣味マップ」。5つの趣味（その他と recommendation_enabled=false を除く）を、
 * 購入した趣味／これから出会う趣味に分けてカテゴリ絞り込みリンクとして並べる。表示だけを担う。
 * purchasedNames は親が購入履歴の商品カテゴリから作った Set。
 */
export function HobbyMap({ clusters, purchasedNames, complete, loading, error, onRetry }) {
  const enabled = clusters.filter((cluster) => cluster.recommendation_enabled && cluster.name !== 'その他')
  const tried = enabled.filter((cluster) => purchasedNames.has(cluster.name))
  const ready = !loading && !error
  return (
    <section className="mypage-card" aria-labelledby="hobby-map-title" aria-busy={loading}>
      <div className="mypage-card__head">
        <h2 id="hobby-map-title" className="mypage-card__title">あなたの趣味マップ</h2>
        {ready && complete && enabled.length > 0 && <p className="mypage-card__lead">
          {enabled.length}つの趣味のうち <strong className="hobby-map__count">{tried.length}つ</strong> を購入しています
        </p>}
      </div>
      {loading && <p role="status" className="page-muted">趣味マップを読み込んでいます…</p>}
      {!loading && error && <div className="page-error mypage-error" role="alert">
        <p>{error}</p>
        <Button variant="secondary" onClick={onRetry}>趣味マップを再読み込み</Button>
      </div>}
      {ready && <>
        <ul className="hobby-map">
          {enabled.map((cluster) => {
            const known = purchasedNames.has(cluster.name)
            return <li key={cluster.id}>
              <a className={`hobby-map__tile hobby-map__tile--${known ? 'tried' : 'new'}`}
                href={`#/?${new URLSearchParams({ category: cluster.name })}`}>
                <span className="hobby-map__name">{cluster.name}</span>
                <span className="hobby-map__state">
                  {known && <svg className="hobby-map__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>}
                  {known ? '購入した趣味' : complete ? 'これから出会う趣味' : '未確認の趣味'}
                </span>
              </a>
            </li>
          })}
        </ul>
        {tried.length === 0
          ? <p className="mypage-card__text">{complete ? 'まだ購入した趣味はありません。気になる趣味をえらんで、道具をのぞいてみましょう。' : '取得できた購入履歴には趣味クラスタの商品がありません。未取得の履歴があるため、未購入とは判定していません。'}</p>
          : tried.length < enabled.length && <a className="page-link" href="#/">ホームで、次に出会う趣味の提案を見る</a>}
        <p className="mypage-note">
          購入履歴の商品カテゴリから表示しています。出品した趣味は含みません。
          {!complete && '購入履歴が多いため、新しい2,000件までを対象にしています。'}
        </p>
      </>}
    </section>
  )
}
