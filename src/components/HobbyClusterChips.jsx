/** 推薦対象の5つの趣味クラスタ（「その他」を除く）へのカテゴリ絞り込みリンク。 */
export function HobbyClusterChips({ clusters, title = '5つの趣味からさがす', titleId, headingLevel = 2, current = '' }) {
  const enabled = clusters.filter((cluster) => cluster.recommendation_enabled && cluster.name !== 'その他')
  if (enabled.length === 0) return null
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  return (
    <nav className="hobby-chips" aria-labelledby={titleId}>
      <Heading id={titleId} className="hobby-chips__title">{title}</Heading>
      <ul className="hobby-chips__list">
        {enabled.map((cluster) => (
          <li key={cluster.id}>
            <a className="hobby-chips__chip" href={`#/?${new URLSearchParams({ category: cluster.name })}`}
              aria-current={cluster.name === current ? 'page' : undefined}>{cluster.name}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
