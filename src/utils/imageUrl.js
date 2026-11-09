// The API keeps its existing relative image_path contract; only the delivery base changes.
export function imageUrl(path, base, fallback) {
  if (!/^\/items\/[1-9]\d*\/image$/.test(path)) throw new Error('商品画像のパスを確認できませんでした。')
  const value = base?.trim().replace(/\/+$/, '')
  if (!value) return fallback
  if (value.startsWith('/') && !value.startsWith('//')) {
    const parsed = new URL(value, 'https://image-base.invalid')
    if (parsed.search || parsed.hash || parsed.pathname !== value) throw new Error('画像の配信先設定を確認してください。')
    return `${value}${path}`
  }
  const parsed = new URL(value)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
  if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:'))
    || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('画像の配信先設定を確認してください。')
  return `${value}${path}`
}
