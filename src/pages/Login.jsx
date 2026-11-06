import { useState } from 'react'
import { Button } from '../components/index.js'
import './pages.css'

export default function Login({ auth, returnTo = '#/' }) {
  const [mode, setMode] = useState('login')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const isRegistration = mode === 'register'
  const reason = returnTo === '#/listing' ? '出品するにはログインが必要です。'
    : returnTo.startsWith('#/items/') ? '購入するにはログインが必要です。'
    : returnTo === '#/chat-history' ? '履歴を見るにはログインが必要です。' : '道具との出会いを、ここから。'

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const credentials = { email: data.get('email').trim(), password: data.get('password') }
    if (isRegistration) {
      credentials.display_name = data.get('display_name').trim()
      if (!credentials.display_name) { setError('表示名を入力してください。'); return }
    }
    setError('')
    setPending(true)
    try {
      await (isRegistration ? auth.register(credentials) : auth.login(credentials))
    } catch (failure) {
      setError(failure.message)
    } finally {
      form.elements.namedItem('password').value = ''
      setPending(false)
    }
  }

  return (
    <section className="page-stack auth-page" aria-labelledby="login-title">
      <h1 id="login-title">{isRegistration ? '新規登録' : 'ログイン'}</h1>
      <p className="page-muted">{reason}</p>
      <form key={mode} className="page-panel page-stack" onSubmit={handleSubmit} aria-busy={pending}>
        <fieldset className="auth-fields page-stack" disabled={pending}>
          <legend className="auth-legend">{isRegistration ? 'アカウントを作成' : 'アカウント情報'}</legend>
          {isRegistration && <div className="form-field">
            <label htmlFor="auth-display-name">表示名</label>
            <input id="auth-display-name" name="display_name" autoComplete="nickname" required maxLength={80} />
          </div>}
          <div className="form-field">
            <label htmlFor="auth-email">メールアドレス</label>
            <input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={254} />
          </div>
          <div className="form-field">
            <label htmlFor="auth-password">パスワード{isRegistration ? '（8〜128文字）' : ''}</label>
            <input id="auth-password" name="password" type="password" autoComplete={isRegistration ? 'new-password' : 'current-password'} required minLength={isRegistration ? 8 : 1} maxLength={128} />
          </div>
          <Button type="submit">{pending ? '確認中…' : isRegistration ? '登録して続ける' : 'ログインして続ける'}</Button>
        </fieldset>
        {error && <p className="page-error" role="alert">{error}</p>}
      </form>
      <div className="page-actions">
        <Button variant="secondary" disabled={pending} onClick={() => {
          setMode(isRegistration ? 'login' : 'register')
          setError('')
        }}>{isRegistration ? 'ログインに切り替える' : '新規登録に切り替える'}</Button>
        <a className="page-link" href="#/">ホームに戻る</a>
      </div>
    </section>
  )
}
