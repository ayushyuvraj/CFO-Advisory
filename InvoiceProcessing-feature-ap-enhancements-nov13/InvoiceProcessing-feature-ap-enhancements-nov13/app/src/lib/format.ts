/** Currency and number formatting for an Indian finance audience. */

/**
 * Indian digit grouping — the last three digits, then pairs (lakh, crore):
 * 4131300 → ₹41,31,300.00
 */
export function inr(n: number, decimals = true): string {
  const neg = n < 0
  const x = Math.abs(n)
  const s = decimals ? x.toFixed(2) : Math.round(x).toString()
  const [whole, frac] = s.split('.')

  let last3 = whole.slice(-3)
  const rest = whole.slice(0, -3)
  if (rest) last3 = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3

  return (neg ? '-' : '') + '₹' + last3 + (frac ? '.' + frac : '')
}

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }

/** Formats in the document's own currency — imports in the inbox are not rupees. */
export function money(n: number, currency: string): string {
  if (currency === 'INR') return inr(n)
  const symbol = SYMBOLS[currency] ?? ''
  return (
    symbol +
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

/** Quantities use the same Indian grouping, without a currency symbol. */
export function qty(n: number): string {
  return n.toLocaleString('en-IN')
}

export function pct(n: number, decimals = 1): string {
  return n.toFixed(decimals) + '%'
}
