export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatPln(n: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
  }).format(n);
}
