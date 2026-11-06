import './components.css'

/** variant: 'primary' | 'secondary'。クリック処理は親から渡す。 */
export function Button({ variant = 'primary', type = 'button', className = '', ...props }) {
  const appearance = variant === 'secondary' ? 'secondary' : 'primary'

  return (
    <button
      {...props}
      type={type}
      className={`ui-button ui-button--${appearance} ${className}`.trim()}
    />
  )
}
