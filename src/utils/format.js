const priceFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** 価格を「￥12,345」形式に整形する。数値にできない値は空文字を返す。 */
export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  return priceFormatter.format(number)
}

/** ISO 日時文字列などを「2026/11/16」形式に整形する。不正な値は空文字を返す。 */
export function formatDate(iso) {
  if (iso === null || iso === undefined || iso === '') return ''
  const date = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return dateFormatter.format(date)
}
