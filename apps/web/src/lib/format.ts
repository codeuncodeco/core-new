const formatters: Record<string, Intl.NumberFormat> = {
  INR: new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }),
}

export const formatAmount = (amount: number, currency: string = 'INR') => {
  const f = formatters[currency] ?? formatters.INR!
  return f.format(amount)
}
