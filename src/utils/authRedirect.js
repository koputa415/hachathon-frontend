// 戻り先は既存画面の内部ハッシュだけを許可し、外部URLへは遷移しない。
export function safeReturnTo(value) {
  return typeof value === 'string' && (/^#\/listing$/.test(value) || /^#\/items\/[1-9]\d*$/.test(value)) ? value : '#/'
}

export function loginHash(next) {
  return `#/login?next=${encodeURIComponent(safeReturnTo(next))}`
}

export function loginReturnTo(route) {
  return safeReturnTo(new URLSearchParams(route.split('?')[1] || '').get('next'))
}
