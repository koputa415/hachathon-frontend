import { StatusBadge } from './StatusBadge.jsx'
import './components.css'

/** priceLabel は「¥12,000」など、親で整形した表示文字列。 */
export function ItemCard({
  title,
  priceLabel,
  categoryLabel,
  status = 'available',
  imageSrc,
  imageAlt = '',
  href,
  reason,
}) {
  return (
    <article className="ui-item-card">
      <div className="ui-item-card__image">
        {imageSrc ? (
          <img src={imageSrc} alt={imageAlt} loading="lazy" />
        ) : (
          <span className="ui-item-card__placeholder">画像準備中</span>
        )}
      </div>
      <div className="ui-item-card__body">
        <div className="ui-item-card__meta">
          {categoryLabel && <span>{categoryLabel}</span>}
          <StatusBadge status={status} />
        </div>
        <h3 className="ui-item-card__title">
          {href ? <a href={href}>{title}</a> : title}
        </h3>
        <p className="ui-item-card__price">{priceLabel}</p>
        {reason && <p className="ui-item-card__reason">{reason}</p>}
      </div>
    </article>
  )
}
