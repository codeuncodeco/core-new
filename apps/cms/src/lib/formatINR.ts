// Formats a rupee amount with Indian digit grouping: 100000 -> "₹1,00,000".
// Numbers only — for amounts that are already strings (e.g. ranges like
// "₹500–2,000/mo") pass them through unchanged from the caller.
export const formatINR = (amount: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`
