import './components.css'

/**
 * variant: 'primary' | 'secondary'。size: 'md' | 'lg'。block: 全幅表示。
 * as="a" と href を渡すと、画面遷移だけの操作をボタンの見た目のリンクとして描画する。
 * クリック処理は親から渡す。
 */
export function Button({ variant = 'primary', size = 'md', block = false, as, type = 'button', className = '', ...props }) {
  const appearance = variant === 'secondary' ? 'secondary' : 'primary'
  const classes = [
    'ui-button',
    `ui-button--${appearance}`,
    size === 'lg' && 'ui-button--lg',
    block && 'ui-button--block',
    as === 'a' && 'ui-button--link',
    className,
  ].filter(Boolean).join(' ')

  if (as === 'a') return <a {...props} className={classes} />
  return <button {...props} type={type} className={classes} />
}
