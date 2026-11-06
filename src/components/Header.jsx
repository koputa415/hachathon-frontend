import './components.css'

/** アプリ名は確定までプレースホルダーを表示する。 */
export function Header({ brand = 'アプリ名（未定）', homeHref = '/', children }) {
  return (
    <header className="ui-header">
      <a className="ui-header__brand" href={homeHref}>{brand}</a>
      {children && <div className="ui-header__actions">{children}</div>}
    </header>
  )
}
