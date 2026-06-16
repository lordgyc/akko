export function formatETB(amount: number): string {
  return `${amount.toLocaleString('en-ET', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}

export function formatETBCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M ETB`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K ETB`;
  }
  return formatETB(amount);
}
