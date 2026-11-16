import { Button } from './Button.jsx'
import { HobbyClusterChips } from './HobbyClusterChips.jsx'
import { formatPrice } from '../utils/format.js'
import { loginHash } from '../utils/authRedirect.js'

/**
 * ホームの目玉カード「まだ知らない趣味」。購入・出品した趣味（source）から、
 * まだ扱っていない近い趣味（target）の道具を理由チップ付きで提案する。
 */
export function DiscoveryCard({ userId, authStatus, discovery, catalog, recommendation, suggested, onOpenItem }) {
  const reasonCode = discovery.value?.reason_code
  const noUnseen = reasonCode === 'no_unseen_items'
    || (Boolean(suggested) && !recommendation && !catalog.loading && !catalog.error)
  const heading = recommendation && (recommendation.source_cluster
    ? `${recommendation.source_cluster}を楽しむあなたへ、次は${recommendation.target_cluster}`
    : `次の趣味は${recommendation.target_cluster}`)
  const item = recommendation?.item

  return (
    <section className="discovery-feature" aria-labelledby="discovery-title">
      <h2 id="discovery-title" className="discovery-feature__label">
        まだ知らない趣味{recommendation ? `：${recommendation.target_cluster}` : 'との出会い'}
      </h2>
      {authStatus === 'checking' && <p role="status">ログイン状態を確認しています…</p>}
      {!userId && authStatus !== 'checking' && <div className="discovery-feature__stack">
        <p>ログインすると、購入・出品した趣味から新しい趣味の入口を提案します。</p>
        <Button className="discovery-feature__cta" onClick={() => { window.location.hash = loginHash('#/') }}>ログインして趣味を見つける</Button>
      </div>}
      {userId && (discovery.loading || catalog.loading) && <p role="status">近い趣味を探しています…</p>}
      {discovery.error && <div className="discovery-feature__stack">
        <p>{discovery.error}</p><Button variant="secondary" onClick={discovery.retry}>提案を再取得</Button>
      </div>}
      {recommendation && <div className="discovery-feature__body">
        <div className="discovery-feature__text">
          <h3 className="discovery-feature__heading">{heading}</h3>
          <span className="discovery-feature__chip">{recommendation.reason_chip}</span>
          <p className="discovery-feature__basis">購入・出品した趣味と商品の特徴をもとにした提案です。</p>
          <Button className="discovery-feature__cta" onClick={() => onOpenItem(item.id)}>この道具を見てみる</Button>
        </div>
        <div className="discovery-feature__item">
          <div className="discovery-feature__thumb">
            {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" />
              : <span className="discovery-feature__placeholder">画像準備中</span>}
          </div>
          <div className="discovery-feature__item-body">
            <p className="discovery-feature__item-title">{item.title}</p>
            <p className="discovery-feature__price">{formatPrice(item.price)}</p>
          </div>
        </div>
      </div>}
      {reasonCode === 'no_experience' && <div className="discovery-feature__stack">
        <p>購入・出品した趣味がまだありません。気になる道具を購入するか、手持ちの道具を出品すると、近い新しい趣味を提案します。</p>
        <HobbyClusterChips clusters={catalog.clusters} title="まずは気になる趣味の道具を見てみる" titleId="discovery-start-title" headingLevel={3} />
        <a className="page-link" href="#/listing">手持ちの道具を出品する</a>
      </div>}
      {noUnseen && <p>今は新しく提案できる道具がありません。また見に来てください。</p>}
    </section>
  )
}
