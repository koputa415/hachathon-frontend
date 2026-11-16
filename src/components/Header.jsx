import './components.css'

/**
 * アプリ名は確定までプレースホルダーを表示する。
 * navItems: { id, label, href, icon? }[]。指定するとブランドの右側にナビゲーションを表示する（表示幅の切り替えは画面側の責務）。
 */
export function Header({ brand = 'アプリ名（未定）', homeHref = '/', navItems, currentId, navLabel = 'メインナビゲーション', children }) {
  return (
    <header className="ui-header">
      <a className="ui-header__brand" href={homeHref}>{brand}</a>
      {navItems?.length > 0 && (
        <nav className="ui-header__nav" aria-label={navLabel}>
          <ul className="ui-header__nav-list">
            {navItems.map((item) => (
              <li key={item.id}>
                <a href={item.href} aria-current={item.id === currentId ? 'page' : undefined}>
                  {item.icon && <span className="ui-header__nav-icon" aria-hidden="true">{item.icon}</span>}
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {children && <div className="ui-header__actions">{children}</div>}
    </header>
  )
}
