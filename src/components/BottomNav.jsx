import './components.css'

/** items: { id, label, href, icon? }[]。選択状態・遷移は親が管理する。 */
export function BottomNav({ items = [], currentId, onNavigate, label = 'メインナビゲーション' }) {
  return (
    <nav className="ui-bottom-nav" aria-label={label}>
      <ul className="ui-bottom-nav__list">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              aria-current={item.id === currentId ? 'page' : undefined}
              onClick={onNavigate ? (event) => onNavigate(event, item) : undefined}
            >
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
